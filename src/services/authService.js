import {
  apiRequest,
  ApiError,
  mockRequest,
  newId,
  USE_MOCK_API,
} from './client.js';
import {
  AUTH_STORAGE_KEYS,
  clone,
  readStore,
  removeStore,
  writeStore,
} from './storage.js';
import {
  hasErrors,
  validateLoginInput,
  validateRegistrationInput,
} from '../utils/validation.js';

/**
 * Mock authentication service.
 *
 * This is NOT production authentication: credentials and the session live in
 * this browser's localStorage, and there is no server, token verification or
 * password recovery. It exists so the sign-in and onboarding flows can be
 * exercised end to end before the backend exists.
 *
 * When the FastAPI backend is available, set VITE_USE_MOCK_API=false. The same
 * functions then call:
 *   POST /api/auth/login      POST /api/auth/register
 *   POST /api/auth/logout     GET  /api/auth/me
 * relative to VITE_API_BASE_URL. Response bodies are expected to be either the
 * user object or `{ user }`.
 */

export const AUTH_ENDPOINTS = {
  login: '/auth/login',
  register: '/auth/register',
  logout: '/auth/logout',
  currentUser: '/auth/me',
};

export const DEMO_CREDENTIALS = {
  email: 'demo@greencampus.app',
  password: 'demo1234',
};

const DEMO_ACCOUNT = {
  id: 'user_demo',
  name: 'Demo Administrator',
  email: DEMO_CREDENTIALS.email,
  role: 'Sustainability administrator',
  isDemo: true,
  collegeSetupComplete: true,
};

function readAccounts() {
  const stored = readStore(AUTH_STORAGE_KEYS.accounts, []);
  return Array.isArray(stored) ? stored : [];
}

function writeAccounts(accounts) {
  writeStore(AUTH_STORAGE_KEYS.accounts, accounts);
}

/**
 * Client-side digest keeps mock passwords out of plain sight. It is a hygiene
 * measure for the prototype, not a security boundary.
 */
async function hashPassword(email, password) {
  const value = `greencampus-mock|${email.trim().toLowerCase()}|${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }
  return `fallback_${(hash >>> 0).toString(16)}`;
}

export function publicUser(account) {
  if (!account) return null;
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    isDemo: Boolean(account.isDemo),
    collegeSetupComplete: Boolean(account.collegeSetupComplete),
    createdAt: account.createdAt ?? null,
  };
}

async function ensureDemoAccount() {
  const accounts = readAccounts();
  if (accounts.some((account) => account.email === DEMO_ACCOUNT.email)) return accounts;
  const demoAccount = {
    ...DEMO_ACCOUNT,
    passwordHash: await hashPassword(DEMO_ACCOUNT.email, DEMO_CREDENTIALS.password),
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  const next = [...accounts, demoAccount];
  writeAccounts(next);
  return next;
}

function readSession() {
  const session = readStore(AUTH_STORAGE_KEYS.session, null);
  if (!session?.userId) return null;
  return session;
}

function writeSession(userId) {
  const session = {
    userId,
    token: newId('mock_session'),
    issuedAt: new Date().toISOString(),
  };
  writeStore(AUTH_STORAGE_KEYS.session, session);
  return session;
}

function userFromResponse(data) {
  if (!data) return null;
  if (data.user) return publicUser(data.user);
  return publicUser(data);
}

export async function login({ email, password } = {}) {
  const errors = validateLoginInput({ email, password });
  if (hasErrors(errors)) throw new ApiError(Object.values(errors)[0], 400);

  if (!USE_MOCK_API) {
    const data = await apiRequest(AUTH_ENDPOINTS.login, {
      method: 'POST',
      body: { email: String(email).trim(), password },
    });
    return userFromResponse(data);
  }

  const accounts = await ensureDemoAccount();
  const normalizedEmail = String(email).trim().toLowerCase();
  const account = accounts.find((entry) => entry.email.toLowerCase() === normalizedEmail);
  const passwordHash = await hashPassword(normalizedEmail, password);
  await mockRequest(null, 320);

  if (!account || account.passwordHash !== passwordHash) {
    throw new ApiError('Email or password is incorrect.', 401);
  }

  writeSession(account.id);
  return publicUser(account);
}

export async function register({ name, email, password, confirmPassword } = {}) {
  const errors = validateRegistrationInput({ name, email, password, confirmPassword });
  if (hasErrors(errors)) throw new ApiError(Object.values(errors)[0], 400);

  if (!USE_MOCK_API) {
    const data = await apiRequest(AUTH_ENDPOINTS.register, {
      method: 'POST',
      body: { name: String(name).trim(), email: String(email).trim(), password },
    });
    return userFromResponse(data);
  }

  const accounts = await ensureDemoAccount();
  const normalizedEmail = String(email).trim().toLowerCase();
  await mockRequest(null, 360);

  if (accounts.some((entry) => entry.email.toLowerCase() === normalizedEmail)) {
    throw new ApiError('An account already exists for this email address.', 409);
  }

  const account = {
    id: newId('user'),
    name: String(name).trim(),
    email: normalizedEmail,
    role: 'Sustainability administrator',
    passwordHash: await hashPassword(normalizedEmail, password),
    isDemo: false,
    collegeSetupComplete: false,
    createdAt: new Date().toISOString(),
  };
  writeAccounts([...accounts, account]);
  writeSession(account.id);
  return publicUser(account);
}

export async function logout() {
  if (!USE_MOCK_API) {
    await apiRequest(AUTH_ENDPOINTS.logout, { method: 'POST' });
    return null;
  }
  removeStore(AUTH_STORAGE_KEYS.session);
  return mockRequest(null, 160);
}

export async function getCurrentUser() {
  if (!USE_MOCK_API) {
    try {
      const data = await apiRequest(AUTH_ENDPOINTS.currentUser);
      return userFromResponse(data);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null;
      throw error;
    }
  }

  const accounts = await ensureDemoAccount();
  const session = readSession();
  if (!session) return null;
  const account = accounts.find((entry) => entry.id === session.userId);
  if (!account) {
    removeStore(AUTH_STORAGE_KEYS.session);
    return null;
  }
  return mockRequest(clone(publicUser(account)), 120);
}

/**
 * Onboarding flag only. The college profile itself is saved through
 * settingsService.updateProfile (PUT /profile when the backend is ready).
 */
export async function completeCollegeSetup() {
  if (!USE_MOCK_API) return getCurrentUser();

  const accounts = await ensureDemoAccount();
  const session = readSession();
  if (!session) throw new ApiError('Your session has expired. Sign in again.', 401);
  const index = accounts.findIndex((entry) => entry.id === session.userId);
  if (index === -1) throw new ApiError('Your session has expired. Sign in again.', 401);

  const updated = { ...accounts[index], collegeSetupComplete: true };
  const next = [...accounts];
  next[index] = updated;
  writeAccounts(next);
  return mockRequest(publicUser(updated), 120);
}

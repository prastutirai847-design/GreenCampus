export const STORAGE_PREFIX = 'greencampus:v1:';

export const STORAGE_KEYS = {
  meta: 'meta',
  buildings: 'buildings',
  departments: 'departments',
  activities: 'activities',
  profile: 'profile',
  factors: 'factors',
  bills: 'bills',
  reports: 'reports',
  scope3: 'scope3',
};

/**
 * Account and session keys are kept separate from the workspace keys so that
 * "Reset workspace" never deletes the signed-in account or logs the user out.
 */
export const AUTH_STORAGE_KEYS = {
  accounts: 'auth:accounts',
  session: 'auth:session',
};

export function readStore(key, fallback = null) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeStore(key, value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
}

export function removeStore(key) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
}

export function clone(value) {
  if (value === undefined) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

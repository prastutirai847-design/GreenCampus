import { defaultScope3Register, SCOPE3_CATEGORIES, SCOPE3_STATUS } from '../data/ghgProtocol.js';
import { apiRequest, mockRequest, USE_MOCK_API } from './client.js';
import { clone, readStore, STORAGE_KEYS, writeStore } from './storage.js';

/**
 * Scope 3 register service.
 *
 * The register records applicability and exclusion decisions for all 15 GHG
 * Protocol Scope 3 categories. It stores decisions, not emissions: quantified
 * emissions always come from the activity records through the shared emission
 * engine, so a category cannot be double counted.
 *
 * Planned FastAPI endpoints:
 *   GET /scope3/register
 *   PUT /scope3/register/{categoryId}
 *   POST /scope3/register/reset
 */
export const SCOPE3_ENDPOINTS = {
  register: '/scope3/register',
  category: (categoryId) => `/scope3/register/${Number(categoryId)}`,
  reset: '/scope3/register/reset',
};

function normalizeRegister(stored) {
  const byId = new Map(
    (Array.isArray(stored) ? stored : []).map((entry) => [Number(entry.categoryId), entry]),
  );
  return SCOPE3_CATEGORIES.map((category) => {
    const saved = byId.get(category.id);
    const status = SCOPE3_STATUS[saved?.status] ? saved.status : category.defaultStatus;
    return {
      categoryId: category.id,
      status,
      note: typeof saved?.note === 'string' ? saved.note : '',
      updatedAt: saved?.updatedAt ?? null,
    };
  });
}

export async function getScope3Register() {
  if (!USE_MOCK_API) {
    return apiRequest(SCOPE3_ENDPOINTS.register);
  }
  return mockRequest(normalizeRegister(readStore(STORAGE_KEYS.scope3, null)), 120);
}

export async function updateScope3Category(categoryId, { status, note = '' } = {}) {
  if (!SCOPE3_CATEGORIES.some((category) => category.id === Number(categoryId))) {
    throw new Error('That Scope 3 category does not exist.');
  }
  if (!SCOPE3_STATUS[status]) {
    throw new Error('Choose a valid applicability status.');
  }
  if (String(note).length > 240) {
    throw new Error('Keep the category note under 240 characters.');
  }

  if (!USE_MOCK_API) {
    return apiRequest(SCOPE3_ENDPOINTS.category(categoryId), {
      method: 'PUT',
      body: { status, note },
    });
  }

  const register = normalizeRegister(readStore(STORAGE_KEYS.scope3, null));
  const updated = register.map((entry) =>
    entry.categoryId === Number(categoryId)
      ? { ...entry, status, note: String(note).trim(), updatedAt: new Date().toISOString() }
      : entry,
  );
  writeStore(STORAGE_KEYS.scope3, updated);
  return mockRequest(clone(updated.find((entry) => entry.categoryId === Number(categoryId))), 140);
}

export async function resetScope3Register() {
  if (!USE_MOCK_API) {
    return apiRequest(SCOPE3_ENDPOINTS.reset, { method: 'POST' });
  }
  const register = defaultScope3Register();
  writeStore(STORAGE_KEYS.scope3, register);
  return mockRequest(clone(register), 140);
}

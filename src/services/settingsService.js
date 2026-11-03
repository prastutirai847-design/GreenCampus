import { DEFAULT_PROFILE } from '../data/demoData.js';
import {
  DEFAULT_FACTORS,
  normalizeFactors,
  resetFactorValues,
} from '../data/emissionFactors.js';
import { hasErrors, validateProfileInput } from '../utils/validation.js';
import { apiRequest, mockRequest, USE_MOCK_API } from './client.js';
import { clone, readStore, STORAGE_KEYS, writeStore } from './storage.js';

/**
 * College profile and emission-factor settings.
 *
 * Planned FastAPI endpoints:
 *   GET /profile                PUT /profile
 *   GET /emission-factors       PUT /emission-factors
 *   POST /emission-factors/reset
 */

export const SETTINGS_ENDPOINTS = {
  profile: '/profile',
  factors: '/emission-factors',
  resetFactors: '/emission-factors/reset',
};

/**
 * Dismissible interface notices are a browser preference, not college data.
 * Keeping the key behind this service stops pages from touching localStorage.
 */
const UI_PREFERENCE_KEYS = {
  demoBannerDismissed: 'demo-banner-hidden',
};

export function isDemoBannerDismissed() {
  return Boolean(readStore(UI_PREFERENCE_KEYS.demoBannerDismissed, false));
}

export function dismissDemoBanner() {
  try {
    writeStore(UI_PREFERENCE_KEYS.demoBannerDismissed, true);
  } catch {
    // The banner is cosmetic; a storage failure is not actionable here.
  }
}

function readProfile() {
  return { ...DEFAULT_PROFILE, ...(readStore(STORAGE_KEYS.profile, {}) ?? {}) };
}

function normalizeProfile(values) {
  return {
    ...readProfile(),
    name: String(values.name ?? '').trim(),
    shortName: String(values.shortName ?? '').trim(),
    city: String(values.city ?? '').trim(),
    type: String(values.type ?? DEFAULT_PROFILE.type),
    students: Number(values.students),
    staff: Number(values.staff),
    campusBuildings:
      values.campusBuildings === '' || values.campusBuildings === null || values.campusBuildings === undefined
        ? null
        : Number(values.campusBuildings),
    campusAreaAcres:
      values.campusAreaAcres === '' || values.campusAreaAcres === null || values.campusAreaAcres === undefined
        ? null
        : Number(values.campusAreaAcres),
    academicYear: String(values.academicYear ?? '').trim(),
    sustainabilityLead: String(values.sustainabilityLead ?? '').trim(),
    contactEmail: String(values.contactEmail ?? '').trim(),
  };
}

export async function getProfile() {
  if (!USE_MOCK_API) return apiRequest(SETTINGS_ENDPOINTS.profile);
  return mockRequest(readProfile(), 120);
}

export async function updateProfile(values) {
  const errors = validateProfileInput(values);
  if (hasErrors(errors)) throw new Error(Object.values(errors)[0]);
  const profile = normalizeProfile(values);

  if (!USE_MOCK_API) {
    return apiRequest(SETTINGS_ENDPOINTS.profile, { method: 'PUT', body: profile });
  }

  writeStore(STORAGE_KEYS.profile, profile);
  return mockRequest(clone(profile), 160);
}

export async function getFactors() {
  if (!USE_MOCK_API) return apiRequest(SETTINGS_ENDPOINTS.factors);
  const stored = readStore(STORAGE_KEYS.factors, {});
  return mockRequest(normalizeFactors(stored), 120);
}

export async function updateFactors(values) {
  const normalized = {};
  Object.keys(DEFAULT_FACTORS).forEach((key) => {
    const raw = values[key];
    const number = Number(raw);
    if (!Number.isFinite(number) || number < 0) {
      throw new Error(`Enter a valid, non-negative value for ${DEFAULT_FACTORS[key].label}.`);
    }
    normalized[key] = number;
  });

  if (!USE_MOCK_API) {
    return apiRequest(SETTINGS_ENDPOINTS.factors, { method: 'PUT', body: { values: normalized } });
  }

  writeStore(STORAGE_KEYS.factors, normalized);
  return mockRequest(normalizeFactors(normalized), 160);
}

export async function resetFactors() {
  if (!USE_MOCK_API) {
    return apiRequest(SETTINGS_ENDPOINTS.resetFactors, { method: 'POST' });
  }
  const values = resetFactorValues();
  writeStore(STORAGE_KEYS.factors, values);
  return mockRequest(normalizeFactors(values), 120);
}

import { hasErrors, parseActivityInput, validateActivityInput } from '../utils/validation.js';
import * as activityApi from './activityService.js';
import { apiRequest, USE_MOCK_API } from './client.js';

/**
 * Consumption service (Phase 3 transport boundary).
 *
 * Planned FastAPI endpoints:
 *   GET    /consumption?category=&building_id=&from=&to=
 *   POST   /consumption
 *   PATCH  /consumption/{id}
 *   DELETE /consumption/{id}
 *
 * The backend contract mirrors the activity records already used by analytics,
 * reports and the dashboard. Mock mode delegates to the local activity store so
 * there is a single copy of the data while no backend exists.
 *
 * Only GET and POST were requested for this phase; PATCH and DELETE follow the
 * same REST shape for the edit and delete actions in the UI.
 */

export const CONSUMPTION_ENDPOINTS = {
  list: '/consumption',
  create: '/consumption',
  update: (id) => `/consumption/${encodeURIComponent(id)}`,
  remove: (id) => `/consumption/${encodeURIComponent(id)}`,
};

function buildQuery({ category, buildingId, period, from, to, search } = {}) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (buildingId) params.set('building_id', buildingId);
  if (period) params.set('period', period);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (search) params.set('search', search);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function listConsumption(params = {}) {
  if (!USE_MOCK_API) {
    return apiRequest(`${CONSUMPTION_ENDPOINTS.list}${buildQuery(params)}`);
  }
  return activityApi.listActivities({ category: params.category });
}

function parseForBackend(category, values) {
  const errors = validateActivityInput(category, values);
  if (hasErrors(errors)) throw new Error(Object.values(errors)[0]);
  return parseActivityInput(category, values);
}

export async function createConsumption(category, values) {
  if (!USE_MOCK_API) {
    return apiRequest(CONSUMPTION_ENDPOINTS.create, {
      method: 'POST',
      body: { category, ...parseForBackend(category, values) },
    });
  }
  return activityApi.createActivity(category, values);
}

export async function updateConsumption(id, values, category) {
  if (!USE_MOCK_API) {
    if (!category) throw new Error('The record category is required to update a consumption record.');
    return apiRequest(CONSUMPTION_ENDPOINTS.update(id), {
      method: 'PATCH',
      body: parseForBackend(category, values),
    });
  }
  return activityApi.updateActivity(id, values, category);
}

export async function deleteConsumption(id) {
  if (!USE_MOCK_API) {
    return apiRequest(CONSUMPTION_ENDPOINTS.remove(id), { method: 'DELETE' });
  }
  return activityApi.deleteActivity(id);
}

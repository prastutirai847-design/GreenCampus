import { buildAnalyticsView, CAMPUS_WIDE } from '../utils/analyticsView.js';
import { apiRequest, mockRequest, USE_MOCK_API } from './client.js';
import * as activityApi from './activityService.js';
import * as buildingApi from './buildingService.js';
import * as departmentApi from './departmentService.js';
import * as settingsApi from './settingsService.js';

/**
 * Analytics service.
 *
 * Planned FastAPI endpoints:
 *   GET /analytics/monthly?from=&to=&buildingId=&departmentId=&scope=&category=
 *   GET /analytics/buildings?...
 *   GET /analytics/scopes?...
 *
 * Mock mode derives every payload from the active workspace through the shared
 * analytics view builder. Real mode calls the matching endpoint, so pages do
 * not change when the backend arrives.
 */
export const ANALYTICS_ENDPOINTS = {
  monthly: '/analytics/monthly',
  buildings: '/analytics/buildings',
  scopes: '/analytics/scopes',
};

function analyticsQuery(filters = {}) {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.buildingId) {
    params.set('buildingId', filters.buildingId === CAMPUS_WIDE ? 'unassigned' : filters.buildingId);
  }
  if (filters.departmentId) params.set('departmentId', filters.departmentId);
  if (filters.scope) params.set('scope', String(filters.scope));
  if (filters.category) params.set('category', filters.category);
  const query = params.toString();
  return query ? `?${query}` : '';
}

async function loadView(filters) {
  const [activities, buildings, departments, profile, factors] = await Promise.all([
    activityApi.listActivities(),
    buildingApi.listBuildings(),
    departmentApi.listDepartments(),
    settingsApi.getProfile(),
    settingsApi.getFactors(),
  ]);
  return buildAnalyticsView({
    activities,
    buildings,
    departments,
    profile,
    factors,
    filters,
  });
}

export async function getAnalyticsMonthly(filters = {}) {
  if (!USE_MOCK_API) {
    return apiRequest(`${ANALYTICS_ENDPOINTS.monthly}${analyticsQuery(filters)}`);
  }
  const view = await loadView(filters);
  return mockRequest(
    {
      meta: view.meta,
      totals: view.totals,
      monthly: view.monthly,
      yearly: view.yearly,
      resources: view.resources,
      renewable: view.renewable,
      breakdowns: view.breakdowns,
    },
    140,
  );
}

export async function getAnalyticsBuildings(filters = {}) {
  if (!USE_MOCK_API) {
    return apiRequest(`${ANALYTICS_ENDPOINTS.buildings}${analyticsQuery(filters)}`);
  }
  const view = await loadView(filters);
  return mockRequest({ meta: view.meta, totals: view.totals, buildings: view.buildings }, 140);
}

export async function getAnalyticsScopes(filters = {}) {
  if (!USE_MOCK_API) {
    return apiRequest(`${ANALYTICS_ENDPOINTS.scopes}${analyticsQuery(filters)}`);
  }
  const view = await loadView(filters);
  return mockRequest(
    { meta: view.meta, totals: view.totals, scopes: view.scopes, categories: view.categories },
    140,
  );
}

/**
 * Loads every analytics panel for the selected filters. Mock mode builds the
 * model once; real mode requests the three endpoints in parallel.
 */
export async function getAnalyticsSnapshot(filters = {}) {
  if (!USE_MOCK_API) {
    const [monthly, buildings, scopes] = await Promise.all([
      getAnalyticsMonthly(filters),
      getAnalyticsBuildings(filters),
      getAnalyticsScopes(filters),
    ]);
    return {
      meta: monthly.meta,
      totals: monthly.totals,
      monthly: monthly.monthly,
      yearly: monthly.yearly,
      resources: monthly.resources,
      renewable: monthly.renewable,
      breakdowns: monthly.breakdowns,
      buildings: buildings.buildings,
      scopes: scopes.scopes,
      categories: scopes.categories,
    };
  }
  const view = await loadView(filters);
  return mockRequest(view, 160);
}

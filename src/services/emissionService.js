import { normalizeFactors } from '../data/emissionFactors.js';
import { buildEmissionReport, selectScopeReport } from '../utils/emissionReport.js';
import { apiRequest, mockRequest, USE_MOCK_API } from './client.js';
import { getFactors } from './settingsService.js';

/**
 * Carbon accounting service.
 *
 * Planned FastAPI endpoints:
 *   POST /emissions/calculate
 *   GET  /emissions
 *   GET  /emissions/scope/1     GET /emissions/scope/2     GET /emissions/scope/3
 *   GET  /emission-factors
 *
 * In mock mode every response is derived from the workspace snapshot with the
 * shared pure report engine. Real mode delegates to the API and returns the same
 * shapes, so the emissions page does not need to change when the backend lands.
 */
export const EMISSION_ENDPOINTS = {
  calculate: '/emissions/calculate',
  report: '/emissions',
  scope: (scope) => `/emissions/scope/${scope}`,
  factors: '/emission-factors',
};

function periodQuery(from, to) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return query ? `?${query}` : '';
}

async function activeFactors(factors) {
  if (factors) return factors;
  return getFactors();
}

/**
 * POST /emissions/calculate — returns the calculated scope totals for a period
 * without the full per-record ledger.
 */
export async function calculateEmissions({ from, to, activities, buildings, factors } = {}) {
  if (!USE_MOCK_API) {
    return apiRequest(EMISSION_ENDPOINTS.calculate, {
      method: 'POST',
      body: { from: from ?? null, to: to ?? null },
    });
  }

  const resolvedFactors = await activeFactors(factors);
  const report = buildEmissionReport({
    activities,
    buildings,
    factors: resolvedFactors,
    from,
    to,
  });

  return mockRequest(
    {
      meta: report.meta,
      totals: report.totals,
      scopes: report.scopeShares,
      byCategory: report.byCategory,
      monthly: report.monthly,
      notes: report.notes,
    },
    0,
  );
}

/**
 * GET /emissions — the complete emissions report for a period.
 */
export async function getEmissions({ from, to, activities, buildings, factors } = {}) {
  if (!USE_MOCK_API) {
    return apiRequest(`${EMISSION_ENDPOINTS.report}${periodQuery(from, to)}`);
  }

  const resolvedFactors = await activeFactors(factors);
  const report = buildEmissionReport({
    activities,
    buildings,
    factors: resolvedFactors,
    from,
    to,
  });
  return mockRequest(report, 0);
}

/**
 * GET /emissions/scope/{1|2|3} — one scope with its ledger and factor usage.
 */
export async function getScopeEmissions(scope, { from, to, activities, buildings, factors } = {}) {
  const scopeNumber = Number(scope);
  if (![1, 2, 3].includes(scopeNumber)) {
    throw new Error('Scope must be 1, 2 or 3.');
  }

  if (!USE_MOCK_API) {
    return apiRequest(`${EMISSION_ENDPOINTS.scope(scopeNumber)}${periodQuery(from, to)}`);
  }

  const resolvedFactors = await activeFactors(factors);
  const report = buildEmissionReport({
    activities,
    buildings,
    factors: resolvedFactors,
    from,
    to,
  });
  return mockRequest(selectScopeReport(report, scopeNumber), 0);
}

/**
 * GET /emission-factors — active factor values with source and applicability
 * metadata. Editing remains in Settings (PUT /emission-factors).
 */
export async function getEmissionFactors() {
  if (!USE_MOCK_API) {
    const payload = await apiRequest(EMISSION_ENDPOINTS.factors);
    return normalizeFactors(payload);
  }
  return getFactors();
}

/**
 * Loads the report and the active factor set together. Mock mode computes the
 * report once; real mode requests the endpoints in parallel.
 */
export async function getEmissionSnapshot(context = {}) {
  if (!USE_MOCK_API) {
    const [report, factors] = await Promise.all([
      getEmissions(context),
      getEmissionFactors(),
    ]);
    return { report, factors };
  }

  const factors = await activeFactors(context.factors);
  const report = buildEmissionReport({
    activities: context.activities ?? [],
    buildings: context.buildings ?? [],
    factors,
    from: context.from,
    to: context.to,
  });
  return mockRequest({ report, factors }, 0);
}

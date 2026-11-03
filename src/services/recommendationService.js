import { buildRecommendationReport } from '../utils/recommendationEngine.js';
import * as activityApi from './activityService.js';
import * as buildingApi from './buildingService.js';
import { apiRequest, ApiError, mockRequest, USE_MOCK_API } from './client.js';
import * as settingsApi from './settingsService.js';

/**
 * Recommendation service.
 *
 * Planned FastAPI endpoints:
 *   GET  /ai/recommendations?months=&from=&to=
 *   POST /ai/ask   { question, from, to, context }
 *
 * The prototype evaluates deterministic rules and never calls an AI model.
 * Keeping the transport here means a future LLM or hosted assistant can replace
 * the mock branch without changing the page or the rule engine.
 */
export const RECOMMENDATION_ENDPOINTS = {
  list: '/ai/recommendations',
  ask: '/ai/ask',
};

function recommendationQuery({ months, from, to } = {}) {
  const params = new URLSearchParams();
  if (months) params.set('months', String(months));
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return query ? `?${query}` : '';
}

async function loadSnapshot(options) {
  const [activities, buildings, profile, factors] = await Promise.all([
    activityApi.listActivities(),
    buildingApi.listBuildings(),
    settingsApi.getProfile(),
    settingsApi.getFactors(),
  ]);
  return buildRecommendationReport({
    activities,
    buildings,
    profile,
    factors,
    months: options?.months,
    from: options?.from,
    to: options?.to,
  });
}

/**
 * Returns the full advisor snapshot: recommendations, rule audit and metadata.
 * In mock mode it is derived from the active workspace through the shared
 * analytics and emission utilities.
 */
export async function getRecommendationSnapshot(options = {}) {
  if (!USE_MOCK_API) {
    return apiRequest(`${RECOMMENDATION_ENDPOINTS.list}${recommendationQuery(options)}`);
  }
  const snapshot = await loadSnapshot(options);
  return mockRequest(snapshot, 180);
}

/**
 * Placeholder for the optional AI assistant. It is intentionally unavailable in
 * the prototype so the UI cannot imply that an LLM is answering questions.
 */
export async function askAdvisor({ question, from, to, context } = {}) {
  if (!USE_MOCK_API) {
    return apiRequest(RECOMMENDATION_ENDPOINTS.ask, {
      method: 'POST',
      body: { question, from, to, context },
    });
  }
  throw new ApiError(
    'The AI assistant is not enabled in this prototype. Recommendations are produced by transparent deterministic rules.',
    501,
  );
}

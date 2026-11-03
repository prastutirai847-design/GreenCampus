/**
 * Compatibility entry point for the recommendation engine.
 *
 * The deterministic rules now live in recommendationEngine.js so the engine,
 * service layer and future AI integration stay independent of the page. This
 * module keeps existing dashboard and report imports stable.
 */
export {
  buildRecommendationReport,
  buildRecommendations,
  DEFAULT_WINDOW_MONTHS,
  ENGINE_VERSION,
  RULE_DEFINITIONS,
} from './recommendationEngine.js';

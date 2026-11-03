import { monthLabel } from '../utils/dates.js';

/**
 * Dashboard-only sample data.
 *
 * Electricity, water, fuel, waste and commuting are recorded as activities.
 * The prototype has no field for on-site generation, so renewable energy usage
 * is illustrated with this separate, clearly labelled sample dataset. It is not
 * a measurement from the fictional college and it is not an emission factor.
 *
 * When the FastAPI backend is connected, /dashboard/consumption should return
 * metered on-site generation instead of this module.
 */
export const SAMPLE_RENEWABLE_SOURCE = {
  id: 'rooftop-solar-sample',
  label: 'Rooftop solar (sample)',
  capacityKwp: 300,
  note:
    'Illustrative on-site solar generation provided with the demo dataset. Replace with metered generation when it is available.',
};

const MONTHLY_BASE_KWH = 32000;

// Seasonal output for a solar array in western India: strong March–May,
// weaker during the monsoon. Fractions of the monthly base, not metered data.
const SEASONAL_FACTORS = [
  0.82, 0.88, 1.02, 1.1, 1.16, 1.04, 0.86, 0.88, 0.98, 1.05, 0.94, 0.83,
];

export function renewableKwhForMonth(period) {
  const month = Number(String(period ?? '').slice(5, 7));
  if (!Number.isFinite(month) || month < 1 || month > 12) return 0;
  const value = MONTHLY_BASE_KWH * SEASONAL_FACTORS[month - 1];
  return Math.round(value / 10) * 10;
}

export function summarizeSampleRenewable(months = []) {
  const byMonth = months.map((period) => ({
    period,
    label: monthLabel(period, 'short'),
    kwh: renewableKwhForMonth(period),
  }));
  return {
    source: SAMPLE_RENEWABLE_SOURCE,
    byMonth,
    totalKwh: byMonth.reduce((sum, month) => sum + month.kwh, 0),
  };
}

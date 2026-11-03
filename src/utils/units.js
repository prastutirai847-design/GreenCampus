export const WATER_UNITS = [
  { id: 'kL', label: 'kilolitres (kL)' },
  { id: 'L', label: 'litres (L)' },
];

export function isWaterUnit(unit) {
  return WATER_UNITS.some((item) => item.id === unit);
}

/**
 * Water is stored in kilolitres so every metric (analytics, reports, dashboards)
 * uses one unit. The UI can accept litres and convert on save.
 */
export function waterToCubicMeters(amount, unit = 'kL') {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return unit === 'L' ? value / 1000 : value;
}

export function waterInputFromRecord(activity) {
  const cubicMeters = Number(activity?.cubicMeters) || 0;
  return activity?.unit === 'L'
    ? { amount: cubicMeters > 0 ? cubicMeters * 1000 : '', unit: 'L' }
    : { amount: cubicMeters || '', unit: 'kL' };
}

import { getCommuteMode, getDisposalMethod, getFuelType, getWasteCategory } from '../data/options.js';
import { wasteTypeFactorKey } from '../data/emissionFactors.js';
import { scope1SourceForFuel, scope3CategoryForActivity } from '../data/ghgProtocol.js';
import { formatNumber } from './format.js';
import { waterToCubicMeters } from './units.js';

const ZERO_RESULT = Object.freeze({
  kg: 0,
  scope: null,
  factorKey: null,
  factorLabel: '',
  factorValue: 0,
  factorUnit: '',
  factorSource: '',
  factorYear: '',
  factorVersion: '',
  factorGasCoverage: '',
  factorMethodology: '',
  factorStatus: '',
  factorVerified: false,
  quantity: 0,
  unit: '',
  formula: '',
  sourceLabel: '',
  category: null,
  activityId: null,
  period: null,
  buildingId: null,
  estimated: false,
  excludedFromGhg: false,
  wasteTypeFactorKey: null,
  dataQuality: 'missing',
  scope1Source: null,
  scope3Category: null,
  marketBased: null,
});

function result({ activity, kg, scope, factor, quantity, unit, formula, sourceLabel, extra }) {
  const safeKg = Number.isFinite(kg) && kg > 0 ? kg : 0;
  return {
    kg: safeKg,
    scope: scope ?? null,
    factorKey: factor?.key ?? null,
    factorLabel: factor?.label ?? '',
    factorValue: Number(factor?.value) || 0,
    factorUnit: factor?.unit ?? '',
    factorSource: factor?.source ?? '',
    factorYear: factor?.year ?? '',
    factorVersion: factor?.version ?? '',
    factorGasCoverage: factor?.gasCoverage ?? '',
    factorMethodology: factor?.methodology ?? '',
    factorStatus: factor?.status ?? '',
    factorVerified: Boolean(factor?.verified),
    quantity: Number.isFinite(quantity) ? quantity : 0,
    unit,
    formula,
    sourceLabel: sourceLabel ?? factor?.label ?? '',
    category: activity?.category ?? null,
    activityId: activity?.id ?? null,
    period: activity?.period ?? null,
    buildingId: activity?.buildingId ?? null,
    estimated: Boolean(scope),
    excludedFromGhg: !scope,
    wasteTypeFactorKey: null,
    dataQuality: activity?.dataQuality ?? 'estimated',
    scope1Source: null,
    scope3Category: scope3CategoryForActivity(activity),
    marketBased: null,
    ...extra,
  };
}

/**
 * Core emission calculation. Every activity is converted through one transparent
 * factor lookup so the same logic powers dashboards, reports, exports and scope
 * reporting. Inputs are recorded quantities; outputs are estimates.
 */
export function calculateActivityEmissions(activity, factors) {
  if (!activity || !factors) return ZERO_RESULT;

  const category = activity.category;

  if (category === 'electricity') {
    const kwh = Math.max(0, Number(activity.kwh) || 0);
    const factor = { key: 'gridElectricity', ...factors.gridElectricity };
    const marketFactor = {
      key: 'gridElectricityMarket',
      ...(factors.gridElectricityMarket ?? factors.gridElectricity),
    };
    return result({
      activity,
      kg: kwh * factor.value,
      scope: 2,
      factor,
      quantity: kwh,
      unit: 'kWh',
      formula: `${formatNumber(kwh)} kWh × ${formatNumber(factor.value, { digits: 3 })} kgCO₂e/kWh`,
      sourceLabel: 'Purchased grid electricity (location-based)',
      extra: {
        scope2Method: 'location-based',
        marketBased: {
          method: 'market-based',
          kg: kwh * marketFactor.value,
          quantity: kwh,
          unit: 'kWh',
          factorKey: marketFactor.key,
          factorLabel: marketFactor.label,
          factorValue: Number(marketFactor.value) || 0,
          factorUnit: marketFactor.unit,
          factorSource: marketFactor.source,
          factorYear: marketFactor.year,
          factorVersion: marketFactor.version,
          factorGasCoverage: marketFactor.gasCoverage,
          factorMethodology: marketFactor.methodology,
          factorStatus: marketFactor.status,
          factorVerified: Boolean(marketFactor.verified),
        },
      },
    });
  }

  if (category === 'fuel') {
    const type = getFuelType(activity.fuelType);
    if (!type) return ZERO_RESULT;
    const quantity = Math.max(0, Number(activity.quantity) || 0);
    const factor = { key: type.factorKey, ...factors[type.factorKey] };
    const refrigerant = type.kind === 'refrigerant';
    return result({
      activity,
      kg: quantity * factor.value,
      scope: 1,
      factor,
      quantity,
      unit: type.unit,
      formula: refrigerant
        ? `${formatNumber(quantity, { digits: 2 })} kg top-up × ${formatNumber(factor.value)} kgCO₂e/kg GWP`
        : `${formatNumber(quantity)} ${type.unit} × ${formatNumber(factor.value, {
            digits: 2,
          })} kgCO₂e/${type.unit}`,
      sourceLabel: refrigerant ? `${type.label} leakage` : `${type.label} combustion`,
      extra: {
        scope1Source: scope1SourceForFuel(activity.fuelType, activity.purpose),
      },
    });
  }

  if (category === 'waste') {
    const method = getDisposalMethod(activity.disposal);
    if (!method) return ZERO_RESULT;
    const weightKg = Math.max(0, Number(activity.weightKg) || 0);
    const tonnes = weightKg / 1000;
    const wasteType = getWasteCategory(activity.wasteCategory);

    // Prefer an optional waste-type-specific override, then fall back to the
    // disposal-method reference factor. No type-specific values ship by default.
    const overrideKey = wasteTypeFactorKey(activity.disposal, activity.wasteCategory);
    const override = overrideKey ? factors[overrideKey] : null;
    const base = factors[method.factorKey] ?? {};
    const factor = override
      ? { key: overrideKey, ...override }
      : { key: method.factorKey, ...base };

    return result({
      activity,
      kg: tonnes * factor.value,
      scope: 3,
      factor,
      quantity: tonnes,
      unit: 'tonne',
      formula: `${formatNumber(weightKg)} kg (${formatNumber(tonnes, {
        digits: 2,
      })} t) × ${formatNumber(factor.value)} kgCO₂e/t`,
      sourceLabel: `${method.label} · ${wasteType?.label ?? 'Unspecified waste'}`,
      extra: { wasteTypeFactorKey: override ? overrideKey : null },
    });
  }

  if (category === 'commuting') {
    const mode = getCommuteMode(activity.mode);
    if (!mode) return ZERO_RESULT;
    const distanceKm = Math.max(0, Number(activity.distanceKm) || 0);
    const trips = Math.max(0, Number(activity.tripsPerMonth) || 0);
    const commuters = Math.max(0, Number(activity.commuters) || 0);
    const passengerKm = distanceKm * 2 * trips * commuters;
    const factor = { key: mode.factorKey, ...factors[mode.factorKey] };
    return result({
      activity,
      kg: passengerKm * factor.value,
      scope: 3,
      factor,
      quantity: passengerKm,
      unit: 'passenger-km',
      formula: `${formatNumber(commuters)} people × ${formatNumber(
        distanceKm,
      )} km one-way × 2 × ${formatNumber(trips)} trips × ${formatNumber(factor.value, {
        digits: 3,
      })} kgCO₂e/pkm`,
      sourceLabel: `${mode.label} commuting`,
    });
  }

  if (category === 'water') {
    const cubicMeters = Math.max(0, Number(activity.cubicMeters) || 0);
    return {
      ...ZERO_RESULT,
      quantity: cubicMeters,
      unit: 'kL',
      category: 'water',
      activityId: activity.id ?? null,
      period: activity.period ?? null,
      buildingId: activity.buildingId ?? null,
      formula: 'Water is tracked as a sustainability metric; no GHG factor is applied.',
      excludedFromGhg: true,
      dataQuality: activity.dataQuality ?? 'estimated',
      sourceLabel: 'Water consumption',
    };
  }

  return ZERO_RESULT;
}

export function previewEmissions(category, values, factors) {
  const activity = {
    category,
    dataQuality: values.dataQuality,
    sourceReference: values.sourceReference,
    kwh: values.kwh,
    cubicMeters:
      category === 'water'
        ? waterToCubicMeters(values.waterAmount, values.unit === 'L' ? 'L' : 'kL')
        : values.cubicMeters,
    fuelType: values.fuelType,
    quantity: values.quantity,
    wasteCategory: values.wasteCategory,
    disposal: values.disposal,
    weightKg: values.weightKg,
    mode: values.mode,
    distanceKm: values.distanceKm,
    tripsPerMonth: values.tripsPerMonth,
    commuters: values.commuters,
  };
  return calculateActivityEmissions(activity, factors);
}

export function getActivityScope(activity, factors) {
  return calculateActivityEmissions(activity, factors).scope;
}

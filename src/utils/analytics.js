import {
  COMMUTE_MODES,
  DISPOSAL_METHODS,
  WASTE_CATEGORIES,
  getDisposalMethod,
  getFuelType,
} from '../data/options.js';
import { addMonths, monthLabel, monthsInRange } from './dates.js';
import { calculateActivityEmissions } from './emissions.js';

function emptyScopeMap() {
  return { 1: 0, 2: 0, 3: 0 };
}

function emptyCategoryMap() {
  return { electricity: 0, fuel: 0, waste: 0, commuting: 0, water: 0 };
}

/**
 * Share of months in a summary with at least one record. Used to decide whether
 * a period-on-period comparison is meaningful: a prior period with one month of
 * records must not produce a headline percentage change.
 */
export function periodCoverage(summary) {
  const buckets = summary?.byMonth ?? [];
  if (!buckets.length) return 0;
  return buckets.filter((bucket) => bucket.entryCount > 0).length / buckets.length;
}

/**
 * A comparison is shown only when both periods have records and each has at
 * least `minimum` share of its months covered. Callers keep their own wording
 * for the withheld state.
 */
export function isComparablePeriod(current, previous, minimum = 0.75) {
  if (!previous?.entryCount) return false;
  return periodCoverage(previous) >= minimum && periodCoverage(current) >= minimum;
}

export function filterActivities(activities, from, to) {
  return (activities ?? []).filter(
    (activity) =>
      (!from || activity.period >= from) && (!to || activity.period <= to),
  );
}

/**
 * Aggregates every activity for a period into scopes, categories, buildings and
 * monthly buckets. All values are kgCO₂e unless the key says otherwise.
 */
export function summarizeActivities(activities, factors, from, to) {
  const filtered = filterActivities(activities, from, to);

  const summary = {
    from: from ?? null,
    to: to ?? null,
    entryCount: filtered.length,
    totalKg: 0,
    byScope: emptyScopeMap(),
    scope2: { locationKg: 0, marketKg: 0 },
    byCategory: emptyCategoryMap(),
    byScope1Source: {},
    byScope3Category: {},
    byDataQuality: {},
    metrics: {
      electricityKwh: 0,
      waterM3: 0,
      wasteKg: 0,
      wasteDivertedKg: 0,
      wasteRecycledKg: 0,
      diversionRate: 0,
      recycledRate: 0,
      commutePassengerKm: 0,
      dieselLitres: 0,
      petrolLitres: 0,
      naturalGasScm: 0,
      refrigerantKg: 0,
    },
    byBuilding: {},
    byFuelType: {},
    byCommuteMode: {},
    byWasteDisposal: {},
    byWasteCategory: {},
    byMonth: [],
  };

  let monthKeys = monthsInRange(from, to);
  if (!monthKeys.length) {
    monthKeys = [...new Set(filtered.map((activity) => activity.period))].sort();
  }

  const monthMap = new Map(
    monthKeys.map((period) => [
      period,
      {
        period,
        scope1: 0,
        scope2: 0,
        scope3: 0,
        total: 0,
        electricityKwh: 0,
        waterM3: 0,
        wasteKg: 0,
        wasteDivertedKg: 0,
        entryCount: 0,
      },
    ]),
  );

  filtered.forEach((activity) => {
    const calc = calculateActivityEmissions(activity, factors);
    const { kg, scope } = calc;
    const category = activity.category;

    summary.totalKg += kg;
    if (scope) summary.byScope[scope] += kg;
    summary.byCategory[category] = (summary.byCategory[category] ?? 0) + kg;

    if (scope === 2) {
      summary.scope2.locationKg += kg;
      summary.scope2.marketKg += calc.marketBased?.kg ?? kg;
    }
    if (calc.scope1Source?.id) {
      const entry = summary.byScope1Source[calc.scope1Source.id] ?? {
        id: calc.scope1Source.id,
        label: calc.scope1Source.label,
        kg: 0,
        entryCount: 0,
      };
      entry.kg += kg;
      entry.entryCount += 1;
      summary.byScope1Source[calc.scope1Source.id] = entry;
    }
    if (calc.scope3Category?.id) {
      const entry = summary.byScope3Category[calc.scope3Category.id] ?? {
        id: calc.scope3Category.id,
        label: calc.scope3Category.label,
        kg: 0,
        entryCount: 0,
      };
      entry.kg += kg;
      entry.entryCount += 1;
      summary.byScope3Category[calc.scope3Category.id] = entry;
    }
    const quality = calc.dataQuality ?? 'estimated';
    const qualityEntry = summary.byDataQuality[quality] ?? { kg: 0, entryCount: 0 };
    qualityEntry.kg += kg;
    qualityEntry.entryCount += 1;
    summary.byDataQuality[quality] = qualityEntry;

    let month = monthMap.get(activity.period);
    if (!month) {
      month = {
        period: activity.period,
        scope1: 0,
        scope2: 0,
        scope3: 0,
        total: 0,
        electricityKwh: 0,
        waterM3: 0,
        wasteKg: 0,
        wasteDivertedKg: 0,
        entryCount: 0,
      };
      monthMap.set(activity.period, month);
    }
    month.total += kg;
    month.entryCount += 1;
    if (scope === 1) month.scope1 += kg;
    if (scope === 2) month.scope2 += kg;
    if (scope === 3) month.scope3 += kg;

    if (activity.buildingId) {
      if (!summary.byBuilding[activity.buildingId]) {
        summary.byBuilding[activity.buildingId] = {
          kg: 0,
          electricityKwh: 0,
          waterM3: 0,
          entryCount: 0,
          byScope: emptyScopeMap(),
        };
      }
      const building = summary.byBuilding[activity.buildingId];
      building.kg += kg;
      building.electricityKwh += Number(activity.kwh) || 0;
      building.waterM3 += Number(activity.cubicMeters) || 0;
      building.entryCount += 1;
      if (scope) building.byScope[scope] += kg;
    }

    if (category === 'electricity') {
      const kwh = Number(activity.kwh) || 0;
      summary.metrics.electricityKwh += kwh;
      month.electricityKwh += kwh;
    }

    if (category === 'water') {
      const cubicMeters = Number(activity.cubicMeters) || 0;
      summary.metrics.waterM3 += cubicMeters;
      month.waterM3 += cubicMeters;
    }

    if (category === 'fuel') {
      const fuelId = activity.fuelType;
      const fuel = getFuelType(fuelId);
      if (!summary.byFuelType[fuelId]) {
        summary.byFuelType[fuelId] = { kg: 0, quantity: 0, unit: fuel?.unit ?? '' };
      }
      summary.byFuelType[fuelId].kg += kg;
      summary.byFuelType[fuelId].quantity += Number(activity.quantity) || 0;

      const quantity = Number(activity.quantity) || 0;
      if (fuelId === 'diesel') summary.metrics.dieselLitres += quantity;
      if (fuelId === 'petrol') summary.metrics.petrolLitres += quantity;
      if (fuelId === 'natural-gas') summary.metrics.naturalGasScm += quantity;
      if (fuel?.kind === 'refrigerant') summary.metrics.refrigerantKg += quantity;
    }

    if (category === 'waste') {
      const weightKg = Number(activity.weightKg) || 0;
      const method = getDisposalMethod(activity.disposal);
      summary.metrics.wasteKg += weightKg;
      month.wasteKg += weightKg;
      if (method?.diverted) {
        summary.metrics.wasteDivertedKg += weightKg;
        month.wasteDivertedKg += weightKg;
      }
      if (activity.disposal === 'recycling') {
        summary.metrics.wasteRecycledKg += weightKg;
      }

      if (!summary.byWasteDisposal[activity.disposal]) {
        summary.byWasteDisposal[activity.disposal] = { kg: 0, weightKg: 0 };
      }
      summary.byWasteDisposal[activity.disposal].kg += kg;
      summary.byWasteDisposal[activity.disposal].weightKg += weightKg;

      if (!summary.byWasteCategory[activity.wasteCategory]) {
        summary.byWasteCategory[activity.wasteCategory] = { kg: 0, weightKg: 0 };
      }
      summary.byWasteCategory[activity.wasteCategory].kg += kg;
      summary.byWasteCategory[activity.wasteCategory].weightKg += weightKg;
    }

    if (category === 'commuting') {
      const passengerKm = (Number(activity.distanceKm) || 0) * 2 * (Number(activity.tripsPerMonth) || 0) * (Number(activity.commuters) || 0);
      summary.metrics.commutePassengerKm += passengerKm;
      if (!summary.byCommuteMode[activity.mode]) {
        summary.byCommuteMode[activity.mode] = { kg: 0, passengerKm: 0 };
      }
      summary.byCommuteMode[activity.mode].kg += kg;
      summary.byCommuteMode[activity.mode].passengerKm += passengerKm;
    }
  });

  summary.metrics.diversionRate =
    summary.metrics.wasteKg > 0 ? summary.metrics.wasteDivertedKg / summary.metrics.wasteKg : 0;
  summary.metrics.recycledRate =
    summary.metrics.wasteKg > 0 ? summary.metrics.wasteRecycledKg / summary.metrics.wasteKg : 0;
  summary.byMonth = [...monthMap.values()].sort((a, b) => a.period.localeCompare(b.period));

  return summary;
}

export function scopeShares(summary) {
  const total = summary?.totalKg ?? 0;
  return [1, 2, 3].map((scope) => ({
    scope,
    kg: summary?.byScope?.[scope] ?? 0,
    percent: total > 0 ? ((summary.byScope[scope] ?? 0) / total) * 100 : 0,
  }));
}

export function previousPeriodRange(from, to) {
  const months = monthsInRange(from, to);
  if (!months.length) return null;
  const prevTo = addMonths(from, -1);
  const prevFrom = addMonths(prevTo, -(months.length - 1));
  return { from: prevFrom, to: prevTo };
}

export function percentChange(current, previous) {
  if (!Number.isFinite(previous) || previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

export function rankBuildings(activities, buildings, factors, from, to) {
  const summary = summarizeActivities(activities, factors, from, to);
  return (buildings ?? [])
    .map((building) => {
      const agg = summary.byBuilding[building.id] ?? {
        kg: 0,
        electricityKwh: 0,
        waterM3: 0,
        entryCount: 0,
      };
      const areaSqm = Number(building.areaSqm) || 0;
      const occupants = Number(building.occupants) || 0;
      return {
        ...building,
        areaSqm,
        occupants,
        kg: agg.kg,
        electricityKwh: agg.electricityKwh,
        waterM3: agg.waterM3,
        entryCount: agg.entryCount,
        intensityKgPerSqm: areaSqm > 0 ? agg.kg / areaSqm : null,
        waterPerOccupant: occupants > 0 ? agg.waterM3 / occupants : null,
        share: summary.totalKg > 0 ? (agg.kg / summary.totalKg) * 100 : 0,
      };
    })
    .sort((a, b) => b.kg - a.kg);
}

export function monthlyChartSeries(summary) {
  return (summary?.byMonth ?? []).map((month) => ({
    ...month,
    label: monthLabel(month.period, 'short'),
    scope1T: month.scope1 / 1000,
    scope2T: month.scope2 / 1000,
    scope3T: month.scope3 / 1000,
    totalT: month.total / 1000,
  }));
}

export function categorySeries(summary) {
  return [
    { id: 'electricity', name: 'Electricity', value: summary?.byCategory?.electricity ?? 0 },
    { id: 'fuel', name: 'Fuel', value: summary?.byCategory?.fuel ?? 0 },
    { id: 'waste', name: 'Waste', value: summary?.byCategory?.waste ?? 0 },
    { id: 'commuting', name: 'Commuting', value: summary?.byCategory?.commuting ?? 0 },
  ];
}

export function commuteSeries(summary) {
  return COMMUTE_MODES.map((mode) => {
    const entry = summary?.byCommuteMode?.[mode.id];
    return {
      id: mode.id,
      name: mode.label,
      kg: entry?.kg ?? 0,
      passengerKm: entry?.passengerKm ?? 0,
      share:
        summary?.metrics?.commutePassengerKm > 0
          ? ((entry?.passengerKm ?? 0) / summary.metrics.commutePassengerKm) * 100
          : 0,
    };
  });
}

export function wasteDisposalSeries(summary) {
  return DISPOSAL_METHODS.map((method) => ({
    id: method.id,
    name: method.label,
    weightKg: summary?.byWasteDisposal?.[method.id]?.weightKg ?? 0,
    kg: summary?.byWasteDisposal?.[method.id]?.kg ?? 0,
    diverted: method.diverted,
  }));
}

export function wasteCategorySeries(summary) {
  return WASTE_CATEGORIES.map((category) => ({
    id: category.id,
    name: category.label,
    weightKg: summary?.byWasteCategory?.[category.id]?.weightKg ?? 0,
  })).filter((item) => item.weightKg > 0);
}

export function averageMonthlyKg(summary) {
  const months = summary?.byMonth?.length ?? 0;
  if (!months) return 0;
  return summary.totalKg / months;
}

export function totalOccupants(profile) {
  return (Number(profile?.students) || 0) + (Number(profile?.staff) || 0);
}

export function perCapitaKg(summary, profile) {
  const people = totalOccupants(profile);
  if (!people) return null;
  return summary.totalKg / people;
}

export function annualizedKg(kg, monthsCount) {
  if (!monthsCount) return 0;
  return (kg / monthsCount) * 12;
}

export function totalFloorArea(buildings) {
  return (buildings ?? []).reduce((sum, building) => sum + (Number(building.areaSqm) || 0), 0);
}

/**
 * Area-based intensity uses emissions attributed to buildings (electricity,
 * fuel and waste recorded against a building). Campus-wide commuting has no
 * floor area and is excluded so the denominator and numerator stay consistent.
 */
export function emissionsPerSqm(summary, buildings) {
  const area = totalFloorArea(buildings);
  if (!area) return null;
  const attributedKg = Object.values(summary?.byBuilding ?? {}).reduce(
    (sum, entry) => sum + (entry.kg ?? 0),
    0,
  );
  return attributedKg / area;
}

export function emissionsPerStudentKg(summary, profile) {
  const students = Number(profile?.students) || 0;
  if (!students) return null;
  return (summary?.totalKg ?? 0) / students;
}

export function electricityPerStudentKwh(summary, profile) {
  const students = Number(profile?.students) || 0;
  if (!students) return null;
  return (summary?.metrics?.electricityKwh ?? 0) / students;
}

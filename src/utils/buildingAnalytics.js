import { CHART_COLORS } from '../data/options.js';
import {
  previousPeriodRange,
  percentChange,
  rankBuildings,
  summarizeActivities,
} from './analytics.js';
import { describeActivity } from './activityLabels.js';
import { monthLabel, monthsInRange } from './dates.js';
import { calculateActivityEmissions } from './emissions.js';

function inRange(activity, from, to) {
  return (!from || activity.period >= from) && (!to || activity.period <= to);
}

function emptyTotals() {
  return {
    kg: 0,
    scope1Kg: 0,
    scope2Kg: 0,
    scope3Kg: 0,
    electricityKwh: 0,
    waterM3: 0,
    wasteKg: 0,
    entryCount: 0,
  };
}

function totalsFor(activities, factors) {
  return activities.reduce((totals, activity) => {
    const { kg, scope } = calculateActivityEmissions(activity, factors);
    totals.kg += kg;
    if (scope === 1) totals.scope1Kg += kg;
    if (scope === 2) totals.scope2Kg += kg;
    if (scope === 3) totals.scope3Kg += kg;
    if (activity.category === 'electricity') totals.electricityKwh += Number(activity.kwh) || 0;
    if (activity.category === 'water') totals.waterM3 += Number(activity.cubicMeters) || 0;
    if (activity.category === 'waste') totals.wasteKg += Number(activity.weightKg) || 0;
    totals.entryCount += 1;
    return totals;
  }, emptyTotals());
}

function buildMonthly(activities, factors, from, to) {
  const keys = monthsInRange(from, to);
  const periods = keys.length
    ? keys
    : [...new Set(activities.map((activity) => activity.period))].sort();

  const buckets = new Map(
    periods.map((period) => [
      period,
      {
        period,
        label: monthLabel(period, 'short'),
        kg: 0,
        electricityKwh: 0,
        waterM3: 0,
        wasteKg: 0,
      },
    ]),
  );

  activities.forEach((activity) => {
    const bucket = buckets.get(activity.period);
    if (!bucket) return;
    const { kg } = calculateActivityEmissions(activity, factors);
    bucket.kg += kg;
    if (activity.category === 'electricity') bucket.electricityKwh += Number(activity.kwh) || 0;
    if (activity.category === 'water') bucket.waterM3 += Number(activity.cubicMeters) || 0;
    if (activity.category === 'waste') bucket.wasteKg += Number(activity.weightKg) || 0;
  });

  return [...buckets.values()].map((month) => ({ ...month, tonnes: month.kg / 1000 }));
}

function latestActivity(activities) {
  return [...activities].sort((a, b) => {
    const period = String(b.period).localeCompare(String(a.period));
    if (period !== 0) return period;
    return String(b.date ?? '').localeCompare(String(a.date ?? ''));
  })[0] ?? null;
}

function recordRows(activities, buildings, factors) {
  const buildingMap = Object.fromEntries((buildings ?? []).map((building) => [building.id, building]));
  return [...activities]
    .sort((a, b) => {
      const period = String(b.period).localeCompare(String(a.period));
      if (period !== 0) return period;
      return String(b.date ?? '').localeCompare(String(a.date ?? ''));
    })
    .slice(0, 12)
    .map((activity) => {
      const info = describeActivity(activity, buildingMap);
      const { kg, scope } = calculateActivityEmissions(activity, factors);
      return {
        id: activity.id,
        period: activity.period,
        date: activity.date ?? null,
        category: activity.category,
        title: info.title,
        subtitle: info.subtitle,
        quantity: info.quantity,
        unit: info.unit,
        kg,
        scope,
      };
    });
}

/**
 * Building-level analytics. Only records explicitly linked to the building are
 * included; campus-wide commuting, waste and generator fuel stay separate and
 * are reported at campus level instead of being guessed into a building.
 */
export function buildBuildingReport({ building, buildings = [], activities = [], factors, from, to, departments = [] }) {
  const filtered = activities.filter(
    (activity) => activity.buildingId === building.id && inRange(activity, from, to),
  );
  const totals = totalsFor(filtered, factors);
  const monthly = buildMonthly(filtered, factors, from, to);
  const summary = summarizeActivities(activities, factors, from, to);
  const department = departments.find((item) => item.id === building.departmentId) ?? null;

  const previousRange = previousPeriodRange(from, to);
  const previousActivities = previousRange
    ? activities.filter(
        (activity) =>
          activity.buildingId === building.id &&
          inRange(activity, previousRange.from, previousRange.to),
      )
    : [];
  const previousTotals = totalsFor(previousActivities, factors);

  const ranking = rankBuildings(activities, buildings, factors, from, to);
  const comparison = ranking
    .map((item) => ({
      id: item.id,
      name: item.id === building.id ? `${item.name} (this building)` : item.name,
      value: item.kg / 1000,
      kg: item.kg,
      selected: item.id === building.id,
      color: item.id === building.id ? CHART_COLORS.scope2 : CHART_COLORS.neutral,
    }))
    .sort((a, b) => b.kg - a.kg);

  const areaSqm = Number(building.areaSqm) || 0;
  const occupants = Number(building.occupants) || 0;
  const latest = latestActivity(filtered);
  const departmentRanking = ranking.filter((item) => item.id === building.id)[0] ?? null;

  return {
    building: {
      ...building,
      departmentName: department?.name ?? null,
      description: building.description ?? building.notes ?? '',
    },
    meta: {
      from,
      to,
      months: monthly.length,
      entryCount: filtered.length,
      departmentName: department?.name ?? null,
      lastReading: latest?.period ?? null,
      generatedAt: new Date().toISOString(),
    },
    totals: {
      ...totals,
      tonnes: totals.kg / 1000,
      intensityKgPerSqm: areaSqm > 0 ? totals.kg / areaSqm : null,
      kgPerOccupant: occupants > 0 ? totals.kg / occupants : null,
      waterPerOccupant: occupants > 0 ? totals.waterM3 / occupants : null,
      shareOfCampus: summary.totalKg > 0 ? (totals.kg / summary.totalKg) * 100 : 0,
      campusKg: summary.totalKg,
      rank:
        totals.kg > 0 && departmentRanking
          ? ranking.findIndex((item) => item.id === building.id) + 1
          : null,
      buildingCount: ranking.length,
    },
    previous: {
      from: previousRange?.from ?? null,
      to: previousRange?.to ?? null,
      ...previousTotals,
      tonnes: previousTotals.kg / 1000,
      changePercent: percentChange(totals.kg, previousTotals.kg),
      electricityChangePercent: percentChange(totals.electricityKwh, previousTotals.electricityKwh),
      waterChangePercent: percentChange(totals.waterM3, previousTotals.waterM3),
      wasteChangePercent: percentChange(totals.wasteKg, previousTotals.wasteKg),
    },
    monthly,
    comparison,
    records: recordRows(filtered, buildings, factors),
  };
}

/**
 * Department rollups. The denominator is the full campus footprint, so
 * departments plus the unassigned bucket reconcile to the campus total.
 */
export function buildDepartmentReport({ departments = [], buildings = [], activities = [], factors, from, to }) {
  const filtered = activities.filter((activity) => inRange(activity, from, to));
  const summary = summarizeActivities(activities, factors, from, to);
  const buildingMap = new Map(buildings.map((building) => [building.id, building]));
  const claimed = new Set();

  const rows = departments.map((department) => {
    const departmentBuildings = buildings.filter(
      (building) => building.departmentId === department.id,
    );
    const buildingIds = new Set(departmentBuildings.map((building) => building.id));
    const records = filtered.filter(
      (activity) =>
        (activity.buildingId && buildingIds.has(activity.buildingId)) ||
        (!activity.buildingId && activity.departmentId === department.id),
    );
    records.forEach((activity) => claimed.add(activity.id));
    const totals = totalsFor(records, factors);
    return {
      ...department,
      buildings: departmentBuildings.map((building) => ({
        id: building.id,
        name: building.name,
      })),
      totals: {
        ...totals,
        tonnes: totals.kg / 1000,
        shareOfCampus: summary.totalKg > 0 ? (totals.kg / summary.totalKg) * 100 : 0,
      },
      directRecordCount: records.filter((activity) => !activity.buildingId).length,
      lastReading: latestActivity(records)?.period ?? null,
      hasActivity: totals.entryCount > 0,
    };
  });

  const unassignedBuildings = buildings.filter((building) => !building.departmentId);
  const unassignedRecords = filtered.filter((activity) => {
    if (claimed.has(activity.id)) return false;
    const building = activity.buildingId ? buildingMap.get(activity.buildingId) : null;
    return !building || !building.departmentId;
  });
  const unassigned = {
    buildings: unassignedBuildings.map((building) => ({ id: building.id, name: building.name })),
    directRecordCount: unassignedRecords.filter((activity) => !activity.buildingId).length,
    ...totalsFor(unassignedRecords, factors),
  };

  return {
    meta: {
      from,
      to,
      departmentCount: departments.length,
      buildingCount: buildings.length,
      campusKg: summary.totalKg,
      generatedAt: new Date().toISOString(),
    },
    departments: rows.sort((a, b) => b.totals.kg - a.totals.kg),
    unassigned: {
      ...unassigned,
      tonnes: unassigned.kg / 1000,
      shareOfCampus: summary.totalKg > 0 ? (unassigned.kg / summary.totalKg) * 100 : 0,
    },
  };
}

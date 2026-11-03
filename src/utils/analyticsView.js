import { summarizeSampleRenewable } from '../data/dashboardDemo.js';
import { CATEGORY_META, SCOPE_META } from '../data/options.js';
import {
  averageMonthlyKg,
  categorySeries,
  commuteSeries,
  isComparablePeriod,
  monthlyChartSeries,
  perCapitaKg,
  percentChange,
  previousPeriodRange,
  scopeShares,
  summarizeActivities,
  totalOccupants,
  wasteCategorySeries,
  wasteDisposalSeries,
} from './analytics.js';
import { monthRangeLabel, monthsInRange } from './dates.js';
import { calculateActivityEmissions } from './emissions.js';

/**
 * Analytics view model.
 *
 * The same builder powers the mock analytics endpoints and can be reused for
 * deterministic tests. All numbers are derived from recorded activities through
 * the shared emission engine — nothing here is hardcoded for a page.
 */

export const CAMPUS_WIDE = '__campus';

function emptyScopeMap() {
  return { 1: 0, 2: 0, 3: 0 };
}

export function activityMatchesFilters(activity, filters = {}, { factors, buildingMap } = {}) {
  if (!activity) return false;
  const { buildingId, departmentId, scope, category } = filters;

  if (category && activity.category !== category) return false;

  if (scope) {
    const activityScope = calculateActivityEmissions(activity, factors).scope;
    if (activityScope !== Number(scope)) return false;
  }

  if (buildingId) {
    if (buildingId === CAMPUS_WIDE) {
      if (activity.buildingId) return false;
    } else if (activity.buildingId !== buildingId) {
      return false;
    }
  }

  if (departmentId) {
    const building = activity.buildingId ? buildingMap?.[activity.buildingId] : null;
    if (building) {
      if (building.departmentId !== departmentId) return false;
    } else if (activity.departmentId !== departmentId) {
      return false;
    }
  }

  return true;
}

export function filterActivitiesForAnalytics(activities, filters = {}, context) {
  const { from, to } = filters;
  return (activities ?? []).filter(
    (activity) =>
      (!from || activity.period >= from) &&
      (!to || activity.period <= to) &&
      activityMatchesFilters(activity, filters, context),
  );
}

export function buildYearlySeries(activities, factors) {
  const years = new Map();

  (activities ?? []).forEach((activity) => {
    const year = String(activity.period ?? '').slice(0, 4);
    if (!/^\d{4}$/.test(year)) return;

    const { kg, scope } = calculateActivityEmissions(activity, factors);
    if (!years.has(year)) {
      years.set(year, {
        year,
        label: year,
        scope1: 0,
        scope2: 0,
        scope3: 0,
        total: 0,
        electricityKwh: 0,
        waterM3: 0,
        wasteKg: 0,
        entryCount: 0,
      });
    }

    const row = years.get(year);
    row.entryCount += 1;
    row.total += kg;
    if (scope) row[`scope${scope}`] += kg;
    if (activity.category === 'electricity') row.electricityKwh += Number(activity.kwh) || 0;
    if (activity.category === 'water') row.waterM3 += Number(activity.cubicMeters) || 0;
    if (activity.category === 'waste') row.wasteKg += Number(activity.weightKg) || 0;
  });

  return [...years.values()]
    .sort((a, b) => a.year.localeCompare(b.year))
    .map((row) => ({
      ...row,
      scope1T: row.scope1 / 1000,
      scope2T: row.scope2 / 1000,
      scope3T: row.scope3 / 1000,
      totalT: row.total / 1000,
    }));
}

function buildBuildingRows(activities, buildings, factors, totalKg) {
  const aggregates = new Map();

  activities.forEach((activity) => {
    if (!activity.buildingId) return;
    const { kg, scope } = calculateActivityEmissions(activity, factors);
    if (!aggregates.has(activity.buildingId)) {
      aggregates.set(activity.buildingId, {
        kg: 0,
        electricityKwh: 0,
        waterM3: 0,
        wasteKg: 0,
        entryCount: 0,
        byScope: emptyScopeMap(),
      });
    }
    const row = aggregates.get(activity.buildingId);
    row.kg += kg;
    row.entryCount += 1;
    if (scope) row.byScope[scope] += kg;
    if (activity.category === 'electricity') row.electricityKwh += Number(activity.kwh) || 0;
    if (activity.category === 'water') row.waterM3 += Number(activity.cubicMeters) || 0;
    if (activity.category === 'waste') row.wasteKg += Number(activity.weightKg) || 0;
  });

  return (buildings ?? [])
    .map((building) => {
      const aggregate = aggregates.get(building.id);
      if (!aggregate || !aggregate.entryCount) return null;
      const areaSqm = Number(building.areaSqm) || 0;
      const occupants = Number(building.occupants) || 0;
      return {
        ...building,
        areaSqm,
        occupants,
        kg: aggregate.kg,
        electricityKwh: aggregate.electricityKwh,
        waterM3: aggregate.waterM3,
        wasteKg: aggregate.wasteKg,
        entryCount: aggregate.entryCount,
        byScope: aggregate.byScope,
        intensityKgPerSqm: areaSqm > 0 ? aggregate.kg / areaSqm : null,
        waterPerOccupant: occupants > 0 ? aggregate.waterM3 / occupants : null,
        share: totalKg > 0 ? (aggregate.kg / totalKg) * 100 : 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.kg - a.kg);
}

function buildScopeRows(scopeSummary, previousScopeSummary) {
  return scopeShares(scopeSummary).map((share) => ({
    ...share,
    label: SCOPE_META[share.scope].label,
    name: SCOPE_META[share.scope].name,
    color: SCOPE_META[share.scope].color,
    previousKg: previousScopeSummary?.byScope?.[share.scope] ?? null,
    change:
      previousScopeSummary?.entryCount
        ? percentChange(share.kg, previousScopeSummary.byScope?.[share.scope] ?? 0)
        : null,
  }));
}

function buildFilterLabels(filters, buildings, departments) {
  const labels = [];
  if (filters.buildingId) {
    labels.push(
      filters.buildingId === CAMPUS_WIDE
        ? 'Campus-wide records'
        : buildings.find((building) => building.id === filters.buildingId)?.name ?? 'Building',
    );
  }
  if (filters.departmentId) {
    labels.push(
      departments.find((department) => department.id === filters.departmentId)?.name ?? 'Department',
    );
  }
  if (filters.scope) {
    labels.push(SCOPE_META[Number(filters.scope)]?.label ?? `Scope ${filters.scope}`);
  }
  if (filters.category) {
    labels.push(CATEGORY_META[filters.category]?.label ?? filters.category);
  }
  return labels;
}

function buildPeak(monthly) {
  const withData = monthly.filter((month) => month.total > 0);
  return withData.reduce(
    (top, month) => (!top || month.total > top.total ? month : top),
    null,
  );
}

function buildLowest(monthly) {
  const withData = monthly.filter((month) => month.total > 0);
  return withData.reduce(
    (low, month) => (!low || month.total < low.total ? month : low),
    null,
  );
}

export function buildAnalyticsView({
  activities = [],
  buildings = [],
  departments = [],
  profile = {},
  factors,
  filters = {},
}) {
  const from = filters.from ?? null;
  const to = filters.to ?? null;
  const dimensionFilters = {
    buildingId: filters.buildingId ?? '',
    departmentId: filters.departmentId ?? '',
    scope: filters.scope ?? '',
    category: filters.category ?? '',
  };

  const buildingMap = Object.fromEntries((buildings ?? []).map((building) => [building.id, building]));
  const context = { factors, buildingMap };

  let months = monthsInRange(from, to);
  if (!months.length) {
    months = [...new Set((activities ?? []).map((activity) => activity.period))].sort();
  }

  const filtered = filterActivitiesForAnalytics(activities, { ...dimensionFilters, from, to }, context);
  const summary = summarizeActivities(filtered, factors, from, to);

  // Scope comparison deliberately ignores the scope filter so the three scopes
  // remain comparable; every other panel respects it.
  const scopeFiltered = filterActivitiesForAnalytics(
    activities,
    { ...dimensionFilters, scope: '', from, to },
    context,
  );
  const scopeSummary = summarizeActivities(scopeFiltered, factors, from, to);

  const previousRange = previousPeriodRange(from, to);
  const previousSummary = previousRange
    ? summarizeActivities(
        filterActivitiesForAnalytics(
          activities,
          { ...dimensionFilters, from: previousRange.from, to: previousRange.to },
          context,
        ),
        factors,
        previousRange.from,
        previousRange.to,
      )
    : null;
  const previousScopeSummary = previousRange
    ? summarizeActivities(
        filterActivitiesForAnalytics(
          activities,
          { ...dimensionFilters, scope: '', from: previousRange.from, to: previousRange.to },
          context,
        ),
        factors,
        previousRange.from,
        previousRange.to,
      )
    : null;

  const monthly = monthlyChartSeries(summary);
  const yearly = buildYearlySeries(
    filterActivitiesForAnalytics(activities, dimensionFilters, context),
    factors,
  );
  const buildingRows = buildBuildingRows(filtered, buildings, factors, summary.totalKg);
  const attributedKg = buildingRows.reduce((sum, building) => sum + building.kg, 0);
  const unattributedKg = Math.max(0, summary.totalKg - attributedKg);

  const renewable = summarizeSampleRenewable(months);
  const hasElectricity = summary.metrics.electricityKwh > 0;
  const renewableKwh = hasElectricity ? renewable.totalKwh : 0;
  const combinedKwh = summary.metrics.electricityKwh + renewableKwh;
  const renewableShare = combinedKwh > 0 ? (renewableKwh / combinedKwh) * 100 : null;

  const people = totalOccupants(profile);
  const peak = buildPeak(monthly);
  const lowest = buildLowest(monthly);
  // Withhold period-on-period figures unless both periods have broadly complete
  // monthly coverage; a single month of prior records would otherwise read as a
  // four-digit percentage change.
  const comparable = isComparablePeriod(summary, previousSummary);
  const comparableScope = isComparablePeriod(scopeSummary, previousScopeSummary);
  const previousKg = comparable ? previousSummary.totalKg : null;

  return {
    filters: { ...dimensionFilters, from, to },
    meta: {
      from,
      to,
      periodLabel: monthRangeLabel(from, to),
      monthCount: months.length,
      months,
      filterLabels: buildFilterLabels(dimensionFilters, buildings, departments),
      isDimensionFiltered: Boolean(
        dimensionFilters.buildingId ||
          dimensionFilters.departmentId ||
          dimensionFilters.scope ||
          dimensionFilters.category,
      ),
      scopeActive: Boolean(dimensionFilters.scope),
      previousLabel: previousRange ? monthRangeLabel(previousRange.from, previousRange.to) : null,
    },
    totals: {
      kg: summary.totalKg,
      entryCount: summary.entryCount,
      averageKg: averageMonthlyKg(summary),
      perCapitaKg: perCapitaKg(summary, profile),
      people,
      previousKg,
      comparable,
      change: comparable ? percentChange(summary.totalKg, previousSummary.totalKg) : null,
      peak: peak
        ? { period: peak.period, label: peak.label, kg: peak.total }
        : null,
      lowest: lowest
        ? { period: lowest.period, label: lowest.label, kg: lowest.total }
        : null,
      monthCount: months.length,
      coveredMonths: summary.byMonth.filter((month) => (month.entryCount ?? 0) > 0).length,
      unattributedKg,
      unattributedShare: summary.totalKg > 0 ? (unattributedKg / summary.totalKg) * 100 : 0,
    },
    scopes: buildScopeRows(scopeSummary, comparableScope ? previousScopeSummary : null),
    categories: categorySeries(summary),
    monthly,
    yearly,
    resources: {
      totals: {
        electricityKwh: summary.metrics.electricityKwh,
        waterM3: summary.metrics.waterM3,
        wasteKg: summary.metrics.wasteKg,
        wasteDivertedKg: summary.metrics.wasteDivertedKg,
        diversionRate: summary.metrics.diversionRate,
        commutePassengerKm: summary.metrics.commutePassengerKm,
      },
      changes: {
        electricity: comparable
          ? percentChange(summary.metrics.electricityKwh, previousSummary.metrics.electricityKwh)
          : null,
        water: comparable
          ? percentChange(summary.metrics.waterM3, previousSummary.metrics.waterM3)
          : null,
        waste: comparable
          ? percentChange(summary.metrics.wasteKg, previousSummary.metrics.wasteKg)
          : null,
      },
    },
    renewable: {
      available: hasElectricity,
      kwh: renewableKwh,
      sampleTotalKwh: renewable.totalKwh,
      share: renewableShare,
      source: renewable.source,
      monthly: renewable.byMonth,
    },
    buildings: buildingRows,
    breakdowns: {
      waste: wasteDisposalSeries(summary),
      wasteCategories: wasteCategorySeries(summary),
      commute: commuteSeries(summary),
      activeTravelShare:
        summary.metrics.commutePassengerKm > 0
          ? ((summary.byCommuteMode?.['walk-cycle']?.passengerKm ?? 0) /
              summary.metrics.commutePassengerKm) *
            100
          : 0,
    },
  };
}

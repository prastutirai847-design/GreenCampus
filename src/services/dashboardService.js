import {
  CATEGORY_META,
  CATEGORY_ORDER,
  SCOPE_META,
  WASTE_CATEGORIES,
  getCategoryLabel,
} from '../data/options.js';
import { summarizeSampleRenewable } from '../data/dashboardDemo.js';
import {
  emissionsPerSqm,
  emissionsPerStudentKg,
  electricityPerStudentKwh,
  filterActivities,
  isComparablePeriod,
  monthlyChartSeries,
  percentChange,
  previousPeriodRange,
  rankBuildings,
  scopeShares,
  summarizeActivities,
  totalFloorArea,
} from '../utils/analytics.js';
import { monthLabel, monthRangeLabel, monthsInRange } from '../utils/dates.js';
import { DATA_QUALITY_ORDER } from '../data/ghgProtocol.js';
import {
  formatNumber,
  formatPercent,
  formatSignedPercent,
  formatTonnes,
  formatWeight,
} from '../utils/format.js';
import { apiRequest, mockRequest, USE_MOCK_API } from './client.js';

/**
 * Dashboard endpoints.
 *
 * Mock mode derives every payload from the active workspace through the shared
 * analytics helpers, so screens update as soon as records change. Real mode
 * calls the matching FastAPI route; the payload shapes are intended to be the
 * same, so DashboardPage does not need to change when the backend arrives.
 */
export const DASHBOARD_ENDPOINTS = {
  overview: '/dashboard/overview',
  emissions: '/dashboard/emissions',
  consumption: '/dashboard/consumption',
  trends: '/dashboard/trends',
};

const EMISSION_CATEGORIES = ['electricity', 'fuel', 'waste', 'commuting'];
const SEVERITY_ORDER = { high: 0, medium: 1, info: 2, positive: 3 };

function periodQuery(from, to) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  return query ? `?${query}` : '';
}

function resolveMonths(activities, from, to) {
  const months = monthsInRange(from, to);
  if (months.length) return months;
  return [
    ...new Set(
      (activities ?? [])
        .filter((activity) => (!from || activity.period >= from) && (!to || activity.period <= to))
        .map((activity) => activity.period),
    ),
  ].sort();
}

function trendTone(change, { upIsGood = false } = {}) {
  if (change === null || change === undefined) return 'neutral';
  if (Math.abs(change) < 1) return 'neutral';
  const improving = upIsGood ? change > 0 : change < 0;
  return improving ? 'positive' : 'warning';
}

function buildScopePayload(summary, previous) {
  return scopeShares(summary).map((share) => ({
    scope: share.scope,
    label: SCOPE_META[share.scope].label,
    name: SCOPE_META[share.scope].name,
    kg: share.kg,
    percent: share.percent,
    change: previous?.entryCount
      ? percentChange(share.kg, previous.byScope?.[share.scope] ?? 0)
      : null,
  }));
}

function buildCategoryPayload(summary) {
  return EMISSION_CATEGORIES.map((category) => ({
    id: category,
    label: CATEGORY_META[category].label,
    kg: summary.byCategory?.[category] ?? 0,
    share:
      summary.totalKg > 0
        ? ((summary.byCategory?.[category] ?? 0) / summary.totalKg) * 100
        : 0,
  })).sort((a, b) => b.kg - a.kg);
}

function buildBuildingRows(ranking, previousRanking) {
  const previousById = new Map((previousRanking ?? []).map((building) => [building.id, building]));
  return ranking.map((building) => {
    const earlier = previousById.get(building.id);
    return {
      id: building.id,
      name: building.name,
      type: building.type,
      areaSqm: building.areaSqm,
      occupants: building.occupants,
      kg: building.kg,
      share: building.share,
      electricityKwh: building.electricityKwh,
      waterM3: building.waterM3,
      intensityKgPerSqm: building.intensityKgPerSqm,
      change: earlier ? percentChange(building.kg, earlier.kg) : null,
    };
  });
}

function buildWasteMonthly(activities, months) {
  const totals = new Map(months.map((period) => [period, 0]));
  activities.forEach((activity) => {
    if (activity.category !== 'waste') return;
    totals.set(activity.period, (totals.get(activity.period) ?? 0) + (Number(activity.weightKg) || 0));
  });
  return months.map((period) => ({
    period,
    label: monthLabel(period, 'short'),
    value: totals.get(period) ?? 0,
  }));
}

function buildPerformance({ summary, previous, coverage, categoriesLatest, latestMonth, months }) {
  const totalChange = previous?.entryCount
    ? percentChange(summary.totalKg, previous.totalKg)
    : null;
  const electricityChange = previous?.entryCount
    ? percentChange(summary.metrics.electricityKwh, previous.metrics.electricityKwh)
    : null;
  const wasteKg = summary.metrics.wasteKg;
  const diversionRate = summary.metrics.diversionRate;
  const leader = buildCategoryPayload(summary)[0];
  const latestLabel = latestMonth ? monthLabel(latestMonth, 'short') : '—';

  const items = [
    {
      id: 'footprint',
      label: 'Estimated footprint',
      value: formatTonnes(summary.totalKg, { digits: 0 }),
      tone: trendTone(totalChange),
      detail:
        totalChange === null
          ? 'No prior-period baseline'
          : `${formatSignedPercent(totalChange, { digits: 1 })} vs prior period`,
    },
    {
      id: 'electricity',
      label: 'Purchased electricity',
      value: `${formatNumber(summary.metrics.electricityKwh)} kWh`,
      tone: trendTone(electricityChange),
      detail:
        electricityChange === null
          ? 'No prior-period baseline'
          : `${formatSignedPercent(electricityChange, { digits: 1 })} vs prior period`,
    },
    {
      id: 'diversion',
      label: 'Waste diversion',
      value: formatPercent(diversionRate, { digits: 0 }),
      tone: wasteKg > 0 ? 'neutral' : 'warning',
      detail:
        wasteKg > 0
          ? `${formatWeight(summary.metrics.wasteDivertedKg)} of ${formatWeight(wasteKg)} recycled or composted`
          : 'No waste records in this period',
    },
    {
      id: 'coverage',
      label: 'Reporting coverage',
      value: `${coverage.coveredMonths} / ${months.length} months`,
      tone:
        months.length > 0 && coverage.coveredMonths === months.length ? 'positive' : 'warning',
      detail: `${categoriesLatest} of ${CATEGORY_ORDER.length} categories recorded in ${latestLabel}`,
    },
  ];

  const changeSentence =
    totalChange === null
      ? 'There is no comparable prior period, so trend comparisons are not available yet.'
      : `Estimated emissions are ${formatNumber(Math.abs(totalChange), { digits: 1 })}% ${
          totalChange <= 0 ? 'lower' : 'higher'
        } than the previous period.`;
  const leaderSentence = leader
    ? `${leader.label} is the largest source at ${formatPercent(leader.share, {
        digits: 0,
        alreadyPercent: true,
      })} of the footprint.`
    : '';
  const diversionSentence =
    wasteKg > 0
      ? `${formatPercent(diversionRate, { digits: 0 })} of recorded waste was diverted from landfill.`
      : 'No waste records were logged for this period.';

  return {
    narrative: [changeSentence, leaderSentence, diversionSentence].filter(Boolean).join(' '),
    items,
  };
}

function buildAlerts({ summary, previous, coverage, categoriesLatest, months, latestMonth, scopePayload, renewablePercent, renewablePointChange }) {  const alerts = [];
  const wasteKg = summary.metrics.wasteKg;
  const totalChange = previous?.entryCount
    ? percentChange(summary.totalKg, previous.totalKg)
    : null;

  if (coverage.missingMonths > 0 && months.length > 0) {
    alerts.push({
      id: 'coverage-gap',
      severity: coverage.missingMonths > 1 ? 'medium' : 'info',
      title: `${coverage.missingMonths} month${coverage.missingMonths === 1 ? '' : 's'} without records`,
      message: `Add at least one activity in each month to keep trend comparisons consistent across ${monthRangeLabel(
        months[0],
        months[months.length - 1],
      )}.`,
      link: { label: 'Review consumption', to: '/data-entry' },
    });
  }

  if (latestMonth) {
    const missing = CATEGORY_ORDER.filter((category) => !categoriesLatest.includes(category));
    if (missing.length) {
      alerts.push({
        id: 'latest-month-gap',
        severity: 'info',
        title: `${monthLabel(latestMonth)} is incomplete`,
        message: `No ${missing.map((category) => getCategoryLabel(category).toLowerCase()).join(', ')} recorded for the latest month.`,
        link: { label: 'Add missing data', to: '/data-entry' },
      });
    }
  }

  if (wasteKg > 0) {
    const landfill = summary.byWasteDisposal?.landfill?.weightKg ?? 0;
    const landfillShare = (landfill / wasteKg) * 100;
    if (landfillShare >= 50) {
      alerts.push({
        id: 'landfill-share',
        severity: 'medium',
        title: `${formatPercent(landfillShare, { digits: 0, alreadyPercent: true })} of waste went to landfill`,
        message: `${formatWeight(landfill)} of ${formatWeight(
          wasteKg,
        )} recorded waste was landfilled. Recycling and composting can reduce Scope 3 emissions.`,
        link: { label: 'See diversion options', to: '/recommendations' },
      });
    }
  }

  if (totalChange !== null && Math.abs(totalChange) >= 3) {
    alerts.push({
      id: 'emissions-trend',
      severity: totalChange < 0 ? 'positive' : 'medium',
      title: `Estimated emissions ${totalChange < 0 ? 'down' : 'up'} ${formatNumber(
        Math.abs(totalChange),
        { digits: 1 },
      )}%`,
      message:
        totalChange < 0
          ? 'The footprint is lower than the previous period. Confirm the change is driven by reduced activity rather than missing data.'
          : 'The footprint is higher than the previous period. Check the largest categories before attributing the increase to growth.',
      link: { label: 'Open analytics', to: '/analytics' },
    });
  }

  const scope2 = scopePayload.find((scope) => scope.scope === 2);
  if (scope2 && scope2.percent >= 60) {
    alerts.push({
      id: 'scope2-dominance',
      severity: 'info',
      title: `Grid electricity is ${formatPercent(scope2.percent, {
        digits: 0,
        alreadyPercent: true,
      })} of the footprint`,
      message:
        'Scope 2 dominates the inventory. Efficiency measures and on-site generation have the largest leverage on total emissions.',
      link: { label: 'View recommendations', to: '/recommendations' },
    });
  }

  if (renewablePercent !== null && renewablePercent < 15 && summary.metrics.electricityKwh > 0) {
    alerts.push({
      id: 'renewable-share',
      severity: 'info',
      title: `On-site renewable share is ${formatPercent(renewablePercent, {
        digits: 0,
        alreadyPercent: true,
      })}`,
      message:
        renewablePointChange !== null
          ? `That is ${formatSignedPercent(renewablePointChange, {
              digits: 1,
            })} percentage points versus the prior period. Generation values are sample data.`
          : 'Generation values are sample data in this prototype.',
      link: { label: 'Review energy options', to: '/recommendations' },
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: 'all-clear',
      severity: 'positive',
      title: 'No data-quality issues detected',
      message:
        'Every month in this period has records and all five categories are present in the latest month.',
    });
  } else if (
    coverage.coveredMonths === months.length &&
    months.length > 0 &&
    latestMonth &&
    categoriesLatest.length === CATEGORY_ORDER.length
  ) {
    alerts.push({
      id: 'coverage-complete',
      severity: 'positive',
      title: 'Inventory coverage is complete',
      message: `All ${months.length} months have records and all five categories are logged for ${monthLabel(
        latestMonth,
        'short',
      )}.`,
    });
  }

  return alerts
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
    .slice(0, 3);
}

/**
 * Builds the 12 headline GHG and resource metrics requested for the dashboard.
 * A previous value is only included when the prior period actually contains
 * records, so the UI never invents a comparison.
 */
function buildGhgMetrics({
  summary,
  previous,
  hasPrevious,
  buildings,
  profile,
  renewableKwh,
  renewablePercent,
  previousRenewablePercent,
}) {
  const prior = hasPrevious ? previous : null;
  const metric = (value, previousValue) => ({
    value: value ?? null,
    previous: prior && previousValue !== undefined ? previousValue : null,
    change: prior && previousValue !== undefined ? percentChange(value, previousValue) : null,
  });
  const pointChange = (current, earlier) =>
    prior && current !== null && earlier !== null && earlier !== undefined
      ? current - earlier
      : null;

  const students = Number(profile?.students) || 0;
  const area = totalFloorArea(buildings);
  const attributedKg = Object.values(summary.byBuilding ?? {}).reduce(
    (sum, entry) => sum + (entry.kg ?? 0),
    0,
  );
  const previousAttributedKg = prior
    ? Object.values(previous.byBuilding ?? {}).reduce((sum, entry) => sum + (entry.kg ?? 0), 0)
    : 0;
  const intensityKgPerSqm = area > 0 ? attributedKg / area : null;
  const previousIntensityKgPerSqm = area > 0 && prior ? previousAttributedKg / area : null;
  const perStudentTco2e = students > 0 ? summary.totalKg / 1000 / students : null;
  const previousPerStudentTco2e =
    students > 0 && prior ? previous.totalKg / 1000 / students : null;
  const kwhPerStudent = students > 0 ? summary.metrics.electricityKwh / students : null;
  const previousKwhPerStudent =
    students > 0 && prior ? previous.metrics.electricityKwh / students : null;

  const wasteTonnes = summary.metrics.wasteKg / 1000;
  const previousWasteTonnes = prior ? previous.metrics.wasteKg / 1000 : 0;
  const recycledPercent = summary.metrics.recycledRate * 100;
  const previousRecycledPercent = prior ? previous.metrics.recycledRate * 100 : 0;
  const liquidLitres = summary.metrics.dieselLitres + summary.metrics.petrolLitres;
  const previousLiquidLitres = prior
    ? previous.metrics.dieselLitres + previous.metrics.petrolLitres
    : 0;

  return {
    total: {
      ...metric(summary.totalKg / 1000, prior ? previous.totalKg / 1000 : undefined),
      kg: summary.totalKg,
      unit: 'tCO₂e',
    },
    scope1: {
      ...metric(
        summary.byScope[1] / 1000,
        prior ? previous.byScope[1] / 1000 : undefined,
      ),
      kg: summary.byScope[1],
      unit: 'tCO₂e',
    },
    scope2: {
      ...metric(
        summary.byScope[2] / 1000,
        prior ? previous.byScope[2] / 1000 : undefined,
      ),
      kg: summary.byScope[2],
      locationKg: summary.scope2.locationKg,
      marketKg: summary.scope2.marketKg,
      locationTco2e: summary.scope2.locationKg / 1000,
      marketTco2e: summary.scope2.marketKg / 1000,
      marketFactorVerified: false,
      unit: 'tCO₂e',
    },
    scope3: {
      ...metric(
        summary.byScope[3] / 1000,
        prior ? previous.byScope[3] / 1000 : undefined,
      ),
      kg: summary.byScope[3],
      unit: 'tCO₂e',
    },
    electricity: {
      ...metric(summary.metrics.electricityKwh, prior ? previous.metrics.electricityKwh : undefined),
      mwh: summary.metrics.electricityKwh / 1000,
      unit: 'kWh',
    },
    renewable: {
      kwh: renewableKwh,
      percent: renewablePercent,
      previousPercent: prior ? previousRenewablePercent : null,
      pointChange: pointChange(renewablePercent, previousRenewablePercent),
      isSample: true,
      unit: '%',
    },
    liquidFuel: {
      ...metric(liquidLitres, prior ? previousLiquidLitres : undefined),
      dieselLitres: summary.metrics.dieselLitres,
      petrolLitres: summary.metrics.petrolLitres,
      naturalGasScm: summary.metrics.naturalGasScm,
      refrigerantKg: summary.metrics.refrigerantKg,
      unit: 'L',
    },
    water: {
      ...metric(summary.metrics.waterM3, prior ? previous.metrics.waterM3 : undefined),
      unit: 'kL',
    },
    waste: {
      ...metric(wasteTonnes, prior ? previousWasteTonnes : undefined),
      kg: summary.metrics.wasteKg,
      recycledKg: summary.metrics.wasteRecycledKg,
      recycledPercent,
      previousRecycledPercent: prior ? previousRecycledPercent : null,
      recycledPointChange: pointChange(recycledPercent, previousRecycledPercent),
      divertedKg: summary.metrics.wasteDivertedKg,
      diversionRate: summary.metrics.diversionRate * 100,
      unit: 't',
    },
    intensity: {
      tco2ePerStudent: perStudentTco2e,
      previousTco2ePerStudent: previousPerStudentTco2e,
      studentChange:
        perStudentTco2e !== null ? percentChange(perStudentTco2e, previousPerStudentTco2e) : null,
      kgPerSqm: intensityKgPerSqm,
      previousKgPerSqm: previousIntensityKgPerSqm,
      areaChange:
        intensityKgPerSqm !== null
          ? percentChange(intensityKgPerSqm, previousIntensityKgPerSqm)
          : null,
      kwhPerStudent,
      previousKwhPerStudent,
      kwhChange: kwhPerStudent !== null ? percentChange(kwhPerStudent, previousKwhPerStudent) : null,
      students,
      floorAreaSqm: area,
      attributedKg,
    },
  };
}

function buildDataQuality(summary) {
  const totalKg = summary.totalKg;
  return {
    totalKg,
    byQuality: DATA_QUALITY_ORDER.map((id) => {
      const entry = summary.byDataQuality?.[id] ?? { kg: 0, entryCount: 0 };
      return {
        id,
        kg: entry.kg,
        entryCount: entry.entryCount,
        share: totalKg > 0 ? (entry.kg / totalKg) * 100 : 0,
      };
    }),
    missingEntries: summary.byDataQuality?.missing?.entryCount ?? 0,
    measuredShare:
      totalKg > 0 ? ((summary.byDataQuality?.measured?.kg ?? 0) / totalKg) * 100 : null,
  };
}

/**
 * Computes the full dashboard model once from the workspace snapshot.
 */
export function buildDashboardSnapshot({
  activities = [],
  buildings = [],
  profile = {},
  factors,
  from,
  to,
}) {
  const months = resolveMonths(activities, from, to);
  const summary = summarizeActivities(activities, factors, from, to);
  const previousRange = previousPeriodRange(from, to);
  const previous = previousRange
    ? summarizeActivities(activities, factors, previousRange.from, previousRange.to)
    : null;

  // Period-on-period change is only meaningful when both periods have broadly
  // complete monthly coverage. The demonstration dataset holds one month in the
  // prior year; comparing against it would report a 1,000% "increase" that is
  // really missing data, so the comparison is withheld instead.
  const comparable = isComparablePeriod(summary, previous);
  const previousForComparison = comparable ? previous : null;
  const hasPrevious = Boolean(previousForComparison);

  const ranking = rankBuildings(activities, buildings, factors, from, to);
  const previousRanking =
    comparable && previousRange
      ? rankBuildings(activities, buildings, factors, previousRange.from, previousRange.to)
      : [];
  const buildingRows = buildBuildingRows(ranking, previousRanking);

  const filtered = filterActivities(activities, from, to);
  const coveredPeriods = new Set(filtered.map((activity) => activity.period));
  const coveredMonths = months.filter((period) => coveredPeriods.has(period));
  const latestMonth = months[months.length - 1] ?? null;
  const latestCategories = latestMonth
    ? CATEGORY_ORDER.filter((category) =>
        filtered.some((activity) => activity.period === latestMonth && activity.category === category),
      )
    : [];

  const renewable = summarizeSampleRenewable(months);
  const previousRenewable = previousRange
    ? summarizeSampleRenewable(monthsInRange(previousRange.from, previousRange.to))
    : null;
  const gridKwh = summary.metrics.electricityKwh;
  const renewableKwh = gridKwh > 0 ? renewable.totalKwh : 0;
  const totalEnergyKwh = gridKwh + renewableKwh;
  const renewablePercent = totalEnergyKwh > 0 ? (renewableKwh / totalEnergyKwh) * 100 : null;
  const previousGridKwh = hasPrevious ? previous.metrics.electricityKwh : 0;
  const previousRenewableKwh = hasPrevious ? previousRenewable?.totalKwh ?? 0 : 0;
  const previousRenewablePercent =
    previousGridKwh + previousRenewableKwh > 0
      ? (previousRenewableKwh / (previousGridKwh + previousRenewableKwh)) * 100
      : null;
  const renewablePointChange =
    renewablePercent !== null && previousRenewablePercent !== null
      ? renewablePercent - previousRenewablePercent
      : null;

  const scopePayload = buildScopePayload(summary, previousForComparison);
  const categoryPayload = buildCategoryPayload(summary);
  const ghg = buildGhgMetrics({
    summary,
    previous: previousForComparison,
    hasPrevious,
    buildings,
    profile,
    renewableKwh,
    renewablePercent,
    previousRenewablePercent,
  });
  const dataQuality = buildDataQuality(summary);
  const scope1Sources = Object.values(summary.byScope1Source ?? {}).sort((a, b) => b.kg - a.kg);
  const scope3Categories = Object.values(summary.byScope3Category ?? {}).sort(
    (a, b) => a.id - b.id,
  );
  const monthsCovered = coveredMonths.length;
  const coverage = {
    coveredMonths: monthsCovered,
    totalMonths: months.length,
    missingMonths: Math.max(0, months.length - monthsCovered),
    percent: months.length > 0 ? (monthsCovered / months.length) * 100 : 0,
  };
  const performance = buildPerformance({
    summary,
    previous: previousForComparison,
    coverage,
    categoriesLatest: latestCategories.length,
    latestMonth,
    months,
  });
  const alerts = buildAlerts({
    summary,
    previous: previousForComparison,
    coverage,
    categoriesLatest: latestCategories,
    months,
    latestMonth,
    scopePayload,
    renewablePercent,
    renewablePointChange,
  });

  const wasteKg = summary.metrics.wasteKg;
  const wasteCategories = WASTE_CATEGORIES.map((category) => {
    const entry = summary.byWasteCategory?.[category.id] ?? { weightKg: 0, kg: 0 };
    return {
      id: category.id,
      name: category.label,
      weightKg: entry.weightKg,
      kg: entry.kg,
      percent: wasteKg > 0 ? (entry.weightKg / wasteKg) * 100 : 0,
    };
  })
    .filter((category) => category.weightKg > 0)
    .sort((a, b) => b.weightKg - a.weightKg);

  const overview = {
    meta: {
      college: profile?.name ?? 'the campus',
      from: from ?? null,
      to: to ?? null,
      periodLabel: monthRangeLabel(from, to),
      monthCount: months.length,
      entryCount: summary.entryCount,
      buildingCount: buildings.length,
      generatedAt: new Date().toISOString(),
      renewableIsSample: true,
    },
    kpis: {
      total: {
        value: summary.totalKg,
        previous: previousForComparison?.totalKg ?? null,
        change: hasPrevious
          ? percentChange(summary.totalKg, previousForComparison.totalKg)
          : null,
      },
      electricity: {
        value: summary.metrics.electricityKwh,
        previous: previousForComparison?.metrics.electricityKwh ?? null,
        change: hasPrevious
          ? percentChange(
              summary.metrics.electricityKwh,
              previousForComparison.metrics.electricityKwh,
            )
          : null,
      },
      water: {
        value: summary.metrics.waterM3,
        previous: previousForComparison?.metrics.waterM3 ?? null,
        change: hasPrevious
          ? percentChange(summary.metrics.waterM3, previousForComparison.metrics.waterM3)
          : null,
      },
      waste: {
        value: summary.metrics.wasteKg,
        previous: previousForComparison?.metrics.wasteKg ?? null,
        change: hasPrevious
          ? percentChange(summary.metrics.wasteKg, previousForComparison.metrics.wasteKg)
          : null,
      },
      renewable: {
        kwh: renewableKwh,
        percent: renewablePercent,
        previousPercent: previousRenewablePercent,
        pointChange: renewablePointChange,
        source: renewable.source,
      },
    },
    scopes: scopePayload,
    categories: categoryPayload,
    ghg,
    dataQuality,
    scope1Sources,
    scope3Categories,
    scope2Methods: {
      locationKg: summary.scope2.locationKg,
      marketKg: summary.scope2.marketKg,
      marketFactorVerified: false,
    },
    buildings: buildingRows,
    topBuildings: buildingRows.filter((building) => building.kg > 0).slice(0, 5),
    performance,
    coverage,
    alerts,
  };

  const emissions = {
    totalKg: summary.totalKg,
    scopes: scopePayload,
    categories: categoryPayload,
    scope2: {
      locationKg: summary.scope2.locationKg,
      marketKg: summary.scope2.marketKg,
      marketFactorVerified: false,
    },
    scope1Sources,
    scope3Categories,
    dataQuality,
    monthly: monthlyChartSeries(summary),
  };

  const consumption = {
    electricity: {
      totalKwh: gridKwh,
      monthly: summary.byMonth.map((month) => ({
        period: month.period,
        label: monthLabel(month.period, 'short'),
        value: month.electricityKwh,
      })),
      byBuilding: buildingRows
        .filter((building) => building.electricityKwh > 0)
        .map((building) => ({
          id: building.id,
          name: building.name,
          kwh: building.electricityKwh,
          share: gridKwh > 0 ? (building.electricityKwh / gridKwh) * 100 : 0,
        })),
      renewable: {
        kwh: renewableKwh,
        percent: renewablePercent,
        previousPercent: previousRenewablePercent,
        pointChange: renewablePointChange,
        source: renewable.source,
        monthly: renewable.byMonth,
      },
    },
    water: {
      totalM3: summary.metrics.waterM3,
      monthly: summary.byMonth.map((month) => ({
        period: month.period,
        label: monthLabel(month.period, 'short'),
        value: month.waterM3,
      })),
      byBuilding: buildingRows
        .filter((building) => building.waterM3 > 0)
        .map((building) => ({
          id: building.id,
          name: building.name,
          cubicMeters: building.waterM3,
          share:
            summary.metrics.waterM3 > 0
              ? (building.waterM3 / summary.metrics.waterM3) * 100
              : 0,
        })),
    },
    waste: {
      totalKg: wasteKg,
      divertedKg: summary.metrics.wasteDivertedKg,
      diversionRate: summary.metrics.diversionRate,
      categories: wasteCategories,
      disposal: Object.entries(summary.byWasteDisposal ?? {}).map(([id, entry]) => ({
        id,
        ...entry,
      })),
    },
    fuel: {
      totalKg: summary.byCategory?.fuel ?? 0,
      byType: Object.entries(summary.byFuelType ?? {}).map(([id, entry]) => ({
        id,
        ...entry,
      })),
    },
    commuting: {
      totalKg: summary.byCategory?.commuting ?? 0,
      passengerKm: summary.metrics.commutePassengerKm,
    },
  };

  const trends = {
    emissions: monthlyChartSeries(summary),
    electricity: summary.byMonth.map((month) => ({
      period: month.period,
      label: monthLabel(month.period, 'short'),
      value: month.electricityKwh,
    })),
    water: summary.byMonth.map((month) => ({
      period: month.period,
      label: monthLabel(month.period, 'short'),
      value: month.waterM3,
    })),
    waste: buildWasteMonthly(filtered, months),
    renewable: renewable.byMonth.map((month) => ({
      period: month.period,
      label: month.label,
      value: month.kwh,
    })),
  };

  return { overview, emissions, consumption, trends };
}

export async function getDashboardOverview({ from, to, ...context }) {
  if (!USE_MOCK_API) {
    return apiRequest(`${DASHBOARD_ENDPOINTS.overview}${periodQuery(from, to)}`);
  }
  const snapshot = buildDashboardSnapshot({ ...context, from, to });
  // Mock responses resolve immediately so charts stay responsive while editing.
  return mockRequest(snapshot.overview, 0);
}

export async function getDashboardEmissions({ from, to, ...context }) {
  if (!USE_MOCK_API) {
    return apiRequest(`${DASHBOARD_ENDPOINTS.emissions}${periodQuery(from, to)}`);
  }
  const snapshot = buildDashboardSnapshot({ ...context, from, to });
  return mockRequest(snapshot.emissions, 0);
}

export async function getDashboardConsumption({ from, to, ...context }) {
  if (!USE_MOCK_API) {
    return apiRequest(`${DASHBOARD_ENDPOINTS.consumption}${periodQuery(from, to)}`);
  }
  const snapshot = buildDashboardSnapshot({ ...context, from, to });
  return mockRequest(snapshot.consumption, 0);
}

export async function getDashboardTrends({ from, to, ...context }) {
  if (!USE_MOCK_API) {
    return apiRequest(`${DASHBOARD_ENDPOINTS.trends}${periodQuery(from, to)}`);
  }
  const snapshot = buildDashboardSnapshot({ ...context, from, to });
  return mockRequest(snapshot.trends, 0);
}

/**
 * Loads every dashboard panel for a period. Mock mode computes the model once;
 * real mode requests the four endpoints in parallel.
 */
export async function getDashboardSnapshot({ from, to, ...context }) {
  if (!USE_MOCK_API) {
    const [overview, emissions, consumption, trends] = await Promise.all([
      getDashboardOverview({ from, to }),
      getDashboardEmissions({ from, to }),
      getDashboardConsumption({ from, to }),
      getDashboardTrends({ from, to }),
    ]);
    return { overview, emissions, consumption, trends };
  }

  const snapshot = buildDashboardSnapshot({ ...context, from, to });
  return mockRequest(snapshot, 0);
}

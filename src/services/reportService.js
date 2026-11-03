import { summarizeSampleRenewable } from '../data/dashboardDemo.js';
import { getFuelType, SCOPE_META } from '../data/options.js';
import {
  DATA_QUALITY,
  DATA_QUALITY_ORDER,
  GHG_STANDARD,
  SCOPE1_SOURCES,
  SCOPE2_METHODS,
  SCOPE3_CATEGORIES,
  SCOPE3_STATUS,
} from '../data/ghgProtocol.js';
import { SCOPE_DETAILS, SCOPE_ORDER } from '../data/scopes.js';
import {
  filterActivities,
  isComparablePeriod,
  percentChange,
  previousPeriodRange,
  rankBuildings,
  scopeShares,
  summarizeActivities,
  totalFloorArea,
} from '../utils/analytics.js';
import { buildReportCsv } from '../utils/csv.js';
import { monthRangeLabel, monthsInRange } from '../utils/dates.js';
import { formatTonnes } from '../utils/format.js';
import { buildReportLimitations, buildReportObservations } from '../utils/reportInsights.js';
import { buildRecommendations } from '../utils/recommendations.js';
import * as activityApi from './activityService.js';
import * as buildingApi from './buildingService.js';
import { apiRequest, mockRequest, newId, USE_MOCK_API } from './client.js';
import * as scope3Api from './scope3Service.js';
import * as settingsApi from './settingsService.js';
import { clone, readStore, STORAGE_KEYS, writeStore } from './storage.js';

/**
 * Report service.
 *
 * Planned FastAPI endpoints:
 *   POST /reports/generate   { from, to }
 *   GET  /reports
 *   GET  /reports/{id}
 *   GET  /reports/{id}/download
 *
 * Generation composes the activity, building and settings services, so a real
 * backend can either keep this composition or implement it in one route. The
 * report payload is a snapshot: every number comes from the shared analytics
 * and emission utilities used by the dashboard and analytics pages.
 */
export const REPORT_ENDPOINTS = {
  generate: '/reports/generate',
  list: '/reports',
  detail: (id) => `/reports/${encodeURIComponent(id)}`,
  download: (id) => `/reports/${encodeURIComponent(id)}/download`,
};

const MAX_SAVED_REPORTS = 20;

function readReports() {
  return readStore(STORAGE_KEYS.reports, []);
}

function writeReports(reports) {
  writeStore(STORAGE_KEYS.reports, reports);
}

function changeBetween(current, previous, hasPrevious) {
  return hasPrevious ? percentChange(current, previous ?? 0) : null;
}

function buildResources({ summary, previousSummary, hasPrevious }) {
  const resources = [
    {
      id: 'electricity',
      label: 'Purchased electricity',
      detail: 'Grid electricity recorded from building meters',
      value: summary.metrics.electricityKwh,
      previous: previousSummary?.metrics.electricityKwh ?? null,
      change: changeBetween(
        summary.metrics.electricityKwh,
        previousSummary?.metrics.electricityKwh,
        hasPrevious,
      ),
      unit: 'kWh',
    },
    {
      id: 'water',
      label: 'Water consumption',
      detail: 'Resource metric, not assigned to a GHG scope',
      value: summary.metrics.waterM3,
      previous: previousSummary?.metrics.waterM3 ?? null,
      change: changeBetween(summary.metrics.waterM3, previousSummary?.metrics.waterM3, hasPrevious),
      unit: 'kL',
    },
    {
      id: 'waste-generated',
      label: 'Waste generated',
      detail: `${(
        summary.metrics.diversionRate * 100
      ).toFixed(0)}% diverted from landfill`,
      value: summary.metrics.wasteKg,
      previous: previousSummary?.metrics.wasteKg ?? null,
      change: changeBetween(summary.metrics.wasteKg, previousSummary?.metrics.wasteKg, hasPrevious),
      unit: 'kg',
    },
    {
      id: 'waste-diverted',
      label: 'Waste diverted',
      detail: 'Recycling and composting',
      value: summary.metrics.wasteDivertedKg,
      previous: previousSummary?.metrics.wasteDivertedKg ?? null,
      change: changeBetween(
        summary.metrics.wasteDivertedKg,
        previousSummary?.metrics.wasteDivertedKg,
        hasPrevious,
      ),
      unit: 'kg',
    },
    {
      id: 'commuting',
      label: 'Commuting passenger-km',
      detail: 'Staff and student travel recorded by mode',
      value: summary.metrics.commutePassengerKm,
      previous: previousSummary?.metrics.commutePassengerKm ?? null,
      change: changeBetween(
        summary.metrics.commutePassengerKm,
        previousSummary?.metrics.commutePassengerKm,
        hasPrevious,
      ),
      unit: 'passenger-km',
    },
  ];

  Object.entries(summary.byFuelType ?? {}).forEach(([id, entry]) => {
    const fuel = getFuelType(id);
    resources.push({
      id: `fuel-${id}`,
      label: `${fuel?.label ?? id} combusted`,
      detail: `${formatTonnes(entry.kg)} estimated from fuel quantity`,
      value: entry.quantity,
      previous: previousSummary?.byFuelType?.[id]?.quantity ?? null,
      change: changeBetween(
        entry.quantity,
        previousSummary?.byFuelType?.[id]?.quantity,
        hasPrevious,
      ),
      unit: entry.unit || fuel?.unit || '',
    });
  });

  return resources;
}

function buildReportModel({
  activities,
  buildings,
  profile,
  factors,
  from,
  to,
  reportingYear = '',
  scope3Register = [],
}) {
  const summary = summarizeActivities(activities, factors, from, to);
  const buildingsRanked = rankBuildings(activities, buildings, factors, from, to);
  const previousRange = previousPeriodRange(from, to);
  const previousRaw = previousRange
    ? summarizeActivities(activities, factors, previousRange.from, previousRange.to)
    : null;
  // Withhold comparisons unless both periods have broadly complete monthly
  // coverage, so a single prior month cannot appear as a four-digit increase.
  const previousSummary = isComparablePeriod(summary, previousRaw) ? previousRaw : null;
  const hasPrevious = Boolean(previousSummary?.entryCount);

  const recommendations = buildRecommendations({
    activities,
    buildings,
    factors,
    profile,
    from,
    to,
  }).slice(0, 3);

  const factorList = Object.entries(factors).map(([key, factor]) => ({
    key,
    ...factor,
  }));

  const scopes = scopeShares(summary).map((share) => ({
    ...share,
    label: SCOPE_META[share.scope].label,
    name: SCOPE_META[share.scope].name,
    color: SCOPE_META[share.scope].color,
    previousKg: previousSummary?.byScope?.[share.scope] ?? null,
    change: hasPrevious
      ? percentChange(share.kg, previousSummary.byScope?.[share.scope] ?? 0)
      : null,
  }));

  const monthList = monthsInRange(from, to);
  const filteredRecords = filterActivities(activities, from, to);
  const covered = new Set(filteredRecords.map((activity) => activity.period));
  const coverage = {
    months: monthList.length,
    coveredMonths: monthList.filter((month) => covered.has(month)).length,
    percent:
      monthList.length > 0
        ? (monthList.filter((month) => covered.has(month)).length / monthList.length) * 100
        : 0,
  };

  const renewableSample = summarizeSampleRenewable(monthList);
  const renewableKwh =
    summary.metrics.electricityKwh > 0 ? renewableSample.totalKwh : 0;
  const combinedKwh = summary.metrics.electricityKwh + renewableKwh;
  const renewable = {
    kwh: renewableKwh,
    sampleTotalKwh: renewableSample.totalKwh,
    share: combinedKwh > 0 ? (renewableKwh / combinedKwh) * 100 : null,
    source: renewableSample.source,
  };

  const attributedKg = buildingsRanked.reduce((sum, building) => sum + building.kg, 0);
  const unattributedKg = Math.max(0, summary.totalKg - attributedKg);
  const unattributedShare =
    summary.totalKg > 0 ? (unattributedKg / summary.totalKg) * 100 : 0;

  const sampleRecordCount = activities.filter((activity) =>
    String(activity.id ?? '').startsWith('demo_'),
  ).length +
    buildings.filter((building) => String(building.id ?? '').startsWith('demo_')).length;
  const isSample = sampleRecordCount > 0;

  const observations = buildReportObservations({
    summary,
    buildings: buildingsRanked,
    previous: hasPrevious ? previousSummary : null,
    previousRange,
    profile,
    from,
    to,
    coverage,
    renewable,
  });

  const limitations = buildReportLimitations({
    coverage,
    isSample,
    sampleRecordCount,
    unattributedShare,
    renewable,
  });

  const totalChange = hasPrevious
    ? percentChange(summary.totalKg, previousSummary.totalKg)
    : null;

  const registerById = new Map(
    (scope3Register ?? []).map((entry) => [Number(entry.categoryId), entry]),
  );
  const scope3Rows = SCOPE3_CATEGORIES.map((category) => {
    const registerEntry = registerById.get(category.id);
    const measured = summary.byScope3Category?.[category.id] ?? { kg: 0, entryCount: 0 };
    const status = SCOPE3_STATUS[registerEntry?.status]
      ? registerEntry.status
      : category.defaultStatus;
    return {
      id: category.id,
      label: category.label,
      relevance: category.relevance,
      status,
      statusLabel: SCOPE3_STATUS[status].label,
      statusTone: SCOPE3_STATUS[status].tone,
      note: registerEntry?.note || category.note,
      linkedCategory: category.linkedCategory ?? null,
      deviation: Boolean(category.deviation),
      kg: measured.kg ?? 0,
      entryCount: measured.entryCount ?? 0,
      quantified: (measured.entryCount ?? 0) > 0,
    };
  });
  const scope3QuantifiedKg = scope3Rows.reduce((sum, row) => sum + row.kg, 0);

  const dataQualityRows = DATA_QUALITY_ORDER.map((id) => {
    const entry = summary.byDataQuality?.[id] ?? { kg: 0, entryCount: 0 };
    return {
      id,
      label: DATA_QUALITY[id].label,
      tone: DATA_QUALITY[id].tone,
      kg: entry.kg,
      entryCount: entry.entryCount,
      share: summary.totalKg > 0 ? (entry.kg / summary.totalKg) * 100 : 0,
    };
  });

  const floorAreaSqm = totalFloorArea(buildings);
  const students = Number(profile?.students) || 0;
  const intensity = {
    tco2ePerStudent:
      students > 0 ? summary.totalKg / 1000 / students : null,
    kgPerSqm: floorAreaSqm > 0 ? attributedKg / floorAreaSqm : null,
    kwhPerStudent:
      students > 0 ? summary.metrics.electricityKwh / students : null,
    students,
    floorAreaSqm,
    attributedKg,
  };

  const methodology = {
    standard: GHG_STANDARD.corporate,
    scope3Standard: GHG_STANDARD.scope3,
    consolidation: GHG_STANDARD.consolidation,
    boundary: GHG_STANDARD.boundary,
    baseYear: GHG_STANDARD.baseYear,
    reportingYearBasis: GHG_STANDARD.reportingYearBasis,
    gwp: GHG_STANDARD.gwp,
    disclaimer: GHG_STANDARD.disclaimer,
    scope2Methods: SCOPE2_METHODS,
    scope1Sources: SCOPE1_SOURCES,
    boundaries: SCOPE_ORDER.map((scope) => ({
      scope,
      label: SCOPE_DETAILS[scope].label,
      name: SCOPE_DETAILS[scope].name,
      boundary: SCOPE_DETAILS[scope].boundary,
      included: SCOPE_DETAILS[scope].included,
      excluded: SCOPE_DETAILS[scope].excluded,
      method: SCOPE_DETAILS[scope].method,
    })),
    doubleCounting:
      'Each activity record is assigned to exactly one scope and one source. Scope 2 is shown on two methods but only the location-based value enters the footprint. Water is a resource metric and never enters the GHG total. Scope 3 categories are quantified only from their linked activity categories.',
  };

  const scope2 = {
    locationKg: summary.scope2?.locationKg ?? 0,
    marketKg: summary.scope2?.marketKg ?? 0,
    marketFactorVerified: false,
    note: 'Market-based figure uses the location-based factor as a proxy because no contractual instruments are recorded or verified.',
  };

  return {
    meta: {
      id: newId('rpt'),
      college: profile,
      from,
      to,
      reportingYear: reportingYear || '',
      periodLabel: monthRangeLabel(from, to),
      monthCount: monthList.length,
      generatedAt: new Date().toISOString(),
      entryCount: summary.entryCount,
      buildingCount: buildings.length,
      isSample,
      sampleRecordCount,
      dataBasis: isSample ? 'Sample demo data' : 'Recorded workspace data',
      coverage,
      unattributedKg,
      unattributedShare,
      previous: previousRange && hasPrevious
        ? {
            from: previousRange.from,
            to: previousRange.to,
            label: monthRangeLabel(previousRange.from, previousRange.to),
            totalKg: previousSummary.totalKg,
            change: totalChange,
          }
        : null,
    },
    methodology,
    scope2,
    scope3: {
      rows: scope3Rows,
      quantifiedKg: scope3QuantifiedKg,
      totalCategories: scope3Rows.length,
      measuredCount: scope3Rows.filter((row) => row.quantified).length,
      applicableNotQuantified: scope3Rows.filter(
        (row) => row.status === 'applicable_not_quantified',
      ).length,
      excludedCount: scope3Rows.filter((row) => row.status === 'excluded_not_relevant').length,
      notAssessedCount: scope3Rows.filter((row) => row.status === 'not_assessed').length,
    },
    dataQuality: dataQualityRows,
    intensity,
    summary,
    scopes,
    resources: buildResources({ summary, previousSummary, hasPrevious }),
    buildings: buildingsRanked,
    recommendations,
    factors: factorList,
    observations,
    limitations,
    coverage,
    renewable,
  };
}

export async function generateReport({ from, to, reportingYear = '' }) {
  if (!USE_MOCK_API) {
    return apiRequest(REPORT_ENDPOINTS.generate, {
      method: 'POST',
      body: { from, to, reportingYear },
    });
  }

  const [activities, buildings, profile, factors, scope3Register] = await Promise.all([
    activityApi.listActivities(),
    buildingApi.listBuildings(),
    settingsApi.getProfile(),
    settingsApi.getFactors(),
    scope3Api.getScope3Register(),
  ]);

  const report = buildReportModel({
    activities,
    buildings,
    profile,
    factors,
    from,
    to,
    reportingYear,
    scope3Register,
  });
  return mockRequest(report, 260);
}

export async function listReports() {
  if (!USE_MOCK_API) return apiRequest(REPORT_ENDPOINTS.list);
  const summaries = readReports().map(({ report, ...entry }) => entry);
  return mockRequest(summaries, 120);
}

export async function getReport(id) {
  if (!USE_MOCK_API) return apiRequest(REPORT_ENDPOINTS.detail(id));
  const entry = readReports().find((item) => item.id === id);
  if (!entry) throw new Error('That saved report no longer exists.');
  return mockRequest(clone(entry), 120);
}

export async function saveReport(report) {
  if (!USE_MOCK_API) {
    return apiRequest(REPORT_ENDPOINTS.list, { method: 'POST', body: report });
  }
  if (!report?.meta) throw new Error('There is no report to save.');

  const entry = {
    id: report.meta.id ?? newId('rpt'),
    savedAt: new Date().toISOString(),
    from: report.meta.from,
    to: report.meta.to,
    reportingYear: report.meta.reportingYear ?? '',
    periodLabel: report.meta.periodLabel,
    generatedAt: report.meta.generatedAt,
    totalKg: report.summary.totalKg,
    entryCount: report.summary.entryCount,
    isSample: Boolean(report.meta.isSample),
    report: clone(report),
  };

  const reports = readReports().filter((item) => item.id !== entry.id);
  writeReports([entry, ...reports].slice(0, MAX_SAVED_REPORTS));
  return mockRequest(clone({ ...entry, report: undefined }), 140);
}

export async function deleteReport(id) {
  if (!USE_MOCK_API) {
    return apiRequest(REPORT_ENDPOINTS.detail(id), { method: 'DELETE' });
  }
  const reports = readReports();
  writeReports(reports.filter((item) => item.id !== id));
  return mockRequest({ id }, 120);
}

/**
 * In mock mode the download is generated from the stored snapshot. A FastAPI
 * implementation can return the CSV file directly from the same route.
 */
export async function downloadReport(id) {
  if (!USE_MOCK_API) return apiRequest(REPORT_ENDPOINTS.download(id));
  const entry = readReports().find((item) => item.id === id);
  if (!entry) throw new Error('That saved report no longer exists.');
  const filename = `${
    entry.isSample ? 'greencampus-sample-report' : 'greencampus-report'
  }-${entry.from}-to-${entry.to}.csv`;
  return mockRequest({ filename, content: buildReportCsv(entry.report) }, 120);
}

import {
  CATEGORY_META,
  CATEGORY_ORDER,
  getCommuteMode,
  getDisposalMethod,
  getFuelType,
  getWasteCategory,
} from '../data/options.js';
import { SCOPE_DETAILS, SCOPE_ORDER, scopeForCategory } from '../data/scopes.js';
import { FACTOR_STATUS } from '../data/emissionFactors.js';
import {
  DATA_QUALITY,
  DATA_QUALITY_ORDER,
  dataQualityMeta,
  scope3Category,
} from '../data/ghgProtocol.js';
import { previousPeriodRange, percentChange } from './analytics.js';
import { toCsv } from './csv.js';
import { monthsInRange, monthLabel, monthRangeLabel } from './dates.js';
import { calculateActivityEmissions } from './emissions.js';
import { formatNumber } from './format.js';

const EMISSION_CATEGORIES = ['electricity', 'fuel', 'waste', 'commuting'];

function emptyScopeMap() {
  return { 1: 0, 2: 0, 3: 0 };
}

function filteredActivities(activities, from, to) {
  return (activities ?? []).filter(
    (activity) =>
      (!from || activity.period >= from) && (!to || activity.period <= to),
  );
}

function recordedInput(activity) {
  if (!activity) return { quantity: 0, unit: '', summary: '' };
  if (activity.category === 'electricity') {
    const value = Number(activity.kwh) || 0;
    return { quantity: value, unit: 'kWh', summary: `${formatNumber(value)} kWh metered` };
  }
  if (activity.category === 'water') {
    const value = Number(activity.cubicMeters) || 0;
    return { quantity: value, unit: 'kL', summary: `${formatNumber(value)} kL metered` };
  }
  if (activity.category === 'fuel') {
    const value = Number(activity.quantity) || 0;
    const fuel = getFuelType(activity.fuelType);
    return {
      quantity: value,
      unit: fuel?.unit ?? '',
      summary: `${formatNumber(value)} ${fuel?.unit ?? ''} ${fuel?.label ?? 'fuel'}`.trim(),
    };
  }
  if (activity.category === 'waste') {
    const value = Number(activity.weightKg) || 0;
    const waste = getWasteCategory(activity.wasteCategory);
    const disposal = getDisposalMethod(activity.disposal);
    return {
      quantity: value,
      unit: 'kg',
      summary: `${formatNumber(value)} kg ${waste?.label ?? 'waste'} → ${disposal?.label ?? 'disposal'}`,
    };
  }
  if (activity.category === 'commuting') {
    const commuters = Number(activity.commuters) || 0;
    const distance = Number(activity.distanceKm) || 0;
    const trips = Number(activity.tripsPerMonth) || 0;
    const mode = getCommuteMode(activity.mode);
    return {
      quantity: commuters,
      unit: 'commuters',
      summary: `${formatNumber(commuters)} people · ${formatNumber(distance)} km one-way · ${formatNumber(
        trips,
      )} round trips/month · ${mode?.label ?? 'mode'}`,
    };
  }
  return { quantity: 0, unit: '', summary: '' };
}

function resolveMonths(activities, from, to) {
  const months = monthsInRange(from, to);
  if (months.length) return months;
  return [...new Set((activities ?? []).map((activity) => activity.period).filter(Boolean))].sort();
}

function resolvePreviousRange(from, to) {
  if (!from || !to) return null;
  return previousPeriodRange(from, to);
}

function totalsFor(activities, factors, from, to) {
  const filtered = filteredActivities(activities, from, to);
  const totals = {
    kg: 0,
    byScope: emptyScopeMap(),
    entryCount: filtered.length,
    estimatedEntryCount: 0,
    waterM3: 0,
    unclassifiedCount: 0,
  };

  filtered.forEach((activity) => {
    const calc = calculateActivityEmissions(activity, factors);
    totals.kg += calc.kg;
    if (calc.scope) {
      totals.byScope[calc.scope] += calc.kg;
      totals.estimatedEntryCount += 1;
    } else if (activity.category !== 'water') {
      totals.unclassifiedCount += 1;
    }
    if (activity.category === 'water') totals.waterM3 += Number(activity.cubicMeters) || 0;
  });

  return totals;
}

function buildMonthly(months, filtered, factors) {
  const monthMap = new Map(
    months.map((period) => [
      period,
      {
        period,
        label: monthLabel(period, 'short'),
        scope1: 0,
        scope2: 0,
        scope3: 0,
        total: 0,
        electricityKwh: 0,
        waterM3: 0,
        entryCount: 0,
      },
    ]),
  );

  filtered.forEach((activity) => {
    let month = monthMap.get(activity.period);
    if (!month) {
      month = {
        period: activity.period,
        label: monthLabel(activity.period, 'short'),
        scope1: 0,
        scope2: 0,
        scope3: 0,
        total: 0,
        electricityKwh: 0,
        waterM3: 0,
        entryCount: 0,
      };
      monthMap.set(activity.period, month);
    }
    const calc = calculateActivityEmissions(activity, factors);
    month.entryCount += 1;
    month.total += calc.kg;
    if (calc.scope === 1) month.scope1 += calc.kg;
    if (calc.scope === 2) month.scope2 += calc.kg;
    if (calc.scope === 3) month.scope3 += calc.kg;
    if (activity.category === 'electricity') month.electricityKwh += Number(activity.kwh) || 0;
    if (activity.category === 'water') month.waterM3 += Number(activity.cubicMeters) || 0;
  });

  return [...monthMap.values()].sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Builds the complete emissions model for a period.
 *
 * Pure and UI-independent: the service layer, page and exports all consume the
 * same object, so scope totals, contribution shares, building rankings and the
 * calculation ledger cannot drift apart. Every kgCO₂e value here is an estimate
 * derived from recorded inputs and the active factors.
 */
export function buildEmissionReport({
  activities = [],
  buildings = [],
  factors = {},
  from = null,
  to = null,
} = {}) {
  const filtered = filteredActivities(activities, from, to);
  const months = resolveMonths(filtered, from, to);
  const previousRange = resolvePreviousRange(from, to);
  const previous = previousRange
    ? totalsFor(activities, factors, previousRange.from, previousRange.to)
    : null;
  // Comparisons need broadly complete monthly coverage in both periods. A
  // single month of prior records would otherwise show as a four-digit change.
  const hasComparableCoverage = (start, end, minimum = 0.75) => {
    const rangeMonths = monthsInRange(start, end);
    if (!rangeMonths.length) return false;
    const recorded = new Set(
      filteredActivities(activities, start, end).map((activity) => activity.period),
    );
    return rangeMonths.filter((period) => recorded.has(period)).length / rangeMonths.length >= minimum;
  };
  const comparable =
    Boolean(previous && previous.entryCount > 0) &&
    previousRange &&
    hasComparableCoverage(from, to) &&
    hasComparableCoverage(previousRange.from, previousRange.to);
  const hasPrevious = Boolean(comparable);

  const buildingMap = new Map((buildings ?? []).map((building) => [building.id, building]));
  const totalKg = { value: 0 };
  const byScope = emptyScopeMap();
  const byCategory = Object.fromEntries(EMISSION_CATEGORIES.map((category) => [category, 0]));
  const categoryEntries = Object.fromEntries(EMISSION_CATEGORIES.map((category) => [category, 0]));
  const sourceMap = new Map();
  const factorMap = new Map();
  const ledger = [];
  const waterMonthlyMap = new Map(months.map((period) => [period, 0]));
  const waterBuildingMap = new Map();
  const buildingTotals = new Map();
  const progress = {
    estimatedEntries: 0,
    excludedEntries: 0,
    withoutFactor: 0,
    withoutScope: 0,
    withoutBuilding: 0,
  };
  const scope2Totals = { locationKg: 0, marketKg: 0 };
  const byDataQuality = {};
  const scope1SourceMap = new Map();
  const scope3CategoryMap = new Map();

  function ensureBuilding(id) {
    const key = id || 'campus-wide';
    if (!buildingTotals.has(key)) {
      const building = id ? buildingMap.get(id) : null;
      buildingTotals.set(key, {
        id: key,
        name: building?.name ?? (id ? 'Unknown building' : 'Campus-wide / unassigned'),
        type: building?.type ?? (id ? 'Unknown' : 'Campus-wide'),
        areaSqm: Number(building?.areaSqm) || 0,
        occupants: Number(building?.occupants) || 0,
        kg: 0,
        scope1: 0,
        scope2: 0,
        scope3: 0,
        waterM3: 0,
        electricityKwh: 0,
        entryCount: 0,
      });
    }
    return buildingTotals.get(key);
  }

  filtered.forEach((activity) => {
    const calc = calculateActivityEmissions(activity, factors);
    const input = recordedInput(activity);
    const category = activity.category;
    const building = activity.buildingId ? buildingMap.get(activity.buildingId) : null;
    const buildingName = activity.buildingId
      ? building?.name ?? 'Unknown building'
      : 'Campus-wide';

    const isWater = category === 'water';
    totalKg.value += calc.kg;
    if (calc.scope) byScope[calc.scope] += calc.kg;
    if (category in byCategory) {
      byCategory[category] += calc.kg;
      categoryEntries[category] += 1;
    }
    if (calc.scope) progress.estimatedEntries += 1;
    if (isWater) progress.excludedEntries += 1;
    if (!isWater && !calc.factorKey) progress.withoutFactor += 1;
    if (!isWater && !calc.scope) progress.withoutScope += 1;
    if (!activity.buildingId) progress.withoutBuilding += 1;

    if (calc.scope === 2) {
      scope2Totals.locationKg += calc.kg;
      scope2Totals.marketKg += calc.marketBased?.kg ?? calc.kg;
    }

    const quality = calc.dataQuality ?? 'estimated';
    const qualityEntry = byDataQuality[quality] ?? { kg: 0, entryCount: 0 };
    qualityEntry.kg += calc.kg;
    qualityEntry.entryCount += 1;
    byDataQuality[quality] = qualityEntry;

    if (calc.scope1Source?.id) {
      const sourceEntry = scope1SourceMap.get(calc.scope1Source.id) ?? {
        id: calc.scope1Source.id,
        label: calc.scope1Source.label,
        kg: 0,
        entryCount: 0,
      };
      sourceEntry.kg += calc.kg;
      sourceEntry.entryCount += 1;
      scope1SourceMap.set(calc.scope1Source.id, sourceEntry);
    }

    if (calc.scope3Category?.id) {
      const categoryEntry = scope3CategoryMap.get(calc.scope3Category.id) ?? {
        id: calc.scope3Category.id,
        label: scope3Category(calc.scope3Category.id)?.label ?? calc.scope3Category.label,
        kg: 0,
        entryCount: 0,
      };
      categoryEntry.kg += calc.kg;
      categoryEntry.entryCount += 1;
      scope3CategoryMap.set(calc.scope3Category.id, categoryEntry);
    }

    const buildingRow = ensureBuilding(activity.buildingId);
    buildingRow.kg += calc.kg;
    buildingRow.entryCount += 1;
    if (calc.scope === 1) buildingRow.scope1 += calc.kg;
    if (calc.scope === 2) buildingRow.scope2 += calc.kg;
    if (calc.scope === 3) buildingRow.scope3 += calc.kg;
    if (category === 'electricity') buildingRow.electricityKwh += Number(activity.kwh) || 0;
    if (isWater) {
      const cubicMeters = Number(activity.cubicMeters) || 0;
      buildingRow.waterM3 += cubicMeters;
      waterMonthlyMap.set(activity.period, (waterMonthlyMap.get(activity.period) ?? 0) + cubicMeters);
      const key = activity.buildingId || 'campus-wide';
      if (!waterBuildingMap.has(key)) {
        waterBuildingMap.set(key, {
          id: key,
          name: buildingName,
          cubicMeters: 0,
          entryCount: 0,
        });
      }
      const waterRow = waterBuildingMap.get(key);
      waterRow.cubicMeters += cubicMeters;
      waterRow.entryCount += 1;
    }

    if (calc.factorKey) {
      if (!factorMap.has(calc.factorKey)) {
        factorMap.set(calc.factorKey, {
          key: calc.factorKey,
          label: calc.factorLabel || calc.sourceLabel,
          value: calc.factorValue,
          unit: calc.factorUnit,
          source: calc.factorSource,
          year: calc.factorYear,
          version: calc.factorVersion,
          gasCoverage: calc.factorGasCoverage,
          methodology: calc.factorMethodology,
          status: calc.factorStatus,
          verified: calc.factorVerified,
          scope: calc.scope,
          group: factors[calc.factorKey]?.group ?? '',
          recordCount: 0,
          quantity: 0,
          unitIn: calc.unit,
          kg: 0,
        });
      }
      const factorRow = factorMap.get(calc.factorKey);
      factorRow.recordCount += 1;
      factorRow.quantity += calc.quantity;
      factorRow.kg += calc.kg;
    }

    if (calc.scope) {
      const sourceKey = `${calc.factorKey}|${category === 'waste' ? activity.wasteCategory : ''}`;
      if (!sourceMap.has(sourceKey)) {
        sourceMap.set(sourceKey, {
          id: sourceKey,
          label: calc.sourceLabel,
          category,
          scope: calc.scope,
          kg: 0,
          entryCount: 0,
          quantity: 0,
          unit: calc.unit,
          factorKey: calc.factorKey,
          factorLabel: calc.factorLabel,
          factorValue: calc.factorValue,
          factorUnit: calc.factorUnit,
          wasteCategory: category === 'waste' ? activity.wasteCategory : null,
        });
      }
      const source = sourceMap.get(sourceKey);
      source.kg += calc.kg;
      source.entryCount += 1;
      source.quantity += calc.quantity;
    }

    ledger.push({
      id: activity.id,
      period: activity.period,
      periodLabel: monthLabel(activity.period, 'short'),
      date: activity.date ?? null,
      category,
      categoryLabel: CATEGORY_META[category]?.label ?? category,
      source: calc.sourceLabel,
      buildingId: activity.buildingId ?? null,
      buildingName,
      inputQuantity: input.quantity,
      inputUnit: input.unit,
      inputSummary: input.summary,
      basisQuantity: calc.quantity,
      basisUnit: calc.unit,
      factorKey: calc.factorKey,
      factorLabel: calc.factorLabel,
      factorValue: calc.factorValue,
      factorUnit: calc.factorUnit,
      factorSource: calc.factorSource,
      factorYear: calc.factorYear,
      factorVersion: calc.factorVersion,
      factorGasCoverage: calc.factorGasCoverage,
      factorMethodology: calc.factorMethodology,
      factorStatus: calc.factorStatus,
      factorStatusLabel: FACTOR_STATUS[calc.factorStatus]?.shortLabel ?? calc.factorStatus,
      factorVerified: calc.factorVerified,
      wasteTypeFactorKey: calc.wasteTypeFactorKey,
      wasteCategory: activity.wasteCategory ?? null,
      disposal: activity.disposal ?? null,
      kg: calc.kg,
      marketBasedKg: calc.marketBased?.kg ?? null,
      scope: calc.scope,
      scopeLabel: calc.scope ? SCOPE_DETAILS[calc.scope].label : 'Not a GHG scope',
      scope1Source: calc.scope1Source?.label ?? '',
      scope3Category: calc.scope3Category?.id ?? null,
      scope3CategoryLabel: calc.scope3Category?.label ?? '',
      dataQuality: quality,
      dataQualityLabel: dataQualityMeta(quality).label,
      sourceReference: activity.sourceReference ?? '',
      formula: calc.formula,
      includedInTotal: Boolean(calc.scope),
      estimated: Boolean(calc.scope),
      notes: activity.notes ?? '',
    });
  });

  const monthly = buildMonthly(months, filtered, factors);
  const sources = [...sourceMap.values()].sort((a, b) => b.kg - a.kg);
  const factorUsage = [...factorMap.values()].sort((a, b) => b.kg - a.kg);
  const scope1Sources = [...scope1SourceMap.values()].sort((a, b) => b.kg - a.kg);
  const scope3Categories = [...scope3CategoryMap.values()].sort((a, b) => a.id - b.id);
  const dataQualityRows = DATA_QUALITY_ORDER.map((id) => {
    const entry = byDataQuality[id] ?? { kg: 0, entryCount: 0 };
    return {
      id,
      label: DATA_QUALITY[id].label,
      tone: DATA_QUALITY[id].tone,
      kg: entry.kg,
      entryCount: entry.entryCount,
    };
  });
  const total = totalKg.value;

  const categoryRows = EMISSION_CATEGORIES.map((category) => {
    const kg = byCategory[category] ?? 0;
    return {
      id: category,
      label: CATEGORY_META[category]?.label ?? category,
      scope: scopeForCategory(category),
      kg,
      share: total > 0 ? (kg / total) * 100 : 0,
      entryCount: categoryEntries[category] ?? 0,
    };
  });

  const buildingRows = [...buildingTotals.values()]
    .map((row) => ({
      ...row,
      share: total > 0 ? (row.kg / total) * 100 : 0,
      intensityKgPerSqm: row.areaSqm > 0 ? row.kg / row.areaSqm : null,
    }))
    .sort((a, b) => b.kg - a.kg);

  const scopeDetails = {};
  SCOPE_ORDER.forEach((scope) => {
    const definition = SCOPE_DETAILS[scope];
    const kg = byScope[scope] ?? 0;
    const scopeLedger = ledger.filter((row) => row.scope === scope);
    const scopeSources = sources.filter((source) => source.scope === scope);
    scopeDetails[scope] = {
      ...definition,
      kg,
      share: total > 0 ? (kg / total) * 100 : 0,
      entryCount: scopeLedger.length,
      previousKg: hasPrevious ? previous.byScope[scope] ?? 0 : null,
      changePercent: hasPrevious ? percentChange(kg, previous.byScope[scope] ?? 0) : null,
      sources: scopeSources,
      categories: categoryRows.filter((category) => category.scope === scope),
      factors: factorUsage.filter((factor) => factor.scope === scope),
      monthly: monthly.map((month) => ({
        period: month.period,
        label: month.label,
        kg: month[`scope${scope}`] ?? 0,
      })),
    };
  });

  const scopeShares = SCOPE_ORDER.map((scope) => ({
    scope,
    label: SCOPE_DETAILS[scope].label,
    name: SCOPE_DETAILS[scope].name,
    kg: byScope[scope] ?? 0,
    percent: total > 0 ? ((byScope[scope] ?? 0) / total) * 100 : 0,
    entryCount: scopeDetails[scope].entryCount,
    changePercent: scopeDetails[scope].changePercent,
    color: SCOPE_DETAILS[scope].color,
    tone: SCOPE_DETAILS[scope].tone,
  }));

  const monthsWithRecords = new Set(filtered.map((activity) => activity.period));
  const presentCategories = CATEGORY_ORDER.filter((category) =>
    filtered.some((activity) => activity.category === category),
  );
  const missingCategories = CATEGORY_ORDER.filter((category) => !presentCategories.includes(category));
  const factorValues = Object.values(factors ?? {});
  const referenceFactors = factorValues.filter(
    (factor) => factor?.status === 'reference' || !factor?.verified,
  ).length;
  const sampleRecordCount = filtered.filter((activity) =>
    String(activity.id ?? '').startsWith('demo_'),
  ).length;

  const notes = [
    {
      id: 'estimate',
      text: 'Recorded quantities are actual inputs; every kgCO₂e figure is an estimate produced by the active factor set.',
    },
  ];
  if (referenceFactors > 0) {
    notes.push({
      id: 'reference-factors',
      text: `${referenceFactors} active factor${
        referenceFactors === 1 ? '' : 's'
      } are reference values, not verified college or regional factors. Review the source and applicable year before formal reporting.`,
    });
  }
  if (byCategory.waste > 0 && !ledger.some((row) => row.wasteTypeFactorKey)) {
    notes.push({
      id: 'waste-type',
      text: 'Waste emissions use disposal-method factors. No waste-type-specific factor is configured, so every waste type shares the factor for its disposal method.',
    });
  }
  if (progress.excludedEntries > 0) {
    notes.push({
      id: 'water-excluded',
      text: `${progress.excludedEntries} water record${
        progress.excludedEntries === 1 ? ' is' : 's are'
      } tracked as a resource metric and excluded from the GHG total.`,
    });
  }
  if (sampleRecordCount > 0) {
    notes.push({
      id: 'sample',
      text: `${sampleRecordCount} record${
        sampleRecordCount === 1 ? '' : 's'
      } in this period come from the demonstration dataset. They do not represent measured college performance.`,
    });
  }
  notes.push({
    id: 'scope2-dual',
    text: `Scope 2 is reported on both bases: location-based ${formatNumber(
      scope2Totals.locationKg / 1000,
      { digits: 2 },
    )} tCO₂e and market-based ${formatNumber(scope2Totals.marketKg / 1000, {
      digits: 2,
    })} tCO₂e. No contractual instruments are verified, so the market-based view is a labelled proxy and only the location-based value is used in the scope total.`,
  });
  const estimatedCount =
    (byDataQuality.estimated?.entryCount ?? 0) + (byDataQuality.missing?.entryCount ?? 0);
  if (estimatedCount > 0) {
    notes.push({
      id: 'data-quality',
      text: `${estimatedCount} record${estimatedCount === 1 ? ' is' : 's are'} marked estimated or missing source data. Data-quality classifications describe the activity data, not the emission factor.`,
    });
  }

  const waterTotalM3 = [...waterMonthlyMap.values()].reduce((sum, value) => sum + value, 0);

  return {
    meta: {
      from: from ?? months[0] ?? null,
      to: to ?? months[months.length - 1] ?? null,
      periodLabel: monthRangeLabel(from ?? months[0], to ?? months[months.length - 1]),
      months,
      monthCount: months.length,
      entryCount: filtered.length,
      estimatedEntryCount: progress.estimatedEntries,
      waterEntryCount: progress.excludedEntries,
      buildingCount: buildings?.length ?? 0,
      activeFactorCount: factorValues.length,
      usedFactorCount: factorUsage.length,
      referenceFactorCount: referenceFactors,
      sampleRecordCount,
      generatedAt: new Date().toISOString(),
    },
    totals: {
      kg: total,
      tonnes: total / 1000,
      scope1Kg: byScope[1],
      scope2Kg: byScope[2],
      scope3Kg: byScope[3],
      scope2LocationKg: scope2Totals.locationKg,
      scope2MarketKg: scope2Totals.marketKg,
      marketFactorVerified: false,
      previousKg: hasPrevious ? previous.kg : null,
      changePercent: hasPrevious ? percentChange(total, previous.kg) : null,
      waterM3: waterTotalM3,
      waterExcluded: true,
    },
    scope2: {
      locationKg: scope2Totals.locationKg,
      marketKg: scope2Totals.marketKg,
      marketFactorVerified: false,
      method: 'location-based total; market-based shown for dual reporting',
    },
    scope1Sources,
    scope3Categories,
    byDataQuality: dataQualityRows,
    scopeShares,
    scopeDetails,
    scopes: SCOPE_ORDER.map((scope) => scopeDetails[scope]),
    byScope,
    byCategory: categoryRows,
    byBuilding: buildingRows,
    bySource: sources,
    monthly,
    ledger,
    factorUsage,
    water: {
      totalM3: waterTotalM3,
      entryCount: progress.excludedEntries,
      monthly: monthly.map((month) => ({
        period: month.period,
        label: month.label,
        value: month.waterM3,
      })),
      byBuilding: [...waterBuildingMap.values()]
        .map((row) => ({
          ...row,
          share: waterTotalM3 > 0 ? (row.cubicMeters / waterTotalM3) * 100 : 0,
        }))
        .sort((a, b) => b.cubicMeters - a.cubicMeters),
      scope: null,
    },
    coverage: {
      months,
      monthCount: months.length,
      monthsWithRecords: months.filter((period) => monthsWithRecords.has(period)).length,
      missingMonths: Math.max(0, months.length - monthsWithRecords.size),
      categoriesPresent: presentCategories,
      missingCategories,
      buildingsCovered: new Set(
        filtered.map((activity) => activity.buildingId).filter(Boolean),
      ).size,
      recordsWithoutBuilding: progress.withoutBuilding,
      recordsWithoutFactor: progress.withoutFactor,
      recordsWithoutScope: progress.withoutScope,
      estimatedEntryCount: progress.estimatedEntries,
      waterEntryCount: progress.excludedEntries,
    },
    previous: previous
      ? {
          kg: previous.kg,
          byScope: previous.byScope,
          entryCount: previous.entryCount,
          waterM3: previous.waterM3,
          range: previousRange,
        }
      : null,
    notes,
  };
}

/**
 * Scope-specific slice of a report, shaped like GET /emissions/scope/{scope}.
 */
export function selectScopeReport(report, scope) {
  const scopeNumber = Number(scope);
  const detail = report?.scopeDetails?.[scopeNumber];
  if (!detail) return null;
  return {
    meta: report.meta,
    scope: detail,
    totals: {
      kg: detail.kg,
      share: detail.share,
      changePercent: detail.changePercent,
      previousKg: detail.previousKg,
    },
    ledger: (report.ledger ?? []).filter((row) => row.scope === scopeNumber),
    monthly: detail.monthly,
    factors: detail.factors,
    sources: detail.sources,
  };
}

/**
 * Calculation ledger export. Keeps actual inputs, factor metadata and estimated
 * outputs in separate columns so a spreadsheet cannot be mistaken for raw data.
 */
export function buildEmissionCsv(report) {
  const columns = [
    { label: 'Record ID', key: 'id' },
    { label: 'Month', key: 'period' },
    { label: 'Date', key: 'date' },
    { label: 'Category', key: 'categoryLabel' },
    { label: 'Activity source', key: 'source' },
    { label: 'Building', key: 'buildingName' },
    { label: 'Recorded input', key: 'inputQuantity' },
    { label: 'Input unit', key: 'inputUnit' },
    { label: 'Input description', key: 'inputSummary' },
    { label: 'Calculation basis', key: 'basisQuantity' },
    { label: 'Basis unit', key: 'basisUnit' },
    { label: 'Factor key', key: 'factorKey' },
    { label: 'Factor value', key: 'factorValue' },
    { label: 'Factor unit', key: 'factorUnit' },
    { label: 'Factor source', key: 'factorSource' },
    { label: 'Source version', key: 'factorVersion' },
    { label: 'Factor applicable year', key: 'factorYear' },
    { label: 'Gas coverage', key: 'factorGasCoverage' },
    { label: 'Calculation methodology', key: 'factorMethodology' },
    { label: 'Factor status', key: 'factorStatusLabel' },
    { label: 'GHG scope', key: 'scopeLabel' },
    { label: 'Scope 1 source', key: 'scope1Source' },
    { label: 'Scope 3 category', key: 'scope3CategoryLabel' },
    { label: 'Data quality', key: 'dataQualityLabel' },
    { label: 'Source reference', key: 'sourceReference' },
    {
      label: 'Estimated emissions (kgCO2e)',
      value: (row) => (row.includedInTotal ? formatNumber(row.kg, { digits: 2 }) : ''),
    },
    {
      label: 'Market-based estimate (kgCO2e)',
      value: (row) =>
        row.marketBasedKg === null || row.marketBasedKg === undefined
          ? ''
          : formatNumber(row.marketBasedKg, { digits: 2 }),
    },
    { label: 'Formula', key: 'formula' },
    { label: 'Notes', key: 'notes' },
  ];
  return toCsv(columns, report?.ledger ?? []);
}

export const EMISSION_CATEGORIES_ORDER = EMISSION_CATEGORIES;

import { CATEGORY_META, SCOPE_META } from '../data/options.js';
import { percentChange, totalOccupants } from './analytics.js';
import { monthRangeLabel } from './dates.js';
import {
  formatNumber,
  formatPercent,
  formatSignedPercent,
  formatTonnes,
  formatWater,
  formatWeight,
} from './format.js';

const EMISSION_CATEGORIES = ['electricity', 'fuel', 'waste', 'commuting'];

/**
 * Rule-based report narrative. Every observation is derived from the same
 * summary, ranking and coverage values used elsewhere in the app, so a report
 * never introduces a separate set of numbers.
 */
export function buildReportObservations({
  summary,
  buildings = [],
  previous = null,
  previousRange = null,
  profile = {},
  from,
  to,
  coverage = null,
  renewable = null,
}) {
  if (!summary?.entryCount) {
    return [
      {
        id: 'no-records',
        title: 'No records in this reporting period',
        detail: `No activity records were available for ${monthRangeLabel(
          from,
          to,
        )}, so no emissions or resource observations can be derived.`,
      },
    ];
  }

  const observations = [];
  const totalKg = summary.totalKg;

  const categories = EMISSION_CATEGORIES.map((category) => ({
    category,
    label: CATEGORY_META[category].label,
    kg: summary.byCategory?.[category] ?? 0,
  })).sort((a, b) => b.kg - a.kg);
  const topCategory = categories[0];

  if (topCategory && topCategory.kg > 0 && totalKg > 0) {
    observations.push({
      id: 'dominant-source',
      title: `${topCategory.label} is the largest emission source`,
      detail: `${topCategory.label} accounts for ${formatPercent(
        (topCategory.kg / totalKg) * 100,
        { digits: 0, alreadyPercent: true },
      )} of the estimated footprint (${formatTonnes(topCategory.kg)}) in ${monthRangeLabel(
        from,
        to,
      )}.`,
    });
  }

  if (totalKg > 0) {
    const scopeRows = [1, 2, 3]
      .map((scope) => ({
        scope,
        kg: summary.byScope?.[scope] ?? 0,
        share: ((summary.byScope?.[scope] ?? 0) / totalKg) * 100,
      }))
      .sort((a, b) => b.kg - a.kg);
    const largest = scopeRows[0];
    const split = scopeRows
      .map(
        (row) =>
          `${SCOPE_META[row.scope].label} ${formatPercent(row.share, {
            digits: 0,
            alreadyPercent: true,
          })}`,
      )
      .join(', ');
    observations.push({
      id: 'scope-mix',
      title: `${SCOPE_META[largest.scope].label} is the largest scope`,
      detail: `${SCOPE_META[largest.scope].name} contributes ${formatTonnes(
        largest.kg,
      )}. The scope split is ${split}.`,
    });
  }

  const buildingsWithData = (buildings ?? []).filter(
    (building) => building.entryCount > 0 && building.kg > 0,
  );
  if (buildingsWithData.length) {
    const leader = buildingsWithData[0];
    const intensity =
      leader.intensityKgPerSqm === null
        ? 'No floor area is recorded for this building, so intensity cannot be calculated.'
        : `Intensity is ${formatNumber(leader.intensityKgPerSqm, {
            digits: 1,
          })} kgCO₂e/m².`;
    observations.push({
      id: 'building-leader',
      title: `${leader.name} has the highest building footprint`,
      detail: `${leader.name} produced ${formatTonnes(leader.kg)} across ${formatNumber(
        leader.entryCount,
      )} record${leader.entryCount === 1 ? '' : 's'}${
        totalKg > 0 ? ` — ${formatPercent(leader.share, { digits: 0, alreadyPercent: true })} of the footprint` : ''
      }. ${intensity}`,
    });
  }

  if (previous?.entryCount && previousRange) {
    const change = percentChange(totalKg, previous.totalKg);
    if (change !== null) {
      observations.push({
        id: 'period-change',
        title: `Emissions are ${formatNumber(Math.abs(change), { digits: 1 })}% ${
          change <= 0 ? 'lower' : 'higher'
        } than the previous period`,
        detail: `${formatTonnes(totalKg)} in ${monthRangeLabel(from, to)} compared with ${formatTonnes(
          previous.totalKg,
        )} in ${monthRangeLabel(previousRange.from, previousRange.to)} (${formatSignedPercent(change, {
          digits: 1,
        })}). Confirm the change reflects consumption rather than missing records.`,
      });
    }
  }

  if (summary.metrics.wasteKg > 0) {
    const landfillKg = summary.byWasteDisposal?.landfill?.weightKg ?? 0;
    observations.push({
      id: 'waste-diversion',
      title: `Waste diversion is ${formatPercent(summary.metrics.diversionRate, {
        digits: 0,
      })}`,
      detail: `${formatWeight(summary.metrics.wasteDivertedKg)} of ${formatWeight(
        summary.metrics.wasteKg,
      )} recorded waste was recycled or composted; ${formatWeight(landfillKg)} went to landfill.`,
    });
  }

  if (summary.metrics.waterM3 > 0) {
    const people = totalOccupants(profile);
    const perPerson = people > 0 ? summary.metrics.waterM3 / people : null;
    observations.push({
      id: 'water-use',
      title: `Water use totals ${formatWater(summary.metrics.waterM3)}`,
      detail:
        perPerson === null
          ? 'Water is tracked as a resource metric and is not assigned to a GHG scope.'
          : `${formatNumber(perPerson, { digits: 2 })} kL per student and staff member over the period. Water is tracked as a resource metric and is not assigned to a GHG scope.`,
    });
  }

  if (coverage && coverage.months > 0) {
    const complete = coverage.coveredMonths === coverage.months;
    observations.push({
      id: 'coverage',
      title: complete
        ? 'All months in the period have records'
        : `${coverage.coveredMonths} of ${coverage.months} months have records`,
      detail: complete
        ? 'Every month contains at least one activity record, so month-to-month comparisons are continuous.'
        : `${coverage.months - coverage.coveredMonths} month${
            coverage.months - coverage.coveredMonths === 1 ? ' has' : 's have'
          } no records. Missing months can understate activity and weaken trend comparisons.`,
    });
  }

  if (renewable?.kwh > 0 && renewable.share !== null && renewable.share !== undefined) {
    observations.push({
      id: 'renewable-sample',
      title: `Sample solar generation would cover ${formatPercent(renewable.share, {
        digits: 0,
        alreadyPercent: true,
      })} of electricity`,
      detail: `Illustrative on-site generation of ${formatNumber(
        renewable.kwh,
      )} kWh is shown for context only. It is sample data, not metered generation, and is excluded from the emission totals.`,
    });
  }

  return observations.slice(0, 7);
}

/**
 * Data limitations are deliberately explicit. They explain what the report can
 * and cannot be used for, and adapt to the coverage of the selected period.
 */
export function buildReportLimitations({
  coverage = null,
  isSample = false,
  sampleRecordCount = 0,
  unattributedShare = 0,
  renewable = null,
}) {
  const items = [];

  if (isSample) {
    items.push(
      `This is a sample report: it is generated from the demo dataset included with the prototype (${formatNumber(
        sampleRecordCount,
      )} demo records detected). It does not describe measured performance of a real college.`,
    );
  }

  items.push(
    'Emission factors are configurable reference values. They have not been verified against a national inventory, utility-specific factor or third-party assurance for this college.',
  );
  items.push(
    'All figures are estimates calculated from manually recorded activity data. They are not a verified GHG inventory, and no metering, invoice reconciliation or audit has been performed.',
  );
  items.push(
    'Scope 3 currently covers staff and student commuting and waste disposal only. Purchased goods and services, capital goods, business travel and other upstream or downstream emissions are excluded.',
  );

  if (unattributedShare > 0) {
    items.push(
      `${formatPercent(unattributedShare, {
        digits: 0,
        alreadyPercent: true,
      })} of estimated emissions are campus-wide or not linked to a building, so building comparisons do not cover the whole footprint.`,
    );
  } else {
    items.push(
      'Building figures depend on each activity record being linked to a building. In this period every emission was attributed.',
    );
  }

  if (coverage && coverage.months > 0) {
    const missing = coverage.months - coverage.coveredMonths;
    if (missing > 0) {
      items.push(
        `${missing} of ${coverage.months} months have no records. Missing months can make trends and period comparisons understate actual activity.`,
      );
    } else {
      items.push(
        'Every month in the reporting period has at least one record, but the number of records per month may still vary.',
      );
    }
  }

  items.push('Water is reported as a resource metric and is not assigned to a GHG scope.');

  if (renewable?.sampleTotalKwh > 0) {
    items.push(
      'Renewable generation is illustrative sample data, not metered on-site generation, and is excluded from the emission totals.',
    );
  }

  items.push(
    'This report is intended for internal sustainability planning. It is not suitable for regulatory disclosure or external assurance without verification.',
  );

  return items;
}

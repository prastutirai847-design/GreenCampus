import { getFuelType } from '../data/options.js';
import { getRecentMonths, lastCompleteMonthKey, monthLabel, monthsInRange } from './dates.js';
import { formatKwh, formatNumber, formatTonnes, formatWater, formatWeight } from './format.js';
import {
  filterActivities,
  rankBuildings,
  summarizeActivities,
  totalOccupants,
} from './analytics.js';

/**
 * Deterministic sustainability recommendation engine.
 *
 * The engine is deliberately separate from the page, the service layer and any
 * future AI endpoint. Every rule below is explicit, testable and reports why it
 * did or did not trigger. It never invents a savings percentage: an expected
 * benefit is returned only when it can be calculated from measured data and a
 * configured factor, and it is always presented as a potential gap, not a
 * guaranteed reduction.
 */
export const ENGINE_VERSION = 'rules-v1';
export const DEFAULT_WINDOW_MONTHS = 12;

export const RULE_DEFINITIONS = [
  {
    id: 'electricity-trend',
    label: 'Electricity change vs previous month',
    threshold: 'Latest month up by 5% or more, with at least 5,000 kWh in both months',
    category: 'Electricity',
  },
  {
    id: 'electricity-intensity',
    label: 'Building electricity intensity outlier',
    threshold: 'At least 3 buildings with floor area; worst is 25% above the campus median',
    category: 'Electricity',
  },
  {
    id: 'electricity-dominant',
    label: 'Electricity dominance and lighting review',
    threshold: 'Electricity is 40% or more of the period footprint',
    category: 'Electricity',
  },
  {
    id: 'generator-fuel',
    label: 'Generator fuel review',
    threshold: 'Diesel is 35% or more of Scope 1 emissions',
    category: 'Fuel',
  },
  {
    id: 'waste-diversion',
    label: 'Waste segregation and diversion',
    threshold: 'Landfill is 30% or more of waste, or diversion is below 40%',
    category: 'Waste',
  },
  {
    id: 'commute-shift',
    label: 'Commuting mode shift',
    threshold: 'Cars are 25% or more of commuting emissions',
    category: 'Commuting',
  },
  {
    id: 'water-intensity',
    label: 'Building water intensity outlier',
    threshold: 'At least 2 buildings with occupants; worst is 50% above the campus average per occupant',
    category: 'Water',
  },
  {
    id: 'data-completeness',
    label: 'Inventory data completeness',
    threshold: 'Every month has records and every category is covered',
    category: 'Data quality',
  },
];

const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function percent(part, total) {
  return total > 0 ? (part / total) * 100 : 0;
}

function resolveRange({ from, to, months = DEFAULT_WINDOW_MONTHS } = {}) {
  if (from && to) return { from, to };
  const recent = getRecentMonths(months, lastCompleteMonthKey());
  return { from: recent[0], to: recent[recent.length - 1] };
}

function priority(level, reason) {
  return { level, reason };
}

function makeCheck(definition, status, detail) {
  return {
    id: definition.id,
    label: definition.label,
    threshold: definition.threshold,
    category: definition.category,
    status,
    detail,
  };
}

function sortRecommendations(items) {
  return [...items].sort((a, b) => {
    const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (byPriority !== 0) return byPriority;
    const aKg = a.expectedBenefit?.kg ?? 0;
    const bKg = b.expectedBenefit?.kg ?? 0;
    if (bKg !== aKg) return bKg - aKg;
    return a.title.localeCompare(b.title);
  });
}

function buildElectricityTrend({ summary, checks }) {
  const definition = RULE_DEFINITIONS.find((rule) => rule.id === 'electricity-trend');
  const months = (summary.byMonth ?? []).filter((month) => month.electricityKwh > 0);
  if (months.length < 2) {
    checks.push(
      makeCheck(
        definition,
        'insufficient-data',
        'At least two months of electricity readings are needed to compare monthly use.',
      ),
    );
    return null;
  }

  const latest = months[months.length - 1];
  const previous = months[months.length - 2];
  const deltaKwh = latest.electricityKwh - previous.electricityKwh;
  const changePercent = previous.electricityKwh > 0 ? (deltaKwh / previous.electricityKwh) * 100 : 0;
  const minimumKwh = 5000;

  if (
    changePercent < 5 ||
    latest.electricityKwh < minimumKwh ||
    previous.electricityKwh < minimumKwh
  ) {
    checks.push(
      makeCheck(
        definition,
        'clear',
        `${monthLabel(latest.period)} electricity was ${formatKwh(latest.electricityKwh)} vs ${formatKwh(
          previous.electricityKwh,
        )} in ${monthLabel(previous.period)} (${changePercent >= 0 ? '+' : ''}${formatNumber(
          changePercent,
          { digits: 1 },
        )}%). The trigger is a 5% rise on at least 5,000 kWh.`,
      ),
    );
    return null;
  }

  const deltaKg = latest.scope2 - previous.scope2;
  const priorityValue = priority(changePercent >= 15 ? 'High' : 'Medium');
  checks.push(
    makeCheck(
      definition,
      'triggered',
      `${monthLabel(latest.period)} electricity rose ${formatNumber(changePercent, {
        digits: 1,
      })}% (${formatKwh(latest.electricityKwh)} vs ${formatKwh(previous.electricityKwh)}).`,
    ),
  );

  return {
    id: `electricity-trend-${latest.period}`,
    ruleId: definition.id,
    title: `Electricity use rose in ${monthLabel(latest.period)}`,
    category: 'Electricity',
    categoryId: 'electricity',
    scope: 2,
    priority: priorityValue.level,
    priorityReason:
      changePercent >= 15
        ? 'Monthly electricity increased by 15% or more.'
        : 'Monthly electricity increased by at least 5%.',
    explanation: `${monthLabel(latest.period)} purchased electricity was ${formatKwh(
      latest.electricityKwh,
    )}, up ${formatKwh(deltaKwh)} (${formatNumber(changePercent, { digits: 1 })}%) on ${monthLabel(
      previous.period,
    )}. At the configured grid factor this adds about ${formatTonnes(
      deltaKg,
    )} to that month's Scope 2 inventory.`,
    evidence: [
      { label: `${monthLabel(latest.period)} electricity`, value: formatKwh(latest.electricityKwh) },
      { label: `${monthLabel(previous.period)} electricity`, value: formatKwh(previous.electricityKwh) },
      { label: 'Change', value: `+${formatKwh(deltaKwh)} (${formatNumber(changePercent, { digits: 1 })}%)` },
      { label: 'Scope 2 change', value: `+${formatTonnes(deltaKg)}` },
    ],
    action:
      'Check meter reads and operating hours for the latest month, then inspect the largest end uses (cooling, laboratories, lighting and IT). Set a review trigger if the increase persists for a second month before changing targets.',
    effort: 'Low',
    expectedBenefit: null,
    benefitSummary: 'No savings estimate — investigate the cause first',
    basis:
      'Compares the two most recent months with electricity readings inside the analysis window using recorded kWh and the configured grid factor. An increase is a signal to investigate, not proof of waste.',
  };
}

function buildBuildingIntensity({ ranking, summary, factors, checks }) {
  const definition = RULE_DEFINITIONS.find((rule) => rule.id === 'electricity-intensity');
  const candidates = ranking.filter(
    (building) => building.electricityKwh > 0 && building.areaSqm > 0,
  );
  if (candidates.length < 3) {
    checks.push(
      makeCheck(
        definition,
        'insufficient-data',
        `${candidates.length} building${
          candidates.length === 1 ? '' : 's'
        } have both electricity and floor-area data; at least 3 are needed for a median comparison.`,
      ),
    );
    return null;
  }

  const intensities = candidates.map((building) => ({
    ...building,
    electricityIntensity: building.electricityKwh / building.areaSqm,
  }));
  const campusMedian = median(intensities.map((building) => building.electricityIntensity));
  const worst = intensities.reduce((top, building) =>
    building.electricityIntensity > top.electricityIntensity ? building : top,
  );
  const ratio = campusMedian > 0 ? worst.electricityIntensity / campusMedian : 0;

  if (ratio < 1.25) {
    checks.push(
      makeCheck(
        definition,
        'clear',
        `The most intensive building (${worst.name}) is ${formatNumber(ratio, {
          digits: 2,
        })}× the campus median of ${formatNumber(campusMedian, { digits: 1 })} kWh/m²; the trigger is 1.25×.`,
      ),
    );
    return null;
  }

  const gridFactor = Number(factors?.gridElectricity?.value) || 0;
  const gapKwh = worst.electricityKwh - campusMedian * worst.areaSqm;
  const gapKg = gapKwh * gridFactor;
  const priorityValue = priority(ratio >= 1.75 ? 'High' : 'Medium');
  checks.push(
    makeCheck(
      definition,
      'triggered',
      `${worst.name} uses ${formatNumber(worst.electricityIntensity, {
        digits: 1,
      })} kWh/m², ${formatNumber(ratio, { digits: 1 })}× the campus median.`,
    ),
  );

  return {
    id: `electricity-intensity-${worst.id}`,
    ruleId: definition.id,
    title: `Investigate high electricity intensity in ${worst.name}`,
    category: 'Electricity',
    categoryId: 'electricity',
    scope: 2,
    priority: priorityValue.level,
    priorityReason:
      ratio >= 1.75
        ? 'Electricity intensity is at least 1.75× the campus median.'
        : 'Electricity intensity is at least 1.25× the campus median.',
    explanation: `${worst.name} used ${formatKwh(
      worst.electricityKwh,
    )} across ${formatNumber(worst.areaSqm)} m², or ${formatNumber(
      worst.electricityIntensity,
      { digits: 1 },
    )} kWh/m². That is ${formatNumber(ratio, {
      digits: 1,
    })}× the campus median of ${formatNumber(campusMedian, {
      digits: 1,
    })} kWh/m² among buildings with electricity and floor-area data. Laboratory or catering loads may be functionally necessary, so verify use before setting a target.`,
    evidence: [
      { label: 'Building electricity', value: formatKwh(worst.electricityKwh) },
      { label: 'Floor area', value: `${formatNumber(worst.areaSqm)} m²` },
      {
        label: 'Intensity',
        value: `${formatNumber(worst.electricityIntensity, { digits: 1 })} kWh/m²`,
      },
      { label: 'Campus median', value: `${formatNumber(campusMedian, { digits: 1 })} kWh/m²` },
    ],
    action:
      'Audit metering, operating schedules, equipment and process loads in this building before setting a reduction target. Prioritise controls and maintenance where the audit confirms avoidable load, and compare only with buildings of similar use.',
    effort: 'Medium',
    expectedBenefit:
      gridFactor > 0 && gapKwh > 0
        ? {
            kind: 'co2e',
            display: `Up to ${formatTonnes(gapKg, { digits: 0 })}/year`,
            kg: gapKg,
            kwh: gapKwh,
            waterM3: null,
            assumption: `Measured gap between this building's electricity intensity and the campus median (${formatKwh(
              gapKwh,
            )}), multiplied by the configured grid factor (${formatNumber(gridFactor, {
              digits: 2,
            })} kgCO₂e/kWh). A planning indicator only — not a forecast or a guaranteed reduction.`,
          }
        : null,
    benefitSummary:
      gridFactor > 0 && gapKwh > 0
        ? `Up to ${formatTonnes(gapKg, { digits: 0 })}/year potential gap`
        : 'No savings estimate',
    basis:
      'Uses recorded electricity, building floor area and the configured grid-electricity factor. The median is a campus benchmark, not an engineering standard; functional differences in building use can explain the gap.',
  };
}

function buildElectricityDominance({ summary, checks }) {
  const definition = RULE_DEFINITIONS.find((rule) => rule.id === 'electricity-dominant');
  if (summary.metrics.electricityKwh <= 0 || summary.totalKg <= 0) {
    checks.push(
      makeCheck(
        definition,
        'insufficient-data',
        'No electricity records or no estimateable emissions in the window.',
      ),
    );
    return null;
  }

  const electricityKg = summary.byCategory.electricity ?? 0;
  const share = percent(electricityKg, summary.totalKg);
  if (share < 40) {
    checks.push(
      makeCheck(
        definition,
        'clear',
        `Electricity is ${formatNumber(share, { digits: 1 })}% of the footprint; the trigger is 40%.`,
      ),
    );
    return null;
  }

  checks.push(
    makeCheck(
      definition,
      'triggered',
      `Electricity is ${formatNumber(share, { digits: 1 })}% of the footprint (${formatKwh(
        summary.metrics.electricityKwh,
      )}).`,
    ),
  );

  return {
    id: 'electricity-dominant-lighting',
    ruleId: definition.id,
    title: 'Review lighting and HVAC schedules before capital works',
    category: 'Electricity',
    categoryId: 'electricity',
    scope: 2,
    priority: 'Medium',
    priorityReason: 'Electricity is the largest source of estimated emissions.',
    explanation: `Purchased electricity accounts for ${formatNumber(share, {
      digits: 1,
    })}% of the period footprint (${formatTonnes(
      electricityKg,
    )}) and ${formatKwh(summary.metrics.electricityKwh)} of consumption. Lighting and HVAC schedules are usually the fastest loads to verify because they can be adjusted without major capital spending.`,
    evidence: [
      { label: 'Electricity consumption', value: formatKwh(summary.metrics.electricityKwh) },
      { label: 'Share of footprint', value: `${formatNumber(share, { digits: 1 })}%` },
      { label: 'Electricity emissions', value: formatTonnes(electricityKg) },
    ],
    action:
      'Walk the largest buildings with facilities: count remaining fluorescent or incandescent fixtures, check occupancy-sensor coverage and after-hours schedules, and replace inefficient lighting with LED only where a lifecycle assessment supports it. Combine with HVAC setback and shutdown routines.',
    effort: 'Low',
    expectedBenefit: null,
    benefitSummary: 'No savings estimate — fixture and operating-hour data needed',
    basis:
      'Triggered by the electricity share of the estimated footprint. A lighting or HVAC saving cannot be estimated without fixture counts, wattages and operating hours, so none is shown.',
  };
}

function buildGeneratorFuel({ summary, checks }) {
  const definition = RULE_DEFINITIONS.find((rule) => rule.id === 'generator-fuel');
  const diesel = summary.byFuelType?.diesel;
  const scope1Kg = summary.byScope[1] ?? 0;
  if (!diesel || diesel.quantity <= 0) {
    checks.push(
      makeCheck(definition, 'insufficient-data', 'No diesel records in the analysis window.'),
    );
    return null;
  }

  const share = percent(diesel.kg, scope1Kg);
  if (share < 35) {
    checks.push(
      makeCheck(
        definition,
        'clear',
        `Diesel is ${formatNumber(share, {
          digits: 1,
        })}% of Scope 1 emissions; the trigger is 35%.`,
      ),
    );
    return null;
  }

  const fuel = getFuelType('diesel');
  const unit = fuel?.unit ?? 'litres';
  checks.push(
    makeCheck(
      definition,
      'triggered',
      `Diesel is ${formatNumber(share, { digits: 1 })}% of Scope 1 emissions (${formatNumber(
        diesel.quantity,
      )} ${unit}).`,
    ),
  );

  return {
    id: 'generator-fuel-review',
    ruleId: definition.id,
    title: 'Review generator fuel consumption',
    category: 'Fuel',
    categoryId: 'fuel',
    scope: 1,
    priority: 'Medium',
    priorityReason: 'Diesel dominates direct (Scope 1) combustion emissions.',
    explanation: `Diesel accounts for ${formatNumber(share, {
      digits: 1,
    })}% of Scope 1 emissions: ${formatNumber(diesel.quantity)} ${unit}, producing about ${formatTonnes(
      diesel.kg,
    )}. Backup-generation runtime is often the largest controllable direct-combustion source on campus.`,
    evidence: [
      { label: 'Diesel quantity', value: `${formatNumber(diesel.quantity)} ${unit}` },
      { label: 'Diesel emissions', value: formatTonnes(diesel.kg) },
      { label: 'Share of Scope 1', value: `${formatNumber(share, { digits: 1 })}%` },
    ],
    action:
      'Review generator sizing, test schedules, maintenance and outage logs. Track generator hours alongside diesel purchases, fix unnecessary no-load testing, and assess battery or solar-backed backup for short outages where it is technically suitable.',
    effort: 'Medium',
    expectedBenefit: null,
    benefitSummary: 'No savings estimate — generator hours and load data needed',
    basis:
      'Triggered by diesel’s share of Scope 1 emissions. A saving cannot be estimated without generator hours, load profiles and outage requirements, so none is shown.',
  };
}

function buildWasteDiversion({ summary, checks }) {
  const definition = RULE_DEFINITIONS.find((rule) => rule.id === 'waste-diversion');
  const wasteKg = summary.metrics.wasteKg;
  if (wasteKg <= 0) {
    checks.push(
      makeCheck(definition, 'insufficient-data', 'No waste records in the analysis window.'),
    );
    return null;
  }

  const landfill = summary.byWasteDisposal?.landfill ?? { weightKg: 0, kg: 0 };
  const landfillShare = percent(landfill.weightKg, wasteKg);
  const diversionRate = summary.metrics.diversionRate * 100;
  if (landfillShare < 30 && diversionRate >= 40) {
    checks.push(
      makeCheck(
        definition,
        'clear',
        `Landfill is ${formatNumber(landfillShare, {
          digits: 1,
        })}% of waste and diversion is ${formatNumber(diversionRate, {
          digits: 1,
        })}%; neither trigger applies.`,
      ),
    );
    return null;
  }

  const highPriority = landfillShare >= 50 || diversionRate < 30;
  checks.push(
    makeCheck(
      definition,
      'triggered',
      `Landfill is ${formatNumber(landfillShare, {
        digits: 1,
      })}% of recorded waste; diversion is ${formatNumber(diversionRate, { digits: 1 })}%.`,
    ),
  );

  return {
    id: 'waste-diversion',
    ruleId: definition.id,
    title: 'Strengthen waste segregation and diversion',
    category: 'Waste',
    categoryId: 'waste',
    scope: 3,
    priority: highPriority ? 'High' : 'Medium',
    priorityReason: highPriority
      ? 'Landfill dominates the waste stream or diversion is below 30%.'
      : 'Landfill or diversion crossed the review threshold.',
    explanation: `${formatWeight(landfill.weightKg)} of ${formatWeight(
      wasteKg,
    )} recorded waste (${formatNumber(landfillShare, {
      digits: 1,
    })}%) went to landfill, producing about ${formatTonnes(
      landfill.kg,
    )}. Recycling and composting diverted ${formatNumber(diversionRate, {
      digits: 1,
    })}% of waste by weight.`,
    evidence: [
      { label: 'Waste recorded', value: formatWeight(wasteKg) },
      { label: 'Landfilled', value: formatWeight(landfill.weightKg) },
      { label: 'Landfill emissions', value: formatTonnes(landfill.kg) },
      { label: 'Diversion rate', value: `${formatNumber(diversionRate, { digits: 1 })}%` },
    ],
    action:
      'Introduce source segregation at canteens, hostels and academic blocks; expand composting for food waste; contract recyclers for paper, plastic and glass-metal; and weigh each stream monthly so diversion can be tracked against a published target.',
    effort: 'Medium',
    expectedBenefit: null,
    benefitSummary: 'No savings estimate — waste composition and capture rates needed',
    basis:
      'Uses recorded waste weights and disposal methods. The avoided-emission benefit depends on composition, capture rates and the receiving facility, which are not recorded, so no saving is claimed.',
  };
}

function buildCommuteShift({ summary, checks }) {
  const definition = RULE_DEFINITIONS.find((rule) => rule.id === 'commute-shift');
  const commutingKg = summary.byCategory.commuting ?? 0;
  if (commutingKg <= 0) {
    checks.push(
      makeCheck(
        definition,
        'insufficient-data',
        'No commuting records in the analysis window.',
      ),
    );
    return null;
  }

  const car = summary.byCommuteMode?.car ?? { kg: 0, passengerKm: 0 };
  const carShare = percent(car.kg, commutingKg);
  if (carShare < 25) {
    checks.push(
      makeCheck(
        definition,
        'clear',
        `Cars are ${formatNumber(carShare, {
          digits: 1,
        })}% of commuting emissions; the trigger is 25%.`,
      ),
    );
    return null;
  }

  checks.push(
    makeCheck(
      definition,
      'triggered',
      `Cars are ${formatNumber(carShare, {
        digits: 1,
      })}% of commuting emissions (${formatTonnes(car.kg)}).`,
    ),
  );

  return {
    id: 'commute-shift',
    ruleId: definition.id,
    title: 'Shift car commuters to shared or active travel',
    category: 'Commuting',
    categoryId: 'commuting',
    scope: 3,
    priority: carShare >= 40 ? 'High' : 'Medium',
    priorityReason:
      carShare >= 40
        ? 'Cars are at least 40% of commuting emissions.'
        : 'Cars are at least 25% of commuting emissions.',
    explanation: `Private cars contribute ${formatNumber(carShare, {
      digits: 1,
    })}% of commuting emissions (${formatTonnes(
      car.kg,
    )}) across ${formatNumber(car.passengerKm)} passenger-km. Bus and rail records show that lower-carbon modes are already in use, which makes a targeted mode shift plausible.`,
    evidence: [
      { label: 'Commuting emissions', value: formatTonnes(commutingKg) },
      { label: 'Car emissions', value: formatTonnes(car.kg) },
      { label: 'Car share', value: `${formatNumber(carShare, { digits: 1 })}%` },
      { label: 'Car passenger-km', value: formatNumber(car.passengerKm) },
    ],
    action:
      'Survey origins and routes, then trial a shuttle on the busiest corridors, structured carpool matching, secure cycle parking and shower facilities. Re-survey mode share after one semester and adjust the service to actual demand.',
    effort: 'Medium',
    expectedBenefit: null,
    benefitSummary: 'No savings estimate — depends on participation',
    basis:
      'Uses recorded commuting modes and passenger-km. A reduction depends on how many commuters change mode and on vehicle occupancy, which are not known, so no saving is claimed.',
  };
}

function buildWaterIntensity({ summary, ranking, profile, checks }) {
  const definition = RULE_DEFINITIONS.find((rule) => rule.id === 'water-intensity');
  const people = totalOccupants(profile);
  const candidates = ranking.filter(
    (building) => building.waterM3 > 0 && building.occupants > 0,
  );
  if (people <= 0 || candidates.length < 2 || summary.metrics.waterM3 <= 0) {
    checks.push(
      makeCheck(
        definition,
        'insufficient-data',
        'At least two buildings with water records and occupant counts, plus campus occupancy, are needed.',
      ),
    );
    return null;
  }

  const campusAverage = summary.metrics.waterM3 / people;
  const worst = candidates.reduce((top, building) =>
    building.waterPerOccupant > top.waterPerOccupant ? building : top,
  );
  const ratio = campusAverage > 0 ? worst.waterPerOccupant / campusAverage : 0;
  if (ratio < 1.5) {
    checks.push(
      makeCheck(
        definition,
        'clear',
        `The most intensive building (${worst.name}) uses ${formatNumber(ratio, {
          digits: 2,
        })}× the campus average per occupant; the trigger is 1.5×.`,
      ),
    );
    return null;
  }

  const gapM3 = worst.waterM3 - campusAverage * worst.occupants;
  checks.push(
    makeCheck(
      definition,
      'triggered',
      `${worst.name} uses ${formatNumber(worst.waterPerOccupant, {
        digits: 2,
      })} kL per occupant, ${formatNumber(ratio, { digits: 1 })}× the campus average.`,
    ),
  );

  return {
    id: `water-intensity-${worst.id}`,
    ruleId: definition.id,
    title: `Investigate water intensity in ${worst.name}`,
    category: 'Water',
    categoryId: 'water',
    scope: null,
    priority: 'Medium',
    priorityReason: 'Water use per occupant is at least 1.5× the campus average.',
    explanation: `${worst.name} used ${formatWater(
      worst.waterM3,
    )}, or ${formatNumber(worst.waterPerOccupant, {
      digits: 2,
    })} kL per occupant, compared with a campus average of ${formatNumber(campusAverage, {
      digits: 2,
    })} kL. Water is tracked as a resource metric and is not assigned to a GHG scope.`,
    evidence: [
      { label: 'Building water', value: formatWater(worst.waterM3) },
      { label: 'Occupants', value: formatNumber(worst.occupants) },
      {
        label: 'Per occupant',
        value: `${formatNumber(worst.waterPerOccupant, { digits: 2 })} kL`,
      },
      { label: 'Campus average', value: `${formatNumber(campusAverage, { digits: 2 })} kL` },
    ],
    action:
      'Inspect for leaks and uncontrolled fixtures, install low-flow taps, showers and dual-flush systems where missing, and submeter large water users. Confirm occupancy assumptions before targeting the building.',
    effort: 'Low',
    expectedBenefit:
      gapM3 > 0
        ? {
            kind: 'water',
            display: `Up to ${formatWater(gapM3)}/year`,
            kg: null,
            kwh: null,
            waterM3: gapM3,
            assumption: `Measured gap between this building's water use and the campus average per occupant (${formatNumber(
              gapM3,
            )} kL over the window). A planning indicator only; actual savings depend on leak repair and fixture changes.`,
          }
        : null,
    benefitSummary:
      gapM3 > 0 ? `Up to ${formatWater(gapM3)}/year potential gap` : 'No savings estimate',
    basis:
      'Uses recorded water volumes, building occupant counts and campus occupancy. Water is a resource metric, not part of the estimated carbon footprint.',
  };
}

function buildDataCompleteness({ activities, summary, buildings, checks, from, to }) {
  const definition = RULE_DEFINITIONS.find((rule) => rule.id === 'data-completeness');
  const months = monthsInRange(from, to);
  const filtered = filterActivities(activities, from, to);
  const coveredMonths = new Set(filtered.map((activity) => activity.period));
  const missingMonths = months.filter((month) => !coveredMonths.has(month));
  const categories = ['electricity', 'water', 'fuel', 'waste', 'commuting'];
  const missingCategories = categories.filter(
    (category) => !filtered.some((activity) => activity.category === category),
  );
  const latestMonth = months[months.length - 1];
  const buildingsWithElectricity = buildings.filter((building) =>
    filtered.some(
      (activity) =>
        activity.category === 'electricity' &&
        activity.buildingId === building.id &&
        activity.period === latestMonth,
    ),
  ).length;
  const buildingGap =
    buildings.length > 0 && buildingsWithElectricity < buildings.length
      ? `${buildingsWithElectricity} of ${buildings.length} buildings have an electricity reading for ${monthLabel(
          latestMonth,
        )}`
      : null;

  const issues = [];
  if (missingMonths.length) {
    issues.push(
      `${missingMonths.length} of ${months.length} months have no records (${missingMonths
        .map((month) => monthLabel(month, 'short'))
        .join(', ')})`,
    );
  }
  if (missingCategories.length) {
    issues.push(`no records for ${missingCategories.join(', ')} in the period`);
  }
  if (buildingGap) issues.push(buildingGap);

  if (!issues.length) {
    checks.push(
      makeCheck(
        definition,
        'clear',
        `All ${months.length} months have records, every resource category is represented${
          buildings.length ? `, and all ${buildings.length} buildings have a latest-month electricity reading` : ''
        }.`,
      ),
    );
    return null;
  }

  checks.push(makeCheck(definition, 'triggered', issues.join('; ')));
  const highPriority = missingCategories.length >= 2 || missingMonths.length >= 3;
  return {
    id: 'data-completeness',
    ruleId: definition.id,
    title: 'Close the gaps in your inventory',
    category: 'Data quality',
    categoryId: 'data',
    scope: null,
    priority: highPriority ? 'Medium' : 'Low',
    priorityReason: highPriority
      ? 'Several months or categories are missing from the inventory.'
      : 'Minor gaps reduce confidence in comparisons.',
    explanation: `Data coverage is incomplete: ${issues.join('; ')}. Trends and benchmarks are only as reliable as the records behind them.`,
    evidence: [
      {
        label: 'Month coverage',
        value: `${months.length - missingMonths.length} of ${months.length}`,
      },
      {
        label: 'Categories covered',
        value: `${categories.length - missingCategories.length} of ${categories.length}`,
      },
      { label: 'Records in period', value: formatNumber(summary.entryCount) },
    ],
    action:
      'Add the missing monthly records before comparing trends or publishing a report. Consistent coverage matters more than precision for year-on-year decisions, and a complete baseline makes any future target verifiable.',
    effort: 'Low',
    expectedBenefit: null,
    benefitSummary: 'No savings estimate — improves data confidence',
    basis:
      'Compares the selected period against the active building list and the five resource categories tracked by the platform.',
  };
}

/**
 * Builds the full advisor snapshot: recommendations, rule audit, summary and
 * metadata. This is the only entry point used by the service layer.
 */
export function buildRecommendationReport({
  activities = [],
  buildings = [],
  profile,
  factors,
  from,
  to,
  months = DEFAULT_WINDOW_MONTHS,
} = {}) {
  const range = resolveRange({ from, to, months });
  const summary = summarizeActivities(activities, factors, range.from, range.to);
  const ranking = rankBuildings(activities, buildings, factors, range.from, range.to);
  const checks = [];
  const recommendations = [];

  const add = (item) => {
    if (item) recommendations.push(item);
  };

  add(buildElectricityTrend({ summary, checks }));
  add(buildBuildingIntensity({ ranking, summary, factors, checks }));
  add(buildElectricityDominance({ summary, checks }));
  add(buildGeneratorFuel({ summary, checks }));
  add(buildWasteDiversion({ summary, checks }));
  add(buildCommuteShift({ summary, checks }));
  add(buildWaterIntensity({ summary, ranking, profile, checks }));
  add(
    buildDataCompleteness({
      activities,
      summary,
      buildings,
      checks,
      from: range.from,
      to: range.to,
    }),
  );

  const sorted = sortRecommendations(recommendations);
  const monthKeys = monthsInRange(range.from, range.to);
  const recorded = new Set(
    filterActivities(activities, range.from, range.to).map((activity) => activity.period),
  );
  const sampleRecordCount =
    activities.filter((activity) => String(activity.id ?? '').startsWith('demo_')).length +
    buildings.filter((building) => String(building.id ?? '').startsWith('demo_')).length;
  const isSample = sampleRecordCount > 0;
  const byCategory = sorted.reduce((tally, item) => {
    tally[item.category] = (tally[item.category] ?? 0) + 1;
    return tally;
  }, {});

  return {
    meta: {
      engine: 'Deterministic rules',
      engineVersion: ENGINE_VERSION,
      generatedAt: new Date().toISOString(),
      from: range.from,
      to: range.to,
      periodLabel: range.from === range.to ? monthLabel(range.from) : monthLabel(range.from, 'compact') + ' – ' + monthLabel(range.to, 'compact'),
      monthCount: monthKeys.length,
      entryCount: summary.entryCount,
      buildingCount: buildings.length,
      isSample,
      sampleRecordCount,
      dataBasis: isSample ? 'Sample demo data' : 'Recorded workspace data',
      coverage: {
        months: monthKeys.length,
        coveredMonths: monthKeys.filter((month) => recorded.has(month)).length,
      },
      disclaimer:
        'Rule-based analysis, not artificial intelligence. Recommendations are prompts for investigation, not verified savings or guaranteed emission reductions.',
    },
    summary: {
      opportunities: sorted.length,
      high: sorted.filter((item) => item.priority === 'High').length,
      medium: sorted.filter((item) => item.priority === 'Medium').length,
      low: sorted.filter((item) => item.priority === 'Low').length,
      quantified: sorted.filter((item) => item.expectedBenefit).length,
      byCategory,
      monthsWithRecords: monthKeys.filter((month) => recorded.has(month)).length,
      monthsInPeriod: monthKeys.length,
    },
    recommendations: sorted,
    checks,
  };
}

/**
 * Backwards-compatible helper used by the dashboard and report generator.
 * Returns only the recommendation list.
 */
export function buildRecommendations(options = {}) {
  return buildRecommendationReport(options).recommendations;
}

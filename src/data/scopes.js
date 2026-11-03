import { SCOPE_META } from './options.js';

/**
 * GHG Protocol scope definitions used by the emissions module.
 *
 * These definitions describe how this prototype classifies activity data. They
 * are not a substitute for an organisational boundary assessment: a formal
 * inventory should confirm ownership, control and consolidation boundaries.
 */
export const SCOPE_DETAILS = {
  1: {
    ...SCOPE_META[1],
    id: 1,
    categories: ['fuel'],
    factorGroups: ['Fuels'],
    boundary:
      'GHG emissions from sources owned or controlled by the college, wherever they are located.',
    included: [
      'Diesel generators used for backup power',
      'College-owned petrol and diesel vehicles',
      'LPG and natural gas used in college-operated kitchens or laboratories',
      'Refrigerant top-ups from air-conditioning and refrigeration equipment',
    ],
    excluded: [
      'Purchased grid electricity (Scope 2)',
      'Student and staff commuting (Scope 3, category 7)',
      'Waste treatment outside the campus boundary (Scope 3, category 5)',
      'Process emissions not recorded in this prototype',
    ],
    method:
      'Recorded fuel quantity × fuel-specific combustion factor. Refrigerant top-up mass × AR4 100-year GWP. Purchased cooling and process emissions are not modelled.',
  },
  2: {
    ...SCOPE_META[2],
    id: 2,
    categories: ['electricity'],
    factorGroups: ['Energy'],
    boundary:
      'Electricity purchased from the grid and consumed by metered campus buildings.',
    included: [
      'Metered grid electricity for academic, residential and administrative buildings',
      'Purchased electricity used by shared campus infrastructure where metered',
    ],
    excluded: [
      'On-site renewable generation (it reduces purchased electricity but is not separately metered in this prototype)',
      'Fuel used by backup generators (Scope 1)',
      'Transmission and distribution losses upstream of the meter (Scope 3, category 3)',
      'Purchased steam, heating and cooling (not recorded for this campus)',
    ],
    method:
      'Location-based: metered electricity × CEA grid-average factor. Market-based: the same quantity × a supplier, residual-mix or contractual factor. No verified instruments are recorded, so the market-based view uses the location-based factor as a labelled proxy. Both methods are shown; only one is used in the scope total.',
  },
  3: {
    ...SCOPE_META[3],
    id: 3,
    categories: ['waste', 'commuting'],
    factorGroups: ['Waste', 'Commuting'],
    boundary:
      'Indirect value-chain emissions, organized under the 15 GHG Protocol Scope 3 categories. This prototype quantifies waste generated in operations (category 5) and employee and student commuting (category 7); all other categories are documented in the Scope 3 register.',
    included: [
      'Student commuting by car, two-wheeler, bus, rail and active travel',
      'Staff commuting using the same recorded travel modes',
      'Waste sent to landfill, composting, recycling or incineration',
    ],
    excluded: [
      'Purchased goods and services, capital goods and business travel (relevant, not yet quantified)',
      'Upstream fuel and energy-related activities (relevant, not yet quantified)',
      'Upstream and downstream leased assets (not yet assessed)',
      'Avoided-emission credits from recycling or energy recovery',
    ],
    method:
      'Commuting passenger-km × mode factor (category 7). Waste mass × disposal-method factor with optional waste-type overrides (category 5). Every other category carries an applicability status and is excluded from the total until quantified, so nothing is double counted.',
  },
};

export const SCOPE_ORDER = [1, 2, 3];

/**
 * Water is deliberately outside the GHG scope structure. It is reported as a
 * resource metric so consumption can be managed without implying an emission.
 */
export const WATER_METRIC = {
  id: 'water',
  label: 'Water',
  name: 'Resource metric',
  description:
    'Water consumption is tracked for sustainability performance and is never assigned to a GHG scope.',
  included: [
    'Metered water supplied to campus buildings',
    'Water recorded in kilolitres (kL) or litres (converted before storage)',
  ],
  excluded: [
    'Supply pumping and treatment energy (not modelled)',
    'Any GHG factor — no water emission factor is applied',
  ],
};

const CATEGORY_TO_SCOPE = {
  electricity: 2,
  fuel: 1,
  waste: 3,
  commuting: 3,
  water: null,
};

export function scopeForCategory(category) {
  return CATEGORY_TO_SCOPE[category] ?? null;
}

export function scopeCategories(scope) {
  return SCOPE_DETAILS[scope]?.categories ?? [];
}

export function scopeForFactorGroup(group) {
  const entry = SCOPE_ORDER.find((scope) => SCOPE_DETAILS[scope].factorGroups.includes(group));
  return entry ?? null;
}

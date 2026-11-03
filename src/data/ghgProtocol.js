/**
 * GHG Protocol reference data for the GreenCampus inventory.
 *
 * This module holds the reporting vocabulary that the rest of the application
 * uses: GHG Protocol scopes, Scope 1 source types, Scope 2 methods, the 15
 * Scope 3 categories, data-quality labels and the methodology statement.
 *
 * None of these structures asserts that the college is compliant with any
 * standard. They make the accounting choices explicit so a reviewer can see
 * what is included, what is excluded and what still has to be assessed.
 */

export const GHG_STANDARD = {
  corporate:
    'GHG Protocol Corporate Accounting and Reporting Standard (Revised Edition)',
  scope3: 'GHG Protocol Corporate Value Chain (Scope 3) Accounting and Reporting Standard',
  gwp: 'IPCC Fourth Assessment Report (AR4) 100-year global warming potentials',
  consolidation: 'Operational control',
  boundary:
    'Single college campus in India. Emissions are consolidated for activities over which the college has operational control, plus the value-chain activities listed in the Scope 3 register.',
  baseYear: 'Not established — the first complete reporting year has not been confirmed.',
  reportingYearBasis:
    'Indian financial year (1 April – 31 March) for reporting-year selection; emission factors keep the publication year of their source.',
  disclaimer:
    'Figures are estimates calculated from recorded activity data and reference emission factors. They are not an assurance statement, a compliance certification or a verified inventory.',
};

export const SCOPE2_METHODS = [
  {
    id: 'location',
    label: 'Location-based',
    shortLabel: 'Location',
    description:
      'Purchased electricity multiplied by the Central Electricity Authority (CEA) grid-average emission factor for the applicable reporting year.',
    status: 'primary',
    applied: true,
  },
  {
    id: 'market',
    label: 'Market-based',
    shortLabel: 'Market',
    description:
      'Purchased electricity multiplied by a supplier-specific, residual-mix or contractual-instrument factor. No verified instruments are recorded in this workspace, so the location-based factor is shown as a clearly labelled proxy.',
    status: 'secondary',
    applied: false,
  },
];

/**
 * Purchased energy that could sit in Scope 2. Only electricity is recorded by
 * this prototype; the others are documented as not applicable or not assessed
 * rather than silently omitted.
 */
export const SCOPE2_ENERGY_SOURCES = [
  {
    id: 'electricity',
    label: 'Purchased electricity',
    applicability: 'recorded',
    detail: 'Metered grid electricity recorded per building, reported both location-based and market-based.',
  },
  {
    id: 'steam',
    label: 'Purchased steam',
    applicability: 'not_applicable',
    detail: 'No purchased steam is recorded for this campus. Add a metered source before reporting it.',
  },
  {
    id: 'heating',
    label: 'Purchased heating',
    applicability: 'not_applicable',
    detail: 'No district heating is recorded for this campus.',
  },
  {
    id: 'cooling',
    label: 'Purchased cooling',
    applicability: 'not_applicable',
    detail: 'No purchased cooling is recorded for this campus.',
  },
];

/**
 * Scope 1 source types. `activity` explains how a source would be recorded in
 * this prototype; only combustion fuels and refrigerant top-ups are supported.
 */
export const SCOPE1_SOURCES = [
  {
    id: 'stationary-combustion',
    label: 'Stationary combustion',
    detail: 'Diesel generators, LPG or natural gas used in kitchens, laboratories and equipment.',
    activity: 'Fuel records with a stationary purpose',
  },
  {
    id: 'mobile-combustion',
    label: 'Mobile combustion',
    detail: 'Petrol or diesel used by college-owned or controlled vehicles.',
    activity: 'Fuel records with a vehicle purpose',
  },
  {
    id: 'refrigerant-leakage',
    label: 'Refrigerant leakage',
    detail: 'Refrigerant top-up quantities converted with the refrigerant global warming potential.',
    activity: 'Fuel records for R-410A, R-22 or R-134a top-ups',
  },
  {
    id: 'process-emissions',
    label: 'Process emissions',
    detail: 'Industrial or laboratory processes that release GHGs outside fuel combustion.',
    activity: 'Not recorded in this prototype',
  },
  {
    id: 'fugitive-other',
    label: 'Other fugitive emissions',
    detail: 'Other intentional or unintentional releases from owned equipment.',
    activity: 'Not recorded in this prototype',
  },
];

export const SCOPE3_STATUS = {
  applicable_measured: {
    label: 'Relevant — quantified',
    shortLabel: 'Quantified',
    tone: 'green',
    description: 'Relevant to the college and quantified from activity records in this workspace.',
  },
  applicable_not_quantified: {
    label: 'Relevant — not yet quantified',
    shortLabel: 'Not quantified',
    tone: 'amber',
    description: 'Relevant to the college but no activity data or factor set has been applied yet.',
  },
  excluded_not_relevant: {
    label: 'Assessed — not relevant',
    shortLabel: 'Not relevant',
    tone: 'neutral',
    description: 'Reviewed and assessed as not applicable to a single college campus.',
  },
  not_assessed: {
    label: 'Not yet assessed',
    shortLabel: 'Not assessed',
    tone: 'blue',
    description: 'Applicability has not been reviewed. Treat this category as an open item.',
  },
};

export const DATA_QUALITY = {
  measured: {
    label: 'Measured',
    shortLabel: 'Measured',
    tone: 'green',
    description: 'A meter reading, weighbridge ticket, fuel log or other direct measurement.',
  },
  estimated: {
    label: 'Estimated',
    shortLabel: 'Estimated',
    tone: 'amber',
    description: 'Derived from a proxy, survey, assumption or engineering estimate.',
  },
  spend_based: {
    label: 'Spend-based',
    shortLabel: 'Spend',
    tone: 'blue',
    description: 'Derived from expenditure multiplied by a spend-based factor.',
  },
  supplier_reported: {
    label: 'Supplier reported',
    shortLabel: 'Supplier',
    tone: 'green',
    description: 'Provided by a supplier or utility from its own emissions accounting.',
  },
  missing: {
    label: 'Missing / incomplete',
    shortLabel: 'Missing',
    tone: 'rose',
    description: 'Activity data is missing or incomplete; any resulting figure is understated.',
  },
};

export const DATA_QUALITY_ORDER = [
  'measured',
  'estimated',
  'spend_based',
  'supplier_reported',
  'missing',
];

/**
 * The 15 Scope 3 categories from the GHG Protocol Corporate Value Chain
 * Standard. Default applicability reflects a single-campus Indian college.
 *
 * Student commuting is reported inside category 7. The standard names employee
 * commuting; including students there is a documented inventory choice for an
 * educational institution, not a separate standard category.
 */
export const SCOPE3_CATEGORIES = [
  {
    id: 1,
    label: 'Purchased goods and services',
    defaultStatus: 'applicable_not_quantified',
    relevance: 'Paper, stationery, food, water supply, chemicals and outsourced services.',
    note: 'No procurement spend or supplier data is recorded yet.',
  },
  {
    id: 2,
    label: 'Capital goods',
    defaultStatus: 'applicable_not_quantified',
    relevance: 'Construction, laboratory equipment, vehicles and long-lived assets.',
    note: 'Capital purchases are not recorded as activity data.',
  },
  {
    id: 3,
    label: 'Fuel- and energy-related activities',
    defaultStatus: 'applicable_not_quantified',
    relevance: 'Upstream fuel extraction and transport, plus transmission and distribution losses.',
    note: 'Calculated separately from Scope 1 and Scope 2 to avoid double counting.',
  },
  {
    id: 4,
    label: 'Upstream transportation and distribution',
    defaultStatus: 'not_assessed',
    relevance: 'Inbound goods and outsourced logistics paid for by the college.',
    note: 'Not yet reviewed against procurement records.',
  },
  {
    id: 5,
    label: 'Waste generated in operations',
    defaultStatus: 'applicable_measured',
    relevance: 'Waste sent to landfill, composting, recycling or incineration.',
    note: 'Quantified from the waste activity records in this workspace.',
    linkedCategory: 'waste',
  },
  {
    id: 6,
    label: 'Business travel',
    defaultStatus: 'applicable_not_quantified',
    relevance: 'Staff travel by air, rail or road for college business.',
    note: 'No business-travel records or factors are configured.',
  },
  {
    id: 7,
    label: 'Employee and student commuting',
    defaultStatus: 'applicable_measured',
    relevance: 'Daily travel between home and campus by staff and students.',
    note: 'Quantified from recorded commuting patterns. Student commuting is included under this category by convention for a college inventory.',
    linkedCategory: 'commuting',
    deviation: true,
  },
  {
    id: 8,
    label: 'Upstream leased assets',
    defaultStatus: 'not_assessed',
    relevance: 'Leased buildings or equipment used by the college.',
    note: 'Lease arrangements have not been reviewed.',
  },
  {
    id: 9,
    label: 'Downstream transportation and distribution',
    defaultStatus: 'excluded_not_relevant',
    relevance: 'Transport of products sold by the college.',
    note: 'The college does not sell physical products.',
  },
  {
    id: 10,
    label: 'Processing of sold products',
    defaultStatus: 'excluded_not_relevant',
    relevance: 'Processing of intermediate products sold by the college.',
    note: 'No sold intermediate products.',
  },
  {
    id: 11,
    label: 'Use of sold products',
    defaultStatus: 'excluded_not_relevant',
    relevance: 'Use-phase emissions of sold products.',
    note: 'No sold products with use-phase emissions.',
  },
  {
    id: 12,
    label: 'End-of-life treatment of sold products',
    defaultStatus: 'excluded_not_relevant',
    relevance: 'Disposal of sold products.',
    note: 'No sold products.',
  },
  {
    id: 13,
    label: 'Downstream leased assets',
    defaultStatus: 'not_assessed',
    relevance: 'Assets owned by the college and leased to others.',
    note: 'Lease arrangements have not been reviewed.',
  },
  {
    id: 14,
    label: 'Franchises',
    defaultStatus: 'excluded_not_relevant',
    relevance: 'Franchise operations.',
    note: 'The college does not operate franchises.',
  },
  {
    id: 15,
    label: 'Investments',
    defaultStatus: 'excluded_not_relevant',
    relevance: 'Equity or debt investments with associated emissions.',
    note: 'No investment portfolio is held for emissions reporting.',
  },
];

export const SCOPE3_CATEGORY_MAP = Object.fromEntries(
  SCOPE3_CATEGORIES.map((category) => [category.id, category]),
);

export function scope3Category(id) {
  return SCOPE3_CATEGORY_MAP[Number(id)] ?? null;
}

export function defaultScope3Register() {
  return SCOPE3_CATEGORIES.map((category) => ({
    categoryId: category.id,
    status: category.defaultStatus,
    note: '',
    updatedAt: null,
  }));
}

/**
 * Map an activity category to the Scope 3 category it contributes to. Water is
 * a resource metric and has no Scope 3 category in this inventory.
 */
export function scope3CategoryForActivity(activity) {
  if (!activity) return null;
  if (activity.category === 'waste') {
    return { id: 5, label: SCOPE3_CATEGORY_MAP[5].label };
  }
  if (activity.category === 'commuting') {
    return { id: 7, label: SCOPE3_CATEGORY_MAP[7].label };
  }
  return null;
}

/**
 * Scope 1 subcategory for a fuel record. Refrigerants are fugitive; petrol and
 * vehicle-purpose fuels are mobile combustion; everything else is stationary.
 */
export function scope1SourceForFuel(fuelTypeId, purpose) {
  if (fuelTypeId === 'r410a' || fuelTypeId === 'r22' || fuelTypeId === 'r134a') {
    return SCOPE1_SOURCES.find((source) => source.id === 'refrigerant-leakage');
  }
  const vehiclePurpose =
    purpose === 'College vehicle' || purpose === 'College bus' || purpose === 'College shuttle';
  if (fuelTypeId === 'petrol' || (vehiclePurpose && fuelTypeId !== 'natural-gas')) {
    return SCOPE1_SOURCES.find((source) => source.id === 'mobile-combustion');
  }
  return SCOPE1_SOURCES.find((source) => source.id === 'stationary-combustion');
}

export function dataQualityMeta(value) {
  return DATA_QUALITY[value] ?? {
    label: 'Not recorded',
    shortLabel: 'Not recorded',
    tone: 'neutral',
    description: 'No data-quality classification has been recorded for this activity.',
  };
}

export function scope3StatusMeta(value) {
  return SCOPE3_STATUS[value] ?? SCOPE3_STATUS.not_assessed;
}

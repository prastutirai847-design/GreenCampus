/**
 * Reference emission factors used by the prototype.
 *
 * These are indicative default values drawn from widely published sources and are
 * intentionally editable in Settings. They are NOT a substitute for a verified
 * regional inventory factor set, and every resulting figure in the app must be
 * treated as an estimate.
 */
export const FACTOR_STATUS = {
  reference: {
    label: 'Reference / unverified',
    shortLabel: 'Reference',
    tone: 'amber',
    description:
      'An indicative value from a published source. It has not been verified for this college or region.',
  },
  verified: {
    label: 'Verified',
    shortLabel: 'Verified',
    tone: 'green',
    description:
      'A value that has been reviewed against a documented regional, utility or contractual source.',
  },
  custom: {
    label: 'Custom value',
    shortLabel: 'Custom',
    tone: 'blue',
    description: 'A value entered in this workspace. Confirm the source and applicability before reporting.',
  },
};

/**
 * Metadata conventions for every factor:
 *   source      — publication or authority the value comes from
 *   year        — applicable publication / reference year of the source
 *   region      — geographic applicability
 *   status      — reference (unverified) | verified | custom
 *   verified    — boolean shortcut for formal reporting suitability
 *   replacement — what to substitute when a verified local factor is available
 *
 * No value here is a verified, college-specific factor. The application surfaces
 * this distinction wherever emissions are shown.
 */
export const DEFAULT_FACTORS = {
  gridElectricity: {
    label: 'Grid electricity — location-based',
    value: 0.675,
    unit: 'kgCO₂e / kWh',
    group: 'Energy',
    scope: 2,
    source:
      'Central Electricity Authority (CEA) CO₂ Baseline Database, Version 22.0 — national weighted-average grid emission factor',
    year: 'FY 2025-26',
    version: 'v22.0',
    region: 'India — national weighted average',
    gasCoverage: 'CO₂',
    methodology: 'Location-based method: purchased electricity × grid-average factor',
    status: 'reference',
    verified: false,
    replacement:
      'Replace with the CEA factor for the actual reporting year, or a state/utility factor where available.',
    hint: 'CEA v22.0 publishes 0.675 tCO₂/MWh for FY 2025-26. Confirm the factor for the year you report.',
  },
  gridElectricityMarket: {
    label: 'Grid electricity — market-based proxy',
    value: 0.675,
    unit: 'kgCO₂e / kWh',
    group: 'Energy',
    scope: 2,
    source:
      'Location-based CEA v22.0 factor used as a market-based proxy — no supplier-specific, residual-mix or contractual instrument is recorded',
    year: 'FY 2025-26',
    version: 'v22.0',
    region: 'India — national weighted average proxy',
    gasCoverage: 'CO₂',
    methodology: 'Market-based method proxy; contractual instruments not verified',
    status: 'reference',
    verified: false,
    replacement:
      'Replace with a supplier-specific factor, residual mix or verified contractual instrument. Do not treat an unbundled certificate as zero-emission electricity without verification.',
    hint: 'Shown for dual Scope 2 reporting. It equals the location-based factor until instruments are verified.',
  },
  diesel: {
    label: 'Diesel',
    value: 2.68,
    unit: 'kgCO₂e / litre',
    group: 'Fuels',
    scope: 1,
    source: 'IPCC (2006) Guidelines — diesel combustion',
    year: '2006',
    version: 'IPCC 2006',
    region: 'Global default',
    gasCoverage: 'CO₂ (CO₂e basis)',
    methodology: 'Scope 1 combustion: litres × fuel factor',
    status: 'reference',
    verified: false,
    replacement: 'Replace with a national fuel emission factor for the reporting year if required.',
    hint: 'Applies to generators and college-owned diesel vehicles.',
  },
  petrol: {
    label: 'Petrol',
    value: 2.31,
    unit: 'kgCO₂e / litre',
    group: 'Fuels',
    scope: 1,
    source: 'IPCC (2006) Guidelines — petrol combustion',
    year: '2006',
    version: 'IPCC 2006',
    region: 'Global default',
    gasCoverage: 'CO₂ (CO₂e basis)',
    methodology: 'Scope 1 combustion: litres × fuel factor',
    status: 'reference',
    verified: false,
    replacement: 'Replace with a national fuel emission factor for the reporting year if required.',
    hint: 'Applies to college-owned petrol vehicles.',
  },
  lpg: {
    label: 'LPG',
    value: 2.98,
    unit: 'kgCO₂e / kg',
    group: 'Fuels',
    scope: 1,
    source: 'IPCC (2006) Guidelines — LPG combustion',
    year: '2006',
    version: 'IPCC 2006',
    region: 'Global default',
    gasCoverage: 'CO₂ (CO₂e basis)',
    methodology: 'Scope 1 combustion: kilograms × fuel factor',
    status: 'reference',
    verified: false,
    replacement: 'Replace with a national fuel emission factor for the reporting year if required.',
    hint: 'Commonly used for canteen and hostel kitchens.',
  },
  naturalGas: {
    label: 'Natural gas',
    value: 2.02,
    unit: 'kgCO₂e / SCM',
    group: 'Fuels',
    scope: 1,
    source: 'India GHG Program / GHG Protocol — natural gas combustion (indicative)',
    year: 'Indicative',
    version: 'India GHG Program',
    region: 'India — indicative',
    gasCoverage: 'CO₂ (CO₂e basis)',
    methodology: 'Scope 1 combustion: standard cubic metres × fuel factor',
    status: 'reference',
    verified: false,
    replacement:
      'Replace with a supplier calorific-value-based factor for the reporting year where available.',
    hint: 'Used where piped natural gas is metered in standard cubic metres (SCM).',
  },
  refrigerantR410a: {
    label: 'R-410A refrigerant',
    value: 2088,
    unit: 'kgCO₂e / kg',
    group: 'Refrigerants',
    scope: 1,
    source: 'IPCC Fourth Assessment Report (AR4) — 100-year global warming potential',
    year: '2007',
    version: 'AR4 GWP-100',
    region: 'Global',
    gasCoverage: 'HFC blend GWP-100',
    methodology: 'Scope 1 fugitive emissions: refrigerant top-up mass × GWP',
    status: 'reference',
    verified: false,
    replacement:
      'Update to the GWP set required by your reporting programme (AR5 or AR6) and confirm the top-up quantity.',
    hint: 'Apply to refrigerant top-up quantities, not to the total system charge.',
  },
  refrigerantR22: {
    label: 'R-22 refrigerant',
    value: 1810,
    unit: 'kgCO₂e / kg',
    group: 'Refrigerants',
    scope: 1,
    source: 'IPCC Fourth Assessment Report (AR4) — 100-year global warming potential',
    year: '2007',
    version: 'AR4 GWP-100',
    region: 'Global',
    gasCoverage: 'HCFC GWP-100',
    methodology: 'Scope 1 fugitive emissions: refrigerant top-up mass × GWP',
    status: 'reference',
    verified: false,
    replacement:
      'Update to the GWP set required by your reporting programme (AR5 or AR6) and confirm the top-up quantity.',
    hint: 'Apply to refrigerant top-up quantities, not to the total system charge.',
  },
  refrigerantR134a: {
    label: 'R-134a refrigerant',
    value: 1430,
    unit: 'kgCO₂e / kg',
    group: 'Refrigerants',
    scope: 1,
    source: 'IPCC Fourth Assessment Report (AR4) — 100-year global warming potential',
    year: '2007',
    version: 'AR4 GWP-100',
    region: 'Global',
    gasCoverage: 'HFC GWP-100',
    methodology: 'Scope 1 fugitive emissions: refrigerant top-up mass × GWP',
    status: 'reference',
    verified: false,
    replacement:
      'Update to the GWP set required by your reporting programme (AR5 or AR6) and confirm the top-up quantity.',
    hint: 'Apply to refrigerant top-up quantities, not to the total system charge.',
  },
  wasteLandfill: {
    label: 'Waste to landfill',
    value: 500,
    unit: 'kgCO₂e / tonne',
    group: 'Waste',
    scope: 3,
    source: 'Indicative planning value for mixed municipal waste (within published IPCC default ranges)',
    year: 'Indicative',
    region: 'Global default',
    status: 'reference',
    verified: false,
    replacement: 'Replace with a waste-type-specific, locally verified factor where available.',
    hint: 'Applied to every waste type sent to landfill in this demonstration factor set.',
  },
  wasteComposting: {
    label: 'Composting',
    value: 40,
    unit: 'kgCO₂e / tonne',
    group: 'Waste',
    scope: 3,
    source: 'Indicative planning value for aerated organic waste composting',
    year: 'Indicative',
    region: 'Global default',
    status: 'reference',
    verified: false,
    replacement: 'Replace with a locally verified composting factor where available.',
    hint: 'Excludes avoided-emission credits from avoided landfill.',
  },
  wasteRecycling: {
    label: 'Recycling',
    value: 30,
    unit: 'kgCO₂e / tonne',
    group: 'Waste',
    scope: 3,
    source: 'Indicative value covering collection and processing of recyclables',
    year: 'Indicative',
    region: 'Global default',
    status: 'reference',
    verified: false,
    replacement: 'Replace with material-specific recycling factors where available.',
    hint: 'Excludes avoided-emission credits from displaced virgin material.',
  },
  wasteIncineration: {
    label: 'Incineration',
    value: 800,
    unit: 'kgCO₂e / tonne',
    group: 'Waste',
    scope: 3,
    source: 'Indicative planning value for mixed waste incineration',
    year: 'Indicative',
    region: 'Global default',
    status: 'reference',
    verified: false,
    replacement: 'Replace with a locally verified incineration factor where available.',
    hint: 'Energy recovery and waste composition can change this materially.',
  },
  commuteCar: {
    label: 'Car',
    value: 0.192,
    unit: 'kgCO₂e / passenger-km',
    group: 'Commuting',
    scope: 3,
    source: 'UK DEFRA/BEIS conversion factors — average petrol car (indicative)',
    year: '2023',
    region: 'United Kingdom — indicative',
    status: 'reference',
    verified: false,
    replacement: 'Replace with an India-specific travel survey or national transport factor.',
    hint: 'Assumes average occupancy; adjust if a local survey is available.',
  },
  commuteTwoWheeler: {
    label: 'Two-wheeler',
    value: 0.113,
    unit: 'kgCO₂e / passenger-km',
    group: 'Commuting',
    scope: 3,
    source: 'UK DEFRA/BEIS conversion factors — motorcycle (indicative)',
    year: '2023',
    region: 'United Kingdom — indicative',
    status: 'reference',
    verified: false,
    replacement: 'Replace with an India-specific two-wheeler factor from a local survey.',
    hint: 'Scooters and motorcycles are grouped into one mode.',
  },
  commuteBus: {
    label: 'Bus',
    value: 0.103,
    unit: 'kgCO₂e / passenger-km',
    group: 'Commuting',
    scope: 3,
    source: 'UK DEFRA/BEIS conversion factors — local bus (indicative)',
    year: '2023',
    region: 'United Kingdom — indicative',
    status: 'reference',
    verified: false,
    replacement: 'Replace with a local bus or shuttle occupancy-based factor.',
    hint: 'College shuttle services can be recorded under this mode.',
  },
  commuteRail: {
    label: 'Train / metro',
    value: 0.035,
    unit: 'kgCO₂e / passenger-km',
    group: 'Commuting',
    scope: 3,
    source: 'UK DEFRA/BEIS conversion factors — rail (indicative)',
    year: '2023',
    region: 'United Kingdom — indicative',
    status: 'reference',
    verified: false,
    replacement: 'Replace with a national rail or metro factor for the reporting year.',
    hint: 'Includes suburban rail and metro journeys.',
  },
  commuteWalkCycle: {
    label: 'Walk / cycle',
    value: 0,
    unit: 'kgCO₂e / passenger-km',
    group: 'Commuting',
    scope: 3,
    source: 'Zero direct combustion emissions',
    year: 'n/a',
    region: 'Global',
    status: 'reference',
    verified: false,
    replacement: 'No factor is required; retained to report active-travel share.',
    hint: 'Tracked so active-travel share can be reported.',
  },
};

export const FACTOR_GROUPS = ['Energy', 'Fuels', 'Refrigerants', 'Waste', 'Commuting'];

export const FACTOR_METADATA_NOTE =
  'The applicable year is the publication or reference period of the source, not the year of the activity data. Every factor in this set is an unverified reference value.';

export const WASTE_TYPE_FACTOR_NOTE =
  'Waste emissions currently use disposal-method factors for every waste type. To apply type-specific factors, add keys such as wasteLandfillOrganic to the factor configuration; the calculation engine will prefer them automatically.';

function capitalize(value) {
  return String(value ?? '')
    .replace(/[-_ ]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Optional waste-type override key, e.g. landfill + organic => wasteLandfillOrganic.
 * The engine uses this factor when it exists in the active factor set, then falls
 * back to the disposal-method factor. No type-specific values are invented here.
 */
export function wasteTypeFactorKey(disposal, wasteCategory) {
  if (!disposal || !wasteCategory) return null;
  return `waste${capitalize(disposal)}${capitalize(wasteCategory)}`;
}

export function factorStatus(factor) {
  if (!factor) return FACTOR_STATUS.reference;
  return FACTOR_STATUS[factor.status] ?? FACTOR_STATUS.reference;
}

export function normalizeFactors(stored = {}) {
  return Object.entries(DEFAULT_FACTORS).reduce((acc, [key, definition]) => {
    const saved = stored[key];
    const raw = typeof saved === 'number' ? saved : saved?.value;
    const value = Number(raw);
    const resolvedValue = Number.isFinite(value) && value >= 0 ? value : definition.value;
    const isCustom = resolvedValue !== definition.value;
    const savedStatus = typeof saved === 'object' && saved ? saved.status : null;
    const savedVerified = typeof saved === 'object' && saved ? saved.verified : null;
    acc[key] = {
      ...definition,
      value: resolvedValue,
      status: isCustom ? 'custom' : savedStatus ?? definition.status,
      verified: isCustom ? false : savedVerified ?? definition.verified,
    };
    return acc;
  }, {});
}

export function factorValues(factors) {
  return Object.fromEntries(Object.entries(factors).map(([key, def]) => [key, def.value]));
}

export function resetFactorValues() {
  return Object.fromEntries(
    Object.entries(DEFAULT_FACTORS).map(([key, def]) => [key, def.value]),
  );
}

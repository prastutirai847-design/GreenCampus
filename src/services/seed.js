import {
  buildDemoBills,
  buildDemoDataset,
  DEFAULT_PROFILE,
  DEMO_BUILDINGS,
  DEMO_DEPARTMENTS,
} from '../data/demoData.js';
import { DEFAULT_FACTORS, normalizeFactors, resetFactorValues } from '../data/emissionFactors.js';
import { defaultScope3Register } from '../data/ghgProtocol.js';
import { readStore, removeStore, STORAGE_KEYS, writeStore } from './storage.js';

const SEED_VERSION = 'sample-v1';
const DEMO_BUILDING_BY_ID = Object.fromEntries(DEMO_BUILDINGS.map((building) => [building.id, building]));

export function seedDemoData() {
  const dataset = buildDemoDataset();
  writeStore(STORAGE_KEYS.buildings, dataset.buildings);
  writeStore(STORAGE_KEYS.departments, dataset.departments ?? []);
  writeStore(STORAGE_KEYS.activities, dataset.activities);
  writeStore(STORAGE_KEYS.bills, dataset.bills ?? []);
  writeStore(STORAGE_KEYS.profile, dataset.profile);
  writeStore(STORAGE_KEYS.factors, resetFactorValues());
  writeStore(STORAGE_KEYS.scope3, defaultScope3Register());
  writeStore(STORAGE_KEYS.meta, {
    seeded: true,
    seedVersion: SEED_VERSION,
    seededAt: new Date().toISOString(),
  });
  return {
    ...dataset,
    factors: normalizeFactors(resetFactorValues()),
  };
}

export function ensureWorkspace() {
  const meta = readStore(STORAGE_KEYS.meta, null);
  if (!meta?.seeded) {
    seedDemoData();
    return;
  }
  // Workspaces created before Phase 3 have no bills key. Seed only the sample
  // bill metadata so existing activity edits are never overwritten.
  if (readStore(STORAGE_KEYS.bills, null) === null) {
    const activities = readStore(STORAGE_KEYS.activities, []);
    writeStore(STORAGE_KEYS.bills, buildDemoBills(activities));
  }
  ensureDepartments();
  ensureReportingStandards();
}

const DEMO_RECORD_DEPARTMENTS = {
  Facilities: 'dept_facilities',
  Transport: 'dept_transport',
  Canteen: 'dept_canteen',
};

const DEMO_ACTIVITY_DEPARTMENTS = [
  { prefix: 'demo_fuel_diesel_generator_', department: 'Facilities', departmentId: 'dept_facilities' },
  { prefix: 'demo_fuel_petrol_vehicles_', department: 'Transport', departmentId: 'dept_transport' },
  { prefix: 'demo_fuel_lpg_kitchen_', department: 'Canteen', departmentId: 'dept_canteen' },
];

function demoDepartmentFor(activity) {
  if (activity.department && DEMO_RECORD_DEPARTMENTS[activity.department]) {
    return {
      department: activity.department,
      departmentId: DEMO_RECORD_DEPARTMENTS[activity.department],
    };
  }
  // Workspaces seeded before Phase 5 have no department fields at all. Their
  // ids are stable, so we can recognise the demonstration fuel rows.
  if (activity.department === undefined) {
    const match = DEMO_ACTIVITY_DEPARTMENTS.find((item) =>
      String(activity.id ?? '').startsWith(item.prefix),
    );
    if (match) return { department: match.department, departmentId: match.departmentId };
  }
  return null;
}

/**
 * Phase 5 migration. Existing workspaces keep their records; we add the
 * department catalogue and link known demonstration rows. The pass is
 * idempotent: it only fills a missing departmentId (an explicit null from an
 * administrator counts as a decision) and only when the referenced department
 * still exists, so rerunning it never duplicates or overwrites edits.
 */
function ensureDepartments() {
  let departments = readStore(STORAGE_KEYS.departments, null);
  if (departments === null) {
    departments = DEMO_DEPARTMENTS.map((department) => ({ ...department }));
    writeStore(STORAGE_KEYS.departments, departments);
  }
  const knownIds = new Set((departments ?? []).map((department) => department.id));

  const buildings = readStore(STORAGE_KEYS.buildings, []);
  const nextBuildings = buildings.map((building) => {
    const demo = DEMO_BUILDING_BY_ID[building.id];
    let next = building;
    if (next.departmentId === undefined && demo?.departmentId && knownIds.has(demo.departmentId)) {
      next = { ...next, departmentId: demo.departmentId };
    }
    // Optional building fields added in Phase 5. Only fill gaps; an explicit
    // blank from the administrator is preserved.
    if (next.floors === undefined && demo?.floors !== undefined) {
      next = { ...next, floors: demo.floors };
    }
    if (next.description === undefined && demo?.description) {
      next = { ...next, description: demo.description };
    }
    return next;
  });
  if (nextBuildings.some((building, index) => building !== buildings[index])) {
    writeStore(STORAGE_KEYS.buildings, nextBuildings);
  }

  const activities = readStore(STORAGE_KEYS.activities, []);
  const nextActivities = activities.map((activity) => {
    if (activity.departmentId) return activity;
    const match = demoDepartmentFor(activity);
    return match && knownIds.has(match.departmentId)
      ? { ...activity, department: match.department, departmentId: match.departmentId }
      : activity;
  });
  if (nextActivities.some((activity, index) => activity !== activities[index])) {
    writeStore(STORAGE_KEYS.activities, nextActivities);
  }
}

export function resetWorkspaceData() {
  Object.values(STORAGE_KEYS).forEach((key) => removeStore(key));
  return seedDemoData();
}

/**
 * Phase 9 migration: record a data-quality classification and source reference
 * for every existing activity, and create the Scope 3 register.
 *
 * Demonstration rows are marked "estimated" because they are illustrative.
 * Records an administrator entered are marked "measured" by default; the field
 * is editable per record so an estimate can be corrected without touching the
 * underlying quantity. Existing values are never overwritten.
 */
function ensureReportingStandards() {
  if (readStore(STORAGE_KEYS.scope3, null) === null) {
    writeStore(STORAGE_KEYS.scope3, defaultScope3Register());
  }
  migrateLegacyGridFactor();

  const activities = readStore(STORAGE_KEYS.activities, []);
  if (!Array.isArray(activities)) return;
  const nextActivities = activities.map((activity) => {
    if (activity.dataQuality) return activity;
    const isDemo = String(activity.id ?? '').startsWith('demo_');
    return {
      ...activity,
      dataQuality: isDemo ? 'estimated' : 'measured',
      sourceReference: activity.sourceReference ?? (isDemo ? 'Sample demo dataset' : ''),
    };
  });
  if (nextActivities.some((activity, index) => activity !== activities[index])) {
    writeStore(STORAGE_KEYS.activities, nextActivities);
  }
}

/**
 * The demonstration workspace was first seeded with 0.71 kgCO₂e/kWh for grid
 * electricity. CEA Version 22.0 reports 0.675 tCO₂/MWh for FY 2025-26, which is
 * the packaged default now. Update the stored value only when the factor set
 * still matches the old demo defaults, so an administrator's own factor edits
 * are never overwritten.
 */
const LEGACY_GRID_FACTOR = 0.71;

function migrateLegacyGridFactor() {
  const stored = readStore(STORAGE_KEYS.factors, null);
  if (!stored || typeof stored !== 'object') return;
  const raw = stored.gridElectricity;
  const value = typeof raw === 'number' ? raw : raw?.value;
  if (Number(value) !== LEGACY_GRID_FACTOR) return;

  const current = normalizeFactors(stored);
  const untouched = Object.keys(DEFAULT_FACTORS).every(
    (key) =>
      key === 'gridElectricity' ||
      Number(current[key]?.value) === Number(DEFAULT_FACTORS[key].value),
  );
  if (!untouched) return;

  writeStore(STORAGE_KEYS.factors, {
    ...stored,
    gridElectricity: DEFAULT_FACTORS.gridElectricity.value,
  });
}

export function clearActivityRecords() {
  writeStore(STORAGE_KEYS.activities, []);
}

export function clearBillRecords() {
  writeStore(STORAGE_KEYS.bills, []);
}

export function readWorkspace() {
  const profile = { ...DEFAULT_PROFILE, ...(readStore(STORAGE_KEYS.profile, {}) ?? {}) };
  return {
    buildings: readStore(STORAGE_KEYS.buildings, []),
    departments: readStore(STORAGE_KEYS.departments, []),
    activities: readStore(STORAGE_KEYS.activities, []),
    bills: readStore(STORAGE_KEYS.bills, []),
    profile,
    factors: normalizeFactors(readStore(STORAGE_KEYS.factors, {})),
    scope3: readStore(STORAGE_KEYS.scope3, null),
  };
}

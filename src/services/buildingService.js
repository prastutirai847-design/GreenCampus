import { buildBuildingReport } from '../utils/buildingAnalytics.js';
import { hasErrors, validateBuildingInput } from '../utils/validation.js';
import { apiRequest, mockRequest, newId, USE_MOCK_API } from './client.js';
import { clone, readStore, STORAGE_KEYS, writeStore } from './storage.js';

/**
 * Building service.
 *
 * Planned FastAPI endpoints:
 *   GET    /buildings
 *   POST   /buildings
 *   GET    /buildings/{id}
 *   PUT    /buildings/{id}
 *   DELETE /buildings/{id}
 *   GET    /buildings/{id}/analytics
 *
 * Deleting a building accepts a record strategy so linked activity and bill
 * records are never orphaned silently:
 *   { recordStrategy: 'reassign', reassignTo: '<building id>' }
 *   { recordStrategy: 'unassign' }
 */

export const BUILDING_ENDPOINTS = {
  list: '/buildings',
  detail: (id) => `/buildings/${encodeURIComponent(id)}`,
  analytics: (id) => `/buildings/${encodeURIComponent(id)}/analytics`,
};

function readBuildings() {
  return readStore(STORAGE_KEYS.buildings, []);
}

function writeBuildings(buildings) {
  writeStore(STORAGE_KEYS.buildings, buildings);
}

function optionalNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeBuilding(values) {
  return {
    name: String(values.name ?? '').trim(),
    type: values.type,
    floors: optionalNumber(values.floors),
    areaSqm: optionalNumber(values.areaSqm),
    occupants: optionalNumber(values.occupants),
    departmentId: values.departmentId ? String(values.departmentId) : null,
    description: String(values.description ?? '').trim(),
  };
}

function assertValid(values) {
  const errors = validateBuildingInput(values);
  if (hasErrors(errors)) throw new Error(Object.values(errors)[0]);
}

export async function listBuildings() {
  if (!USE_MOCK_API) return apiRequest(BUILDING_ENDPOINTS.list);
  return mockRequest(readBuildings());
}

export async function getBuilding(id) {
  if (!USE_MOCK_API) return apiRequest(BUILDING_ENDPOINTS.detail(id));
  const building = readBuildings().find((item) => item.id === id);
  if (!building) throw new Error('That building no longer exists.');
  return mockRequest(clone(building), 120);
}

export async function createBuilding(values) {
  assertValid(values);
  const parsed = normalizeBuilding(values);

  if (!USE_MOCK_API) {
    return apiRequest(BUILDING_ENDPOINTS.list, { method: 'POST', body: parsed });
  }

  const building = {
    id: newId('bld'),
    ...parsed,
    createdAt: new Date().toISOString(),
  };
  writeBuildings([...readBuildings(), building]);
  return mockRequest(clone(building), 160);
}

export async function updateBuilding(id, values) {
  assertValid(values);
  const parsed = normalizeBuilding(values);

  if (!USE_MOCK_API) {
    return apiRequest(BUILDING_ENDPOINTS.detail(id), { method: 'PUT', body: parsed });
  }

  const buildings = readBuildings();
  const existing = buildings.find((building) => building.id === id);
  if (!existing) throw new Error('That building no longer exists.');
  const updated = { ...existing, ...parsed, updatedAt: new Date().toISOString() };
  writeBuildings(buildings.map((building) => (building.id === id ? updated : building)));
  return mockRequest(clone(updated), 160);
}

export async function getBuildingAnalytics(id, { activities, buildings, factors, from, to, departments = [] } = {}) {
  if (!USE_MOCK_API) {
    const query = new URLSearchParams();
    if (from) query.set('from', from);
    if (to) query.set('to', to);
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`${BUILDING_ENDPOINTS.analytics(id)}${suffix}`);
  }
  const building = (buildings ?? readBuildings()).find((item) => item.id === id);
  if (!building) throw new Error('That building no longer exists.');
  const report = buildBuildingReport({
    building,
    buildings: buildings ?? readBuildings(),
    activities: activities ?? readStore(STORAGE_KEYS.activities, []),
    factors,
    from,
    to,
    departments,
  });
  return mockRequest(report, 220);
}

export async function deleteBuilding(id, options = {}) {
  if (!USE_MOCK_API) {
    return apiRequest(BUILDING_ENDPOINTS.detail(id), {
      method: 'DELETE',
      body: {
        recordStrategy: options.recordStrategy ?? 'reassign',
        reassignTo: options.reassignTo ?? null,
      },
    });
  }

  const buildings = readBuildings();
  const existing = buildings.find((building) => building.id === id);
  if (!existing) throw new Error('That building no longer exists.');

  const activities = readStore(STORAGE_KEYS.activities, []);
  const bills = readStore(STORAGE_KEYS.bills, []);
  const linkedActivities = activities.filter((activity) => activity.buildingId === id).length;
  const linkedBills = bills.filter((bill) => bill.buildingId === id).length;
  const strategy = options.recordStrategy ?? (linkedActivities || linkedBills ? null : 'unassign');

  if (!strategy && (linkedActivities > 0 || linkedBills > 0)) {
    throw new Error(
      `This building has ${linkedActivities} linked activity record${
        linkedActivities === 1 ? '' : 's'
      } and ${linkedBills} linked bill${linkedBills === 1 ? '' : 's'}. Choose where those records should go.`,
    );
  }

  let nextActivities = activities;
  let nextBills = bills;

  if (strategy === 'reassign') {
    const target = buildings.find((building) => building.id === options.reassignTo);
    if (!target || target.id === id) {
      throw new Error('Choose another building for the linked records.');
    }
    nextActivities = activities.map((activity) =>
      activity.buildingId === id ? { ...activity, buildingId: target.id } : activity,
    );
    nextBills = bills.map((bill) =>
      bill.buildingId === id ? { ...bill, buildingId: target.id } : bill,
    );
  } else if (strategy === 'unassign') {
    nextActivities = activities.map((activity) =>
      activity.buildingId === id ? { ...activity, buildingId: null } : activity,
    );
    nextBills = bills.map((bill) => (bill.buildingId === id ? { ...bill, buildingId: null } : bill));
  } else {
    throw new Error('Choose what should happen to the linked records.');
  }

  writeBuildings(buildings.filter((building) => building.id !== id));
  if (nextActivities !== activities) writeStore(STORAGE_KEYS.activities, nextActivities);
  if (nextBills !== bills) writeStore(STORAGE_KEYS.bills, nextBills);

  return mockRequest(
    {
      id,
      recordStrategy: strategy,
      reassignedTo: strategy === 'reassign' ? options.reassignTo : null,
      activities: nextActivities,
      bills: nextBills,
      movedActivities: linkedActivities,
      movedBills: linkedBills,
    },
    180,
  );
}

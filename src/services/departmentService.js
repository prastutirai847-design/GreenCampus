import { hasErrors, validateDepartmentInput } from '../utils/validation.js';
import { apiRequest, mockRequest, newId, USE_MOCK_API } from './client.js';
import { clone, readStore, STORAGE_KEYS, writeStore } from './storage.js';

/**
 * Department service.
 *
 * Planned FastAPI endpoints:
 *   GET    /departments
 *   POST   /departments
 *   PUT    /departments/{id}
 *   DELETE /departments/{id}
 *
 * A rename also updates the department name snapshot stored on fuel records so
 * exports and search stay readable. The stable departmentId remains the link.
 */

export const DEPARTMENT_ENDPOINTS = {
  list: '/departments',
  detail: (id) => `/departments/${encodeURIComponent(id)}`,
};

function readDepartments() {
  return readStore(STORAGE_KEYS.departments, []);
}

function writeDepartments(departments) {
  writeStore(STORAGE_KEYS.departments, departments);
}

function normalizeDepartment(values) {
  return {
    name: String(values.name ?? '').trim(),
    code: String(values.code ?? '').trim().toUpperCase(),
    head: String(values.head ?? '').trim(),
    description: String(values.description ?? '').trim(),
  };
}

function assertValid(values, departments, editingId) {
  const errors = validateDepartmentInput(values);
  if (hasErrors(errors)) throw new Error(Object.values(errors)[0]);
  const name = String(values.name ?? '').trim().toLowerCase();
  const duplicate = departments.some(
    (department) => department.id !== editingId && department.name.toLowerCase() === name,
  );
  if (duplicate) throw new Error('A department with that name already exists.');
}

export async function listDepartments() {
  if (!USE_MOCK_API) return apiRequest(DEPARTMENT_ENDPOINTS.list);
  return mockRequest(readDepartments());
}

export async function createDepartment(values) {
  const departments = readDepartments();
  assertValid(values, departments);
  const parsed = normalizeDepartment(values);

  if (!USE_MOCK_API) {
    return apiRequest(DEPARTMENT_ENDPOINTS.list, { method: 'POST', body: parsed });
  }

  const department = {
    id: newId('dept'),
    ...parsed,
    createdAt: new Date().toISOString(),
  };
  writeDepartments([...departments, department]);
  return mockRequest(clone(department), 150);
}

export async function updateDepartment(id, values) {
  const departments = readDepartments();
  assertValid(values, departments, id);
  const parsed = normalizeDepartment(values);

  if (!USE_MOCK_API) {
    const response = await apiRequest(DEPARTMENT_ENDPOINTS.detail(id), {
      method: 'PUT',
      body: parsed,
    });
    // The API may return the department on its own or wrapped with the
    // records whose department-name snapshot it rewrote.
    return {
      department: response?.department ?? response,
      activities: Array.isArray(response?.activities) ? response.activities : null,
      renamed: Boolean(response?.renamed),
    };
  }

  const existing = departments.find((department) => department.id === id);
  if (!existing) throw new Error('That department no longer exists.');

  const department = { ...existing, ...parsed, updatedAt: new Date().toISOString() };
  writeDepartments(
    departments.map((item) => (item.id === id ? department : item)),
  );

  let activities = readStore(STORAGE_KEYS.activities, []);
  if (existing.name !== department.name) {
    activities = activities.map((activity) => {
      const linked =
        activity.departmentId === id ||
        (!activity.departmentId && activity.department === existing.name);
      return linked
        ? { ...activity, departmentId: id, department: department.name }
        : activity;
    });
    writeStore(STORAGE_KEYS.activities, activities);
  }

  return mockRequest({ department: clone(department), activities, renamed: existing.name !== department.name }, 170);
}

export async function deleteDepartment(id) {
  if (!USE_MOCK_API) {
    return apiRequest(DEPARTMENT_ENDPOINTS.detail(id), { method: 'DELETE' });
  }

  const departments = readDepartments();
  const existing = departments.find((department) => department.id === id);
  if (!existing) throw new Error('That department no longer exists.');

  const linkedBuildings = readStore(STORAGE_KEYS.buildings, []).filter(
    (building) => building.departmentId === id,
  ).length;
  const linkedRecords = readStore(STORAGE_KEYS.activities, []).filter(
    (activity) =>
      activity.departmentId === id ||
      (!activity.departmentId && activity.department === existing.name),
  ).length;

  if (linkedBuildings > 0 || linkedRecords > 0) {
    throw new Error(
      `${existing.name} is linked to ${linkedBuildings} building${
        linkedBuildings === 1 ? '' : 's'
      } and ${linkedRecords} consumption record${
        linkedRecords === 1 ? '' : 's'
      }. Reassign them before deleting the department.`,
    );
  }

  writeDepartments(departments.filter((department) => department.id !== id));
  return mockRequest({ id }, 140);
}

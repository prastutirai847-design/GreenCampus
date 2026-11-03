import { hasErrors, parseActivityInput, validateActivityInput } from '../utils/validation.js';
import { apiRequest, mockRequest, newId, USE_MOCK_API } from './client.js';
import { clone, readStore, STORAGE_KEYS, writeStore } from './storage.js';

/**
 * Activity service.
 *
 * Planned FastAPI endpoints:
 *   GET    /activities?category=
 *   POST   /activities
 *   PATCH  /activities/{id}
 *   DELETE /activities/{id}
 *
 * All functions are async and return plain JSON-ready objects.
 */

export const ACTIVITY_ENDPOINTS = {
  list: '/activities',
  create: '/activities',
  update: (id) => `/activities/${encodeURIComponent(id)}`,
  remove: (id) => `/activities/${encodeURIComponent(id)}`,
};

function readActivities() {
  return readStore(STORAGE_KEYS.activities, []);
}

function writeActivities(activities) {
  writeStore(STORAGE_KEYS.activities, activities);
}

function sortActivities(activities) {
  return [...activities].sort((a, b) => {
    const period = String(b.period).localeCompare(String(a.period));
    if (period !== 0) return period;
    return String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''));
  });
}

function assertValid(category, values) {
  const errors = validateActivityInput(category, values);
  if (hasErrors(errors)) {
    throw new Error(Object.values(errors)[0]);
  }
}

export async function listActivities({ category } = {}) {
  if (!USE_MOCK_API) {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return apiRequest(`${ACTIVITY_ENDPOINTS.list}${query}`);
  }
  const activities = readActivities();
  const filtered = category ? activities.filter((item) => item.category === category) : activities;
  return mockRequest(sortActivities(filtered));
}

export async function createActivity(category, values) {
  assertValid(category, values);
  const parsed = parseActivityInput(category, values);

  if (!USE_MOCK_API) {
    return apiRequest(ACTIVITY_ENDPOINTS.create, {
      method: 'POST',
      body: { category, ...parsed },
    });
  }

  const activity = {
    id: newId('act'),
    category,
    ...parsed,
    createdAt: new Date().toISOString(),
  };
  const activities = readActivities();
  writeActivities([activity, ...activities]);
  return mockRequest(clone(activity), 160);
}

export async function updateActivity(id, values, category) {
  if (!USE_MOCK_API) {
    if (!category) {
      throw new Error('The record category is required to update a consumption record.');
    }
    assertValid(category, values);
    return apiRequest(ACTIVITY_ENDPOINTS.update(id), {
      method: 'PATCH',
      body: parseActivityInput(category, values),
    });
  }

  const activities = readActivities();
  const existing = activities.find((item) => item.id === id);
  if (!existing) throw new Error('That record no longer exists.');

  assertValid(existing.category, values);
  const parsed = parseActivityInput(existing.category, values);

  const updated = {
    ...existing,
    ...parsed,
    updatedAt: new Date().toISOString(),
  };
  writeActivities(activities.map((item) => (item.id === id ? updated : item)));
  return mockRequest(clone(updated), 160);
}

export async function deleteActivity(id) {
  if (!USE_MOCK_API) {
    return apiRequest(ACTIVITY_ENDPOINTS.remove(id), { method: 'DELETE' });
  }
  const activities = readActivities();
  writeActivities(activities.filter((item) => item.id !== id));
  return mockRequest({ id }, 140);
}

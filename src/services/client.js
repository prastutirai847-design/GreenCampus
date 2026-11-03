/**
 * Transport boundary for the service layer.
 *
 * The prototype runs against localStorage via the mock branches in each service.
 * When the FastAPI backend is ready, set VITE_USE_MOCK_API=false and point
 * VITE_API_BASE_URL at the API. Service signatures and returned shapes stay the
 * same, so pages and components do not need to change.
 */
export const USE_MOCK_API = String(import.meta.env.VITE_USE_MOCK_API ?? 'true') !== 'false';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';
const MOCK_LATENCY_MS = 220;

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function delay(ms = MOCK_LATENCY_MS) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function mockRequest(payload, ms = MOCK_LATENCY_MS) {
  await delay(ms);
  return payload;
}

export async function apiRequest(path, { method = 'GET', body } = {}) {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    // Allow a future FastAPI session cookie to travel with authenticated calls.
    credentials: 'include',
    headers: isFormData ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const data = await response.json();
      if (data?.detail) message = typeof data.detail === 'string' ? data.detail : message;
    } catch {
      // Keep the status-based message when the body is not JSON.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return null;
  return response.json();
}

export function newId(prefix) {
  const suffix =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${suffix}`;
}

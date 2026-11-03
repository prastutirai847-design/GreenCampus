import { CATEGORY_ORDER } from '../data/options.js';
import { hasErrors, validateBillInput } from '../utils/validation.js';
import { apiRequest, mockRequest, newId, USE_MOCK_API } from './client.js';
import { clone, readStore, STORAGE_KEYS, writeStore } from './storage.js';

/**
 * Bill attachment service.
 *
 * Planned FastAPI endpoints:
 *   POST   /bills/upload        multipart: file + metadata
 *   GET    /bills?category=&building_id=&period=&activity_id=
 *   GET    /bills/{bill_id}
 *   PUT    /bills/{bill_id}     multipart when replacing the file
 *   DELETE /bills/{bill_id}
 *   POST   /bills/unlink?activity_id={id}  detach bills from a deleted record
 *
 * No PDF parsing or data extraction happens here. The prototype stores file
 * metadata and, when the file is a small image, a local preview data URL. The
 * figures on a bill must be entered and verified manually.
 */

export const BILL_ENDPOINTS = {
  upload: '/bills/upload',
  list: '/bills',
  detail: (id) => `/bills/${encodeURIComponent(id)}`,
  update: (id) => `/bills/${encodeURIComponent(id)}`,
  remove: (id) => `/bills/${encodeURIComponent(id)}`,
  unlinkActivity: (activityId) =>
    `/bills/unlink?activity_id=${encodeURIComponent(activityId)}`,
};

export const BILL_MAX_BYTES = 5 * 1024 * 1024;
export const BILL_PREVIEW_MAX_BYTES = 600 * 1024;
export const BILL_FILE_TYPES = [
  { mime: 'application/pdf', extensions: ['.pdf'], label: 'PDF' },
  { mime: 'image/png', extensions: ['.png'], label: 'Image' },
  { mime: 'image/jpeg', extensions: ['.jpg', '.jpeg'], label: 'Image' },
  { mime: 'image/webp', extensions: ['.webp'], label: 'Image' },
];
const BILL_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp';

function readBills() {
  return readStore(STORAGE_KEYS.bills, []);
}

function writeBills(bills) {
  try {
    writeStore(STORAGE_KEYS.bills, bills);
  } catch {
    throw new Error(
      'This browser could not store the bill. Local storage may be full — delete an older attachment and try again.',
    );
  }
}

function sortBills(bills) {
  return [...bills].sort((a, b) =>
    String(b.uploadedAt ?? '').localeCompare(String(a.uploadedAt ?? '')),
  );
}

function fileExtension(name = '') {
  const match = String(name).toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : '';
}

export function fileKind(file) {
  if (!file) return null;
  const type = BILL_FILE_TYPES.find((item) => item.mime === file.type);
  if (type) return type.mime === 'application/pdf' ? 'pdf' : 'image';
  const extension = fileExtension(file.name);
  const byExtension = BILL_FILE_TYPES.find((item) => item.extensions.includes(extension));
  if (!byExtension) return null;
  return byExtension.mime === 'application/pdf' ? 'pdf' : 'image';
}

export function validateBillFile(file) {
  if (!file) return 'Choose a PDF or image file.';
  if (file.size === 0) return 'That file appears to be empty.';
  const kind = fileKind(file);
  if (!kind) return 'Upload a PDF, PNG, JPEG or WebP file.';
  if (file.size > BILL_MAX_BYTES) return 'Keep the bill file under 5 MB.';
  return null;
}

export function billAcceptAttribute() {
  return BILL_ACCEPT;
}

export function billHasPreview(bill) {
  return Boolean(bill?.dataUrl && String(bill?.mimeType ?? '').startsWith('image/'));
}

function readImagePreview(file) {
  if (!file || fileKind(file) !== 'image' || file.size > BILL_PREVIEW_MAX_BYTES) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function normalizeMetadata(values = {}) {
  return {
    category: values.category,
    period: values.period,
    buildingId: values.buildingId || null,
    activityId: values.activityId || null,
    title: String(values.title ?? '').trim(),
    provider: String(values.provider ?? '').trim(),
    billNumber: String(values.billNumber ?? '').trim(),
    amount:
      values.amount === '' || values.amount === null || values.amount === undefined
        ? null
        : Number(values.amount),
    notes: String(values.notes ?? '').trim(),
  };
}

function assertValid(values) {
  const errors = validateBillInput(values);
  if (hasErrors(errors)) throw new Error(Object.values(errors)[0]);
}

function fileMetadata(file) {
  return {
    fileName: file.name,
    mimeType: file.type || BILL_FILE_TYPES.find((item) => item.extensions.includes(fileExtension(file.name)))?.mime || '',
    sizeBytes: file.size,
  };
}

function toFormData(file, metadata) {
  const form = new FormData();
  if (file) form.append('file', file);
  Object.entries(metadata).forEach(([key, value]) => {
    if (value !== null && value !== undefined) form.append(key, String(value));
  });
  return form;
}

export async function listBills({ category, buildingId, period, activityId, search } = {}) {
  if (!USE_MOCK_API) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (buildingId) params.set('building_id', buildingId);
    if (period) params.set('period', period);
    if (activityId) params.set('activity_id', activityId);
    if (search) params.set('q', search);
    const query = params.toString();
    return apiRequest(`${BILL_ENDPOINTS.list}${query ? `?${query}` : ''}`);
  }

  const term = String(search ?? '').trim().toLowerCase();
  const bills = readBills().filter((bill) => {
    if (category && bill.category !== category) return false;
    if (buildingId && bill.buildingId !== buildingId) return false;
    if (period && bill.period !== period) return false;
    if (activityId && bill.activityId !== activityId) return false;
    if (!term) return true;
    return [bill.title, bill.fileName, bill.provider, bill.billNumber]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });
  return mockRequest(sortBills(bills));
}

export async function getBill(id) {
  if (!USE_MOCK_API) return apiRequest(BILL_ENDPOINTS.detail(id));
  const bill = readBills().find((item) => item.id === id);
  if (!bill) throw new Error('That bill no longer exists.');
  return mockRequest(clone(bill));
}

export async function uploadBill({ file, values }) {
  const fileError = validateBillFile(file);
  if (fileError) throw new Error(fileError);
  assertValid(values);
  const metadata = normalizeMetadata(values);

  if (!USE_MOCK_API) {
    return apiRequest(BILL_ENDPOINTS.upload, {
      method: 'POST',
      body: toFormData(file, metadata),
    });
  }

  const preview = await readImagePreview(file);
  const now = new Date().toISOString();
  const bill = {
    id: newId('bill'),
    ...metadata,
    ...fileMetadata(file),
    title: metadata.title || file.name,
    dataUrl: preview,
    hasPreview: Boolean(preview),
    previewSkipped: fileKind(file) === 'image' && !preview,
    sample: false,
    uploadedAt: now,
    updatedAt: now,
  };
  const bills = readBills();
  writeBills([bill, ...bills]);
  return mockRequest(clone(bill), 260);
}

export async function updateBill(id, { values, file } = {}) {
  assertValid(values);
  const metadata = normalizeMetadata(values);

  if (!USE_MOCK_API) {
    const body = file ? toFormData(file, metadata) : metadata;
    return apiRequest(BILL_ENDPOINTS.update(id), { method: 'PUT', body });
  }

  const bills = readBills();
  const existing = bills.find((item) => item.id === id);
  if (!existing) throw new Error('That bill no longer exists.');

  let filePatch = {};
  if (file) {
    const fileError = validateBillFile(file);
    if (fileError) throw new Error(fileError);
    const preview = await readImagePreview(file);
    filePatch = {
      ...fileMetadata(file),
      dataUrl: preview,
      hasPreview: Boolean(preview),
      previewSkipped: fileKind(file) === 'image' && !preview,
      sample: false,
    };
  }

  const updated = {
    ...existing,
    ...metadata,
    ...filePatch,
    title: metadata.title || existing.title,
    updatedAt: new Date().toISOString(),
  };
  writeBills(bills.map((item) => (item.id === id ? updated : item)));
  return mockRequest(clone(updated), 200);
}

export async function unlinkBillsFromActivity(activityId) {
  if (!USE_MOCK_API) {
    return apiRequest(BILL_ENDPOINTS.unlinkActivity(activityId), { method: 'POST' });
  }
  const bills = readBills();
  const next = bills.map((bill) =>
    bill.activityId === activityId
      ? { ...bill, activityId: null, updatedAt: new Date().toISOString() }
      : bill,
  );
  writeBills(next);
  return mockRequest(null, 60);
}

export async function deleteBill(id) {
  if (!USE_MOCK_API) {
    return apiRequest(BILL_ENDPOINTS.remove(id), { method: 'DELETE' });
  }
  const bills = readBills();
  writeBills(bills.filter((item) => item.id !== id));
  return mockRequest({ id }, 160);
}

export function isBillCategory(category) {
  return CATEGORY_ORDER.includes(category);
}

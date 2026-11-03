import { apiRequest, mockRequest, USE_MOCK_API } from './client.js';
import {
  clearActivityRecords,
  clearBillRecords,
  readWorkspace,
  resetWorkspaceData,
  seedDemoData,
} from './seed.js';

/**
 * Workspace-level operations used by Settings and the demo-data controls.
 * These are the only service functions without a direct REST equivalent today;
 * they are grouped here so the Phase 2 backend can implement them together.
 */

export const WORKSPACE_ENDPOINTS = {
  sampleData: '/workspace/sample-data',
  clearRecords: '/workspace/records',
  reset: '/workspace/reset',
};

export async function loadSampleDataset() {
  if (!USE_MOCK_API) return apiRequest(WORKSPACE_ENDPOINTS.sampleData, { method: 'POST' });
  await mockRequest(null, 320);
  return seedDemoData();
}

export async function removeAllRecords() {
  if (!USE_MOCK_API) return apiRequest(WORKSPACE_ENDPOINTS.clearRecords, { method: 'DELETE' });
  await mockRequest(null, 220);
  clearActivityRecords();
  clearBillRecords();
  return { ...readWorkspace(), activities: [], bills: [] };
}

export async function resetAllData() {
  if (!USE_MOCK_API) return apiRequest(WORKSPACE_ENDPOINTS.reset, { method: 'POST' });
  await mockRequest(null, 360);
  return resetWorkspaceData();
}

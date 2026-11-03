import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as billApi from '../services/billService.js';
import * as buildingApi from '../services/buildingService.js';
import * as consumptionApi from '../services/consumptionService.js';
import * as dataApi from '../services/dataService.js';
import * as departmentApi from '../services/departmentService.js';
import * as scope3Api from '../services/scope3Service.js';
import * as settingsApi from '../services/settingsService.js';
import { ensureWorkspace } from '../services/seed.js';

const CampusContext = createContext(null);

function sortActivities(activities) {
  return [...activities].sort((a, b) => {
    const period = String(b.period).localeCompare(String(a.period));
    if (period !== 0) return period;
    return String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''));
  });
}

const initialState = {
  buildings: [],
  departments: [],
  activities: [],
  bills: [],
  profile: null,
  factors: null,
  scope3: [],
  loading: true,
  error: null,
};

export function CampusProvider({ children }) {
  const [state, setState] = useState(initialState);

  const load = useCallback(async () => {
    setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      ensureWorkspace();
      const [buildings, departments, activities, bills, factors, profile, scope3] =
        await Promise.all([
          buildingApi.listBuildings(),
          departmentApi.listDepartments(),
          consumptionApi.listConsumption(),
          billApi.listBills(),
          settingsApi.getFactors(),
          settingsApi.getProfile(),
          scope3Api.getScope3Register(),
        ]);
      setState({
        buildings,
        departments,
        activities: sortActivities(activities),
        bills,
        profile,
        factors,
        scope3: Array.isArray(scope3) ? scope3 : [],
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((previous) => ({
        ...previous,
        loading: false,
        error: error instanceof Error ? error.message : 'Could not load the workspace.',
      }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addActivity = useCallback(async (category, values) => {
    const created = await consumptionApi.createConsumption(category, values);
    setState((previous) => ({
      ...previous,
      activities: sortActivities([created, ...previous.activities]),
    }));
    return created;
  }, []);

  const editActivity = useCallback(async (id, values, category) => {
    const updated = await consumptionApi.updateConsumption(id, values, category);
    setState((previous) => ({
      ...previous,
      activities: sortActivities(
        previous.activities.map((activity) => (activity.id === id ? updated : activity)),
      ),
    }));
    return updated;
  }, []);

  const removeActivity = useCallback(async (id) => {
    await consumptionApi.deleteConsumption(id);
    await billApi.unlinkBillsFromActivity(id);
    setState((previous) => ({
      ...previous,
      activities: previous.activities.filter((activity) => activity.id !== id),
      // Keep bill metadata, but drop the link to the deleted record.
      bills: previous.bills.map((bill) =>
        bill.activityId === id ? { ...bill, activityId: null } : bill,
      ),
    }));
  }, []);

  const addBill = useCallback(async ({ file, values }) => {
    const created = await billApi.uploadBill({ file, values });
    setState((previous) => ({ ...previous, bills: [created, ...previous.bills] }));
    return created;
  }, []);

  const editBill = useCallback(async (id, payload) => {
    const updated = await billApi.updateBill(id, payload);
    setState((previous) => ({
      ...previous,
      bills: previous.bills.map((bill) => (bill.id === id ? updated : bill)),
    }));
    return updated;
  }, []);

  const removeBill = useCallback(async (id) => {
    await billApi.deleteBill(id);
    setState((previous) => ({
      ...previous,
      bills: previous.bills.filter((bill) => bill.id !== id),
    }));
  }, []);

  const addBuilding = useCallback(async (values) => {
    const created = await buildingApi.createBuilding(values);
    setState((previous) => ({ ...previous, buildings: [...previous.buildings, created] }));
    return created;
  }, []);

  const editBuilding = useCallback(async (id, values) => {
    const updated = await buildingApi.updateBuilding(id, values);
    setState((previous) => ({
      ...previous,
      buildings: previous.buildings.map((building) =>
        building.id === id ? updated : building,
      ),
    }));
    return updated;
  }, []);

  const removeBuilding = useCallback(async (id, options) => {
    const result = await buildingApi.deleteBuilding(id, options);
    setState((previous) => ({
      ...previous,
      buildings: previous.buildings.filter((building) => building.id !== id),
      activities: sortActivities(result.activities ?? previous.activities),
      bills: result.bills ?? previous.bills,
    }));
    return result;
  }, []);

  const addDepartment = useCallback(async (values) => {
    const created = await departmentApi.createDepartment(values);
    setState((previous) => ({ ...previous, departments: [...previous.departments, created] }));
    return created;
  }, []);

  const editDepartment = useCallback(async (id, values) => {
    const result = await departmentApi.updateDepartment(id, values);
    const updated = result.department ?? result;
    setState((previous) => ({
      ...previous,
      departments: previous.departments.map((department) =>
        department.id === id ? updated : department,
      ),
      activities: Array.isArray(result.activities)
        ? sortActivities(result.activities)
        : previous.activities,
    }));
    return updated;
  }, []);

  const removeDepartment = useCallback(async (id) => {
    await departmentApi.deleteDepartment(id);
    setState((previous) => ({
      ...previous,
      departments: previous.departments.filter((department) => department.id !== id),
    }));
  }, []);

  const saveProfile = useCallback(async (values) => {
    const profile = await settingsApi.updateProfile(values);
    setState((previous) => ({ ...previous, profile }));
    return profile;
  }, []);

  const saveFactors = useCallback(async (values) => {
    const factors = await settingsApi.updateFactors(values);
    setState((previous) => ({ ...previous, factors }));
    return factors;
  }, []);

  const restoreFactors = useCallback(async () => {
    const factors = await settingsApi.resetFactors();
    setState((previous) => ({ ...previous, factors }));
    return factors;
  }, []);

  const saveScope3Category = useCallback(async (categoryId, values) => {
    const updated = await scope3Api.updateScope3Category(categoryId, values);
    setState((previous) => ({
      ...previous,
      scope3: previous.scope3.map((entry) =>
        entry.categoryId === Number(categoryId) ? updated : entry,
      ),
    }));
    return updated;
  }, []);

  const resetScope3Register = useCallback(async () => {
    const register = await scope3Api.resetScope3Register();
    setState((previous) => ({ ...previous, scope3: register }));
    return register;
  }, []);

  const loadSampleData = useCallback(async () => {
    const snapshot = await dataApi.loadSampleDataset();
    const scope3 = await scope3Api.getScope3Register();
    setState({
      buildings: snapshot.buildings,
      departments: snapshot.departments ?? [],
      activities: sortActivities(snapshot.activities),
      bills: snapshot.bills ?? [],
      profile: snapshot.profile,
      factors: snapshot.factors,
      scope3: Array.isArray(scope3) ? scope3 : [],
      loading: false,
      error: null,
    });
  }, []);

  const clearAllRecords = useCallback(async () => {
    const snapshot = await dataApi.removeAllRecords();
    setState((previous) => ({
      ...previous,
      activities: snapshot.activities ?? [],
      bills: snapshot.bills ?? [],
    }));
  }, []);

  const resetWorkspace = useCallback(async () => {
    const snapshot = await dataApi.resetAllData();
    const scope3 = await scope3Api.getScope3Register();
    setState({
      buildings: snapshot.buildings,
      departments: snapshot.departments ?? [],
      activities: sortActivities(snapshot.activities),
      bills: snapshot.bills ?? [],
      profile: snapshot.profile,
      factors: snapshot.factors,
      scope3: Array.isArray(scope3) ? scope3 : [],
      loading: false,
      error: null,
    });
  }, []);

  const buildingMap = useMemo(
    () => Object.fromEntries(state.buildings.map((building) => [building.id, building])),
    [state.buildings],
  );

  const value = useMemo(
    () => ({
      ...state,
      buildingMap,
      departmentMap: Object.fromEntries(
        state.departments.map((department) => [department.id, department]),
      ),
      reload: load,
      addActivity,
      editActivity,
      removeActivity,
      addBill,
      editBill,
      removeBill,
      addBuilding,
      editBuilding,
      removeBuilding,
      addDepartment,
      editDepartment,
      removeDepartment,
      saveProfile,
      saveFactors,
      restoreFactors,
      saveScope3Category,
      resetScope3Register,
      loadSampleData,
      clearAllRecords,
      resetWorkspace,
    }),
    [
      state,
      buildingMap,
      load,
      addActivity,
      editActivity,
      removeActivity,
      addBill,
      editBill,
      removeBill,
      addBuilding,
      editBuilding,
      removeBuilding,
      addDepartment,
      editDepartment,
      removeDepartment,
      saveProfile,
      saveFactors,
      restoreFactors,
      saveScope3Category,
      resetScope3Register,
      loadSampleData,
      clearAllRecords,
      resetWorkspace,
    ],
  );

  return <CampusContext.Provider value={value}>{children}</CampusContext.Provider>;
}

export function useCampus() {
  const context = useContext(CampusContext);
  if (!context) {
    throw new Error('useCampus must be used inside a CampusProvider.');
  }
  return context;
}

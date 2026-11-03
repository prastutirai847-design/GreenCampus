import {
  CATEGORY_ORDER,
  COLLEGE_TYPES,
  COMMUTE_MODES,
  DISPOSAL_METHODS,
  FUEL_PURPOSES,
  FUEL_TYPES,
  WASTE_CATEGORIES,
} from '../data/options.js';
import { DATA_QUALITY } from '../data/ghgProtocol.js';
import { isValidDateValue, isValidMonthKey, todayDateValue } from './dates.js';
import { toNumber } from './format.js';
import { isWaterUnit, waterToCubicMeters } from './units.js';

const MAX_RECORDED_QUANTITY = 100000000;

function requirePositive(errors, key, value, label) {
  const number = toNumber(value);
  if (!Number.isFinite(number) || number <= 0) {
    errors[key] = `Enter ${label} greater than zero.`;
    return;
  }
  if (number > MAX_RECORDED_QUANTITY) {
    errors[key] = `Enter ${label} below ${MAX_RECORDED_QUANTITY.toLocaleString('en-US')}.`;
  }
}

function requireWholeNumber(errors, key, value, label) {
  const number = toNumber(value);
  if (!Number.isFinite(number) || number <= 0 || !Number.isInteger(number)) {
    errors[key] = `Enter ${label} as a whole number greater than zero.`;
  }
}

function validateNotes(errors, notes) {
  if (notes && String(notes).length > 200) {
    errors.notes = 'Keep notes under 200 characters.';
  }
}

function validateReportingFields(errors, values) {
  if (values.dataQuality !== undefined && !DATA_QUALITY[values.dataQuality]) {
    errors.dataQuality = 'Choose how the activity data was obtained.';
  }
  validateOptionalText(errors, 'sourceReference', values.sourceReference, 'source reference', 120);
}

function validateOptionalAmount(errors, key, value, label) {
  if (value === '' || value === null || value === undefined) return;
  const number = toNumber(value);
  if (!Number.isFinite(number) || number < 0) {
    errors[key] = `Enter ${label} as a positive amount, or leave it blank.`;
  } else if (number > MAX_RECORDED_QUANTITY) {
    errors[key] = `That ${label} looks too large. Check the figure or leave it blank.`;
  }
}

function validateOptionalText(errors, key, value, label, max = 80) {
  if (value === undefined || value === null) return;
  if (String(value).trim().length > max) {
    errors[key] = `Keep the ${label} under ${max} characters.`;
  }
}

function validateRecordDate(errors, value) {
  if (!value || !isValidDateValue(value)) {
    errors.date = 'Choose the date this record belongs to.';
    return;
  }
  if (value > todayDateValue()) {
    errors.date = 'Choose today or an earlier date.';
  }
}

export function validateActivityInput(category, values = {}) {
  const errors = {};
  const usesRecordDate = category === 'fuel' || category === 'waste';

  if (!usesRecordDate && (!values.period || !isValidMonthKey(values.period))) {
    errors.period = 'Choose the month this record belongs to.';
  }

  if (category === 'electricity') {
    if (!values.buildingId) errors.buildingId = 'Select the building this meter serves.';
    requirePositive(errors, 'kwh', values.kwh, 'electricity consumed');
    validateOptionalAmount(errors, 'billAmount', values.billAmount, 'bill amount');
    validateOptionalText(errors, 'provider', values.provider, 'provider name');
  }

  if (category === 'water') {
    if (!values.buildingId) errors.buildingId = 'Select the building this meter serves.';
    requirePositive(errors, 'waterAmount', values.waterAmount, 'water consumed');
    if (!isWaterUnit(values.unit)) {
      errors.unit = 'Choose litres or kilolitres.';
    }
    validateOptionalAmount(errors, 'billAmount', values.billAmount, 'bill amount');
  }

  if (category === 'fuel') {
    validateRecordDate(errors, values.date);
    if (!FUEL_TYPES.some((type) => type.id === values.fuelType)) {
      errors.fuelType = 'Select the fuel type.';
    }
    if (!FUEL_PURPOSES.includes(values.purpose)) {
      errors.purpose = 'Select how the fuel was used.';
    }
    requirePositive(errors, 'quantity', values.quantity, 'fuel quantity');
    validateOptionalText(errors, 'department', values.department, 'department name');
  }

  if (category === 'waste') {
    validateRecordDate(errors, values.date);
    if (!WASTE_CATEGORIES.some((item) => item.id === values.wasteCategory)) {
      errors.wasteCategory = 'Select a waste category.';
    }
    if (!DISPOSAL_METHODS.some((item) => item.id === values.disposal)) {
      errors.disposal = 'Select the disposal method.';
    }
    requirePositive(errors, 'weightKg', values.weightKg, 'waste weight');
  }

  if (category === 'commuting') {
    if (!COMMUTE_MODES.some((item) => item.id === values.mode)) {
      errors.mode = 'Select the primary travel mode.';
    }
    requirePositive(errors, 'distanceKm', values.distanceKm, 'the one-way distance');
    requireWholeNumber(errors, 'tripsPerMonth', values.tripsPerMonth, 'round trips per month');
    requireWholeNumber(errors, 'commuters', values.commuters, 'the number of commuters');
  }

  validateNotes(errors, values.notes);
  validateReportingFields(errors, values);

  return errors;
}

function optionalNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function trimmed(value) {
  return String(value ?? '').trim();
}

export function parseActivityInput(category, values = {}) {
  const base = {
    period: values.period,
    notes: trimmed(values.notes),
    dataQuality: DATA_QUALITY[values.dataQuality] ? values.dataQuality : 'measured',
    sourceReference: trimmed(values.sourceReference),
  };

  if (category === 'electricity') {
    return {
      ...base,
      buildingId: values.buildingId,
      kwh: toNumber(values.kwh),
      billAmount: optionalNumber(values.billAmount),
      provider: trimmed(values.provider),
    };
  }
  if (category === 'water') {
    const unit = isWaterUnit(values.unit) ? values.unit : 'kL';
    return {
      ...base,
      buildingId: values.buildingId,
      cubicMeters: waterToCubicMeters(values.waterAmount, unit),
      unit,
      billAmount: optionalNumber(values.billAmount),
    };
  }
  if (category === 'fuel') {
    return {
      ...base,
      period: String(values.date ?? '').slice(0, 7),
      date: values.date,
      fuelType: values.fuelType,
      purpose: values.purpose,
      quantity: toNumber(values.quantity),
      buildingId: values.buildingId || null,
      department: trimmed(values.department),
      departmentId: values.departmentId ? String(values.departmentId) : null,
    };
  }
  if (category === 'waste') {
    return {
      ...base,
      period: String(values.date ?? '').slice(0, 7),
      date: values.date,
      wasteCategory: values.wasteCategory,
      disposal: values.disposal,
      weightKg: toNumber(values.weightKg),
      buildingId: values.buildingId || null,
    };
  }
  if (category === 'commuting') {
    return {
      ...base,
      mode: values.mode,
      distanceKm: toNumber(values.distanceKm),
      tripsPerMonth: toNumber(values.tripsPerMonth),
      commuters: toNumber(values.commuters),
    };
  }
  return base;
}

export function validateBuildingInput(values = {}) {
  const errors = {};
  if (!values.name || !String(values.name).trim()) {
    errors.name = 'Enter a building name.';
  } else if (String(values.name).trim().length > 80) {
    errors.name = 'Keep the name under 80 characters.';
  }
  if (!values.type) errors.type = 'Select a building type.';

  if (values.areaSqm !== '' && values.areaSqm !== null && values.areaSqm !== undefined) {
    requirePositive(errors, 'areaSqm', values.areaSqm, 'the floor area');
  }
  if (values.floors !== '' && values.floors !== null && values.floors !== undefined) {
    const floors = toNumber(values.floors);
    if (!Number.isFinite(floors) || floors <= 0 || !Number.isInteger(floors)) {
      errors.floors = 'Enter the number of floors as a whole number, or leave it blank.';
    }
  }
  if (values.occupants !== '' && values.occupants !== null && values.occupants !== undefined) {
    const occupants = toNumber(values.occupants);
    if (!Number.isFinite(occupants) || occupants < 0 || !Number.isInteger(occupants)) {
      errors.occupants = 'Enter occupants as a whole number (zero is allowed), or leave it blank.';
    }
  }
  validateOptionalText(errors, 'description', values.description, 'description', 200);
  validateOptionalText(errors, 'departmentId', values.departmentId, 'department', 80);
  return errors;
}

export function validateDepartmentInput(values = {}) {
  const errors = {};
  if (!values.name || !String(values.name).trim()) {
    errors.name = 'Enter a department name.';
  } else if (String(values.name).trim().length > 80) {
    errors.name = 'Keep the name under 80 characters.';
  }
  validateOptionalText(errors, 'code', values.code, 'code', 12);
  validateOptionalText(errors, 'head', values.head, 'department lead', 80);
  validateOptionalText(errors, 'description', values.description, 'description', 200);
  return errors;
}

export function validateProfileInput(values = {}) {
  const errors = {};
  if (!values.name || !String(values.name).trim()) {
    errors.name = 'Enter the college name.';
  }
  ['students', 'staff'].forEach((key) => {
    const number = toNumber(values[key]);
    if (!Number.isFinite(number) || number < 0 || !Number.isInteger(number)) {
      errors[key] = 'Enter a whole number (zero is allowed).';
    }
  });
  if (values.campusAreaAcres !== '' && values.campusAreaAcres !== undefined) {
    const number = toNumber(values.campusAreaAcres);
    if (!Number.isFinite(number) || number < 0) {
      errors.campusAreaAcres = 'Enter a positive area or leave it blank.';
    }
  }
  if (values.type !== undefined && !COLLEGE_TYPES.includes(values.type)) {
    errors.type = 'Select the type that best describes the college.';
  }
  if (values.campusBuildings !== undefined && values.campusBuildings !== '') {
    const number = toNumber(values.campusBuildings);
    if (!Number.isFinite(number) || number < 0 || !Number.isInteger(number)) {
      errors.campusBuildings = 'Enter the number of campus buildings as a whole number.';
    }
  }
  return errors;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value ?? '').trim());
}

export function validateLoginInput(values = {}) {
  const errors = {};
  const email = String(values.email ?? '').trim();
  if (!email) {
    errors.email = 'Enter your work email address.';
  } else if (!isValidEmail(email)) {
    errors.email = 'Enter a valid email address, for example name@college.edu.';
  }
  if (!values.password) {
    errors.password = 'Enter your password.';
  } else if (String(values.password).length < 8) {
    errors.password = 'Passwords are at least 8 characters.';
  }
  return errors;
}

export function validateRegistrationInput(values = {}) {
  const errors = validateLoginInput(values);
  const name = String(values.name ?? '').trim();
  if (!name) {
    errors.name = 'Enter your full name.';
  } else if (name.length > 80) {
    errors.name = 'Keep your name under 80 characters.';
  }
  if (!values.confirmPassword) {
    errors.confirmPassword = 'Repeat the password to confirm it.';
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'The passwords do not match.';
  }
  return errors;
}

export function validateCollegeSetupInput(values = {}) {
  const errors = {};
  const name = String(values.name ?? '').trim();
  if (!name) {
    errors.name = 'Enter the college name.';
  } else if (name.length > 120) {
    errors.name = 'Keep the college name under 120 characters.';
  }
  if (!String(values.city ?? '').trim()) {
    errors.city = 'Enter the city or campus location.';
  }
  if (!COLLEGE_TYPES.includes(values.type)) {
    errors.type = 'Select the type that best describes the college.';
  }
  requireWholeNumber(errors, 'students', values.students, 'the number of students');
  requireWholeNumber(errors, 'staff', values.staff, 'the number of staff');
  requireWholeNumber(errors, 'campusBuildings', values.campusBuildings, 'the number of campus buildings');
  return errors;
}

export function validateBillInput(values = {}) {
  const errors = {};
  if (!CATEGORY_ORDER.includes(values.category)) {
    errors.category = 'Choose the utility this bill belongs to.';
  }
  if (!values.period || !isValidMonthKey(values.period)) {
    errors.period = 'Choose the billing period.';
  }
  validateOptionalText(errors, 'title', values.title, 'bill title', 100);
  validateOptionalText(errors, 'provider', values.provider, 'provider name');
  validateOptionalText(errors, 'billNumber', values.billNumber, 'bill number', 60);
  validateOptionalAmount(errors, 'amount', values.amount, 'bill amount');
  validateNotes(errors, values.notes);
  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Save } from 'lucide-react';
import { Field } from '../ui/Field.jsx';
import { Button } from '../ui/Button.jsx';
import { ScopeBadge } from '../ui/Badge.jsx';
import { Callout } from '../ui/Callout.jsx';
import { inputClasses, textareaClasses } from '../ui/styles.js';
import {
  COMMUTE_MODES,
  DISPOSAL_METHODS,
  FUEL_PURPOSES,
  FUEL_TYPES,
  WASTE_CATEGORIES,
} from '../../data/options.js';
import { DATA_QUALITY, DATA_QUALITY_ORDER, dataQualityMeta } from '../../data/ghgProtocol.js';
import {
  currentMonthKey,
  lastCompleteMonthKey,
  monthEndDateValue,
  todayDateValue,
} from '../../utils/dates.js';
import { formatEmissions, formatNumber } from '../../utils/format.js';
import { previewEmissions } from '../../utils/emissions.js';
import { WATER_UNITS, waterInputFromRecord, waterToCubicMeters } from '../../utils/units.js';
import { hasErrors, validateActivityInput } from '../../utils/validation.js';

const EDITABLE_KEYS = [
  'period',
  'buildingId',
  'notes',
  'dataQuality',
  'sourceReference',
  'kwh',
  'billAmount',
  'provider',
  'unit',
  'fuelType',
  'purpose',
  'quantity',
  'date',
  'department',
  'departmentId',
  'wasteCategory',
  'disposal',
  'weightKg',
  'mode',
  'distanceKm',
  'tripsPerMonth',
  'commuters',
];

function buildDefaults(category, buildings) {
  return {
    period: lastCompleteMonthKey(),
    buildingId:
      category === 'electricity' || category === 'water' ? buildings[0]?.id ?? '' : '',
    notes: '',
    dataQuality: 'measured',
    sourceReference: '',
    kwh: '',
    billAmount: '',
    provider: '',
    waterAmount: '',
    unit: 'kL',
    fuelType: 'diesel',
    purpose: 'Backup generator',
    quantity: '',
    date: monthEndDateValue(lastCompleteMonthKey()),
    department: '',
    departmentId: '',
    wasteCategory: 'mixed',
    disposal: 'landfill',
    weightKg: '',
    mode: 'car',
    distanceKm: '',
    tripsPerMonth: '',
    commuters: '',
  };
}

function valuesFromActivity(activity, buildings, departments = []) {
  const values = buildDefaults(activity.category, buildings);
  EDITABLE_KEYS.forEach((key) => {
    if (activity[key] !== undefined && activity[key] !== null && activity[key] !== '') {
      values[key] = activity[key];
    }
  });
  if (activity.category === 'fuel' && !values.departmentId && activity.department) {
    const match = departments.find((department) => department.name === activity.department);
    if (match) values.departmentId = match.id;
  }
  if (activity.category === 'water') {
    const water = waterInputFromRecord(activity);
    values.waterAmount = water.amount;
    values.unit = water.unit;
  }
  if (
    (activity.category === 'fuel' || activity.category === 'waste') &&
    !activity.date &&
    activity.period
  ) {
    values.date = monthEndDateValue(activity.period);
  }
  return values;
}

function formatWaterPreview(cubicMeters) {
  const value = Number(cubicMeters) || 0;
  return `${formatNumber(value, { digits: value > 0 && value < 10 ? 2 : 1 })} kL`;
}

export function ActivityForm({
  category,
  buildings,
  departments = [],
  factors,
  initialActivity,
  onSubmit,
  onCancelEdit,
  isSubmitting,
  resetSignal = 0,
}) {
  const [values, setValues] = useState(() =>
    initialActivity
      ? valuesFromActivity(initialActivity, buildings, departments)
      : buildDefaults(category, buildings),
  );
  const [errors, setErrors] = useState({});
  const editing = Boolean(initialActivity);

  useEffect(() => {
    setValues(
      initialActivity
        ? valuesFromActivity(initialActivity, buildings, departments)
        : buildDefaults(category, buildings),
    );
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, initialActivity, resetSignal, buildings.length, departments.length]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === 'fuelType') {
      const type = FUEL_TYPES.find((item) => item.id === value);
      setValues((previous) => ({
        ...previous,
        fuelType: value,
        purpose:
          type?.kind === 'refrigerant'
            ? 'Refrigerant top-up'
            : previous.purpose === 'Refrigerant top-up'
              ? 'Other'
              : previous.purpose,
      }));
      setErrors((previous) => {
        if (!previous.fuelType) return previous;
        const next = { ...previous };
        delete next.fuelType;
        return next;
      });
      return;
    }
    if (name === 'date') {
      const derivedPeriod = /^\d{4}-\d{2}/.test(value) ? value.slice(0, 7) : null;
      setValues((previous) => ({
        ...previous,
        date: value,
        period: derivedPeriod ?? previous.period,
      }));
      setErrors((previous) => {
        if (!previous.date) return previous;
        const next = { ...previous };
        delete next.date;
        return next;
      });
      return;
    }
    if (name === 'departmentId') {
      const department = departments.find((item) => item.id === value);
      setValues((previous) => ({
        ...previous,
        departmentId: value,
        department: department?.name ?? '',
      }));
      setErrors((previous) => {
        if (!previous.department) return previous;
        const next = { ...previous };
        delete next.department;
        return next;
      });
      return;
    }
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => {
      if (!previous[name]) return previous;
      const next = { ...previous };
      delete next[name];
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateActivityInput(category, values);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    const success = await onSubmit(values);
    if (success && !editing) {
      setValues(buildDefaults(category, buildings));
    }
  };

  const preview = previewEmissions(category, values, factors);
  const fuelType = FUEL_TYPES.find((item) => item.id === values.fuelType);
  const needsBuilding = category === 'electricity' || category === 'water';
  const usesDate = category === 'fuel' || category === 'waste';
  const cubicMeters = waterToCubicMeters(values.waterAmount, values.unit);

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {needsBuilding && buildings.length === 0 ? (
        <Callout tone="warning" title="Add a building first">
          Electricity and water readings are attached to a building.{' '}
          <Link to="/buildings" className="font-semibold underline decoration-from-font">
            Add your first building
          </Link>{' '}
          to continue.
        </Callout>
      ) : null}

      <fieldset disabled={isSubmitting} className="space-y-4">
        {usesDate ? (
          <Field
            label="Date"
            htmlFor="activity-date"
            error={errors.date}
            hint="The reporting month is derived from this date."
            required
          >
            <input
              id="activity-date"
              name="date"
              type="date"
              value={values.date}
              max={todayDateValue()}
              onChange={handleChange}
              className={inputClasses(Boolean(errors.date))}
              aria-invalid={Boolean(errors.date)}
            />
          </Field>
        ) : (
          <Field
            label={category === 'commuting' ? 'Reporting month' : 'Billing period'}
            htmlFor="activity-period"
            error={errors.period}
            required
          >
            <input
              id="activity-period"
              name="period"
              type="month"
              value={values.period}
              max={currentMonthKey()}
              onChange={handleChange}
              className={inputClasses(Boolean(errors.period))}
              aria-invalid={Boolean(errors.period)}
            />
          </Field>
        )}

        {category === 'electricity' ? (
          <>
            <Field label="Building" htmlFor="activity-building" error={errors.buildingId} required>
              <select
                id="activity-building"
                name="buildingId"
                value={values.buildingId}
                onChange={handleChange}
                className={inputClasses(Boolean(errors.buildingId))}
                aria-invalid={Boolean(errors.buildingId)}
              >
                <option value="">Select a building</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Electricity consumed"
              htmlFor="activity-kwh"
              error={errors.kwh}
              hint="Use the monthly meter reading in kilowatt-hours."
              required
            >
              <div className="relative">
                <input
                  id="activity-kwh"
                  name="kwh"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  placeholder="e.g. 42000"
                  value={values.kwh}
                  onChange={handleChange}
                  className={inputClasses(Boolean(errors.kwh), 'pr-14')}
                  aria-invalid={Boolean(errors.kwh)}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-xs text-ink-400">
                  kWh
                </span>
              </div>
            </Field>

            <div className="space-y-3 border-t border-line pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                Billing details <span className="font-normal normal-case tracking-normal">(optional)</span>
              </p>
              <Field label="Bill amount" htmlFor="activity-bill-amount" error={errors.billAmount}>
                <div className="relative">
                  <input
                    id="activity-bill-amount"
                    name="billAmount"
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    placeholder="e.g. 315000"
                    value={values.billAmount}
                    onChange={handleChange}
                    className={inputClasses(Boolean(errors.billAmount), 'pl-8')}
                    aria-invalid={Boolean(errors.billAmount)}
                  />
                  <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-xs text-ink-400">
                    ₹
                  </span>
                </div>
              </Field>
              <Field label="Electricity provider" htmlFor="activity-provider" error={errors.provider}>
                <input
                  id="activity-provider"
                  name="provider"
                  type="text"
                  placeholder="e.g. State electricity board"
                  value={values.provider}
                  onChange={handleChange}
                  className={inputClasses(Boolean(errors.provider))}
                  aria-invalid={Boolean(errors.provider)}
                />
              </Field>
              <p className="text-[11px] leading-relaxed text-ink-400">
                Save the record, then attach a PDF or image from the record row or the bills section.
              </p>
            </div>
          </>
        ) : null}

        {category === 'water' ? (
          <>
            <Field label="Building" htmlFor="activity-building" error={errors.buildingId} required>
              <select
                id="activity-building"
                name="buildingId"
                value={values.buildingId}
                onChange={handleChange}
                className={inputClasses(Boolean(errors.buildingId))}
                aria-invalid={Boolean(errors.buildingId)}
              >
                <option value="">Select a building</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-[minmax(0,1fr)_128px] gap-3">
              <Field
                label="Water consumed"
                htmlFor="activity-water"
                error={errors.waterAmount}
                hint={
                  values.unit === 'L' && cubicMeters > 0
                    ? `Stored as ${formatWaterPreview(cubicMeters)}.`
                    : 'Read from the water meter or utility bill.'
                }
                required
              >
                <input
                  id="activity-water"
                  name="waterAmount"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  placeholder="e.g. 820"
                  value={values.waterAmount}
                  onChange={handleChange}
                  className={inputClasses(Boolean(errors.waterAmount))}
                  aria-invalid={Boolean(errors.waterAmount)}
                />
              </Field>
              <Field label="Unit" htmlFor="activity-water-unit" error={errors.unit} required>
                <select
                  id="activity-water-unit"
                  name="unit"
                  value={values.unit}
                  onChange={handleChange}
                  className={inputClasses(Boolean(errors.unit))}
                  aria-invalid={Boolean(errors.unit)}
                >
                  {WATER_UNITS.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="space-y-3 border-t border-line pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                Billing details <span className="font-normal normal-case tracking-normal">(optional)</span>
              </p>
              <Field label="Bill amount" htmlFor="activity-bill-amount" error={errors.billAmount}>
                <div className="relative">
                  <input
                    id="activity-bill-amount"
                    name="billAmount"
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    placeholder="e.g. 48200"
                    value={values.billAmount}
                    onChange={handleChange}
                    className={inputClasses(Boolean(errors.billAmount), 'pl-8')}
                    aria-invalid={Boolean(errors.billAmount)}
                  />
                  <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-xs text-ink-400">
                    ₹
                  </span>
                </div>
              </Field>
              <p className="text-[11px] leading-relaxed text-ink-400">
                Attach the water bill after saving, from the record list below.
              </p>
            </div>
          </>
        ) : null}

        {category === 'fuel' ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fuel type" htmlFor="activity-fuel" error={errors.fuelType} required>
                <select
                  id="activity-fuel"
                  name="fuelType"
                  value={values.fuelType}
                  onChange={handleChange}
                  className={inputClasses(Boolean(errors.fuelType))}
                >
                  {FUEL_TYPES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Usage purpose" htmlFor="activity-purpose" error={errors.purpose} required>
                <select
                  id="activity-purpose"
                  name="purpose"
                  value={values.purpose}
                  onChange={handleChange}
                  className={inputClasses(Boolean(errors.purpose))}
                >
                  {FUEL_PURPOSES.map((purpose) => (
                    <option key={purpose} value={purpose}>
                      {purpose}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field
              label={fuelType?.kind === 'refrigerant' ? 'Refrigerant top-up quantity' : 'Fuel consumed'}
              htmlFor="activity-quantity"
              error={errors.quantity}
              hint={
                fuelType?.kind === 'refrigerant'
                  ? 'Record the refrigerant added during servicing, in kilograms — not the full system charge.'
                  : `Recorded in ${fuelType?.unit ?? 'litres'} for the selected fuel.`
              }
              required
            >
              <div className="relative">
                <input
                  id="activity-quantity"
                  name="quantity"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  placeholder="e.g. 1450"
                  value={values.quantity}
                  onChange={handleChange}
                  className={inputClasses(Boolean(errors.quantity), 'pr-12')}
                  aria-invalid={Boolean(errors.quantity)}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-xs text-ink-400">
                  {fuelType?.unit ?? ''}
                </span>
              </div>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Related building" htmlFor="activity-fuel-building" error={errors.buildingId}>
                <select
                  id="activity-fuel-building"
                  name="buildingId"
                  value={values.buildingId}
                  onChange={handleChange}
                  className={inputClasses(Boolean(errors.buildingId))}
                >
                  <option value="">No specific building</option>
                  {buildings.map((building) => (
                    <option key={building.id} value={building.id}>
                      {building.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Department"
                htmlFor="activity-department"
                error={errors.department}
                hint="Optional, if no building applies."
              >
                <select
                  id="activity-department"
                  name="departmentId"
                  value={values.departmentId}
                  onChange={handleChange}
                  className={inputClasses(Boolean(errors.department))}
                  aria-invalid={Boolean(errors.department)}
                >
                  <option value="">No department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </>
        ) : null}

        {category === 'waste' ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Waste category"
                htmlFor="activity-waste-category"
                error={errors.wasteCategory}
                required
              >
                <select
                  id="activity-waste-category"
                  name="wasteCategory"
                  value={values.wasteCategory}
                  onChange={handleChange}
                  className={inputClasses(Boolean(errors.wasteCategory))}
                >
                  {WASTE_CATEGORIES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Disposal method" htmlFor="activity-disposal" error={errors.disposal} required>
                <select
                  id="activity-disposal"
                  name="disposal"
                  value={values.disposal}
                  onChange={handleChange}
                  className={inputClasses(Boolean(errors.disposal))}
                >
                  {DISPOSAL_METHODS.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field
              label="Waste generated"
              htmlFor="activity-weight"
              error={errors.weightKg}
              hint="Use the weighed or vendor-reported quantity for this entry."
              required
            >
              <div className="relative">
                <input
                  id="activity-weight"
                  name="weightKg"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  placeholder="e.g. 3150"
                  value={values.weightKg}
                  onChange={handleChange}
                  className={inputClasses(Boolean(errors.weightKg), 'pr-10')}
                  aria-invalid={Boolean(errors.weightKg)}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-xs text-ink-400">
                  kg
                </span>
              </div>
            </Field>
            <Field label="Related building" htmlFor="activity-waste-building" error={errors.buildingId}>
              <select
                id="activity-waste-building"
                name="buildingId"
                value={values.buildingId}
                onChange={handleChange}
                className={inputClasses(Boolean(errors.buildingId))}
              >
                <option value="">No specific building</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
            </Field>
          </>
        ) : null}

        {category === 'commuting' ? (
          <>
            <Field label="Primary mode" htmlFor="activity-mode" error={errors.mode} required>
              <select
                id="activity-mode"
                name="mode"
                value={values.mode}
                onChange={handleChange}
                className={inputClasses(Boolean(errors.mode))}
              >
                {COMMUTE_MODES.map((mode) => (
                  <option key={mode.id} value={mode.id}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Average one-way distance"
                htmlFor="activity-distance"
                error={errors.distanceKm}
                hint="Per commuter, in km."
                required
              >
                <input
                  id="activity-distance"
                  name="distanceKm"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  placeholder="e.g. 9"
                  value={values.distanceKm}
                  onChange={handleChange}
                  className={inputClasses(Boolean(errors.distanceKm))}
                  aria-invalid={Boolean(errors.distanceKm)}
                />
              </Field>
              <Field
                label="Travel frequency"
                htmlFor="activity-trips"
                error={errors.tripsPerMonth}
                hint="Round trips per month."
                required
              >
                <input
                  id="activity-trips"
                  name="tripsPerMonth"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder="e.g. 20"
                  value={values.tripsPerMonth}
                  onChange={handleChange}
                  className={inputClasses(Boolean(errors.tripsPerMonth))}
                  aria-invalid={Boolean(errors.tripsPerMonth)}
                />
              </Field>
            </div>
            <Field
              label="Number of people"
              htmlFor="activity-commuters"
              error={errors.commuters}
              hint="Students and staff in this travel group."
              required
            >
              <input
                id="activity-commuters"
                name="commuters"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                placeholder="e.g. 420"
                value={values.commuters}
                onChange={handleChange}
                className={inputClasses(Boolean(errors.commuters))}
                aria-invalid={Boolean(errors.commuters)}
              />
            </Field>
          </>
        ) : null}

        <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
          <Field
            label="Data quality"
            htmlFor="activity-data-quality"
            error={errors.dataQuality}
            hint={dataQualityMeta(values.dataQuality).description}
          >
            <select
              id="activity-data-quality"
              name="dataQuality"
              value={values.dataQuality}
              onChange={handleChange}
              className={inputClasses(Boolean(errors.dataQuality))}
              aria-invalid={Boolean(errors.dataQuality)}
            >
              {DATA_QUALITY_ORDER.map((quality) => (
                <option key={quality} value={quality}>
                  {DATA_QUALITY[quality].label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Source reference"
            htmlFor="activity-source-reference"
            error={errors.sourceReference}
            hint="Bill, meter log, survey or register reference."
          >
            <input
              id="activity-source-reference"
              name="sourceReference"
              type="text"
              maxLength={120}
              placeholder="e.g. Electricity bill 03/2026"
              value={values.sourceReference}
              onChange={handleChange}
              className={inputClasses(Boolean(errors.sourceReference))}
              aria-invalid={Boolean(errors.sourceReference)}
            />
          </Field>
        </div>

        <Field label="Notes" htmlFor="activity-notes" error={errors.notes} hint="Optional, up to 200 characters.">
          <textarea
            id="activity-notes"
            name="notes"
            rows={2}
            value={values.notes}
            onChange={handleChange}
            placeholder="Source, meter notes or an operational exception"
            className={textareaClasses(Boolean(errors.notes))}
          />
        </Field>

        <div className="rounded-xl border border-forest-100 bg-forest-50/70 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-forest-600">
              Estimated emissions
            </p>
            <ScopeBadge scope={preview.scope} />
          </div>
          <p className="mt-1.5 font-display text-lg font-semibold tracking-tight text-ink-900">
            {category === 'water' ? formatWaterPreview(preview.quantity) : formatEmissions(preview.kg)}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-500">{preview.formula}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-400">
            Data quality: {dataQualityMeta(values.dataQuality).label} · Factor:{' '}
            {preview.factorSource} ({preview.factorYear || 'year not stated'})
          </p>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button type="submit" isLoading={isSubmitting} className="flex-1">
            {!isSubmitting ? (
              editing ? (
                <Save className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )
            ) : null}
            {editing ? 'Save changes' : 'Add record'}
          </Button>
          {editing ? (
            <Button type="button" variant="secondary" onClick={onCancelEdit} disabled={isSubmitting}>
              Cancel
            </Button>
          ) : null}
        </div>
      </fieldset>
    </form>
  );
}

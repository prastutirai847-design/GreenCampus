import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Field } from '../ui/Field.jsx';
import { inputClasses, textareaClasses } from '../ui/styles.js';
import { BUILDING_TYPES } from '../../data/options.js';
import { hasErrors, validateBuildingInput } from '../../utils/validation.js';

function defaults(initialBuilding) {
  return {
    name: initialBuilding?.name ?? '',
    type: initialBuilding?.type ?? 'Academic block',
    floors: initialBuilding?.floors ?? '',
    areaSqm: initialBuilding?.areaSqm ?? '',
    occupants: initialBuilding?.occupants ?? '',
    departmentId: initialBuilding?.departmentId ?? '',
    description: initialBuilding?.description ?? initialBuilding?.notes ?? '',
  };
}

export function BuildingFormModal({
  open,
  onClose,
  onSubmit,
  initialBuilding,
  departments = [],
  isSubmitting,
}) {
  const [values, setValues] = useState(() => defaults(initialBuilding));
  const [errors, setErrors] = useState({});
  const editing = Boolean(initialBuilding);

  useEffect(() => {
    if (open) {
      setValues(defaults(initialBuilding));
      setErrors({});
    }
  }, [open, initialBuilding]);

  const handleChange = (event) => {
    const { name, value } = event.target;
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
    const nextErrors = validateBuildingInput(values);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    await onSubmit(values);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? 'Edit building' : 'Add a building'}
      description="Buildings organise metered electricity, water and related records. Only the name and type are required."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="building-form" isLoading={isSubmitting}>
            {editing ? 'Save building' : 'Add building'}
          </Button>
        </>
      }
    >
      <form id="building-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Building name" htmlFor="building-name" error={errors.name} required>
            <input
              id="building-name"
              name="name"
              type="text"
              value={values.name}
              onChange={handleChange}
              placeholder="e.g. Science & Engineering Block"
              className={inputClasses(Boolean(errors.name))}
              aria-invalid={Boolean(errors.name)}
            />
          </Field>

          <Field label="Building type" htmlFor="building-type" error={errors.type} required>
            <select
              id="building-type"
              name="type"
              value={values.type}
              onChange={handleChange}
              className={inputClasses(Boolean(errors.type))}
            >
              {BUILDING_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Department" htmlFor="building-department" hint="Optional. Rolls this building into a department footprint.">
            <select
              id="building-department"
              name="departmentId"
              value={values.departmentId}
              onChange={handleChange}
              className={inputClasses(Boolean(errors.departmentId))}
            >
              <option value="">No department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Number of floors"
            htmlFor="building-floors"
            error={errors.floors}
            hint="Optional."
          >
            <input
              id="building-floors"
              name="floors"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={values.floors}
              onChange={handleChange}
              placeholder="e.g. 3"
              className={inputClasses(Boolean(errors.floors))}
              aria-invalid={Boolean(errors.floors)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Approximate area"
            htmlFor="building-area"
            error={errors.areaSqm}
            hint="Optional. Record in m² for GHG intensity reporting (1 m² ≈ 10.76 sq ft)."
          >
            <div className="relative">
              <input
                id="building-area"
                name="areaSqm"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={values.areaSqm}
                onChange={handleChange}
                placeholder="e.g. 3800"
                className={inputClasses(Boolean(errors.areaSqm), 'pr-12')}
                aria-invalid={Boolean(errors.areaSqm)}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-xs text-ink-400">
                m²
              </span>
            </div>
          </Field>

          <Field
            label="Regular occupants"
            htmlFor="building-occupants"
            error={errors.occupants}
            hint="Optional. Students and staff."
          >
            <input
              id="building-occupants"
              name="occupants"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={values.occupants}
              onChange={handleChange}
              placeholder="e.g. 950"
              className={inputClasses(Boolean(errors.occupants))}
              aria-invalid={Boolean(errors.occupants)}
            />
          </Field>
        </div>

        <Field
          label="Description"
          htmlFor="building-description"
          error={errors.description}
          hint="Optional context for the sustainability team."
        >
          <textarea
            id="building-description"
            name="description"
            rows={2}
            value={values.description}
            onChange={handleChange}
            placeholder="Metering setup, operating hours or known exceptions"
            className={textareaClasses(Boolean(errors.description))}
          />
        </Field>
      </form>
    </Modal>
  );
}

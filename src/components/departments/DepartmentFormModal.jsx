import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Field } from '../ui/Field.jsx';
import { inputClasses, textareaClasses } from '../ui/styles.js';
import { hasErrors, validateDepartmentInput } from '../../utils/validation.js';

function defaults(initialDepartment) {
  return {
    name: initialDepartment?.name ?? '',
    code: initialDepartment?.code ?? '',
    head: initialDepartment?.head ?? '',
    description: initialDepartment?.description ?? '',
  };
}

export function DepartmentFormModal({
  open,
  onClose,
  onSubmit,
  initialDepartment,
  isSubmitting,
}) {
  const [values, setValues] = useState(() => defaults(initialDepartment));
  const [errors, setErrors] = useState({});
  const editing = Boolean(initialDepartment);

  useEffect(() => {
    if (open) {
      setValues(defaults(initialDepartment));
      setErrors({});
    }
  }, [open, initialDepartment]);

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
    const nextErrors = validateDepartmentInput(values);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    await onSubmit(values);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit department' : 'Add a department'}
      description="Departments group buildings and directly attributed consumption records for reporting."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="department-form" isLoading={isSubmitting}>
            {editing ? 'Save department' : 'Add department'}
          </Button>
        </>
      }
    >
      <form id="department-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
          <Field label="Department name" htmlFor="department-name" error={errors.name} required>
            <input
              id="department-name"
              name="name"
              type="text"
              value={values.name}
              onChange={handleChange}
              placeholder="e.g. Facilities"
              className={inputClasses(Boolean(errors.name))}
              aria-invalid={Boolean(errors.name)}
            />
          </Field>
          <Field label="Code" htmlFor="department-code" error={errors.code} hint="Optional.">
            <input
              id="department-code"
              name="code"
              type="text"
              value={values.code}
              onChange={handleChange}
              placeholder="FAC"
              className={inputClasses(Boolean(errors.code))}
              aria-invalid={Boolean(errors.code)}
            />
          </Field>
        </div>

        <Field label="Department lead" htmlFor="department-head" error={errors.head} hint="Optional.">
          <input
            id="department-head"
            name="head"
            type="text"
            value={values.head}
            onChange={handleChange}
            placeholder="e.g. Facilities Manager"
            className={inputClasses(Boolean(errors.head))}
          />
        </Field>

        <Field
          label="Description"
          htmlFor="department-description"
          error={errors.description}
          hint="Optional. What this department is responsible for."
        >
          <textarea
            id="department-description"
            name="description"
            rows={2}
            value={values.description}
            onChange={handleChange}
            placeholder="Campus maintenance, generators and shared infrastructure"
            className={textareaClasses(Boolean(errors.description))}
          />
        </Field>
      </form>
    </Modal>
  );
}

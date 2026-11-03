import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Field } from '../ui/Field.jsx';
import { inputClasses } from '../ui/styles.js';

export function PasswordField({
  id,
  name = id,
  label,
  value,
  onChange,
  error,
  hint,
  autoComplete = 'current-password',
  placeholder = 'Enter your password',
  disabled = false,
  required = true,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} required={required}>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={inputClasses(Boolean(error), 'pr-11')}
          aria-invalid={Boolean(error)}
        />
        <button
          type="button"
          onClick={() => setVisible((previous) => !previous)}
          className="absolute inset-y-0 right-1.5 my-auto flex h-7 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-sand-100 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/35"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          tabIndex={0}
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </Field>
  );
}

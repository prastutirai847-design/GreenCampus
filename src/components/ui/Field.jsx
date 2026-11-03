import { labelClass } from './styles.js';
import { classNames } from '../../utils/format.js';

export function Field({ label, htmlFor, error, hint, required, children, className }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={classNames(labelClass, 'mb-1.5')}>
        {label}
        {required ? <span className="ml-0.5 text-danger">*</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs leading-snug text-danger-700" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs leading-snug text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

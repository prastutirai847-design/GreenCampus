import { AlertTriangle } from 'lucide-react';
import { Button } from './Button.jsx';

export function ErrorState({ title = 'Something went wrong', message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-white px-6 py-16 text-center shadow-card">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-danger-50 text-danger-700">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-3 font-display text-base font-semibold text-ink-900">{title}</h2>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink-500">
        {message || 'The workspace could not be loaded.'}
      </p>
      {onRetry ? (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

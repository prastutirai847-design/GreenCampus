import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, LayoutDashboard } from 'lucide-react';
import { buttonClasses } from '../components/ui/Button.jsx';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-forest-100 bg-forest-50 text-forest-600">
        <Compass className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-forest-600">
        404 · Page not found
      </p>
      <h1 className="mt-2 font-display text-[28px] font-[650] tracking-[-0.025em] text-ink-900">
        This page is off the map
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-500">
        The page you requested does not exist in this prototype. It may have been renamed, or the
        link may be out of date.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link to="/" className={buttonClasses({ variant: 'primary' })}>
          <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
          Back to dashboard
        </Link>
        <button type="button" className={buttonClasses({ variant: 'secondary' })} onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Go back
        </button>
      </div>
    </div>
  );
}

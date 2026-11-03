import { Link } from 'react-router-dom';
import { ArrowRight, Gauge } from 'lucide-react';
import { Card } from '../ui/Card.jsx';
import { ProgressBar } from '../ui/ProgressBar.jsx';
import { classNames } from '../../utils/format.js';

const TONE_DOT = {
  positive: 'bg-forest-600',
  warning: 'bg-warning',
  negative: 'bg-danger',
  neutral: 'bg-ink-300',
};

export function PerformanceSummary({ performance, coverage }) {
  if (!performance) return null;

  return (
    <Card className="flex flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-[16px] font-semibold leading-snug text-ink-900">
            Sustainability performance
          </h3>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
            A data-derived summary of the selected period.
          </p>
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-100 text-olive-700">
          <Gauge className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      <p className="mt-4 rounded-xl bg-sand-50 p-3 text-[12px] leading-relaxed text-ink-600 ring-1 ring-line">
        {performance.narrative}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {performance.items.map((item) => (
          <div key={item.id} className="rounded-xl border border-line p-3">
            <div className="flex items-center gap-1.5">
              <span
                className={classNames(
                  'h-1.5 w-1.5 rounded-full',
                  TONE_DOT[item.tone] ?? TONE_DOT.neutral,
                )}
                aria-hidden="true"
              />
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-400">
                {item.label}
              </p>
            </div>
            <p className="mt-1.5 font-display text-base font-semibold tracking-tight text-ink-900">
              {item.value}
            </p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-ink-400">{item.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium text-ink-500">Months with at least one record</p>
          <p className="text-[11px] font-semibold tabular-nums text-ink-900">
            {coverage?.coveredMonths ?? 0} / {coverage?.totalMonths ?? 0}
          </p>
        </div>
        <ProgressBar
          value={coverage?.percent ?? 0}
          className="mt-2"
          label="Months with at least one record"
        />
      </div>

      <Link
        to="/analytics"
        className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-forest-700 hover:text-forest-900"
      >
        Explore the analytics workspace
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </Link>
    </Card>
  );
}

import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Card } from './Card.jsx';
import { classNames, formatSignedPercent } from '../../utils/format.js';

function TrendPill({ percent, label }) {
  if (percent === null || percent === undefined || !Number.isFinite(percent)) {
    return <span className="text-ink-400">{label}</span>;
  }
  const isFlat = Math.abs(percent) < 0.05;
  const isDown = percent < 0;
  const good = !isFlat && isDown;
  const Icon = isFlat ? Minus : isDown ? ArrowDownRight : ArrowUpRight;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <span
        className={classNames(
          'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
          isFlat
            ? 'bg-sand-100 text-ink-500'
            : good
              ? 'bg-success-50 text-success-700'
              : 'bg-warning-50 text-warning-700',
        )}
      >
        <Icon className="h-3 w-3" aria-hidden="true" />
        {formatSignedPercent(percent, { digits: 1 })}
      </span>
      <span className="text-ink-400">{label}</span>
    </span>
  );
}

export function StatCard({ label, value, unit, icon: Icon, hint, trend, className }) {
  return (
    <Card className={classNames('p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow min-h-[36px] leading-relaxed">{label}</p>
        {Icon ? (
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sand-100 text-ink-400">
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
        <span className="tabular font-display text-[30px] font-semibold leading-none tracking-[-0.02em] text-ink-900">
          {value}
        </span>
        {unit ? <span className="text-xs font-medium text-ink-500">{unit}</span> : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-relaxed text-ink-500">
        {trend ? <TrendPill percent={trend.percent} label={trend.label ?? 'vs prior period'} /> : null}
        {hint ? <span className={trend ? 'text-ink-400' : 'text-ink-500'}>{hint}</span> : null}
      </div>
    </Card>
  );
}

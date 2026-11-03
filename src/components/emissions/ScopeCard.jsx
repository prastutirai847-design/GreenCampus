import { ArrowDownRight, ArrowUpRight, Check, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card.jsx';
import { ProgressBar } from '../ui/ProgressBar.jsx';
import { classNames, formatNumber, formatPercent, formatSignedPercent, formatTonnes } from '../../utils/format.js';

const PROGRESS_TONES = { 1: 'amber', 2: 'green', 3: 'olive' };

function ChangeNote({ changePercent, className }) {
  if (changePercent === null || changePercent === undefined || !Number.isFinite(changePercent)) {
    return <span className={classNames('text-[11px] text-ink-400', className)}>No prior-period comparison</span>;
  }
  const flat = Math.abs(changePercent) < 0.05;
  const down = changePercent < 0;
  const Icon = flat ? Minus : down ? ArrowDownRight : ArrowUpRight;
  return (
    <span className={classNames('inline-flex items-center gap-1 text-[11px]', className)}>
      <span
        className={classNames(
          'inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-semibold tabular-nums',
          flat
            ? 'bg-sand-100 text-ink-500'
            : down
              ? 'bg-forest-50 text-forest-700'
              : 'bg-warning-50 text-warning-700',
        )}
      >
        <Icon className="h-3 w-3" aria-hidden="true" />
        {formatSignedPercent(changePercent, { digits: 1 })}
      </span>
      <span className="text-ink-400">vs prior period</span>
    </span>
  );
}

export function ScopeCard({ scope, className }) {
  return (
    <Card className={classNames('relative overflow-hidden p-5', className)}>
      <span
        className="absolute inset-x-0 top-0 h-1"
        style={{ backgroundColor: scope.color }}
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
            {scope.label}
          </p>
          <p className="mt-0.5 text-[12px] font-medium text-ink-500">{scope.name}</p>
        </div>
        <span
          className="mt-1 inline-flex h-2 w-2 rounded-full"
          style={{ backgroundColor: scope.color }}
          aria-hidden="true"
        />
      </div>
      <p className="mt-4 flex flex-wrap items-baseline gap-x-1.5">
        <span className="font-display text-[26px] font-semibold leading-none tracking-tight text-ink-900">
          {formatNumber(scope.kg / 1000, { digits: scope.kg >= 10000 ? 0 : 1 })}
        </span>
        <span className="text-xs font-medium text-ink-500">tCO₂e</span>
      </p>
      <p className="mt-2 text-[11px] text-ink-400">
        {formatPercent(scope.share, { digits: 1, alreadyPercent: true })} of the footprint ·{' '}
        {formatNumber(scope.entryCount)} {scope.entryCount === 1 ? 'record' : 'records'}
      </p>
      <ProgressBar
        value={scope.share}
        tone={PROGRESS_TONES[scope.id] ?? 'green'}
        className="mt-3"
        label={`${scope.label} share of estimated emissions`}
      />
      <div className="mt-3">
        <ChangeNote changePercent={scope.changePercent} />
      </div>
    </Card>
  );
}

export function TotalEmissionsCard({
  totals,
  scopeShares,
  estimatedEntryCount,
  waterEntryCount,
  className,
}) {
  return (
    <Card className={classNames('relative overflow-hidden p-5', className)}>
      <span className="absolute inset-x-0 top-0 h-1 bg-forest-800" aria-hidden="true" />
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-400">
        Total estimated footprint
      </p>
      <p className="mt-4 flex flex-wrap items-baseline gap-x-1.5">
        <span className="font-display text-[30px] font-semibold leading-none tracking-tight text-ink-900">
          {formatNumber(totals.kg / 1000, { digits: totals.kg >= 100000 ? 0 : 1 })}
        </span>
        <span className="text-xs font-medium text-ink-500">tCO₂e</span>
      </p>
      <p className="mt-2 text-[11px] text-ink-400">
        {formatNumber(estimatedEntryCount)} estimated records
        {waterEntryCount ? ` · ${formatNumber(waterEntryCount)} water rows excluded` : ''}
      </p>
      <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-sand-200" aria-hidden="true">
        {scopeShares.map((scope) => (
          <span
            key={scope.scope}
            style={{ width: `${scope.percent}%`, backgroundColor: scope.color }}
            title={`${scope.label}: ${formatPercent(scope.percent, {
              digits: 0,
              alreadyPercent: true,
            })}`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-ink-400">
        {scopeShares.map((scope) => (
          <span key={scope.scope} className="inline-flex items-center gap-1">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: scope.color }}
              aria-hidden="true"
            />
            {scope.label} {formatPercent(scope.percent, { digits: 0, alreadyPercent: true })}
          </span>
        ))}
      </div>
      <div className="mt-3">
        <ChangeNote changePercent={totals.changePercent} />
      </div>
    </Card>
  );
}

export function ScopeDetailCard({ scope, className }) {
  return (
    <Card className={classNames('relative overflow-hidden p-5 sm:p-6', className)}>
      <span
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: scope.color }}
        aria-hidden="true"
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-ink-900">{scope.label}</h2>
            <span className="rounded-md bg-sand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-500">
              {scope.name}
            </span>
          </div>
          <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-ink-500">
            {scope.boundary}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-semibold tabular-nums text-ink-900">
            {formatNumber(scope.kg / 1000, { digits: 1 })} tCO₂e
          </p>
          <p className="mt-0.5 text-[11px] text-ink-400">
            {formatPercent(scope.share, { digits: 1, alreadyPercent: true })} ·{' '}
            {scope.entryCount} {scope.entryCount === 1 ? 'record' : 'records'}
          </p>
          <div className="mt-1.5">
            <ChangeNote changePercent={scope.changePercent} />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 border-t border-line pt-4 md:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
            Included in this scope
          </p>
          <ul className="mt-2 space-y-1.5">
            {scope.included.map((item) => (
              <li key={item} className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-600">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest-600" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
            Outside this scope
          </p>
          <ul className="mt-2 space-y-1.5">
            {scope.excluded.map((item) => (
              <li key={item} className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-500">
                <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-300" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 grid gap-4 border-t border-line pt-4 md:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
            Contribution by activity
          </p>
          <div className="mt-2 space-y-2">
            {scope.categories.map((category) => (
              <div key={category.id}>
                <div className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="font-medium text-ink-700">{category.label}</span>
                  <span className="tabular-nums text-ink-500">
                    {formatTonnes(category.kg, { digits: 1 })}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <ProgressBar
                    value={category.share}
                    tone={PROGRESS_TONES[scope.id] ?? 'green'}
                    className="flex-1"
                    label={`${category.label} share within ${scope.label}`}
                  />
                  <span className="w-10 text-right text-[10px] tabular-nums text-ink-400">
                    {formatPercent(category.share, { digits: 0, alreadyPercent: true })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
            Calculation method
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-ink-500">{scope.method}</p>
          <p className="mt-2 text-[11px] text-ink-400">
            {scope.factors.length} factor{scope.factors.length === 1 ? '' : 's'} used ·{' '}
            {scope.sources.length} source group{scope.sources.length === 1 ? '' : 's'}
          </p>
          <Link
            to="/settings#factors"
            className="mt-2 inline-flex text-[11px] font-medium text-forest-700 hover:text-forest-900"
          >
            Review factor sources
          </Link>
        </div>
      </div>

      {scope.sources.length ? (
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
            Source groups
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {scope.sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-sand-50/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-ink-700">{source.label}</p>
                  <p className="mt-0.5 text-[10px] text-ink-400">
                    {formatNumber(source.entryCount)} record{source.entryCount === 1 ? '' : 's'}
                  </p>
                </div>
                <span className="shrink-0 text-[12px] font-semibold tabular-nums text-ink-900">
                  {formatTonnes(source.kg, { digits: 1 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

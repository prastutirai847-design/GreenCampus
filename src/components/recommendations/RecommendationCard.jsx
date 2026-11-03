import {
  Bus,
  ClipboardCheck,
  Droplets,
  Flame,
  Recycle,
  Zap,
} from 'lucide-react';
import { Card } from '../ui/Card.jsx';
import { Badge, PriorityBadge, ScopeBadge } from '../ui/Badge.jsx';
import { classNames } from '../../utils/format.js';

const CATEGORY_ICONS = {
  Electricity: Zap,
  Fuel: Flame,
  Waste: Recycle,
  Commuting: Bus,
  Water: Droplets,
  'Data quality': ClipboardCheck,
};

const CATEGORY_STYLES = {
  Electricity: 'bg-forest-50 text-forest-600',
  Fuel: 'bg-warning-50 text-warning-700',
  Waste: 'bg-lime-100 text-olive-700',
  Commuting: 'bg-info-50 text-info-700',
  Water: 'bg-water-50 text-water-700',
  'Data quality': 'bg-sand-100 text-ink-500',
};

export function RecommendationCard({ recommendation }) {
  const Icon = CATEGORY_ICONS[recommendation.category] ?? Zap;
  const benefit = recommendation.expectedBenefit;

  return (
    <Card className="flex flex-col p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={classNames(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
              CATEGORY_STYLES[recommendation.category] ?? 'bg-forest-50 text-forest-600',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">
            {recommendation.category}
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          {recommendation.scope ? (
            <ScopeBadge scope={recommendation.scope} />
          ) : (
            <Badge tone="neutral">
              {recommendation.categoryId === 'water' ? 'Resource metric' : 'No GHG scope'}
            </Badge>
          )}
          <PriorityBadge priority={recommendation.priority} />
        </span>
      </div>

      <h3 className="mt-3 font-display text-[16px] font-semibold leading-snug text-ink-900">
        {recommendation.title}
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
        {recommendation.explanation ?? recommendation.finding}
      </p>

      {recommendation.evidence?.length ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-line bg-sand-50/70 px-3 py-2.5">
          {recommendation.evidence.map((item) => (
            <div key={item.label} className="min-w-0">
              <dt className="truncate text-[9px] font-medium uppercase tracking-[0.08em] text-ink-400">
                {item.label}
              </dt>
              <dd className="mt-0.5 text-[12px] font-medium tabular-nums text-ink-800">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-3 rounded-lg border border-line bg-white p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-forest-600">
          Suggested action
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-700">{recommendation.action}</p>
      </div>

      <div className="mt-auto pt-4">
        <div className="flex flex-wrap items-end justify-between gap-2 border-t border-line pt-3">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-400">
              {benefit ? 'Potential benefit' : 'Benefit estimate'}
            </p>
            {benefit ? (
              <>
                <p className="mt-0.5 font-display text-sm font-semibold text-forest-700">
                  {benefit.display}
                </p>
                <p className="mt-1 max-w-md text-[10px] leading-relaxed text-ink-400">
                  {benefit.assumption}
                </p>
              </>
            ) : (
              <p className="mt-0.5 text-[12px] text-ink-500">
                Not estimated — the data needed to calculate a credible benefit is not recorded.
              </p>
            )}
          </div>
          <span className="rounded-md border border-line bg-white px-2 py-0.5 text-[10px] font-medium text-ink-500">
            Effort: {recommendation.effort}
          </span>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-ink-400">{recommendation.basis}</p>
      </div>
    </Card>
  );
}

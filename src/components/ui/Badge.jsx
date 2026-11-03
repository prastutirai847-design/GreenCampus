import { classNames } from '../../utils/format.js';
import { CATEGORY_META, SCOPE_META } from '../../data/options.js';

const tones = {
  neutral: 'border-sand-200 bg-sand-100 text-ink-700',
  green: 'border-forest-100 bg-forest-50 text-forest-700',
  amber: 'border-warning-200 bg-warning-50 text-warning-700',
  olive: 'border-lime-200 bg-lime-100 text-olive-700',
  rose: 'border-danger-200 bg-danger-50 text-danger-700',
  blue: 'border-info-100 bg-info-50 text-info-700',
};

export function Badge({ tone = 'neutral', children, className, dot = false }) {
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-[550] leading-5',
        tones[tone] ?? tones.neutral,
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function ScopeBadge({ scope, className }) {
  if (!scope) {
    return (
      <Badge tone="neutral" className={className}>
        Not classified
      </Badge>
    );
  }
  const meta = SCOPE_META[scope];
  return (
    <Badge tone={meta?.tone ?? 'neutral'} className={className}>
      {meta?.label ?? `Scope ${scope}`}
    </Badge>
  );
}

export function CategoryBadge({ category, className }) {
  const meta = CATEGORY_META[category];
  return (
    <Badge tone={meta?.tone ?? 'neutral'} className={className}>
      {meta?.label ?? category}
    </Badge>
  );
}

export function PriorityBadge({ priority, className }) {
  const tone = priority === 'High' ? 'rose' : priority === 'Medium' ? 'amber' : 'green';
  return (
    <Badge tone={tone} className={className}>
      {priority} priority
    </Badge>
  );
}

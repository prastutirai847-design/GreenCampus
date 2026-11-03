import { classNames } from '../../utils/format.js';

const tones = {
  green: 'bg-forest-600',
  amber: 'bg-warning',
  olive: 'bg-lime-500',
  water: 'bg-info',
};

export function ProgressBar({ value = 0, tone = 'green', className, label }) {
  const safe = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className={className}>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-sand-200"
        role="progressbar"
        aria-valuenow={Math.round(safe)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={classNames('h-full rounded-full transition-all', tones[tone] ?? tones.green)}
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}

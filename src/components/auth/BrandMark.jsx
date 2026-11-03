import { Leaf } from 'lucide-react';
import { classNames } from '../../utils/format.js';

export function BrandMark({ tone = 'light', compact = false }) {
  const dark = tone === 'dark';
  return (
    <div className="flex items-center gap-3">
      <span
        className={classNames(
          'flex items-center justify-center rounded-xl',
          compact ? 'h-9 w-9' : 'h-10 w-10',
          dark ? 'bg-lime-300 text-forest-900' : 'bg-forest-800 text-lime-200',
        )}
      >
        <Leaf className={compact ? 'h-5 w-5' : 'h-5 w-5'} aria-hidden="true" />
      </span>
      <span>
        <span
          className={classNames(
            'block font-display font-semibold tracking-tight',
            compact ? 'text-[15px]' : 'text-base',
            dark ? 'text-white' : 'text-ink-900',
          )}
        >
          GreenCampus
        </span>
        <span
          className={classNames(
            'mt-0.5 block text-[9px] font-medium uppercase tracking-[0.18em]',
            dark ? 'text-white/45' : 'text-ink-400',
          )}
        >
          Sustainability office
        </span>
      </span>
    </div>
  );
}

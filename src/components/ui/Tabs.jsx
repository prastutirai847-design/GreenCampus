import { classNames } from '../../utils/format.js';

export function Tabs({ items, value, onChange, className }) {
  return (
    <div
      role="tablist"
      className={classNames(
        'flex flex-wrap gap-1 rounded-xl border border-line bg-white p-1 shadow-card scrollbar-thin sm:flex-nowrap sm:overflow-x-auto',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={classNames(
              'inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
              active
                ? 'bg-forest-700 text-white shadow-sm'
                : 'text-ink-500 hover:bg-sand-100 hover:text-ink-900',
            )}
          >
            {item.label}
            {item.count !== undefined ? (
              <span
                className={classNames(
                  'rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                  active ? 'bg-white/15 text-white' : 'bg-sand-100 text-ink-400',
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

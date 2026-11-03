import { classNames } from '../../utils/format.js';

export function ChartCard({ title, description, action, children, className, footer }) {
  return (
    <div className={classNames('rounded-2xl border border-line bg-white p-5 shadow-card sm:p-6', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-[16px] font-semibold leading-snug text-ink-900">{title}</h3>
          {description ? (
            <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
      {footer ? <div className="mt-4 border-t border-line pt-3 text-xs text-ink-400">{footer}</div> : null}
    </div>
  );
}

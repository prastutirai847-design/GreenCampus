import { classNames } from '../../utils/format.js';

export function Card({ children, className, ...props }) {
  return (
    <div
      className={classNames('rounded-2xl border border-line bg-white shadow-card', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className, headingLevel: Heading = 'h3' }) {
  return (
    <div className={classNames('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <Heading className="font-display text-[16px] font-semibold leading-snug text-ink-900">{title}</Heading>
        {description ? <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

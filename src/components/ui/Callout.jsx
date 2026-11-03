import { AlertTriangle, Info, X } from 'lucide-react';
import { classNames } from '../../utils/format.js';

const tones = {
  info: {
    wrapper: 'border-forest-100 bg-forest-50/70',
    icon: 'text-forest-600',
    title: 'text-forest-900',
    body: 'text-forest-800/80',
    Icon: Info,
  },
  warning: {
    wrapper: 'border-warning-200 bg-warning-50',
    icon: 'text-warning-700',
    title: 'text-warning-700',
    body: 'text-warning-700',
    Icon: AlertTriangle,
  },
  danger: {
    wrapper: 'border-danger-200 bg-danger-50',
    icon: 'text-danger',
    title: 'text-danger-700',
    body: 'text-danger-700',
    Icon: AlertTriangle,
  },
};

export function Callout({ tone = 'info', title, children, action, onDismiss, className }) {
  const styles = tones[tone] ?? tones.info;
  const Icon = styles.Icon;
  return (
    <div className={classNames('flex items-start gap-3 rounded-xl border px-4 py-3', styles.wrapper, className)}>
      <Icon className={classNames('mt-0.5 h-4 w-4 shrink-0', styles.icon)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? <p className={classNames('text-[13px] font-semibold', styles.title)}>{title}</p> : null}
        {children ? (
          <div className={classNames('text-[13px] leading-relaxed', styles.body, title ? 'mt-0.5' : '')}>
            {children}
          </div>
        ) : null}
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className={classNames('rounded-md p-1 transition hover:bg-black/5', styles.icon)}
          aria-label="Dismiss message"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

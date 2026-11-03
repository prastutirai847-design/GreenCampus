import { Inbox } from 'lucide-react';
import { classNames } from '../../utils/format.js';

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }) {
  return (
    <div className={classNames('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-forest-100 bg-forest-50 text-forest-600">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <h3 className="mt-3 font-display text-base font-semibold text-ink-900">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-500">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, Info, ShieldAlert } from 'lucide-react';
import { Card } from '../ui/Card.jsx';
import { classNames } from '../../utils/format.js';

const SEVERITY_STYLES = {
  high: {
    wrapper: 'border-danger-200 bg-danger-50',
    icon: 'text-danger-700',
    Icon: AlertTriangle,
  },
  medium: {
    wrapper: 'border-warning-200 bg-warning-50',
    icon: 'text-warning-700',
    Icon: ShieldAlert,
  },
  info: {
    wrapper: 'border-info-100 bg-info-50',
    icon: 'text-info-700',
    Icon: Info,
  },
  positive: {
    wrapper: 'border-forest-100 bg-forest-50/70',
    icon: 'text-forest-600',
    Icon: CheckCircle2,
  },
};

export function AlertsPanel({ alerts = [] }) {
  return (
    <Card className="flex flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-[16px] font-semibold leading-snug text-ink-900">Sustainability alerts</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
            Signals derived from the selected period.
          </p>
        </div>
        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-forest-50 px-2 font-display text-sm font-semibold text-forest-700">
          {alerts.length}
        </span>
      </div>

      {alerts.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-line p-4 text-xs leading-relaxed text-ink-400">
          No alerts for this period.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {alerts.map((alert) => {
            const styles = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info;
            const Icon = styles.Icon;
            return (
              <li
                key={alert.id}
                className={classNames('rounded-xl border p-3', styles.wrapper)}
              >
                <div className="flex items-start gap-2.5">
                  <Icon className={classNames('mt-0.5 h-4 w-4 shrink-0', styles.icon)} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold leading-snug text-ink-900">{alert.title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-500">{alert.message}</p>
                    {alert.link ? (
                      <Link
                        to={alert.link.to}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-forest-700 hover:text-forest-900"
                      >
                        {alert.link.label}
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-auto pt-4 text-[10px] leading-relaxed text-ink-400">
        Alerts are rule-based checks on recorded data, not an audit.
      </p>
    </Card>
  );
}

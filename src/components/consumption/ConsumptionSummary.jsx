import { Card } from '../ui/Card.jsx';

export function ConsumptionSummary({ items }) {
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-2 divide-y divide-line sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {items.map((item) => (
          <div key={item.label} className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              {item.label}
            </p>
            <p className="mt-1 font-display text-lg font-semibold tracking-tight text-ink-900">
              {item.value}
            </p>
            {item.hint ? <p className="mt-0.5 text-[11px] text-ink-400">{item.hint}</p> : null}
          </div>
        ))}
      </div>
    </Card>
  );
}

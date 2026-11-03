import { formatNumber } from '../../utils/format.js';

export function ChartTooltip({ active, payload, label, unit = 'tCO₂e', valueFormatter, showTotal = false }) {
  if (!active || !payload?.length) return null;
  const formatter =
    valueFormatter ??
    ((value) => `${formatNumber(value, { digits: Math.abs(Number(value)) >= 10 ? 0 : 1 })} ${unit}`);
  const total = payload.reduce((sum, entry) => sum + (Number(entry.value) || 0), 0);

  return (
    <div className="min-w-[160px] rounded-xl border border-line bg-white/95 p-3 text-xs shadow-lift backdrop-blur">
      {label ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">{label}</p>
      ) : null}
      <div className="mt-1.5 space-y-1">
        {payload.map((entry) => (
          <div
            key={`${entry.dataKey ?? entry.name}`}
            className="flex items-center justify-between gap-4"
          >
            <span className="flex items-center gap-1.5 text-ink-500">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color ?? entry.payload?.fill }}
                aria-hidden="true"
              />
              {entry.name}
            </span>
            <span className="font-[550] tabular-nums text-ink-900">{formatter(entry.value, entry)}</span>
          </div>
        ))}
      </div>
      {showTotal && payload.length > 1 ? (
        <div className="mt-2 flex items-center justify-between border-t border-line pt-1.5">
          <span className="text-ink-500">Total</span>
          <span className="font-semibold tabular-nums text-ink-900">{formatter(total)}</span>
        </div>
      ) : null}
    </div>
  );
}

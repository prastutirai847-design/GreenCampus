import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { classNames, formatNumber } from '../../utils/format.js';
import { ChartTooltip } from './ChartTooltip.jsx';

export function DonutChart({
  data,
  centerValue,
  centerLabel,
  valueFormatter,
  size = 188,
  layout = 'row',
}) {
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const stacked = layout === 'stack';

  return (
    <div
      className={classNames(
        'flex flex-col items-center',
        stacked ? 'gap-4' : 'gap-5 sm:flex-row',
      )}
    >
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        {total > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="64%"
                outerRadius="92%"
                paddingAngle={2}
                startAngle={90}
                endAngle={-270}
                stroke="none"
              >
                {data.map((item) => (
                  <Cell key={item.name} fill={item.color} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} showTotal />} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full rounded-full border-[16px] border-sand-100" aria-hidden="true" />
        )}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-display text-xl font-semibold tracking-tight text-ink-900">
            {centerValue}
          </span>
          <span className="mt-0.5 max-w-[110px] text-[10px] font-medium uppercase leading-tight tracking-[0.08em] text-ink-400">
            {centerLabel}
          </span>
        </div>
      </div>

      <div className={classNames('w-full min-w-0', stacked ? 'space-y-2.5' : 'flex-1 space-y-3')}>
        {data.length === 0 ? (
          <p className="text-xs text-ink-400">No records for this period.</p>
        ) : (
          data.map((item) => (
            <div key={item.name} className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
                <span className="truncate text-xs text-ink-500">{item.name}</span>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-semibold tabular-nums text-ink-900">
                  {valueFormatter(item.value)}
                </p>
                {item.percent !== undefined ? (
                  <p className="text-[10px] tabular-nums text-ink-400">
                    {formatNumber(item.percent, { digits: 1 })}%
                  </p>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS } from '../../data/options.js';

function BarTooltip({ active, payload, valueFormatter, secondaryFormatter }) {
  const item = payload?.[0];
  if (!active || !item) return null;
  const row = item.payload;
  return (
    <div className="min-w-[150px] rounded-xl border border-line bg-white/95 p-3 text-xs shadow-lift backdrop-blur">
      <p className="font-medium text-ink-900">{row.name}</p>
      <p className="mt-1 font-semibold tabular-nums text-forest-700">{valueFormatter(row.value)}</p>
      {secondaryFormatter && row.secondary !== undefined ? (
        <p className="mt-0.5 text-[11px] text-ink-400">{secondaryFormatter(row.secondary)}</p>
      ) : null}
    </div>
  );
}

function wrapName(value, maxChars) {
  const words = String(value ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  if (lines.length <= 2) return lines;
  return [lines[0], `${lines[1]}…`];
}

function WrappedTick({ x, y, payload, maxChars }) {
  const lines = wrapName(payload?.value, maxChars);
  return (
    <text x={x} y={y} textAnchor="end" fill={CHART_COLORS.axis} fontSize={11}>
      {lines.map((line, index) => (
        <tspan key={`${line}-${index}`} x={x} dy={index === 0 ? (lines.length > 1 ? -3 : 4) : 12}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

export function HorizontalBarChart({
  data,
  valueFormatter,
  secondaryFormatter,
  color = CHART_COLORS.scope2,
  height = 260,
  nameWidth = 128,
  wrapNames = false,
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 20, left: 0, bottom: 4 }}
          barCategoryGap="24%"
        >
          <CartesianGrid horizontal={false} stroke={CHART_COLORS.grid} strokeDasharray="3 5" />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            axisLine={false}
            tickLine={false}
            width={nameWidth}
            tick={
              wrapNames ? (
                <WrappedTick maxChars={Math.max(10, Math.floor((nameWidth - 10) / 5.6))} />
              ) : (
                { fontSize: 11, fill: CHART_COLORS.axis }
              )
            }
          />
          <Tooltip
            content={
              <BarTooltip
                valueFormatter={valueFormatter}
                secondaryFormatter={secondaryFormatter}
              />
            }
            cursor={{ fill: 'rgba(23, 35, 28, 0.03)' }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18} background={{ fill: CHART_COLORS.surface, radius: 4 }}>
            {data.map((item) => (
              <Cell key={item.name} fill={item.color ?? color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

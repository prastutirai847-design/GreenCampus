import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS } from '../../data/options.js';
import { formatCompact, formatNumber } from '../../utils/format.js';
import { ChartTooltip } from './ChartTooltip.jsx';

export function TrendAreaChart({
  data,
  unit,
  seriesName,
  color = CHART_COLORS.electricity,
  height = 210,
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} strokeDasharray="3 5" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            dy={8}
            interval="preserveStartEnd"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: CHART_COLORS.axis }}
            width={56}
            tickFormatter={(value) => formatCompact(value)}
          />
          <Tooltip
            content={
              <ChartTooltip
                valueFormatter={(value) =>
                  `${formatNumber(value, { digits: Math.abs(Number(value)) >= 10 ? 0 : 1 })} ${unit}`
                }
              />
            }
            cursor={{ stroke: '#B8C9BE', strokeDasharray: '4 4' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            name={seriesName ?? unit}
            stroke={color}
            strokeWidth={2}
            fill={color}
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: '#ffffff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

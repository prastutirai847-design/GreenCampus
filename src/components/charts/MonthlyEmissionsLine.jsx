import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS } from '../../data/options.js';
import { formatNumber } from '../../utils/format.js';
import { ChartTooltip } from './ChartTooltip.jsx';
import { ChartLegend } from './ChartLegend.jsx';

export function MonthlyEmissionsLine({ data, height = 280 }) {
  return (
    <div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
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
              width={52}
              tickFormatter={(value) => formatNumber(value)}
            />
            <Tooltip
              content={
                <ChartTooltip
                  valueFormatter={(value) =>
                    `${formatNumber(value, { digits: Math.abs(Number(value)) >= 10 ? 0 : 1 })} tCO₂e`
                  }
                />
              }
              cursor={{ stroke: '#B8C9BE', strokeDasharray: '4 4' }}
            />
            <Line
              type="monotone"
              dataKey="scope1T"
              name="Scope 1"
              stroke={CHART_COLORS.scope1}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#ffffff' }}
            />
            <Line
              type="monotone"
              dataKey="scope2T"
              name="Scope 2"
              stroke={CHART_COLORS.scope2}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#ffffff' }}
            />
            <Line
              type="monotone"
              dataKey="scope3T"
              name="Scope 3"
              stroke={CHART_COLORS.scope3}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#ffffff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend
        items={[
          { label: 'Scope 1', color: CHART_COLORS.scope1 },
          { label: 'Scope 2', color: CHART_COLORS.scope2 },
          { label: 'Scope 3', color: CHART_COLORS.scope3 },
        ]}
      />
    </div>
  );
}

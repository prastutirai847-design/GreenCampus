import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS } from '../../data/options.js';
import { formatNumber } from '../../utils/format.js';
import { ChartTooltip } from './ChartTooltip.jsx';
import { ChartLegend } from './ChartLegend.jsx';

const formatTonnesValue = (value) =>
  `${formatNumber(value, { digits: Math.abs(Number(value)) >= 10 ? 0 : 1 })} tCO₂e`;

export function EmissionsTrendChart({ data, height = 300 }) {
  return (
    <div>
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barCategoryGap="26%">
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
              content={<ChartTooltip showTotal valueFormatter={formatTonnesValue} />}
              cursor={{ fill: 'rgba(20, 32, 26, 0.04)' }}
            />
            <Bar dataKey="scope1T" name="Scope 1" stackId="emissions" fill={CHART_COLORS.scope1} maxBarSize={30} />
            <Bar dataKey="scope2T" name="Scope 2" stackId="emissions" fill={CHART_COLORS.scope2} maxBarSize={30} />
            <Bar
              dataKey="scope3T"
              name="Scope 3"
              stackId="emissions"
              fill={CHART_COLORS.scope3}
              radius={[3, 3, 0, 0]}
              maxBarSize={30}
            />
          </BarChart>
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

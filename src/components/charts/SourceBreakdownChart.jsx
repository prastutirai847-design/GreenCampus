import { CHART_COLORS } from '../../data/options.js';
import { formatNumber, formatTonnes } from '../../utils/format.js';
import { HorizontalBarChart } from './HorizontalBarChart.jsx';

export function SourceBreakdownChart({ categories, height = 230 }) {
  const colors = {
    electricity: CHART_COLORS.electricity,
    fuel: CHART_COLORS.fuel,
    waste: CHART_COLORS.waste,
    commuting: CHART_COLORS.commuting,
  };
  const data = categories.map((item) => ({
    name: item.name,
    value: item.value / 1000,
    secondary: item.value,
    color: colors[item.id] ?? CHART_COLORS.scope2,
  }));

  return (
    <HorizontalBarChart
      data={data}
      height={height}
      nameWidth={104}
      valueFormatter={(value) => `${formatNumber(value, { digits: value >= 10 ? 1 : 2 })} tCO₂e`}
      secondaryFormatter={(value) => formatTonnes(value, { digits: 1 })}
    />
  );
}

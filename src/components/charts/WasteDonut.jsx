import { formatWeight } from '../../utils/format.js';
import { DonutChart } from './DonutChart.jsx';

const COLORS = {
  landfill: '#C2763A',
  composting: '#166534',
  recycling: '#8FAA5E',
  incineration: '#B5675A',
};

export function WasteDonut({ series }) {
  const data = series
    .filter((item) => item.weightKg > 0)
    .map((item) => ({
      name: item.name,
      value: item.weightKg,
      color: COLORS[item.id] ?? '#8FAA5E',
    }));
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <DonutChart
      data={data}
      centerValue={formatWeight(total)}
      centerLabel="waste"
      valueFormatter={(value) => formatWeight(value)}
      layout="stack"
      size={164}
    />
  );
}

import { formatWeight } from '../../utils/format.js';
import { DonutChart } from './DonutChart.jsx';

const CATEGORY_COLORS = {
  mixed: '#B5675A',
  organic: '#166534',
  paper: '#8FAA5E',
  plastic: '#3E7A8C',
  'glass-metal': '#5B7A99',
  'e-waste': '#C2763A',
};

export function WasteCategoryChart({ categories = [] }) {
  const data = categories
    .filter((category) => category.weightKg > 0)
    .map((category) => ({
      name: category.name,
      value: category.weightKg,
      percent: category.percent,
      color: CATEGORY_COLORS[category.id] ?? '#8FAA5E',
    }));
  const total = data.reduce((sum, category) => sum + category.value, 0);

  return (
    <DonutChart
      data={data}
      centerValue={formatWeight(total)}
      centerLabel="total waste"
      valueFormatter={(value) => formatWeight(value)}
      layout="stack"
      size={160}
    />
  );
}

import { SCOPE_META } from '../../data/options.js';
import { formatNumber, formatTonnes } from '../../utils/format.js';
import { DonutChart } from './DonutChart.jsx';

export function ScopeDonut({ shares, totalKg }) {
  const data = shares
    .filter((item) => item.kg > 0)
    .map((item) => ({
      name: SCOPE_META[item.scope].label,
      value: item.kg,
      percent: item.percent,
      color: SCOPE_META[item.scope].color,
    }));

  const totalTonnes = totalKg / 1000;
  const centerValue = formatNumber(totalTonnes, { digits: totalTonnes >= 100 ? 0 : 1 });

  return (
    <DonutChart
      data={data}
      centerValue={centerValue}
      centerLabel="tCO₂e total"
      valueFormatter={(value) => formatTonnes(value, { digits: 1 })}
    />
  );
}

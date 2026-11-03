import { Link } from 'react-router-dom';
import { ArrowUpRight, Building2 } from 'lucide-react';
import { Card } from '../ui/Card.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { ProgressBar } from '../ui/ProgressBar.jsx';
import { formatNumber, formatPercent, formatTonnes } from '../../utils/format.js';

export function TopBuildingsCard({ buildings = [] }) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-3 sm:p-6 sm:pb-3">
        <div>
          <h3 className="font-display text-[16px] font-semibold leading-snug text-ink-900">
            Highest-consuming buildings
          </h3>
          <p className="mt-1 text-[13px] text-ink-500">
            Ranked by estimated emissions for the selected period.
          </p>
        </div>
        <Link
          to="/buildings"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-forest-700 hover:text-forest-900"
        >
          All buildings
          <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      {buildings.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No building emissions yet"
          description="Attach electricity and water readings to buildings to see which ones consume the most."
          className="py-10"
        />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {buildings.map((building, index) => (
            <li key={building.id} className="px-5 py-3 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-2.5">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-sand-100 font-display text-[10px] font-semibold text-ink-500">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink-900">{building.name}</p>
                    <p className="mt-0.5 text-[11px] text-ink-400">
                      {building.type ?? 'Building'}
                      {building.intensityKgPerSqm
                        ? ` · ${formatNumber(building.intensityKgPerSqm, { digits: 1 })} kgCO₂e/m²`
                        : ''}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[13px] font-medium tabular-nums text-ink-900">
                    {formatTonnes(building.kg, { digits: 1 })}
                  </p>
                  <p className="text-[10px] tabular-nums text-ink-400">
                    {formatPercent(building.share, { digits: 1, alreadyPercent: true })} of total
                  </p>
                </div>
              </div>
              <ProgressBar
                value={building.share}
                className="mt-2"
                label={`${building.name} share of emissions`}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

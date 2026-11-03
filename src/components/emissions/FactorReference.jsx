import { Link } from 'react-router-dom';
import { Badge, ScopeBadge } from '../ui/Badge.jsx';
import { Callout } from '../ui/Callout.jsx';
import { Card } from '../ui/Card.jsx';
import {
  FACTOR_GROUPS,
  FACTOR_METADATA_NOTE,
  FACTOR_STATUS,
  factorStatus,
} from '../../data/emissionFactors.js';
import { formatEmissions, formatFactor } from '../../utils/format.js';

export function FactorReferenceCard({ factors, usage = [] }) {
  const usageByKey = new Map(usage.map((entry) => [entry.key, entry]));
  const entries = FACTOR_GROUPS.flatMap((group) =>
    Object.entries(factors ?? {}).filter(([, definition]) => definition.group === group),
  );
  const customCount = entries.filter(([, definition]) => definition.status === 'custom').length;
  const verifiedCount = entries.filter(([, definition]) => definition.verified).length;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-4 sm:p-6 sm:pb-4">
        <div>
          <h3 className="font-display text-[16px] font-semibold leading-snug text-ink-900">
            Emission factor reference
          </h3>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-500">
            Every factor records its value, unit, source, applicable year and verification status.
            Editing a value in Settings marks it as a custom value.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={verifiedCount ? 'green' : 'amber'}>
            {verifiedCount} verified
          </Badge>
          <Badge tone="neutral">
            {entries.length - customCount - verifiedCount} reference
          </Badge>
          {customCount ? <Badge tone="blue">{customCount} custom</Badge> : null}
        </div>
      </div>

      <div className="px-5 pb-4 sm:px-6">
        <Callout tone="warning" title="Reference set, not a verified inventory">
          {FACTOR_METADATA_NOTE} Replace values in{' '}
          <Link to="/settings#factors" className="font-semibold underline decoration-from-font">
            Settings
          </Link>{' '}
          when a documented regional, utility or contractual source is available.
        </Callout>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-y border-line bg-sand-50/80">
              <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                Factor
              </th>
              <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                Scope
              </th>
              <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                Active value
              </th>
              <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                Source &amp; applicability
              </th>
              <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                Used in period
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {entries.map(([key, definition]) => {
              const status = factorStatus(definition);
              const used = usageByKey.get(key);
              return (
                <tr key={key} className="align-top transition-colors hover:bg-sand-50/50">
                  <td className="px-5 py-3.5">
                    <p className="text-[13px] font-medium text-ink-900">{definition.label}</p>
                    <p className="mt-0.5 max-w-[240px] text-[11px] leading-relaxed text-ink-400">
                      {definition.hint}
                    </p>
                    <div className="mt-1.5">
                      <Badge tone={status.tone}>{status.shortLabel}</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <ScopeBadge scope={definition.scope} />
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <p className="whitespace-nowrap text-[13px] font-semibold tabular-nums text-ink-900">
                      {formatFactor(definition.value, '')}
                    </p>
                    <p className="mt-0.5 text-[10px] text-ink-400">{definition.unit}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="max-w-[300px] text-[11px] leading-relaxed text-ink-500">
                      {definition.source}
                    </p>
                    <p className="mt-1 text-[10px] text-ink-400">
                      Applicable year {definition.year && definition.year !== 'Indicative' ? definition.year : '—'} · {definition.region || '—'}
                    </p>
                    {definition.replacement ? (
                      <p className="mt-1 max-w-[300px] text-[10px] leading-relaxed text-ink-400">
                        Replacement guidance: {definition.replacement}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {used ? (
                      <>
                        <p className="text-[12px] font-medium tabular-nums text-ink-900">
                          {formatEmissions(used.kg)}
                        </p>
                        <p className="mt-0.5 text-[10px] text-ink-400">
                          {used.recordCount} record{used.recordCount === 1 ? '' : 's'}
                        </p>
                      </>
                    ) : (
                      <span className="text-[11px] text-ink-400">Not used</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-line bg-sand-50 px-5 py-3 text-[11px] leading-relaxed text-ink-400 sm:px-6">
        {FACTOR_STATUS.reference.description} A verified status must be supported by source
        evidence retained outside this prototype.
      </div>
    </Card>
  );
}

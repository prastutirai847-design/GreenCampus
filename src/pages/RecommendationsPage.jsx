import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ClipboardCheck,
  Download,
  Gauge,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react';
import { useCampus } from '../context/CampusContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { RecommendationCard } from '../components/recommendations/RecommendationCard.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button, buttonClasses } from '../components/ui/Button.jsx';
import { Callout } from '../components/ui/Callout.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { Tabs } from '../components/ui/Tabs.jsx';
import { getRecommendationSnapshot } from '../services/recommendationService.js';
import { downloadCsv, toCsv } from '../utils/csv.js';
import { formatNumber } from '../utils/format.js';

const PRIORITY_TABS = ['All', 'High', 'Medium', 'Low'];

const STATUS_META = {
  triggered: { label: 'Triggered', tone: 'amber' },
  clear: { label: 'Clear', tone: 'green' },
  'insufficient-data': { label: 'Needs data', tone: 'neutral' },
};

function RuleStatusBadge({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META['insufficient-data'];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

function AdvisorSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Card key={item} className="p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-6 w-16" />
            <Skeleton className="mt-2 h-3 w-32" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <Card key={item} className="p-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-3 h-5 w-3/4" />
            <Skeleton className="mt-2 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-5/6" />
            <Skeleton className="mt-4 h-20 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, iconClass, label, value, detail }) {
  return (
    <Card className="flex items-start gap-3 p-4">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-400">{label}</p>
        <p className="mt-0.5 font-display text-lg font-semibold text-ink-900">{value}</p>
        <p className="text-[11px] leading-snug text-ink-400">{detail}</p>
      </div>
    </Card>
  );
}

export function RecommendationsPage() {
  const { activities, buildings, profile, factors } = useCampus();
  const { push } = useToast();

  const [priority, setPriority] = useState('All');
  const [category, setCategory] = useState('All');
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const hasLoadedRef = useRef(false);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    requestRef.current += 1;
    const requestId = requestRef.current;
    setError(null);
    if (hasLoadedRef.current) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getRecommendationSnapshot({ months: 12 });
      if (requestId === requestRef.current) {
        setSnapshot(data);
        hasLoadedRef.current = true;
      }
    } catch (loadError) {
      if (requestId === requestRef.current) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'The recommendation advisor could not be loaded.',
        );
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [activities, buildings, profile, factors, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  const recommendations = snapshot?.recommendations ?? [];
  const summary = snapshot?.summary;
  const meta = snapshot?.meta;

  const counts = useMemo(
    () => ({
      All: recommendations.length,
      High: summary?.high ?? 0,
      Medium: summary?.medium ?? 0,
      Low: summary?.low ?? 0,
    }),
    [recommendations.length, summary],
  );

  const categoryOptions = useMemo(() => {
    if (!summary?.byCategory) return [];
    return Object.entries(summary.byCategory)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [summary]);

  const visible = useMemo(
    () =>
      recommendations.filter(
        (item) =>
          (priority === 'All' || item.priority === priority) &&
          (category === 'All' || item.category === category),
      ),
    [recommendations, priority, category],
  );

  const filtersActive = priority !== 'All' || category !== 'All';
  const resetFilters = () => {
    setPriority('All');
    setCategory('All');
  };

  const handleExport = () => {
    if (!recommendations.length) return;
    const rows = recommendations.map((item) => ({
      priority: item.priority,
      category: item.category,
      scope: item.scope ? `Scope ${item.scope}` : 'Not a GHG scope',
      title: item.title,
      explanation: item.explanation ?? item.finding,
      evidence: (item.evidence ?? []).map((entry) => `${entry.label}: ${entry.value}`).join('; '),
      action: item.action,
      effort: item.effort,
      benefit: item.expectedBenefit?.display ?? 'Not estimated',
      benefitAssumption: item.expectedBenefit?.assumption ?? 'Insufficient data for a credible estimate.',
      rule: item.ruleId,
      basis: item.basis,
    }));
    const csv = toCsv(
      [
        { label: 'Priority', key: 'priority' },
        { label: 'Category', key: 'category' },
        { label: 'GHG scope', key: 'scope' },
        { label: 'Recommendation', key: 'title' },
        { label: 'Explanation', key: 'explanation' },
        { label: 'Evidence', key: 'evidence' },
        { label: 'Suggested action', key: 'action' },
        { label: 'Effort', key: 'effort' },
        { label: 'Potential benefit', key: 'benefit' },
        { label: 'Benefit assumption', key: 'benefitAssumption' },
        { label: 'Rule', key: 'rule' },
        { label: 'Method / basis', key: 'basis' },
      ],
      rows,
    );
    const prefix = meta?.isSample ? 'greencampus-sample-recommendations' : 'greencampus-recommendations';
    downloadCsv(`${prefix}-${meta?.to ?? 'period'}.csv`, csv);
    push({
      tone: 'success',
      title: 'Recommendations exported',
      description: 'Rule results, evidence, actions and benefit assumptions were written to CSV.',
    });
  };

  const hasActivities = (meta?.entryCount ?? 0) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sustainability advisor · rule-based"
        title="Recommendations"
        description="Actionable opportunities derived from the same activity, building and emission data as the dashboard. The checks below are explicit rules — not artificial intelligence."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setRefreshKey((value) => value + 1)}
              disabled={loading || refreshing}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {refreshing ? 'Refreshing' : 'Refresh'}
            </Button>
            <Button
              variant="secondary"
              onClick={handleExport}
              disabled={loading || !hasActivities || !recommendations.length}
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Export CSV
            </Button>
            <Link to="/data-entry" className={buttonClasses()}>
              Add records
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </>
        }
      />

      <Callout title="Deterministic rules, not AI">
        Each recommendation comes from a named, auditable rule with a fixed threshold — for example,
        electricity rising at least 5% month on month, or one building using at least 1.25× the
        campus median electricity per m². No language model is called and no savings percentage is
        assumed. A future AI assistant can use{' '}
        <code className="rounded bg-black/5 px-1 py-0.5 text-[11px]">GET /ai/recommendations</code>{' '}
        and <code className="rounded bg-black/5 px-1 py-0.5 text-[11px]">POST /ai/ask</code>, but it
        is not enabled in this prototype.
      </Callout>

      {meta?.isSample ? (
        <Callout tone="warning" title="Sample dataset — illustrative advice">
          The workspace contains {formatNumber(meta.sampleRecordCount)} demo records. Recommendations
          describe patterns in that sample data and are not measured advice for a real college.
        </Callout>
      ) : null}

      {loading && !snapshot ? <AdvisorSkeleton /> : null}

      {error && !loading ? (
        <ErrorState
          title="Recommendations could not be loaded"
          message={error}
          onRetry={() => setRefreshKey((value) => value + 1)}
        />
      ) : null}

      {!loading && !error && snapshot && !hasActivities ? (
        <Card>
          <EmptyState
            icon={Lightbulb}
            title="Nothing to advise on yet"
            description="Recommendations are derived from recorded consumption. Add electricity, water, fuel, waste or commuting data to run the rule set."
            action={
              <Link to="/data-entry" className={buttonClasses()}>
                Add your first records
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            }
          />
        </Card>
      ) : null}

      {!loading && !error && snapshot && hasActivities ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={Lightbulb}
              iconClass="bg-forest-50 text-forest-600"
              label="Open recommendations"
              value={summary.opportunities}
              detail={meta.periodLabel}
            />
            <SummaryCard
              icon={Target}
              iconClass="bg-danger-50 text-danger-700"
              label="High priority"
              value={summary.high}
              detail="Address these first"
            />
            <SummaryCard
              icon={Sparkles}
              iconClass="bg-lime-100 text-olive-700"
              label="Quantified benefits"
              value={summary.quantified}
              detail={
                summary.quantified
                  ? 'Gaps calculated from measured data'
                  : 'No defensible estimate yet'
              }
            />
            <SummaryCard
              icon={Gauge}
              iconClass="bg-info-50 text-info-700"
              label="Month coverage"
              value={`${summary.monthsWithRecords}/${summary.monthsInPeriod}`}
              detail={`${meta.entryCount} records in ${meta.periodLabel}`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              items={PRIORITY_TABS.map((item) => ({
                id: item,
                label: item === 'All' ? 'All recommendations' : `${item} priority`,
                count: counts[item],
              }))}
              value={priority}
              onChange={setPriority}
            />
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="recommendation-category" className="sr-only">
                Filter by category
              </label>
              <select
                id="recommendation-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-10 rounded-xl border border-line bg-white px-3 text-[13px] font-medium text-ink-700 shadow-sm outline-none transition hover:border-forest-200 focus:border-forest-600 focus:ring-2 focus:ring-forest-600/15"
              >
                <option value="All">All categories</option>
                {categoryOptions.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.name} ({option.count})
                  </option>
                ))}
              </select>
              <p className="text-[12px] text-ink-400">
                Showing {visible.length} of {recommendations.length}
              </p>
            </div>
          </div>

          {recommendations.length === 0 ? (
            <Card>
              <EmptyState
                icon={ClipboardCheck}
                title="No rules triggered"
                description="The current data did not cross any review threshold — that is a good sign. Keep recording monthly data so the engine can detect drift and compare buildings."
                action={
                  <Link to="/analytics" className={buttonClasses({ variant: 'secondary' })}>
                    Open analytics
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                }
              />
            </Card>
          ) : visible.length === 0 ? (
            <Card>
              <EmptyState
                icon={Lightbulb}
                title="No recommendations match these filters"
                description="Change the priority or category filter to see the remaining opportunities."
                action={
                  <Button variant="secondary" onClick={resetFilters}>
                    Reset filters
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="grid items-start gap-4 lg:grid-cols-2">
              {visible.map((recommendation) => (
                <RecommendationCard key={recommendation.id} recommendation={recommendation} />
              ))}
            </div>
          )}

          <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
            <Card className="p-5">
              <CardHeader
                title="Rule audit"
                description="Every rule is evaluated on each run. Only triggered rules become recommendations; clear and data-gap outcomes are listed for transparency."
              />
              <div className="mt-4 divide-y divide-line">
                {snapshot.checks.map((check) => (
                  <div key={check.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium text-ink-900">{check.label}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500">
                        {check.detail}
                      </p>
                      <p className="mt-1 text-[10px] leading-relaxed text-ink-400">
                        Trigger: {check.threshold}
                      </p>
                    </div>
                    <RuleStatusBadge status={check.status} />
                  </div>
                ))}
              </div>
            </Card>

            <div className="space-y-5">
              <Card className="p-5">
                <CardHeader
                  title="How benefits are estimated"
                  description="Only measured gaps are quantified."
                />
                <ul className="mt-3 space-y-2.5 text-[12px] leading-relaxed text-ink-600">
                  <li>
                    <strong className="font-semibold text-ink-800">Building electricity:</strong>{' '}
                    the difference between a building&apos;s electricity intensity and the campus
                    median, multiplied by the configured grid factor. It is an upper planning gap,
                    not a forecast.
                  </li>
                  <li>
                    <strong className="font-semibold text-ink-800">Building water:</strong> the
                    difference between water use per occupant and the campus average. Water is a
                    resource metric and is not counted in GHG totals.
                  </li>
                  <li>
                    <strong className="font-semibold text-ink-800">Everything else:</strong> no
                    benefit is shown because fixture inventories, generator hours, waste composition
                    or mode-shift participation are not recorded. Where data is missing, the card
                    says so instead of inventing a percentage.
                  </li>
                </ul>
                <p className="mt-3 rounded-lg border border-line bg-sand-50 px-3 py-2 text-[10px] leading-relaxed text-ink-400">
                  Engine {meta.engineVersion} · deterministic · {meta.periodLabel}. Benefits are
                  planning indicators only. They are not audited savings, commitments or guaranteed
                  emission reductions.
                </p>
              </Card>

              <Card className="p-5">
                <CardHeader
                  title="AI assistant (not enabled)"
                  description="The rule engine is intentionally separate from any model."
                />
                <p className="mt-3 text-[12px] leading-relaxed text-ink-500">
                  When a hosted assistant is approved, it can read the same snapshot through{' '}
                  <code className="rounded bg-sand-100 px-1 py-0.5 text-[11px]">GET /ai/recommendations</code>{' '}
                  and answer questions through{' '}
                  <code className="rounded bg-sand-100 px-1 py-0.5 text-[11px]">POST /ai/ask</code>.
                  No AI-generated advice is shown today, and the current page does not depend on an
                  external service.
                </p>
              </Card>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-white px-4 py-3 text-[12px] leading-relaxed text-ink-400">
            Recommendations are prompts for investigation, not verified savings. Validate each
            opportunity with metered baselines, a site audit and locally verified emission factors
            before committing capital or publishing a reduction claim.
            {filtersActive ? (
              <Button variant="ghost" size="sm" className="ml-2" onClick={resetFilters}>
                Reset filters
              </Button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

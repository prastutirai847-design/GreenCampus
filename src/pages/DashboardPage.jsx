import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Bus,
  Droplets,
  Flame,
  Fuel,
  Leaf,
  Plus,
  Recycle,
  Ruler,
  Sparkles,
  Sun,
  Trash2,
  Users,
  Zap,
} from 'lucide-react';
import { useCampus } from '../context/CampusContext.jsx';
import { AlertsPanel } from '../components/dashboard/AlertsPanel.jsx';
import { PerformanceSummary } from '../components/dashboard/PerformanceSummary.jsx';
import { TopBuildingsCard } from '../components/dashboard/TopBuildingsCard.jsx';
import { Callout } from '../components/ui/Callout.jsx';
import { Card } from '../components/ui/Card.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { ProgressBar } from '../components/ui/ProgressBar.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { StatCard } from '../components/ui/StatCard.jsx';
import { CategoryBadge, ScopeBadge } from '../components/ui/Badge.jsx';
import { buttonClasses } from '../components/ui/Button.jsx';
import { ChartCard } from '../components/charts/ChartCard.jsx';
import { EmissionsTrendChart } from '../components/charts/EmissionsTrendChart.jsx';
import { HorizontalBarChart } from '../components/charts/HorizontalBarChart.jsx';
import { ScopeDonut } from '../components/charts/ScopeDonut.jsx';
import { TrendAreaChart } from '../components/charts/TrendAreaChart.jsx';
import { WasteCategoryChart } from '../components/charts/WasteCategoryChart.jsx';
import { PERIOD_OPTIONS, SCOPE_META } from '../data/options.js';
import { getDashboardSnapshot } from '../services/dashboardService.js';
import { dismissDemoBanner, isDemoBannerDismissed } from '../services/settingsService.js';
import { describeActivity } from '../utils/activityLabels.js';
import { getRecentMonths, monthLabel, monthRangeLabel } from '../utils/dates.js';
import { calculateActivityEmissions } from '../utils/emissions.js';
import {
  formatEmissions,
  formatNumber,
  formatPercent,
  formatTonnes,
  formatWeight,
  truncate,
} from '../utils/format.js';
import { buildRecommendations } from '../utils/recommendations.js';

const QUICK_ACTIONS = [
  { label: 'Electricity', to: '/data-entry?category=electricity', icon: Zap },
  { label: 'Water', to: '/data-entry?category=water', icon: Droplets },
  { label: 'Waste', to: '/data-entry?category=waste', icon: Trash2 },
  { label: 'Fuel', to: '/data-entry?category=fuel', icon: Flame },
  { label: 'Commuting', to: '/data-entry?category=commuting', icon: Bus },
];

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-3.5 w-44" />
        <Skeleton className="mt-3 h-8 w-72" />
        <Skeleton className="mt-2 h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, index) => (
          <Skeleton key={index} className="h-[132px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[68px] rounded-2xl" />
      <div className="grid gap-5 xl:grid-cols-3">
        <Skeleton className="h-[400px] rounded-2xl xl:col-span-2" />
        <Skeleton className="h-[400px] rounded-2xl" />
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Skeleton className="h-[320px] rounded-2xl xl:col-span-2" />
        <Skeleton className="h-[320px] rounded-2xl" />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { activities, buildings, profile, factors, buildingMap } = useCampus();
  const [range, setRange] = useState(12);
  const [showDemoBanner, setShowDemoBanner] = useState(() => !isDemoBannerDismissed());
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const months = useMemo(() => getRecentMonths(range), [range]);
  const from = months[0];
  const to = months[months.length - 1];

  useEffect(() => {
    let cancelled = false;

    getDashboardSnapshot({ activities, buildings, profile, factors, from, to })
      .then((data) => {
        if (cancelled) return;
        setSnapshot(data);
        setError(null);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(
          loadError instanceof Error ? loadError.message : 'The dashboard could not be loaded.',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [activities, buildings, profile, factors, from, to, reloadKey]);

  const overview = snapshot?.overview ?? null;
  const trends = snapshot?.trends ?? null;
  const consumption = snapshot?.consumption ?? null;

  const dataReady = Boolean(
    overview && overview.meta.from === (from ?? null) && overview.meta.to === (to ?? null),
  );

  const recent = useMemo(
    () =>
      activities.slice(0, 5).map((activity) => ({
        ...activity,
        calc: calculateActivityEmissions(activity, factors),
        info: describeActivity(activity, buildingMap),
      })),
    [activities, factors, buildingMap],
  );

  const recommendations = useMemo(
    () => buildRecommendations({ activities, buildings, factors, profile }),
    [activities, buildings, factors, profile],
  );

  const buildingChartData = useMemo(
    () =>
      (overview?.buildings ?? [])
        .filter((building) => building.kg > 0)
        .map((building) => ({
          name: truncate(building.name, 26),
          value: building.kg / 1000,
          secondary: building.intensityKgPerSqm ?? 0,
        })),
    [overview],
  );

  const handleDismissBanner = () => {
    setShowDemoBanner(false);
    dismissDemoBanner();
  };

  const recentColumns = [
    {
      key: 'period',
      header: 'Month',
      render: (row) => (
        <span className="whitespace-nowrap text-[13px] font-medium text-ink-900">
          {monthLabel(row.period, 'compact')}
        </span>
      ),
    },
    {
      key: 'activity',
      header: 'Activity',
      render: (row) => (
        <div className="min-w-[170px]">
          <div className="flex items-center gap-2">
            <CategoryBadge category={row.category} />
            <span className="text-[13px] font-medium text-ink-900">{row.info.title}</span>
          </div>
          <p className="mt-1 text-[11px] text-ink-400">{row.info.subtitle}</p>
        </div>
      ),
    },
    {
      key: 'emissions',
      header: 'Est. emissions',
      align: 'right',
      render: (row) =>
        row.calc.scope ? (
          <div className="flex flex-col items-end gap-1">
            <span className="whitespace-nowrap text-[13px] font-medium tabular-nums text-ink-900">
              {formatEmissions(row.calc.kg)}
            </span>
            <ScopeBadge scope={row.calc.scope} />
          </div>
        ) : (
          <div className="flex flex-col items-end gap-1">
            <span className="text-[13px] text-ink-400">Not calculated</span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-ink-400">Water</span>
          </div>
        ),
    },
  ];

  if (activities.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Sustainability overview"
          title="Campus overview"
          description={`Start building the emissions and resource inventory for ${profile?.name ?? 'your college'}.`}
          actions={
            <Link to="/data-entry" className={buttonClasses()}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Log data
            </Link>
          }
        />
        <Card>
          <EmptyState
            icon={Leaf}
            title="Your sustainability workspace is empty"
            description="Record monthly electricity, water, fuel, waste and commuting data to generate an estimated footprint and reduction recommendations."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/data-entry" className={buttonClasses()}>
                  Add your first record
                </Link>
                <Link to="/settings" className={buttonClasses({ variant: 'secondary' })}>
                  Restore sample dataset
                </Link>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  if (!dataReady) {
    if (error) {
      return (
        <ErrorState
          title="Dashboard could not be loaded"
          message={error}
          onRetry={() => setReloadKey((value) => value + 1)}
        />
      );
    }
    return <DashboardSkeleton />;
  }

  const { kpis, scopes, performance, coverage, alerts, topBuildings, ghg } = overview;
  const renewable = kpis.renewable;
  const waste = consumption?.waste ?? {
    totalKg: 0,
    divertedKg: 0,
    diversionRate: 0,
    categories: [],
  };
  const electricitySeries = trends?.electricity ?? [];
  const rangeLabel = `vs prior ${range} month${range === 1 ? '' : 's'}`;
  const trendLabel = (change) =>
    change === null || change === undefined ? 'No prior period data' : rangeLabel;
  const tValue = (value) => {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
    const number = Number(value);
    return formatNumber(number, { digits: Math.abs(number) < 10 ? 2 : Math.abs(number) < 100 ? 1 : 0 });
  };
  const trendFor = (change) =>
    change === null || change === undefined ? null : { percent: change, label: rangeLabel };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Reporting period · ${monthRangeLabel(from, to)}`}
        title="Campus sustainability overview"
        description={`Track resource use, estimated emissions and reduction opportunities across ${
          profile?.name ?? 'the campus'
        }.`}
        actions={
          <>
            <label htmlFor="dashboard-range" className="sr-only">
              Reporting range
            </label>
            <select
              id="dashboard-range"
              value={range}
              onChange={(event) => setRange(Number(event.target.value))}
              className="h-10 rounded-xl border border-line bg-white px-3 text-[13px] font-medium text-ink-700 shadow-sm outline-none transition hover:border-forest-200 focus:border-forest-600 focus:ring-2 focus:ring-forest-600/15"
            >
              {PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Link to="/data-entry" className={buttonClasses()}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Log data
            </Link>
          </>
        }
      />

      {error ? (
        <Callout tone="warning" title="Dashboard could not refresh">
          {error} Showing the last successfully loaded period.
        </Callout>
      ) : null}

      {showDemoBanner ? (
        <Callout tone="warning" title="Illustrative sample dataset" onDismiss={handleDismissBanner}>
          The workspace is preloaded with demo records for a fictional college. All emissions are
          estimates — not measured college data. Renewable share uses separate illustrative solar
          generation data. Replace records and factors in{' '}
          <Link to="/settings" className="font-semibold underline decoration-from-font">
            Settings
          </Link>
          .
        </Callout>
      ) : null}

      {overview.meta.entryCount === 0 ? (
        <Callout tone="info" title="No records in this reporting period">
          There are no activities between {monthRangeLabel(from, to)}. Change the range or{' '}
          <Link to="/data-entry" className="font-semibold underline decoration-from-font">
            add a record
          </Link>
          .
        </Callout>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total GHG emissions"
          value={tValue(ghg.total.value)}
          unit="tCO₂e"
          icon={Leaf}
          hint={`${formatTonnes(ghg.total.kg, { digits: 0 })} across Scope 1–3`}
          trend={trendFor(ghg.total.change)}
        />
        <StatCard
          label="Scope 1 · direct"
          value={tValue(ghg.scope1.value)}
          unit="tCO₂e"
          icon={Flame}
          hint="Fuel combustion and refrigerant leakage"
          trend={trendFor(ghg.scope1.change)}
        />
        <StatCard
          label="Scope 2 · purchased energy"
          value={tValue(ghg.scope2.value)}
          unit="tCO₂e"
          icon={Zap}
          hint={`Location-based · market proxy ${tValue(ghg.scope2.marketTco2e)} tCO₂e`}
          trend={trendFor(ghg.scope2.change)}
        />
        <StatCard
          label="Scope 3 · value chain"
          value={tValue(ghg.scope3.value)}
          unit="tCO₂e"
          icon={Building2}
          hint="Waste and commuting quantified"
          trend={trendFor(ghg.scope3.change)}
        />
        <StatCard
          label="Purchased electricity"
          value={formatNumber(ghg.electricity.value)}
          unit="kWh"
          icon={Zap}
          hint={
            ghg.intensity.kwhPerStudent === null
              ? `${formatNumber(ghg.electricity.mwh, { digits: 2 })} MWh`
              : `${formatNumber(ghg.intensity.kwhPerStudent, {
                  digits: 1,
                })} kWh/student · ${formatNumber(ghg.electricity.mwh, { digits: 2 })} MWh`
          }
          trend={trendFor(ghg.electricity.change)}
        />
        <StatCard
          label="Renewable electricity"
          value={
            ghg.renewable.percent === null ? '—' : formatNumber(ghg.renewable.percent, { digits: 1 })
          }
          unit={ghg.renewable.percent === null ? '' : '%'}
          icon={Sun}
          hint={
            ghg.renewable.percent === null
              ? 'No electricity records in this period'
              : `${formatNumber(ghg.renewable.kwh)} kWh on-site · sample data`
          }
          trend={
            ghg.renewable.pointChange === null
              ? null
              : { percent: ghg.renewable.pointChange, label: `pp ${rangeLabel}` }
          }
        />
        <StatCard
          label="Diesel + petrol"
          value={formatNumber(ghg.liquidFuel.value)}
          unit="L"
          icon={Fuel}
          hint={`Diesel ${formatNumber(ghg.liquidFuel.dieselLitres)} L · petrol ${formatNumber(
            ghg.liquidFuel.petrolLitres,
          )} L`}
          trend={trendFor(ghg.liquidFuel.change)}
        />
        <StatCard
          label="Water consumption"
          value={formatNumber(ghg.water.value)}
          unit="kL"
          icon={Droplets}
          hint="Resource metric · not a GHG scope"
          trend={trendFor(ghg.water.change)}
        />
        <StatCard
          label="Waste generated"
          value={formatNumber(ghg.waste.value, { digits: 1 })}
          unit="t"
          icon={Trash2}
          hint={`${formatWeight(ghg.waste.kg)} recorded by weight`}
          trend={trendFor(ghg.waste.change)}
        />
        <StatCard
          label="Waste recycled"
          value={formatNumber(ghg.waste.recycledPercent, { digits: 1 })}
          unit="%"
          icon={Recycle}
          hint={`${formatWeight(ghg.waste.recycledKg)} recycled · ${formatPercent(
            ghg.waste.diversionRate,
            { digits: 0, alreadyPercent: true },
          )} diverted (incl. composting)`}
        />
        <StatCard
          label="Emissions per student"
          value={ghg.intensity.tco2ePerStudent === null ? '—' : tValue(ghg.intensity.tco2ePerStudent)}
          unit={ghg.intensity.tco2ePerStudent === null ? '' : 'tCO₂e/student'}
          icon={Users}
          hint={
            ghg.intensity.tco2ePerStudent === null
              ? 'Add the student count in Settings'
              : `${formatNumber(ghg.intensity.students)} students recorded`
          }
          trend={trendFor(ghg.intensity.studentChange)}
        />
        <StatCard
          label="Carbon intensity"
          value={
            ghg.intensity.kgPerSqm === null
              ? '—'
              : formatNumber(ghg.intensity.kgPerSqm, { digits: 1 })
          }
          unit={ghg.intensity.kgPerSqm === null ? '' : 'kgCO₂e/m²'}
          icon={Ruler}
          hint={
            ghg.intensity.kgPerSqm === null
              ? 'Add floor area to buildings'
              : `${formatNumber(ghg.intensity.floorAreaSqm)} m² of recorded floor area`
          }
          trend={trendFor(ghg.intensity.areaChange)}
        />
      </div>

      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h3 className="font-display text-[16px] font-semibold leading-snug text-ink-900">Quick actions</h3>
          <p className="mt-0.5 text-[12px] text-ink-500">
            Jump straight into a category and add the latest monthly reading.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={action.to}
                className={buttonClasses({ variant: 'secondary', size: 'sm' })}
              >
                <Icon className="h-3.5 w-3.5 text-forest-600" aria-hidden="true" />
                {action.label}
              </Link>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Emissions trend"
          description="Estimated monthly emissions, stacked by GHG Protocol scope."
          action={<span className="text-[11px] text-ink-400">tonnes CO₂e</span>}
        >
          <EmissionsTrendChart data={trends?.emissions ?? []} />
        </ChartCard>

        <ChartCard title="Scope breakdown" description="Where the estimated footprint comes from.">
          <ScopeDonut shares={scopes} totalKg={ghg.total.kg} />
          <div className="mt-5 space-y-1.5 border-t border-line pt-3">
            {[1, 2, 3].map((scope) => (
              <p key={scope} className="text-[11px] leading-relaxed text-ink-400">
                <span className="font-semibold text-ink-500">{SCOPE_META[scope].label}</span> ·{' '}
                {SCOPE_META[scope].description}
              </p>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Electricity consumption trend"
          description="Purchased grid electricity from building meters."
          action={<span className="text-[11px] text-ink-400">kWh</span>}
          footer={
            renewable.percent === null
              ? 'No purchased electricity recorded for this period.'
              : `On-site solar supplied an estimated ${formatPercent(renewable.percent, {
                  digits: 1,
                  alreadyPercent: true,
                })} of total electricity in this period (sample generation).`
          }
        >
          <TrendAreaChart data={electricitySeries} unit="kWh" seriesName="Electricity" height={250} />
        </ChartCard>

        <AlertsPanel alerts={alerts} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <ChartCard
          title="Waste category breakdown"
          description="Recorded waste by weight and category."
          footer={`${formatPercent(waste.diversionRate, {
            digits: 0,
          })} of waste was recycled or composted (${formatWeight(waste.divertedKg)} of ${formatWeight(
            waste.totalKg,
          )}).`}
        >
          <WasteCategoryChart categories={waste.categories} />
          <div className="mt-4 border-t border-line pt-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-medium text-ink-500">Diverted from landfill</p>
              <p className="text-[11px] font-semibold tabular-nums text-ink-900">
                {formatPercent(waste.diversionRate, { digits: 0 })}
              </p>
            </div>
            <ProgressBar
              value={waste.diversionRate * 100}
              className="mt-2"
              label="Share of waste diverted from landfill"
            />
          </div>
        </ChartCard>

        <ChartCard
          className="xl:col-span-2"
          title="Building-wise emissions"
          description="Estimated total emissions for the selected period; tooltips show emission intensity."
          action={
            <Link
              to="/buildings"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-forest-700 hover:text-forest-900"
            >
              All buildings
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          }
        >
          {buildingChartData.length ? (
            <HorizontalBarChart
              data={buildingChartData}
              height={280}
              nameWidth={150}
              valueFormatter={(value) => `${formatNumber(value, { digits: 1 })} tCO₂e`}
              secondaryFormatter={(value) =>
                `${formatNumber(value, { digits: 1 })} kgCO₂e/m² intensity`
              }
            />
          ) : (
            <EmptyState
              icon={Building2}
              title="No building emissions yet"
              description="Add floor areas and metered electricity records to compare buildings."
              className="py-10"
            />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <TopBuildingsCard buildings={topBuildings} />
        </div>
        <PerformanceSummary performance={performance} coverage={coverage} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-4 sm:p-6 sm:pb-4">
            <div>
              <h3 className="font-display text-[16px] font-semibold leading-snug text-ink-900">Recent activity</h3>
              <p className="mt-1 text-[13px] text-ink-500">The latest records across all categories.</p>
            </div>
            <Link
              to="/data-entry"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-forest-700 hover:text-forest-900"
            >
              Open data entry
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
          <DataTable
            columns={recentColumns}
            rows={recent}
            getRowId={(row) => row.id}
            tableClassName="min-w-[600px]"
            className="border-t border-line"
            emptyState={
              <EmptyState
                icon={Leaf}
                title="No recent activity"
                description="Log a reading to see it appear here."
                className="py-10"
              />
            }
          />
        </Card>

        <Card className="flex flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-[16px] font-semibold leading-snug text-ink-900">Opportunities</h3>
              <p className="mt-1 text-[13px] text-ink-500">Derived from the last 12 months of data.</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-100 text-olive-700">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>

          <div className="mt-4 space-y-2.5">
            {recommendations.slice(0, 2).map((recommendation) => (
              <Link
                key={recommendation.id}
                to="/recommendations"
                className="group block rounded-xl border border-line p-3 transition hover:border-forest-200 hover:bg-forest-50/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                    {recommendation.category}
                  </span>
                  <span
                    className={`text-[10px] font-medium ${
                      recommendation.priority === 'High'
                        ? 'text-danger-700'
                        : recommendation.priority === 'Medium'
                          ? 'text-warning-700'
                          : 'text-forest-600'
                    }`}
                  >
                    {recommendation.priority}
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] font-medium leading-snug text-ink-900 group-hover:text-forest-800">
                  {recommendation.title}
                </p>
                <p className="mt-1 text-[11px] text-ink-400">
                  {recommendation.benefitSummary ?? recommendation.impactLabel}
                </p>
              </Link>
            ))}
            {recommendations.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line p-4 text-xs leading-relaxed text-ink-400">
                Add more records to generate tailored reduction opportunities.
              </p>
            ) : null}
          </div>

          <Link
            to="/recommendations"
            className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[11px] font-semibold text-forest-700 hover:text-forest-900"
          >
            View all recommendations
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </Card>
      </div>

      <p className="pb-2 text-center text-[10px] leading-relaxed text-ink-400">
        GHG Protocol Corporate Standard, operational-control boundary · India reporting conventions
        (₹, en-IN, DD/MM/YYYY, Asia/Kolkata). All figures are estimates calculated from recorded
        activity data and configurable emission factors; renewable share uses illustrative sample
        generation. Scope 2 is shown location-based and market-based, with no verified contractual
        instruments. These figures are not a verified carbon inventory or compliance statement.
      </p>
    </div>
  );
}

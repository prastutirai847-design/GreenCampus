import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  Droplets,
  Gauge,
  Leaf,
  RotateCcw,
  SlidersHorizontal,
  Users,
  Zap,
} from 'lucide-react';
import { useCampus } from '../context/CampusContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { ChartCard } from '../components/charts/ChartCard.jsx';
import { HorizontalBarChart } from '../components/charts/HorizontalBarChart.jsx';
import { MonthlyEmissionsLine } from '../components/charts/MonthlyEmissionsLine.jsx';
import { SourceBreakdownChart } from '../components/charts/SourceBreakdownChart.jsx';
import { TrendAreaChart } from '../components/charts/TrendAreaChart.jsx';
import { WasteDonut } from '../components/charts/WasteDonut.jsx';
import { YearlyEmissionsChart } from '../components/charts/YearlyEmissionsChart.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Callout } from '../components/ui/Callout.jsx';
import { Card } from '../components/ui/Card.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Skeleton } from '../components/ui/Skeleton.jsx';
import { CATEGORY_META, CATEGORY_ORDER, CHART_COLORS, SCOPE_META } from '../data/options.js';
import { getAnalyticsSnapshot } from '../services/analyticsService.js';
import { CAMPUS_WIDE } from '../utils/analyticsView.js';
import { buildBuildingCsv, buildMonthlyCsv, buildScopeCsv, buildYearlyCsv, downloadCsv } from '../utils/csv.js';
import {
  getRecentMonths,
  lastCompleteMonthKey,
  monthLabel,
  monthRangeLabel,
} from '../utils/dates.js';
import {
  formatNumber,
  formatPercent,
  formatSignedPercent,
  formatTonnes,
  formatWater,
  formatWeight,
} from '../utils/format.js';

const PERIOD_MODES = [
  { id: 'range', label: 'Date range' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

const selectClass =
  'h-10 w-full rounded-xl border border-line bg-white px-3 text-[13px] font-medium text-ink-700 shadow-sm outline-none transition hover:border-forest-200 focus:border-forest-600 focus:ring-2 focus:ring-forest-600/15 disabled:cursor-not-allowed disabled:bg-sand-50';

function FilterField({ label, htmlFor, children }) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ChangeText({ value, positiveIsGood = false }) {
  if (value === null || value === undefined) {
    return <span className="text-ink-400">No prior-period baseline</span>;
  }
  const improving = positiveIsGood ? value > 0 : value < 0;
  return (
    <span className={improving ? 'text-forest-700' : 'text-danger-700'}>
      {formatSignedPercent(value, { digits: 1 })} vs prior period
    </span>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <Skeleton className="h-8 w-48" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <Skeleton key={item} className="h-10 w-full" />
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-16 w-full" />
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <Skeleton className="h-[260px] w-full" />
      </Card>
    </div>
  );
}

export function AnalyticsPage() {
  const { activities, buildings, departments } = useCampus();
  const { push } = useToast();

  const lastComplete = useMemo(() => lastCompleteMonthKey(), []);
  const defaultMonths = useMemo(() => getRecentMonths(12, lastComplete), [lastComplete]);
  const defaultFrom = defaultMonths[0];
  const defaultTo = defaultMonths[defaultMonths.length - 1];

  const availableMonths = useMemo(() => {
    const set = new Set([
      ...getRecentMonths(24, lastComplete),
      ...activities.map((activity) => activity.period),
    ]);
    return [...set].sort().reverse();
  }, [activities, lastComplete]);

  const years = useMemo(() => {
    const set = new Set(availableMonths.map((month) => month.slice(0, 4)));
    return [...set].sort().reverse();
  }, [availableMonths]);

  const [mode, setMode] = useState('range');
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [month, setMonth] = useState(defaultTo);
  const [year, setYear] = useState(defaultTo.slice(0, 4));
  const [buildingId, setBuildingId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [scope, setScope] = useState('');
  const [category, setCategory] = useState('');

  const effectiveRange = useMemo(() => {
    if (mode === 'month') return { from: month, to: month };
    if (mode === 'year') {
      const end = year === lastComplete.slice(0, 4) ? lastComplete : `${year}-12`;
      return { from: `${year}-01`, to: end };
    }
    return { from, to };
  }, [mode, month, year, from, to, lastComplete]);

  const rangeError =
    !effectiveRange.from || !effectiveRange.to
      ? 'Choose a start and end month.'
      : effectiveRange.from > effectiveRange.to
        ? 'The start month must be on or before the end month.'
        : null;

  const filters = useMemo(
    () => ({
      from: effectiveRange.from,
      to: effectiveRange.to,
      buildingId,
      departmentId,
      scope,
      category,
    }),
    [effectiveRange, buildingId, departmentId, scope, category],
  );

  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const requestRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    if (rangeError) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    requestRef.current += 1;
    const requestId = requestRef.current;
    setLoadError(null);
    if (!hasLoadedRef.current) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await getAnalyticsSnapshot(filters);
      if (requestId === requestRef.current) {
        setView(data);
        hasLoadedRef.current = true;
      }
    } catch (error) {
      if (requestId === requestRef.current) {
        setLoadError(
          error instanceof Error ? error.message : 'The analytics snapshot could not be loaded.',
        );
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [filters, rangeError]);

  useEffect(() => {
    load();
  }, [load]);

  const buildingOptions = useMemo(
    () => [...buildings].sort((a, b) => String(a.name).localeCompare(String(b.name))),
    [buildings],
  );
  const departmentOptions = useMemo(
    () => [...departments].sort((a, b) => String(a.name).localeCompare(String(b.name))),
    [departments],
  );

  const canReset =
    mode !== 'range' ||
    from !== defaultFrom ||
    to !== defaultTo ||
    Boolean(buildingId || departmentId || scope || category);

  const resetFilters = () => {
    setMode('range');
    setFrom(defaultFrom);
    setTo(defaultTo);
    setMonth(defaultTo);
    setYear(defaultTo.slice(0, 4));
    setBuildingId('');
    setDepartmentId('');
    setScope('');
    setCategory('');
  };

  const scopeNumber = scope ? Number(scope) : null;
  const electricityExcluded = scopeNumber !== null && scopeNumber !== 2;
  const wasteExcluded = scopeNumber !== null && scopeNumber !== 3;
  const waterExcluded = scopeNumber !== null;

  const categoryScopeMismatch =
    scopeNumber !== null &&
    category &&
    (!CATEGORY_META[category] ||
      CATEGORY_META[category].scope === null ||
      CATEGORY_META[category].scope !== scopeNumber);

  const filterSuffix = view?.meta?.isDimensionFiltered ? '-filtered' : '';
  const samplePrefix = 'greencampus';
  const exportDisabled = !view || view.totals.entryCount === 0;

  const handleExportMonthly = () => {
    if (!view || !view.monthly.length) return;
    downloadCsv(
      `${samplePrefix}-monthly-${effectiveRange.from}-to-${effectiveRange.to}${filterSuffix}.csv`,
      buildMonthlyCsv({ byMonth: view.monthly }),
    );
    push({
      title: 'Monthly data exported',
      description: `Scope and resource totals for ${view.meta.periodLabel}.`,
    });
  };

  const handleExportYearly = () => {
    if (!view || !view.yearly.length) return;
    downloadCsv(
      `${samplePrefix}-yearly-${effectiveRange.from}-to-${effectiveRange.to}${filterSuffix}.csv`,
      buildYearlyCsv(view.yearly),
    );
    push({ title: 'Yearly data exported', description: 'Scope totals for every recorded year.' });
  };

  const handleExportBuildings = () => {
    if (!view || !view.buildings.length) return;
    downloadCsv(
      `${samplePrefix}-building-comparison-${effectiveRange.from}-to-${effectiveRange.to}${filterSuffix}.csv`,
      buildBuildingCsv(view.buildings),
    );
    push({ title: 'Building comparison exported', description: 'Filtered building totals and intensity.' });
  };

  const handleExportScopes = () => {
    if (!view || !view.scopes.length) return;
    downloadCsv(
      `${samplePrefix}-scope-comparison-${effectiveRange.from}-to-${effectiveRange.to}${filterSuffix}.csv`,
      buildScopeCsv(view.scopes),
    );
    push({ title: 'Scope comparison exported', description: 'Scope totals, shares and prior-period change.' });
  };

  const monthlyColumns = [
    {
      key: 'period',
      header: 'Month',
      render: (row) => (
        <span className="whitespace-nowrap text-[13px] font-medium text-ink-900">
          {monthLabel(row.period)}
        </span>
      ),
    },
    {
      key: 'scope1',
      header: 'Scope 1',
      align: 'right',
      render: (row) => formatNumber(row.scope1 / 1000, { digits: 1 }),
    },
    {
      key: 'scope2',
      header: 'Scope 2',
      align: 'right',
      render: (row) => formatNumber(row.scope2 / 1000, { digits: 1 }),
    },
    {
      key: 'scope3',
      header: 'Scope 3',
      align: 'right',
      render: (row) => formatNumber(row.scope3 / 1000, { digits: 1 }),
    },
    {
      key: 'total',
      header: 'Total tCO₂e',
      align: 'right',
      render: (row) => (
        <span className="text-[13px] font-semibold tabular-nums text-ink-900">
          {formatNumber(row.total / 1000, { digits: 1 })}
        </span>
      ),
    },
    {
      key: 'electricity',
      header: 'Electricity',
      align: 'right',
      render: (row) => `${formatNumber(row.electricityKwh / 1000, { digits: 1 })} MWh`,
    },
    {
      key: 'water',
      header: 'Water',
      align: 'right',
      render: (row) => formatWater(row.waterM3),
    },
    {
      key: 'waste',
      header: 'Waste',
      align: 'right',
      render: (row) => formatWeight(row.wasteKg ?? 0),
    },
  ];

  if (activities.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Analysis"
          title="Resource & emissions analytics"
          description="Compare consumption trends, scopes and building performance once records exist."
        />
        <Card>
          <EmptyState
            icon={Gauge}
            title="Nothing to analyse yet"
            description="Add monthly resource records to unlock trend charts, building comparisons and intensity metrics."
            action={
              <Link
                to="/data-entry"
                className="inline-flex h-10 items-center rounded-xl bg-forest-800 px-4 text-sm font-medium text-white transition hover:bg-forest-700"
              >
                Log your first record
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const yearlyHasData = Boolean(view?.yearly?.some((row) => row.total > 0));
  const scopeTotalKg = view?.scopes?.reduce((sum, row) => sum + row.kg, 0) ?? 0;
  const scopeData =
    view?.scopes?.map((row) => ({
      name: row.label,
      value: row.kg / 1000,
      secondary: row.percent,
      color: row.color,
    })) ?? [];
  const buildingData =
    view?.buildings?.map((building) => ({
      name: building.name,
      value: building.kg / 1000,
      secondary: building.intensityKgPerSqm,
      color: CHART_COLORS.scope2,
    })) ?? [];
  const COMMUTE_COLORS = {
    car: CHART_COLORS.commuting,
    'two-wheeler': '#8FA6B8',
    bus: CHART_COLORS.scope2,
    rail: CHART_COLORS.scope3,
    'walk-cycle': CHART_COLORS.neutral,
  };
  const commuteData =
    view?.breakdowns?.commute
      ?.filter((mode) => mode.kg > 0)
      .map((mode) => ({
        name: mode.name,
        value: mode.kg / 1000,
        secondary: mode.passengerKm,
        color: COMMUTE_COLORS[mode.id] ?? CHART_COLORS.commuting,
      })) ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`Analysis · ${view?.meta?.periodLabel ?? monthRangeLabel(effectiveRange.from, effectiveRange.to)}`}
        title="Resource & emissions analytics"
        description="Explore emissions and resource consumption over time, compare scopes and buildings, and export the tables behind the charts."
        actions={
          <Button variant="secondary" onClick={handleExportMonthly} disabled={exportDisabled}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Export monthly
          </Button>
        }
      />

      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            Analysis filters
          </p>
          <div className="flex items-center gap-2">
            {refreshing ? <span className="text-[11px] text-ink-400">Updating…</span> : null}
            <Button variant="ghost" size="sm" onClick={resetFilters} disabled={!canReset}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reset
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
            Period
          </span>
          <div
            className="inline-flex rounded-lg border border-line bg-sand-50 p-0.5"
            role="group"
            aria-label="Period mode"
          >
            {PERIOD_MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                aria-pressed={mode === item.id}
                className={`h-8 rounded-md px-3 text-[12px] font-medium transition ${
                  mode === item.id
                    ? 'bg-white text-ink-900 shadow-sm'
                    : 'text-ink-500 hover:text-ink-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {!rangeError ? (
            <span className="text-[11px] text-ink-400">
              {monthRangeLabel(effectiveRange.from, effectiveRange.to)}
            </span>
          ) : null}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {mode === 'range' ? (
            <>
              <FilterField label="From" htmlFor="analytics-from">
                <select
                  id="analytics-from"
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  className={selectClass}
                >
                  {availableMonths.map((item) => (
                    <option key={item} value={item}>
                      {monthLabel(item)}
                    </option>
                  ))}
                </select>
              </FilterField>
              <FilterField label="To" htmlFor="analytics-to">
                <select
                  id="analytics-to"
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  className={selectClass}
                >
                  {availableMonths.map((item) => (
                    <option key={item} value={item}>
                      {monthLabel(item)}
                    </option>
                  ))}
                </select>
              </FilterField>
            </>
          ) : mode === 'month' ? (
            <FilterField label="Month" htmlFor="analytics-month">
              <select
                id="analytics-month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className={selectClass}
              >
                {availableMonths.map((item) => (
                  <option key={item} value={item}>
                    {monthLabel(item)}
                  </option>
                ))}
              </select>
            </FilterField>
          ) : (
            <FilterField label="Year" htmlFor="analytics-year">
              <select
                id="analytics-year"
                value={year}
                onChange={(event) => setYear(event.target.value)}
                className={selectClass}
              >
                {years.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </FilterField>
          )}

          <FilterField label="Building" htmlFor="analytics-building">
            <select
              id="analytics-building"
              value={buildingId}
              onChange={(event) => setBuildingId(event.target.value)}
              className={selectClass}
            >
              <option value="">All buildings</option>
              <option value={CAMPUS_WIDE}>Campus-wide (no building)</option>
              {buildingOptions.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Department" htmlFor="analytics-department">
            <select
              id="analytics-department"
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
              className={selectClass}
            >
              <option value="">All departments</option>
              {departmentOptions.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Emission scope" htmlFor="analytics-scope">
            <select
              id="analytics-scope"
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              className={selectClass}
            >
              <option value="">All scopes</option>
              {[1, 2, 3].map((item) => (
                <option key={item} value={item}>
                  {SCOPE_META[item].label} · {SCOPE_META[item].name}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Resource category" htmlFor="analytics-category">
            <select
              id="analytics-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={selectClass}
            >
              <option value="">All categories</option>
              {CATEGORY_ORDER.map((item) => (
                <option key={item} value={item}>
                  {CATEGORY_META[item].label}
                </option>
              ))}
            </select>
          </FilterField>
        </div>

        {rangeError ? (
          <p className="mt-3 text-xs text-danger-700" role="alert">
            {rangeError}
          </p>
        ) : null}

        {categoryScopeMismatch ? (
          <p className="mt-3 text-xs text-danger-700" role="alert">
            {CATEGORY_META[category].label} belongs to{' '}
            {SCOPE_META[CATEGORY_META[category].scope]?.label ?? 'no GHG scope'}, so this combination
            cannot match any records. Clear the scope or category filter.
          </p>
        ) : null}

        {view?.meta?.filterLabels?.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.1em] text-ink-400">Applied</span>
            {view.meta.filterLabels.map((label) => (
              <Badge key={label} tone="neutral">
                {label}
              </Badge>
            ))}
          </div>
        ) : null}
      </Card>

      {rangeError ? (
        <Card>
          <EmptyState
            icon={Gauge}
            title="Choose a valid period"
            description={rangeError}
            action={
              <Button variant="secondary" onClick={resetFilters}>
                Reset filters
              </Button>
            }
          />
        </Card>
      ) : null}

      {loadError && !loading && !rangeError ? (
        <ErrorState
          title="Analytics could not be loaded"
          message={loadError}
          onRetry={load}
        />
      ) : null}

      {loading && !view && !rangeError ? <AnalyticsSkeleton /> : null}

      {!loading && !rangeError && !loadError && view ? (
        <>
          <Card className="overflow-hidden">
            <div className="grid grid-cols-2 divide-y divide-line sm:grid-cols-4 sm:divide-x sm:divide-y-0">
              <div className="px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                  Total footprint
                </p>
                <p className="mt-1 font-display text-lg font-semibold text-ink-900">
                  {formatTonnes(view.totals.kg, { digits: 0 })}
                </p>
                <p className="mt-1 text-[10px] text-ink-400">
                  {view.totals.entryCount} records · <ChangeText value={view.totals.change} />
                </p>
              </div>
              <div className="px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                  Average / month
                </p>
                <p className="mt-1 font-display text-lg font-semibold text-ink-900">
                  {formatTonnes(view.totals.averageKg, { digits: 1 })}
                </p>
                <p className="mt-1 text-[10px] text-ink-400">
                  {view.totals.coveredMonths} of {view.totals.monthCount} months with records
                </p>
              </div>
              <div className="px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                  Peak / lowest month
                </p>
                <p className="mt-1 font-display text-lg font-semibold text-ink-900">
                  {view.totals.peak ? formatTonnes(view.totals.peak.kg, { digits: 0 }) : '—'}
                </p>
                <p className="mt-1 text-[10px] text-ink-400">
                  {view.totals.peak ? view.totals.peak.label : 'No data'} · low{' '}
                  {view.totals.lowest ? view.totals.lowest.label : '—'}
                </p>
              </div>
              <div className="flex items-start gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                    Per person
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold text-ink-900">
                    {view.totals.perCapitaKg === null
                      ? '—'
                      : `${formatNumber(view.totals.perCapitaKg, { digits: 0 })} kg`}
                  </p>
                  <p className="mt-1 text-[10px] text-ink-400">Estimated CO₂e per occupant</p>
                </div>
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
              </div>
            </div>
          </Card>

          {view.totals.entryCount === 0 ? (
            <>
              <Callout tone="warning" title="No records match these filters">
                No activity records fall inside {view.meta.periodLabel} with the selected building,
                department, scope and category filters. Adjust the filters or reset them to restore the
                full analysis.
                <div className="mt-2">
                  <Button variant="secondary" size="sm" onClick={resetFilters}>
                    Reset filters
                  </Button>
                </div>
              </Callout>

              {yearlyHasData ? (
                <ChartCard
                  title="Yearly emission trends"
                  description="Every recorded year under the building, department, scope and category filters."
                  action={
                    <Button variant="ghost" size="sm" onClick={handleExportYearly}>
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      CSV
                    </Button>
                  }
                  footer="The date range does not apply to this chart; dimensions still do."
                >
                  <YearlyEmissionsChart data={view.yearly} />
                </ChartCard>
              ) : null}

              <Card>
                <EmptyState
                  icon={Gauge}
                  title="Nothing to show for this selection"
                  description="Change the period or dimension filters to bring records back into view."
                  action={
                    <Button variant="secondary" onClick={resetFilters}>
                      Reset filters
                    </Button>
                  }
                />
              </Card>
            </>
          ) : (
            <>
              {view.totals.kg === 0 ? (
                <Callout tone="info" title="No GHG emissions in this selection">
                  The matching records are resource metrics such as water, which are reported below
                  but are not assigned to a GHG scope.
                </Callout>
              ) : null}

              <ChartCard
                title="Monthly carbon emission trends"
                description="Estimated Scope 1–3 emissions for each month in the selected period."
                action={<span className="text-[11px] text-ink-400">tonnes CO₂e</span>}
              >
                {view.totals.kg > 0 ? (
                  <MonthlyEmissionsLine data={view.monthly} />
                ) : (
                  <EmptyState
                    icon={Gauge}
                    title="No GHG emissions in this selection"
                    description="Water and other non-GHG records are shown in the resource charts below."
                    className="py-10"
                  />
                )}
              </ChartCard>

              <div className="grid gap-5 lg:grid-cols-2">
                <ChartCard
                  title="Yearly emission trends"
                  description="Scope totals by calendar year."
                  action={
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleExportYearly}
                      disabled={!view.yearly.length}
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      CSV
                    </Button>
                  }
                  footer="Yearly totals use every recorded year and respect the dimension filters; the date range applies to other charts."
                >
                  {yearlyHasData ? (
                    <YearlyEmissionsChart data={view.yearly} />
                  ) : (
                    <EmptyState
                      icon={Gauge}
                      title="No yearly emissions"
                      description="No scope-classified records match the dimension filters."
                      className="py-10"
                    />
                  )}
                </ChartCard>

                <ChartCard
                  title="Scope-wise comparison"
                  description="Estimated contribution of each GHG Protocol scope."
                  action={
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleExportScopes}
                      disabled={!view.scopes.length}
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      CSV
                    </Button>
                  }
                  footer={
                    view.meta.scopeActive
                      ? 'This comparison always shows all three scopes under the other filters; the scope filter applies to the rest of the page.'
                      : 'Scope 1 covers owned fuel, Scope 2 purchased electricity, Scope 3 commuting and waste.'
                  }
                >
                  {scopeTotalKg > 0 ? (
                    <HorizontalBarChart
                      data={scopeData}
                      height={230}
                      nameWidth={86}
                      valueFormatter={(value) => `${formatNumber(value, { digits: 1 })} tCO₂e`}
                      secondaryFormatter={(value) =>
                        `${formatPercent(value, { digits: 0, alreadyPercent: true })} of footprint`
                      }
                    />
                  ) : (
                    <EmptyState
                      icon={Gauge}
                      title="No scope-classified emissions"
                      description="Water and other non-GHG records do not contribute to a scope."
                      className="py-10"
                    />
                  )}
                </ChartCard>
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                <ChartCard
                  title="Electricity consumption"
                  description="Monthly metered electricity."
                  action={<Zap className="h-4 w-4 text-forest-500" aria-hidden="true" />}
                  footer={
                    <>
                      {formatNumber(view.resources.totals.electricityKwh / 1000, { digits: 1 })} MWh
                      recorded · <ChangeText value={view.resources.changes.electricity} />
                    </>
                  }
                >
                  {electricityExcluded ? (
                    <EmptyState
                      icon={Zap}
                      title="Electricity is outside the selected scope"
                      description="Electricity is Scope 2. Clear the scope filter to see this trend."
                      className="py-8"
                    />
                  ) : view.resources.totals.electricityKwh > 0 ? (
                    <TrendAreaChart
                      data={view.monthly.map((row) => ({
                        label: row.label,
                        value: row.electricityKwh / 1000,
                      }))}
                      unit="MWh"
                      seriesName="Electricity"
                      color={CHART_COLORS.electricity}
                    />
                  ) : (
                    <EmptyState
                      icon={Zap}
                      title="No electricity records"
                      description="No matching electricity readings in this period."
                      className="py-8"
                    />
                  )}
                </ChartCard>

                <ChartCard
                  title="Water consumption"
                  description="Monthly metered water use."
                  action={<Droplets className="h-4 w-4 text-water" aria-hidden="true" />}
                  footer={
                    <>
                      {formatWater(view.resources.totals.waterM3)} recorded ·{' '}
                      <ChangeText value={view.resources.changes.water} />
                    </>
                  }
                >
                  {waterExcluded ? (
                    <EmptyState
                      icon={Droplets}
                      title="Water is excluded by the scope filter"
                      description="Water is a resource metric with no GHG scope. Clear the scope filter to view it."
                      className="py-8"
                    />
                  ) : view.resources.totals.waterM3 > 0 ? (
                    <TrendAreaChart
                      data={view.monthly.map((row) => ({
                        label: row.label,
                        value: row.waterM3,
                      }))}
                      unit="kL"
                      seriesName="Water"
                      color={CHART_COLORS.water}
                    />
                  ) : (
                    <EmptyState
                      icon={Droplets}
                      title="No water records"
                      description="No matching water readings in this period."
                      className="py-8"
                    />
                  )}
                </ChartCard>

                <ChartCard
                  title="Waste generation"
                  description="Monthly waste recorded by weight."
                  action={<Leaf className="h-4 w-4 text-olive-700" aria-hidden="true" />}
                  footer={
                    <>
                      {formatWeight(view.resources.totals.wasteKg)} ·{' '}
                      {formatPercent(view.resources.totals.diversionRate, { digits: 0 })} diverted ·{' '}
                      <ChangeText value={view.resources.changes.waste} />
                    </>
                  }
                >
                  {wasteExcluded ? (
                    <EmptyState
                      icon={Leaf}
                      title="Waste is outside the selected scope"
                      description="Waste is Scope 3. Clear the scope filter or choose Scope 3 to view this trend."
                      className="py-8"
                    />
                  ) : view.resources.totals.wasteKg > 0 ? (
                    <TrendAreaChart
                      data={view.monthly.map((row) => ({
                        label: row.label,
                        value: row.wasteKg ?? 0,
                      }))}
                      unit="kg"
                      seriesName="Waste"
                      color={CHART_COLORS.waste}
                    />
                  ) : (
                    <EmptyState
                      icon={Leaf}
                      title="No waste records"
                      description="No matching waste records in this period."
                      className="py-8"
                    />
                  )}
                </ChartCard>
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                <ChartCard
                  title="Emissions by source"
                  description="Contribution of each recorded activity category."
                >
                  {view.categories.some((item) => item.value > 0) ? (
                    <SourceBreakdownChart categories={view.categories} height={235} />
                  ) : (
                    <EmptyState
                      icon={Gauge}
                      title="No classified emissions"
                      description="Resource-only records do not produce a source breakdown."
                      className="py-8"
                    />
                  )}
                </ChartCard>

                <ChartCard
                  title="Commuting modes"
                  description="Estimated emissions by travel mode."
                  footer={`Active travel makes up ${formatPercent(view.breakdowns.activeTravelShare, {
                    digits: 0,
                    alreadyPercent: true,
                  })} of recorded passenger-km.`}
                >
                  {commuteData.length ? (
                    <HorizontalBarChart
                      data={commuteData}
                      height={220}
                      nameWidth={98}
                      valueFormatter={(value) =>
                        `${formatNumber(value, { digits: Math.abs(value) >= 10 ? 1 : 2 })} tCO₂e`
                      }
                      secondaryFormatter={(value) => `${formatNumber(value)} passenger-km`}
                    />
                  ) : (
                    <EmptyState
                      icon={Users}
                      title="No commuting records"
                      description="Add a commuting pattern from Consumption to compare modes."
                      className="py-8"
                    />
                  )}
                </ChartCard>

                <ChartCard
                  title="Waste management"
                  description="Recorded waste by disposal method."
                  footer={`Diversion rate: ${formatPercent(view.resources.totals.diversionRate, {
                    digits: 0,
                  })} (recycling + composting).`}
                >
                  {view.breakdowns.waste.some((item) => item.weightKg > 0) ? (
                    <WasteDonut series={view.breakdowns.waste} />
                  ) : (
                    <EmptyState
                      icon={Leaf}
                      title="No waste disposal records"
                      description="No matching waste records in this period."
                      className="py-8"
                    />
                  )}
                </ChartCard>
              </div>

              <ChartCard
                title="Renewable energy contribution"
                description="Illustrative on-site generation compared with recorded grid electricity."
                action={<Badge tone="blue">Sample data</Badge>}
                footer={view.renewable.source.note}
              >
                {view.renewable.available ? (
                  <div className="grid gap-5 lg:grid-cols-[240px_1fr] lg:items-center">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                        Sample generation
                      </p>
                      <p className="mt-1 font-display text-xl font-semibold text-ink-900">
                        {formatNumber(view.renewable.kwh / 1000, { digits: 1 })} MWh
                      </p>
                      <p className="mt-1 text-[11px] text-ink-400">
                        {formatPercent(view.renewable.share, {
                          digits: 0,
                          alreadyPercent: true,
                        })}{' '}
                        of electricity used (recorded grid + sample solar) in this period.
                      </p>
                      <p className="mt-3 text-[11px] leading-relaxed text-ink-500">
                        {view.renewable.source.label} · {view.renewable.source.capacityKwp} kWp
                        illustrative. This sample is not metered and is not counted in the GHG
                        totals above.
                      </p>
                    </div>
                    <TrendAreaChart
                      data={view.renewable.monthly.map((row) => ({
                        label: row.label,
                        value: row.kwh / 1000,
                      }))}
                      unit="MWh"
                      seriesName="Sample solar"
                      color={CHART_COLORS.scope3}
                      height={190}
                    />
                  </div>
                ) : (
                  <EmptyState
                    icon={Leaf}
                    title="No electricity records to compare"
                    description="Renewable contribution is shown against recorded grid electricity. Add electricity readings to see the comparison."
                    className="py-8"
                  />
                )}
              </ChartCard>

              <ChartCard
                title="Building comparison"
                description="Estimated emissions by building for the selected period and filters."
                action={
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleExportBuildings}
                      disabled={!view.buildings.length}
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      CSV
                    </Button>
                    <Link
                      to="/buildings"
                      className="text-[11px] font-medium text-forest-700 hover:text-forest-900"
                    >
                      Portfolio
                    </Link>
                  </div>
                }
                footer={
                  view.totals.unattributedKg > 0 ? (
                    <>
                      {formatTonnes(view.totals.unattributedKg)} (
                      {formatPercent(view.totals.unattributedShare, {
                        digits: 0,
                        alreadyPercent: true,
                      })}
                      ) is campus-wide or not linked to a building, so it is not shown here.
                    </>
                  ) : (
                    'All emissions in this selection are linked to buildings.'
                  )
                }
              >
                {buildingData.length ? (
                  <HorizontalBarChart
                    data={buildingData}
                    height={Math.min(420, Math.max(230, buildingData.length * 40))}
                    nameWidth={176}
                    wrapNames
                    valueFormatter={(value) => `${formatNumber(value, { digits: 1 })} tCO₂e`}
                    secondaryFormatter={(value) =>
                      value === null || value === undefined
                        ? 'No floor area recorded'
                        : `${formatNumber(value, { digits: 1 })} kgCO₂e/m²`
                    }
                  />
                ) : (
                  <EmptyState
                    icon={Gauge}
                    title="No building-level emissions"
                    description="No matching records are linked to a building. Campus-wide records appear in the totals above."
                    className="py-10"
                  />
                )}
              </ChartCard>

              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-4">
                  <div>
                    <h3 className="font-display text-[16px] font-semibold leading-snug text-ink-900">
                      Monthly inventory
                    </h3>
                    <p className="mt-1 text-[13px] text-ink-500">
                      Scope totals in tonnes CO₂e, with electricity, water and waste for context.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-ink-400">Estimated values</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleExportMonthly}
                      disabled={!view.monthly.length}
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      CSV
                    </Button>
                  </div>
                </div>
                <DataTable
                  columns={monthlyColumns}
                  rows={view.monthly}
                  getRowId={(row) => row.period}
                  pageSize={12}
                  className="border-t border-line"
                  tableClassName="min-w-[820px]"
                  emptyState={
                    <EmptyState
                      icon={Gauge}
                      title="No monthly totals"
                      description="No activity records fall within the selected period."
                      className="py-10"
                    />
                  }
                />
              </Card>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}

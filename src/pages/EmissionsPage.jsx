import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  Calculator,
  Download,
  Droplets,
  Factory,
  Leaf,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useCampus } from '../context/CampusContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { FactorReferenceCard } from '../components/emissions/FactorReference.jsx';
import {
  ScopeCard,
  ScopeDetailCard,
  TotalEmissionsCard,
} from '../components/emissions/ScopeCard.jsx';
import { ChartCard } from '../components/charts/ChartCard.jsx';
import { EmissionsTrendChart } from '../components/charts/EmissionsTrendChart.jsx';
import { HorizontalBarChart } from '../components/charts/HorizontalBarChart.jsx';
import { ScopeDonut } from '../components/charts/ScopeDonut.jsx';
import { TrendAreaChart } from '../components/charts/TrendAreaChart.jsx';
import { Badge, CategoryBadge, ScopeBadge } from '../components/ui/Badge.jsx';
import { Button, buttonClasses } from '../components/ui/Button.jsx';
import { Callout } from '../components/ui/Callout.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { PageSkeleton } from '../components/ui/PageSkeleton.jsx';
import { ProgressBar } from '../components/ui/ProgressBar.jsx';
import { Tabs } from '../components/ui/Tabs.jsx';
import { inputClasses } from '../components/ui/styles.js';
import { CATEGORY_META, CATEGORY_ORDER, CHART_COLORS, PERIOD_OPTIONS } from '../data/options.js';
import {
  GHG_STANDARD,
  SCOPE1_SOURCES,
  SCOPE2_ENERGY_SOURCES,
  SCOPE2_METHODS,
  SCOPE3_CATEGORIES,
  SCOPE3_STATUS,
  dataQualityMeta,
  scope3StatusMeta,
} from '../data/ghgProtocol.js';
import { WATER_METRIC } from '../data/scopes.js';
import { getEmissionSnapshot } from '../services/emissionService.js';
import { buildEmissionCsv } from '../utils/emissionReport.js';
import { downloadCsv } from '../utils/csv.js';
import { formatDateTime, getRecentMonths, monthLabel, monthRangeLabel } from '../utils/dates.js';
import { formatEmissions, formatNumber, formatPercent, formatTonnes, formatWater, truncate } from '../utils/format.js';

const PROGRESS_TONES = { 1: 'amber', 2: 'green', 3: 'olive' };
const CATEGORY_DESCRIPTIONS = {
  electricity: 'Purchased grid electricity',
  fuel: 'Diesel, petrol and LPG combustion',
  waste: 'Landfill, recycling and composting',
  commuting: 'Student and staff travel',
};
const TAB_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'scopes', label: 'Scope management' },
  { id: 'scope3', label: 'Scope 3 register' },
  { id: 'ledger', label: 'Calculation ledger' },
  { id: 'factors', label: 'Factor reference' },
];

function LedgerMetric({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-line bg-sand-50/60 px-3.5 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">{label}</p>
      <p className="mt-0.5 text-[14px] font-semibold tabular-nums text-ink-900">{value}</p>
      {hint ? <p className="mt-0.5 text-[10px] text-ink-400">{hint}</p> : null}
    </div>
  );
}

export function EmissionsPage() {
  const { activities, buildings, factors, scope3, saveScope3Category } = useCampus();
  const { push } = useToast();

  const [range, setRange] = useState(12);
  const [tab, setTab] = useState('overview');
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [ledgerQuery, setLedgerQuery] = useState('');
  const [ledgerScope, setLedgerScope] = useState('all');
  const [ledgerCategory, setLedgerCategory] = useState('all');
  const [scope3Drafts, setScope3Drafts] = useState({});
  const [savingScope3, setSavingScope3] = useState(null);

  const months = useMemo(() => getRecentMonths(range), [range]);
  const from = months[0];
  const to = months[months.length - 1];

  useEffect(() => {
    let cancelled = false;

    getEmissionSnapshot({ activities, buildings, factors, from, to })
      .then((data) => {
        if (cancelled) return;
        setSnapshot(data);
        setError(null);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setError(
          loadError instanceof Error ? loadError.message : 'The emissions report could not be loaded.',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [activities, buildings, factors, from, to, reloadKey]);

  const report = snapshot?.report ?? null;
  const activeFactors = snapshot?.factors ?? factors ?? {};
  const dataReady = Boolean(
    report && report.meta.from === (from ?? null) && report.meta.to === (to ?? null),
  );

  const monthlyChartData = useMemo(
    () =>
      (report?.monthly ?? []).map((month) => ({
        ...month,
        scope1T: month.scope1 / 1000,
        scope2T: month.scope2 / 1000,
        scope3T: month.scope3 / 1000,
        totalT: month.total / 1000,
      })),
    [report],
  );

  const sourceChartData = useMemo(
    () =>
      (report?.bySource ?? [])
        .filter((source) => source.kg > 0)
        .map((source) => ({
          name: truncate(source.label, 30),
          value: source.kg / 1000,
          secondary: source.entryCount,
          color: report?.scopeDetails?.[source.scope]?.color,
        })),
    [report],
  );

  const buildingChartData = useMemo(
    () =>
      (report?.byBuilding ?? [])
        .filter((building) => building.kg > 0)
        .map((building) => ({
          name: truncate(building.name, 30),
          value: building.kg / 1000,
          secondary: building.intensityKgPerSqm,
          color: CHART_COLORS.scope2,
        })),
    [report],
  );

  const filteredLedger = useMemo(() => {
    const query = ledgerQuery.trim().toLowerCase();
    return (report?.ledger ?? []).filter((row) => {
      if (ledgerScope === 'water' && row.category !== 'water') return false;
      if (ledgerScope !== 'all' && ledgerScope !== 'water' && row.scope !== Number(ledgerScope)) {
        return false;
      }
      if (ledgerCategory !== 'all' && row.category !== ledgerCategory) return false;
      if (!query) return true;
      return [
        row.source,
        row.buildingName,
        row.categoryLabel,
        row.inputSummary,
        row.factorLabel,
        row.formula,
        row.factorSource,
        row.scope1Source,
        row.scope3CategoryLabel,
        row.dataQualityLabel,
        row.sourceReference,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [report, ledgerQuery, ledgerScope, ledgerCategory]);

  const ledgerTotals = useMemo(
    () =>
      filteredLedger.reduce(
        (totals, row) => {
          totals.kg += row.includedInTotal ? row.kg : 0;
          if (row.includedInTotal) totals.estimated += 1;
          if (row.category === 'water') totals.water += 1;
          return totals;
        },
        { kg: 0, estimated: 0, water: 0 },
      ),
    [filteredLedger],
  );

  const verifiedFactorCount = useMemo(
    () => Object.values(activeFactors ?? {}).filter((factor) => factor.verified).length,
    [activeFactors],
  );

  const scope3Rows = useMemo(() => {
    const registerById = new Map((scope3 ?? []).map((entry) => [Number(entry.categoryId), entry]));
    const measuredById = new Map(
      (report?.scope3Categories ?? []).map((entry) => [Number(entry.id), entry]),
    );
    return SCOPE3_CATEGORIES.map((category) => {
      const register = registerById.get(category.id);
      const measured = measuredById.get(category.id) ?? { kg: 0, entryCount: 0 };
      const status = SCOPE3_STATUS[register?.status] ? register.status : category.defaultStatus;
      return {
        ...category,
        status,
        savedNote: typeof register?.note === 'string' ? register.note : '',
        kg: measured.kg ?? 0,
        entryCount: measured.entryCount ?? 0,
        updatedAt: register?.updatedAt ?? null,
      };
    });
  }, [scope3, report]);

  const scope3Summary = useMemo(() => {
    const counts = { quantified: 0, notQuantified: 0, excluded: 0, notAssessed: 0 };
    scope3Rows.forEach((row) => {
      if (row.entryCount > 0) counts.quantified += 1;
      if (row.status === 'applicable_not_quantified') counts.notQuantified += 1;
      if (row.status === 'excluded_not_relevant') counts.excluded += 1;
      if (row.status === 'not_assessed') counts.notAssessed += 1;
    });
    return {
      ...counts,
      kg: scope3Rows.reduce((sum, row) => sum + row.kg, 0),
    };
  }, [scope3Rows]);

  const measuredShare = useMemo(() => {
    if (!report?.totals?.kg) return null;
    const measured = (report.byDataQuality ?? []).find((row) => row.id === 'measured');
    return ((measured?.kg ?? 0) / report.totals.kg) * 100;
  }, [report]);

  const handleExport = () => {
    if (!report?.ledger?.length) return;
    const rangeKey = `${report.meta.from ?? 'start'}-to-${report.meta.to ?? 'end'}`;
    downloadCsv(`greencampus-emission-ledger-${rangeKey}.csv`, buildEmissionCsv(report));
    push({
      title: 'Calculation ledger exported',
      description: 'Recorded inputs, factor metadata and estimated emissions are in separate columns.',
    });
  };

  const handleScope3Change = (categoryId, field, value) => {
    const row = scope3Rows.find((entry) => entry.id === categoryId);
    setScope3Drafts((previous) => ({
      ...previous,
      [categoryId]: {
        status: previous[categoryId]?.status ?? row?.status ?? 'not_assessed',
        note: previous[categoryId]?.note ?? row?.savedNote ?? '',
        [field]: value,
      },
    }));
  };

  const handleScope3Save = async (row) => {
    const draft = scope3Drafts[row.id] ?? { status: row.status, note: row.savedNote };
    setSavingScope3(row.id);
    try {
      await saveScope3Category(row.id, { status: draft.status, note: draft.note });
      setScope3Drafts((previous) => {
        const next = { ...previous };
        delete next[row.id];
        return next;
      });
      push({
        title: `Category ${row.id} updated`,
        description: 'Scope 3 applicability is recorded in the inventory register.',
      });
    } catch (saveError) {
      push({
        tone: 'error',
        title: 'Scope 3 category could not be saved',
        description:
          saveError instanceof Error ? saveError.message : 'The applicability change failed.',
      });
    } finally {
      setSavingScope3(null);
    }
  };

  const ledgerColumns = [
    {
      key: 'period',
      header: 'Month',
      render: (row) => (
        <div className="whitespace-nowrap">
          <p className="text-[13px] font-medium text-ink-900">{monthLabel(row.period, 'compact')}</p>
          <p className="mt-0.5 text-[10px] text-ink-400">{row.period}</p>
        </div>
      ),
    },
    {
      key: 'activity',
      header: 'Activity source',
      render: (row) => (
        <div className="min-w-[170px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryBadge category={row.category} />
            <span className="text-[12px] font-medium text-ink-900">{row.source}</span>
          </div>
          <p className="mt-1 text-[11px] text-ink-400">{row.buildingName}</p>
        </div>
      ),
    },
    {
      key: 'input',
      header: 'Recorded input',
      render: (row) => (
        <div className="min-w-[190px]">
          <p className="text-[12px] font-medium tabular-nums text-ink-900">
            {formatNumber(row.inputQuantity, {
              digits: row.inputUnit === 'kL' || row.inputUnit === 'kWh' ? 1 : 0,
            })}{' '}
            {row.inputUnit}
          </p>
          <p className="mt-0.5 max-w-[230px] text-[10px] leading-relaxed text-ink-400">
            {row.inputSummary}
          </p>
        </div>
      ),
    },
    {
      key: 'factor',
      header: 'Factor applied',
      render: (row) =>
        row.factorKey ? (
          <div className="min-w-[160px]">
            <p className="text-[12px] font-medium text-ink-900">{row.factorLabel}</p>
            <p className="mt-0.5 text-[10px] tabular-nums text-ink-500">
              {formatNumber(row.factorValue, {
                digits: row.factorValue >= 10 ? 0 : row.factorValue >= 1 ? 2 : 3,
              })}{' '}
              {row.factorUnit}
            </p>
            <p className="mt-0.5 text-[10px] text-ink-400">
              {row.factorStatusLabel || 'Reference'} · {row.factorYear || 'Year not stated'}
              {row.factorVersion ? ` · ${row.factorVersion}` : ''}
            </p>
            {row.factorGasCoverage || row.factorMethodology ? (
              <p
                className="mt-0.5 max-w-[200px] text-[10px] leading-relaxed text-ink-400"
                title={row.factorMethodology || undefined}
              >
                {[row.factorGasCoverage, row.factorMethodology].filter(Boolean).join(' · ')}
              </p>
            ) : null}
          </div>
        ) : (
          <span className="text-[11px] text-ink-400">Not applied</span>
        ),
    },
    {
      key: 'scope',
      header: 'Scope',
      render: (row) =>
        row.scope ? (
          <ScopeBadge scope={row.scope} />
        ) : (
          <Badge tone="neutral">{row.scopeLabel}</Badge>
        ),
    },
    {
      key: 'quality',
      header: 'Data quality',
      render: (row) => {
        const quality = dataQualityMeta(row.dataQuality);
        return (
          <div className="min-w-[130px]">
            <Badge tone={quality.tone}>{quality.shortLabel}</Badge>
            <p
              className="mt-1 max-w-[180px] text-[10px] leading-relaxed text-ink-400"
              title={quality.description}
            >
              {row.sourceReference || quality.description}
            </p>
          </div>
        );
      },
    },
    {
      key: 'emissions',
      header: 'Estimated emissions',
      align: 'right',
      render: (row) =>
        row.includedInTotal ? (
          <span className="whitespace-nowrap text-[12px] font-semibold tabular-nums text-ink-900">
            {formatEmissions(row.kg)}
          </span>
        ) : (
          <span className="text-[11px] text-ink-400">—</span>
        ),
    },
    {
      key: 'formula',
      header: 'Calculation',
      render: (row) => (
        <p
          className="max-w-[210px] text-[10px] leading-relaxed text-ink-400"
          title={row.formula}
        >
          {truncate(row.formula, 74)}
        </p>
      ),
    },
  ];

  if (activities.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Carbon accounting"
          title="Emissions & scope management"
          description="Convert recorded activity into estimated Scope 1, 2 and 3 emissions once data exists."
        />
        <Card>
          <EmptyState
            icon={Factory}
            title="No activity data to calculate"
            description="Add electricity, fuel, waste or commuting records to produce an estimated footprint and a transparent calculation ledger."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link to="/data-entry" className={buttonClasses()}>
                  Add a record
                </Link>
                <Link to="/settings" className={buttonClasses({ variant: 'secondary' })}>
                  Review factors
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
          title="Emissions report could not be loaded"
          message={error}
          onRetry={() => setReloadKey((value) => value + 1)}
        />
      );
    }
    return <PageSkeleton />;
  }

  const { totals, scopeShares, scopeDetails, coverage, water } = report;
  const hasEntries = report.meta.entryCount > 0;
  const hasEstimated = report.meta.estimatedEntryCount > 0;
  const tabItems = TAB_ITEMS.map((item) => {
    if (item.id === 'ledger') return { ...item, count: report.ledger.length };
    if (item.id === 'factors') return { ...item, count: Object.keys(activeFactors).length };
    if (item.id === 'scope3') return { ...item, count: scope3Summary.quantified };
    return item;
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`Carbon accounting · ${monthRangeLabel(from, to)}`}
        title="Emissions & scope management"
        description="Estimate the campus footprint from recorded activity, inspect how each scope is built and trace every result back to its input and factor."
        actions={
          <>
            <label htmlFor="emissions-range" className="sr-only">
              Reporting range
            </label>
            <select
              id="emissions-range"
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
            <Button variant="secondary" onClick={handleExport} disabled={!report.ledger.length}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Export ledger
            </Button>
          </>
        }
      />

      <Tabs items={tabItems} value={tab} onChange={setTab} />

      {error ? (
        <Callout tone="warning" title="The report could not refresh">
          {error} Showing the last successfully calculated period.
        </Callout>
      ) : null}

      <Callout tone="warning" title="Actual inputs, estimated outputs">
        Recorded quantities are real inputs to the calculation. Every kgCO₂e figure is an estimate
        produced by {report.meta.activeFactorCount} active factor
        {report.meta.activeFactorCount === 1 ? '' : 's'}; {verifiedFactorCount} of them{' '}
        {verifiedFactorCount === 1 ? 'is' : 'are'} marked verified. Review{' '}
        <Link to="/settings#factors" className="font-semibold underline decoration-from-font">
          factor sources and applicable years
        </Link>{' '}
        before using these figures for formal reporting.
      </Callout>

      {tab === 'overview' ? (
        <div className="space-y-5">
          {!hasEntries ? (
            <Card>
              <EmptyState
                icon={Factory}
                title="No activity in this reporting period"
                description={`There are no records between ${monthRangeLabel(from, to)}. Change the range or add activity data to calculate emissions.`}
                action={
                  <Link to="/data-entry" className={buttonClasses()}>
                    Add activity data
                  </Link>
                }
              />
            </Card>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <TotalEmissionsCard
                  totals={totals}
                  scopeShares={scopeShares}
                  estimatedEntryCount={report.meta.estimatedEntryCount}
                  waterEntryCount={report.meta.waterEntryCount}
                />
                {scopeShares.map((share) => (
                  <ScopeCard key={share.scope} scope={scopeDetails[share.scope]} />
                ))}
              </div>

              <div className="grid gap-5 xl:grid-cols-3">
                <ChartCard
                  className="xl:col-span-2"
                  title="Monthly emissions by scope"
                  description="Estimated monthly totals across the selected period."
                  action={<span className="text-[11px] text-ink-400">tonnes CO₂e</span>}
                >
                  <EmissionsTrendChart data={monthlyChartData} />
                </ChartCard>

                <ChartCard
                  title="Scope contribution"
                  description="Share of the estimated footprint by GHG Protocol scope."
                  footer="Water is excluded: it is reported as a resource metric, not a GHG scope."
                >
                  {hasEstimated ? (
                    <ScopeDonut shares={scopeShares} totalKg={totals.kg} />
                  ) : (
                    <EmptyState
                      icon={Leaf}
                      title="No calculated emissions"
                      description="Only water records exist for this period, so there is no scope total."
                      className="py-8"
                    />
                  )}
                </ChartCard>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <ChartCard
                  title="Emissions by source"
                  description="Each activity group, coloured by its assigned scope."
                  action={<span className="text-[11px] text-ink-400">tCO₂e</span>}
                >
                  {sourceChartData.length ? (
                    <HorizontalBarChart
                      data={sourceChartData}
                      height={Math.max(260, sourceChartData.length * 27)}
                      nameWidth={185}
                      valueFormatter={(value) => `${formatNumber(value, { digits: 1 })} tCO₂e`}
                      secondaryFormatter={(value) =>
                        `${formatNumber(value)} record${value === 1 ? '' : 's'} in period`
                      }
                    />
                  ) : (
                    <EmptyState
                      icon={Calculator}
                      title="No emission sources"
                      description="No records in this period carry a GHG factor."
                      className="py-8"
                    />
                  )}
                </ChartCard>

                <ChartCard
                  title="Building comparison"
                  description="Estimated emissions by metered building; unassigned records are grouped separately."
                  action={<span className="text-[11px] text-ink-400">tCO₂e</span>}
                  footer="Tooltips show emission intensity where floor area is recorded."
                >
                  {buildingChartData.length ? (
                    <HorizontalBarChart
                      data={buildingChartData}
                      height={Math.max(260, buildingChartData.length * 32)}
                      nameWidth={185}
                      valueFormatter={(value) => `${formatNumber(value, { digits: 1 })} tCO₂e`}
                      secondaryFormatter={(value) =>
                        value === null
                          ? 'No floor area recorded'
                          : `${formatNumber(value, { digits: 1 })} kgCO₂e/m² intensity`
                      }
                    />
                  ) : (
                    <EmptyState
                      icon={Building2}
                      title="No building-level emissions"
                      description="Add building-linked electricity or water records to compare buildings."
                      className="py-8"
                    />
                  )}
                </ChartCard>
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                <Card className="p-5 sm:p-6">
                  <CardHeader
                    title="Scope 1 by source"
                    description="Direct emissions grouped by the GHG Protocol source type."
                    action={<Badge tone="amber">Scope 1</Badge>}
                  />
                  <div className="mt-4 space-y-3">
                    {SCOPE1_SOURCES.map((source) => {
                      const record = (report.scope1Sources ?? []).find(
                        (entry) => entry.id === source.id,
                      );
                      return (
                        <div key={source.id}>
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[12px] text-ink-600">{source.label}</p>
                            <p className="shrink-0 text-[12px] font-semibold tabular-nums text-ink-900">
                              {record ? formatTonnes(record.kg, { digits: 2 }) : '—'}
                            </p>
                          </div>
                          <p className="mt-0.5 text-[10px] leading-relaxed text-ink-400">
                            {record
                              ? `${formatNumber(record.entryCount)} record${
                                  record.entryCount === 1 ? '' : 's'
                                } in period`
                              : source.activity}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-400">
                    Refrigerant leakage uses AR4 100-year global warming potentials. Process and
                    other fugitive emissions are documented but not recorded in this workspace.
                  </p>
                </Card>

                <Card className="p-5 sm:p-6">
                  <CardHeader
                    title="Scope 2 dual reporting"
                    description="The same purchased electricity, reported on both GHG Protocol methods."
                    action={<Badge tone="green">Scope 2</Badge>}
                  />
                  <div className="mt-4 space-y-3">
                    {SCOPE2_METHODS.map((method) => (
                      <div
                        key={method.id}
                        className="rounded-xl border border-line bg-sand-50/60 px-3.5 py-2.5"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <p className="text-[12px] font-medium text-ink-700">{method.label}</p>
                            <Badge tone={method.applied ? 'green' : 'blue'}>
                              {method.applied ? 'Applied' : 'Proxy'}
                            </Badge>
                          </div>
                          <p className="shrink-0 text-[13px] font-semibold tabular-nums text-ink-900">
                            {formatTonnes(
                              method.id === 'location'
                                ? totals.scope2LocationKg
                                : totals.scope2MarketKg,
                              { digits: 2 },
                            )}
                          </p>
                        </div>
                        <p className="mt-1 text-[10px] leading-relaxed text-ink-400">
                          {method.description}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 space-y-1.5 border-t border-line pt-3">
                    {SCOPE2_ENERGY_SOURCES.map((source) => (
                      <div key={source.id} className="flex items-center justify-between gap-3">
                        <p className="text-[11px] text-ink-500">{source.label}</p>
                        <Badge tone={source.applicability === 'recorded' ? 'green' : 'neutral'}>
                          {source.applicability === 'recorded' ? 'Recorded' : 'Not applicable'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[10px] leading-relaxed text-ink-400">
                    Only the location-based value enters the Scope 2 total. The market-based view is
                    a labelled proxy because no contractual instruments are recorded or verified.
                  </p>
                </Card>

                <Card className="p-5 sm:p-6">
                  <CardHeader
                    title="Activity data quality"
                    description="How the recorded inputs behind this estimate were obtained."
                    action={
                      <Badge tone={measuredShare !== null && measuredShare >= 80 ? 'green' : 'amber'}>
                        {measuredShare === null
                          ? 'No data'
                          : `${formatPercent(measuredShare, { digits: 0, alreadyPercent: true })} measured`}
                      </Badge>
                    }
                  />
                  <div className="mt-4 space-y-2.5">
                    {(report.byDataQuality ?? []).map((row) => (
                      <div key={row.id} className="flex items-center justify-between gap-3">
                        <Badge tone={row.tone}>{row.label}</Badge>
                        <div className="text-right">
                          <p className="text-[12px] font-semibold tabular-nums text-ink-900">
                            {formatNumber(row.entryCount)} record{row.entryCount === 1 ? '' : 's'}
                          </p>
                          <p className="text-[10px] tabular-nums text-ink-400">
                            {formatTonnes(row.kg, { digits: 1 })} estimated
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-400">
                    Data quality describes the activity input, not the emission factor. Records
                    marked estimated or missing are counted in the total and flagged for review.
                  </p>
                </Card>
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                <Card className="p-5 sm:p-6">
                  <CardHeader
                    title="Contribution by activity"
                    description="Estimated emissions and share for each activity category."
                    action={
                      <Link
                        to="/analytics"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-forest-700 hover:text-forest-900"
                      >
                        Analytics
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    }
                  />
                  <div className="mt-4 space-y-3.5">
                    {report.byCategory.map((category) => (
                      <div key={category.id}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <CategoryBadge category={category.id} />
                            <span className="text-[12px] font-medium text-ink-700">
                              {CATEGORY_DESCRIPTIONS[category.id] ?? category.label}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-[12px] font-semibold tabular-nums text-ink-900">
                              {formatTonnes(category.kg, { digits: 1 })}
                            </p>
                            <p className="text-[10px] text-ink-400">
                              {formatNumber(category.entryCount)} record
                              {category.entryCount === 1 ? '' : 's'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <ProgressBar
                            value={category.share}
                            tone={PROGRESS_TONES[category.scope] ?? 'green'}
                            className="flex-1"
                            label={`${category.label} share of emissions`}
                          />
                          <span className="w-10 text-right text-[10px] tabular-nums text-ink-400">
                            {formatPercent(category.share, { digits: 0, alreadyPercent: true })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-400">
                    Shares sum to 100% of calculated emissions. Water records are shown separately.
                  </p>
                </Card>

                <Card className="p-5 sm:p-6">
                  <CardHeader
                    title="Water resource metric"
                    description="Tracked for sustainability performance, never converted into a GHG total."
                    action={<Droplets className="h-4 w-4 text-water" aria-hidden="true" />}
                  />
                  {water.entryCount ? (
                    <>
                      <div className="mt-4 flex flex-wrap items-baseline gap-x-2">
                        <span className="font-display text-[26px] font-semibold leading-none text-ink-900">
                          {formatNumber(water.totalM3)}
                        </span>
                        <span className="text-xs font-medium text-ink-500">kL recorded</span>
                      </div>
                      <p className="mt-1 text-[11px] text-ink-400">
                        {water.entryCount} water record{water.entryCount === 1 ? '' : 's'} · no scope
                        assigned
                      </p>
                      <div className="mt-2">
                        <Badge tone="blue">{WATER_METRIC.name}</Badge>
                      </div>
                      <div className="mt-3">
                        <TrendAreaChart
                          data={water.monthly}
                          unit="kL"
                          seriesName="Water"
                          color={CHART_COLORS.water}
                          height={135}
                        />
                      </div>
                      <div className="mt-3 space-y-1.5 border-t border-line pt-3">
                        {water.byBuilding.slice(0, 3).map((building) => (
                          <div key={building.id} className="flex items-center justify-between gap-3">
                            <p className="truncate text-[11px] text-ink-500">{building.name}</p>
                            <p className="shrink-0 text-[11px] font-medium tabular-nums text-ink-700">
                              {formatWater(building.cubicMeters)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <EmptyState
                      icon={Droplets}
                      title="No water records"
                      description="Add a water reading to track this metric alongside emissions."
                      className="py-8"
                    />
                  )}
                </Card>

                <Card className="p-5 sm:p-6">
                  <CardHeader
                    title="Inventory coverage"
                    description="Data quality checks for the selected period."
                    action={
                      <Badge
                        tone={
                          coverage.missingMonths === 0 && coverage.missingCategories.length === 0
                            ? 'green'
                            : 'amber'
                        }
                        dot
                      >
                        {coverage.missingMonths === 0 && coverage.missingCategories.length === 0
                          ? 'Complete'
                          : 'Review'}
                      </Badge>
                    }
                  />
                  <div className="mt-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-3 text-[12px]">
                      <span className="text-ink-500">Months with records</span>
                      <span className="font-semibold tabular-nums text-ink-900">
                        {coverage.monthsWithRecords} / {coverage.monthCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-[12px]">
                      <span className="text-ink-500">Categories present</span>
                      <span className="font-semibold tabular-nums text-ink-900">
                        {coverage.categoriesPresent.length} / {CATEGORY_ORDER.length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-[12px]">
                      <span className="text-ink-500">Buildings with records</span>
                      <span className="font-semibold tabular-nums text-ink-900">
                        {coverage.buildingsCovered}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-[12px]">
                      <span className="text-ink-500">Campus-wide records (no building)</span>
                      <span className="font-semibold tabular-nums text-ink-900">
                        {coverage.recordsWithoutBuilding}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-[12px]">
                      <span className="text-ink-500">Records without a factor</span>
                      <span
                        className={
                          coverage.recordsWithoutFactor
                            ? 'font-semibold text-danger-700'
                            : 'font-semibold text-forest-700'
                        }
                      >
                        {coverage.recordsWithoutFactor}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-[12px]">
                      <span className="text-ink-500">Factors used in period</span>
                      <span className="font-semibold tabular-nums text-ink-900">
                        {report.meta.usedFactorCount} / {report.meta.activeFactorCount}
                      </span>
                    </div>
                  </div>
                  {coverage.missingCategories.length ? (
                    <p className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-400">
                      Missing categories: {coverage.missingCategories.map((category) => CATEGORY_META[category].label).join(', ')}.
                    </p>
                  ) : null}
                  <Link
                    to="/data-entry"
                    className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-forest-700 hover:text-forest-900"
                  >
                    Review activity data
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </Card>
              </div>

              {report.notes.length ? (
                <Card className="p-5 sm:p-6">
                  <CardHeader
                    title="Estimate notes"
                    description="Assumptions a reader should know before using these figures."
                  />
                  <ul className="mt-3 grid gap-2 lg:grid-cols-2">
                    {report.notes.map((note) => (
                      <li
                        key={note.id}
                        className="flex items-start gap-2 rounded-lg border border-line bg-sand-50/60 px-3 py-2.5 text-[11px] leading-relaxed text-ink-500"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-forest-500" aria-hidden="true" />
                        {note.text}
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {tab === 'scopes' ? (
        <div className="space-y-5">
          <Callout tone="info" title="How scopes are managed in this inventory">
            Scope assignment follows the activity category: fuel and refrigerant top-ups are Scope 1,
            purchased electricity is Scope 2, and commuting plus waste are Scope 3. Water never
            receives a scope. The organisational boundary is operational control over a single Indian
            campus; every Scope 3 category is documented separately in the register.
          </Callout>

          {scopeShares.map((share) => (
            <ScopeDetailCard key={share.scope} scope={scopeDetails[share.scope]} />
          ))}

          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="p-5 sm:p-6">
              <CardHeader
                title="Scope 1 sources"
                description="Direct emissions from sources owned or controlled by the college."
                action={<Badge tone="amber">Scope 1</Badge>}
              />
              <div className="mt-4 space-y-3">
                {SCOPE1_SOURCES.map((source) => {
                  const record = (report.scope1Sources ?? []).find((entry) => entry.id === source.id);
                  return (
                    <div key={source.id}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[12px] font-medium text-ink-700">{source.label}</p>
                        <Badge tone={record ? 'green' : 'neutral'}>
                          {record ? formatTonnes(record.kg, { digits: 2 }) : 'Not recorded'}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-ink-400">{source.detail}</p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-400">
                {GHG_STANDARD.gwp} are used for refrigerant leakage. GWP values are not combustion
                factors and are applied only to refrigerant top-up quantities.
              </p>
            </Card>

            <Card className="p-5 sm:p-6">
              <CardHeader
                title="Scope 2 purchased energy"
                description="Electricity, steam, heating and cooling purchased by the campus."
                action={<Badge tone="green">Scope 2</Badge>}
              />
              <div className="mt-4 space-y-3">
                {SCOPE2_ENERGY_SOURCES.map((source) => (
                  <div key={source.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[12px] font-medium text-ink-700">{source.label}</p>
                      <Badge tone={source.applicability === 'recorded' ? 'green' : 'neutral'}>
                        {source.applicability === 'recorded' ? 'Recorded' : 'Not applicable'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-ink-400">{source.detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1.5 border-t border-line pt-3">
                {SCOPE2_METHODS.map((method) => (
                  <div key={method.id} className="flex items-center justify-between gap-3">
                    <p className="text-[11px] text-ink-500">{method.label} method</p>
                    <span className="text-[11px] font-semibold tabular-nums text-ink-900">
                      {formatTonnes(
                        method.id === 'location' ? totals.scope2LocationKg : totals.scope2MarketKg,
                        { digits: 2 },
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <CardHeader
                title="Scope 3 coverage"
                description="Value-chain categories assessed in the inventory register."
                action={<Badge tone="olive">Scope 3</Badge>}
              />
              <div className="mt-4 space-y-2.5">
                <div className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="text-ink-500">Categories quantified</span>
                  <span className="font-semibold tabular-nums text-ink-900">
                    {scope3Summary.quantified} / {SCOPE3_CATEGORIES.length}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="text-ink-500">Relevant, not yet quantified</span>
                  <span className="font-semibold tabular-nums text-ink-900">
                    {scope3Summary.notQuantified}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="text-ink-500">Assessed as not relevant</span>
                  <span className="font-semibold tabular-nums text-ink-900">
                    {scope3Summary.excluded}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 text-[12px]">
                  <span className="text-ink-500">Not yet assessed</span>
                  <span className="font-semibold tabular-nums text-ink-900">
                    {scope3Summary.notAssessed}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-line pt-2.5 text-[12px]">
                  <span className="text-ink-500">Quantified Scope 3 emissions</span>
                  <span className="font-semibold tabular-nums text-ink-900">
                    {formatTonnes(scope3Summary.kg, { digits: 2 })}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTab('scope3')}
                className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-forest-700 hover:text-forest-900"
              >
                Open Scope 3 register
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
              </button>
            </Card>
          </div>

          <Card className="p-5 sm:p-6">
            <CardHeader
              title="Water is not a GHG scope"
              description={WATER_METRIC.description}
              action={<Badge tone="blue">Resource metric</Badge>}
            />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                  Tracked
                </p>
                <ul className="mt-2 space-y-1.5">
                  {WATER_METRIC.included.map((item) => (
                    <li key={item} className="text-[12px] leading-relaxed text-ink-500">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
                  Not modelled
                </p>
                <ul className="mt-2 space-y-1.5">
                  {WATER_METRIC.excluded.map((item) => (
                    <li key={item} className="text-[12px] leading-relaxed text-ink-500">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-400">
              {formatWater(water.totalM3)} recorded in this period from {water.entryCount} water
              record{water.entryCount === 1 ? '' : 's'} — excluded from every scope total above.
            </p>
          </Card>
        </div>
      ) : null}

      {tab === 'scope3' ? (
        <div className="space-y-5">
          <Callout tone="info" title="All 15 Scope 3 categories are documented">
            The {GHG_STANDARD.scope3} defines 15 categories. Relevance is recorded per category and a
            category is only quantified when activity records exist. Student commuting is reported
            inside category 7 under an explicit inventory convention for a college; it is not a
            separate standard category.
          </Callout>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <LedgerMetric
              label="Categories quantified"
              value={`${scope3Summary.quantified} / ${SCOPE3_CATEGORIES.length}`}
              hint="Backed by activity records"
            />
            <LedgerMetric
              label="Relevant, not quantified"
              value={formatNumber(scope3Summary.notQuantified)}
              hint="Documented as an open inventory item"
            />
            <LedgerMetric
              label="Assessed not relevant"
              value={formatNumber(scope3Summary.excluded)}
              hint="Reviewed and excluded"
            />
            <LedgerMetric
              label="Not yet assessed"
              value={formatNumber(scope3Summary.notAssessed)}
              hint="Applicability still to be reviewed"
            />
          </div>

          <Card className="overflow-hidden">
            <div className="p-5 sm:p-6">
              <CardHeader
                title="Scope 3 applicability register"
                description="Record whether each value-chain category is relevant and whether it is quantified. Saved decisions carry into the report methodology."
                action={<Badge tone="olive">{formatTonnes(scope3Summary.kg, { digits: 2 })}</Badge>}
              />
              <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
                Scope 3 emissions come from the linked activity records only — waste contributes to
                category 5 and commuting to category 7. Changing a status does not create emissions;
                it records the inventory decision.
              </p>
            </div>

            <div className="overflow-x-auto border-t border-line">
              <table className="w-full min-w-[1040px] text-left">
                <thead className="bg-sand-50">
                  <tr>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                      Category
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                      Quantified
                    </th>
                    <th className="w-[240px] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                      Applicability
                    </th>
                    <th className="w-[260px] px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                      Register note
                    </th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {scope3Rows.map((row) => {
                    const draft = scope3Drafts[row.id];
                    const status = draft?.status ?? row.status;
                    const note = draft?.note ?? row.savedNote;
                    const dirty = Boolean(draft);
                    const statusMeta = scope3StatusMeta(status);
                    return (
                      <tr key={row.id} className="align-top">
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2.5">
                            <span className="mt-0.5 inline-flex h-5 min-w-[26px] items-center justify-center rounded-md bg-sand-100 px-1 text-[10px] font-semibold tabular-nums text-ink-500">
                              {String(row.id).padStart(2, '0')}
                            </span>
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="text-[12px] font-medium text-ink-900">{row.label}</p>
                                {row.deviation ? (
                                  <Badge tone="blue">Includes student commuting</Badge>
                                ) : null}
                              </div>
                              <p className="mt-0.5 max-w-[300px] text-[10px] leading-relaxed text-ink-400">
                                {row.relevance}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {row.entryCount ? (
                            <>
                              <p className="text-[12px] font-semibold tabular-nums text-ink-900">
                                {formatTonnes(row.kg, { digits: 2 })}
                              </p>
                              <p className="text-[10px] text-ink-400">
                                {formatNumber(row.entryCount)} record
                                {row.entryCount === 1 ? '' : 's'}
                              </p>
                            </>
                          ) : (
                            <span className="text-[11px] text-ink-400">No activity records</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <label htmlFor={`scope3-status-${row.id}`} className="sr-only">
                            Applicability for category {row.id}
                          </label>
                          <select
                            id={`scope3-status-${row.id}`}
                            value={status}
                            onChange={(event) =>
                              handleScope3Change(row.id, 'status', event.target.value)
                            }
                            className={inputClasses()}
                          >
                            {Object.entries(SCOPE3_STATUS).map(([value, meta]) => (
                              <option key={value} value={value}>
                                {meta.label}
                              </option>
                            ))}
                          </select>
                          <p className="mt-1 text-[10px] leading-relaxed text-ink-400">
                            {statusMeta.description}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <label htmlFor={`scope3-note-${row.id}`} className="sr-only">
                            Register note for category {row.id}
                          </label>
                          <input
                            id={`scope3-note-${row.id}`}
                            type="text"
                            value={note}
                            maxLength={240}
                            placeholder={row.note}
                            onChange={(event) =>
                              handleScope3Change(row.id, 'note', event.target.value)
                            }
                            className={inputClasses()}
                          />
                          <p className="mt-1 text-[10px] leading-relaxed text-ink-400">
                            {row.updatedAt
                              ? `Saved ${formatDateTime(row.updatedAt)}`
                              : `Default assessment: ${row.note}`}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            size="sm"
                            variant={dirty ? 'primary' : 'secondary'}
                            disabled={!dirty || savingScope3 === row.id}
                            onClick={() => handleScope3Save(row)}
                          >
                            {savingScope3 === row.id ? 'Saving…' : dirty ? 'Save' : 'Saved'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="border-t border-line bg-sand-50/60 px-4 py-3 text-[10px] leading-relaxed text-ink-400">
              A category assessed as not relevant or not yet assessed is not an omission: the
              decision is recorded so a reviewer can see the full 15-category inventory. Quantified
              emissions are always derived from activity records, never entered directly.
            </div>
          </Card>
        </div>
      ) : null}

      {tab === 'ledger' ? (
        <Card className="overflow-hidden">
          <div className="space-y-4 p-5 sm:p-6">
            <CardHeader
              title="Calculation ledger"
              description="Every record that contributes to the estimate, with its recorded input, factor, scope and formula."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExport}
                  disabled={!report.ledger.length}
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  Export CSV
                </Button>
              }
            />

            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              <LedgerMetric
                label="Records shown"
                value={formatNumber(filteredLedger.length)}
                hint={`${report.ledger.length} in the full period`}
              />
              <LedgerMetric
                label="Estimated records"
                value={formatNumber(ledgerTotals.estimated)}
                hint="Records with an assigned GHG scope"
              />
              <LedgerMetric
                label="Water rows"
                value={formatNumber(ledgerTotals.water)}
                hint="Included for context, excluded from totals"
              />
              <LedgerMetric
                label="Filtered estimate"
                value={formatTonnes(ledgerTotals.kg, { digits: 1 })}
                hint="Sum of scope-assigned rows shown"
              />
            </div>

            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_190px_170px]">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
                  aria-hidden="true"
                />
                <label htmlFor="ledger-search" className="sr-only">
                  Search the calculation ledger
                </label>
                <input
                  id="ledger-search"
                  type="search"
                  value={ledgerQuery}
                  onChange={(event) => setLedgerQuery(event.target.value)}
                  placeholder="Search source, building, factor or formula"
                  className={inputClasses(false, 'pl-9')}
                />
              </div>
              <div>
                <label htmlFor="ledger-scope" className="sr-only">
                  Filter by scope
                </label>
                <select
                  id="ledger-scope"
                  value={ledgerScope}
                  onChange={(event) => setLedgerScope(event.target.value)}
                  className={inputClasses()}
                >
                  <option value="all">All scopes</option>
                  <option value="1">Scope 1 · Direct</option>
                  <option value="2">Scope 2 · Electricity</option>
                  <option value="3">Scope 3 · Indirect</option>
                  <option value="water">Water · Not scoped</option>
                </select>
              </div>
              <div>
                <label htmlFor="ledger-category" className="sr-only">
                  Filter by activity category
                </label>
                <select
                  id="ledger-category"
                  value={ledgerCategory}
                  onChange={(event) => setLedgerCategory(event.target.value)}
                  className={inputClasses()}
                >
                  <option value="all">All categories</option>
                  {CATEGORY_ORDER.map((category) => (
                    <option key={category} value={category}>
                      {CATEGORY_META[category].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <DataTable
            columns={ledgerColumns}
            rows={filteredLedger}
            getRowId={(row) => row.id}
            pageSize={12}
            className="border-t border-line"
            tableClassName="min-w-[1180px]"
            emptyState={
              <EmptyState
                icon={Calculator}
                title="No matching calculation rows"
                description="Adjust the search or filters, or add activity data for this period."
                action={
                  <Link to="/data-entry" className={buttonClasses({ variant: 'secondary' })}>
                    Open consumption
                  </Link>
                }
                className="py-10"
              />
            }
          />
        </Card>
      ) : null}

      {tab === 'factors' ? (
        <div className="space-y-5">
          <FactorReferenceCard factors={activeFactors} usage={report.factorUsage} />

          <Card className="p-5 sm:p-6">
            <CardHeader
              title="How each estimate is calculated"
              description="The same calculation engine feeds the dashboard, analytics, reports and this ledger."
              action={
                <Link
                  to="/settings#factors"
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-forest-700 hover:text-forest-900"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
                  Edit factors
                </Link>
              }
            />
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {[
                {
                  id: 'electricity',
                  title: 'Electricity → Scope 2',
                  method:
                    'Metered kWh × CEA grid-average emission factor for the applicable reporting year.',
                  note: 'Location-based and market-based views are both shown; only the location-based value enters the total. RECs are not treated as zero without verification.',
                },
                {
                  id: 'fuel',
                  title: 'Fuel → Scope 1',
                  method:
                    'Litres, kilograms or SCM × the fuel-specific factor. Refrigerant top-ups use the gas GWP instead of a combustion factor.',
                  note: 'Diesel, petrol, LPG and natural gas each use their own factor; R-410A, R-22 and R-134a use AR4 100-year GWPs.',
                },
                {
                  id: 'waste',
                  title: 'Waste → Scope 3 category 5',
                  method: 'Waste mass (kg ÷ 1,000) × disposal-method factor.',
                  note: 'A waste-type override is used automatically if one is configured.',
                },
                {
                  id: 'commuting',
                  title: 'Commuting → Scope 3 category 7',
                  method:
                    'Commuters × one-way km × 2 × round trips per month = passenger-km; passenger-km × mode factor.',
                  note: 'Active travel is recorded at zero emissions so its share can be reported. Student commuting sits in category 7 by convention.',
                },
                {
                  id: 'water',
                  title: 'Water → Not a scope',
                  method: 'Metered kilolitres are reported directly; no factor is applied.',
                  note: 'Excluded from every scope total by design.',
                },
              ].map((item) => (
                <div key={item.id} className="rounded-xl border border-line p-3.5">
                  <div className="flex items-center gap-2">
                    <CategoryBadge category={item.id} />
                    <p className="text-[12px] font-semibold text-ink-900">{item.title}</p>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-ink-500">{item.method}</p>
                  <p className="mt-1 text-[10px] leading-relaxed text-ink-400">{item.note}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-400">
              {GHG_STANDARD.corporate} scopes and the 15 Scope 3 categories are documented in this
              workspace. Purchased steam, heating and cooling, process emissions, business travel,
              purchased goods and other value-chain categories are not quantified here; their
              applicability is recorded in the Scope 3 register instead of being silently omitted.
            </p>
          </Card>
        </div>
      ) : null}

      <p className="pb-2 text-center text-[10px] leading-relaxed text-ink-400">
        {footerSummary(report, totals)} {GHG_STANDARD.disclaimer}
      </p>
    </div>
  );
}

function footerSummary(report, totals) {
  return `${formatTonnes(totals.kg, { digits: 1 })} across ${report.meta.estimatedEntryCount} scope-assigned record${
    report.meta.estimatedEntryCount === 1 ? '' : 's'
  }.`;
}

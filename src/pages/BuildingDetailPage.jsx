import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Droplets,
  Factory,
  Layers,
  Pencil,
  Trash2,
  Zap,
} from 'lucide-react';
import { useCampus } from '../context/CampusContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getBuildingAnalytics } from '../services/buildingService.js';
import { BuildingFormModal } from '../components/buildings/BuildingFormModal.jsx';
import { DeleteBuildingDialog } from '../components/buildings/DeleteBuildingDialog.jsx';
import { ChartCard } from '../components/charts/ChartCard.jsx';
import { HorizontalBarChart } from '../components/charts/HorizontalBarChart.jsx';
import { TrendAreaChart } from '../components/charts/TrendAreaChart.jsx';
import { Badge, CategoryBadge, ScopeBadge } from '../components/ui/Badge.jsx';
import { Button, buttonClasses } from '../components/ui/Button.jsx';
import { Callout } from '../components/ui/Callout.jsx';
import { Card } from '../components/ui/Card.jsx';
import { DataTable } from '../components/ui/DataTable.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { ErrorState } from '../components/ui/ErrorState.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { PageSkeleton } from '../components/ui/PageSkeleton.jsx';
import { StatCard } from '../components/ui/StatCard.jsx';
import { inputClasses } from '../components/ui/styles.js';
import { CHART_COLORS, PERIOD_OPTIONS } from '../data/options.js';
import { getRecentMonths, monthLabel } from '../utils/dates.js';
import {
  formatArea,
  formatNumber,
  formatPercent,
  formatTonnes,
  formatWater,
  formatWeight,
} from '../utils/format.js';

const METRICS = {
  emissions: {
    label: 'Estimated emissions',
    unit: 'tCO₂e',
    color: CHART_COLORS.scope2,
    suffix: ' tCO₂e',
  },
  electricity: { label: 'Electricity', unit: 'kWh', color: CHART_COLORS.electricity, suffix: ' kWh' },
  water: { label: 'Water', unit: 'kL', color: CHART_COLORS.water, suffix: ' kL' },
  waste: { label: 'Waste generated', unit: 'kg', color: CHART_COLORS.waste, suffix: ' kg' },
};

function recordsColumns() {
  return [
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
      header: 'Record',
      render: (row) => (
        <div className="min-w-[180px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryBadge category={row.category} />
            <span className="text-[12px] font-medium text-ink-900">{row.title}</span>
          </div>
          <p className="mt-0.5 text-[11px] text-ink-400">{row.subtitle}</p>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Recorded input',
      render: (row) => (
        <span className="whitespace-nowrap text-[12px] tabular-nums text-ink-700">
          {formatNumber(row.quantity, { digits: row.quantity < 10 ? 1 : 0 })} {row.unit}
        </span>
      ),
    },
    {
      key: 'estimate',
      header: 'Estimate',
      align: 'right',
      render: (row) => (
        <span className="whitespace-nowrap text-[12px] font-medium tabular-nums text-ink-900">
          {row.scope ? formatTonnes(row.kg, { digits: row.kg < 10000 ? 2 : 1 }) : '—'}
        </span>
      ),
    },
    {
      key: 'scope',
      header: 'Scope',
      render: (row) =>
        row.scope ? <ScopeBadge scope={row.scope} /> : <Badge tone="neutral">Not scoped</Badge>,
    },
  ];
}

export function BuildingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    buildings,
    departments,
    activities,
    bills,
    factors,
    editBuilding,
    removeBuilding,
  } = useCampus();
  const { push } = useToast();

  const [range, setRange] = useState(12);
  const [metric, setMetric] = useState('emissions');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const building = useMemo(() => buildings.find((item) => item.id === id), [buildings, id]);
  const months = useMemo(() => getRecentMonths(range), [range]);
  const from = months[0];
  const to = months[months.length - 1];

  useEffect(() => {
    let active = true;
    if (!building) {
      setLoading(false);
      setReport(null);
      return undefined;
    }
    setLoading(true);
    setError(null);
    getBuildingAnalytics(id, { activities, buildings, factors, from, to, departments })
      .then((next) => {
        if (!active) return;
        setReport(next);
        setLoading(false);
      })
      .catch((nextError) => {
        if (!active) return;
        setError(nextError instanceof Error ? nextError.message : 'Could not load building analytics.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, building, activities, buildings, factors, from, to, reloadKey]);

  const linkedActivities = activities.filter((activity) => activity.buildingId === id).length;
  const linkedBills = bills.filter((bill) => bill.buildingId === id).length;

  const handleSave = async (values) => {
    if (!building) return;
    setIsSubmitting(true);
    try {
      await editBuilding(building.id, values);
      push({ title: 'Building updated', description: `${values.name} was saved.` });
      setModalOpen(false);
    } catch (saveError) {
      push({
        tone: 'error',
        title: 'Building not saved',
        description: saveError instanceof Error ? saveError.message : 'Try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async ({ recordStrategy, reassignTo }) => {
    if (!building) return;
    setIsDeleting(true);
    try {
      const result = await removeBuilding(building.id, { recordStrategy, reassignTo });
      const moved = (result?.movedActivities ?? 0) + (result?.movedBills ?? 0);
      push({
        title: 'Building removed',
        description:
          moved > 0
            ? `${building.name} was deleted. ${moved} linked record${moved === 1 ? '' : 's'} ${
                recordStrategy === 'reassign' ? 'moved to another building' : 'kept as campus-wide'
              }.`
            : `${building.name} was deleted.`,
      });
      navigate('/buildings');
    } catch (deleteError) {
      push({
        tone: 'error',
        title: 'Building not removed',
        description: deleteError instanceof Error ? deleteError.message : 'Try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!building) {
    return (
      <div className="space-y-5">
        <Link to="/buildings" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-forest-700">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          All buildings
        </Link>
        <Card>
          <EmptyState
            icon={Building2}
            title="Building not found"
            description="It may have been deleted, or the link is incorrect."
            action={
              <Link to="/buildings" className={buttonClasses({ variant: 'primary' })}>
                Back to buildings
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  if (loading && !report) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Building analytics" title={building.name} />
        <PageSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Building analytics" title={building.name} />
        <ErrorState title="Analytics unavailable" message={error} onRetry={() => setReloadKey((value) => value + 1)} />
      </div>
    );
  }

  const activeMetric = METRICS[metric];
  const chartData = report.monthly.map((month) => ({
    label: month.label,
    value:
      metric === 'emissions'
        ? month.tonnes
        : metric === 'electricity'
          ? month.electricityKwh
          : metric === 'water'
            ? month.waterM3
            : month.wasteKg,
  }));
  const metricEmpty = chartData.every((point) => !point.value);
  const departmentName =
    departments.find((department) => department.id === building.departmentId)?.name ?? null;
  const description = building.description ?? building.notes ?? '';
  const columns = recordsColumns();

  return (
    <div className="space-y-5">
      <Link
        to="/buildings"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-forest-700 transition hover:text-forest-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        All buildings
      </Link>

      <PageHeader
        eyebrow={departmentName ?? 'Campus building'}
        title={building.name}
        description={description || 'No description has been added for this building yet.'}
        actions={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit building
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">{building.type}</Badge>
        {departmentName ? <Badge tone="blue">{departmentName}</Badge> : <Badge tone="amber">No department</Badge>}
        <span className="text-[11px] text-ink-400">
          {building.floors ? `${formatNumber(building.floors)} floors` : 'Floors not set'} ·{' '}
          {building.areaSqm ? formatArea(building.areaSqm) : 'Area not set'} ·{' '}
          {building.occupants
            ? `${formatNumber(building.occupants)} occupants`
            : 'Occupants not set'}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <label htmlFor="building-range" className="sr-only">
            Analytics period
          </label>
          <select
            id="building-range"
            value={range}
            onChange={(event) => setRange(Number(event.target.value))}
            className={inputClasses(false, 'w-auto')}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Electricity"
          value={formatNumber(report.totals.electricityKwh)}
          unit="kWh"
          icon={Zap}
          trend={{ percent: report.previous.electricityChangePercent, label: 'vs prior period' }}
        />
        <StatCard
          label="Water"
          value={formatWater(report.totals.waterM3)}
          unit=""
          icon={Droplets}
          trend={{ percent: report.previous.waterChangePercent, label: 'vs prior period' }}
        />
        <StatCard
          label="Waste generated"
          value={formatWeight(report.totals.wasteKg)}
          unit=""
          icon={Trash2}
          hint={
            report.totals.wasteKg > 0
              ? 'Records linked to this building'
              : 'No waste records linked to this building'
          }
        />
        <StatCard
          label="Estimated emissions"
          value={formatTonnes(report.totals.kg, { digits: 0, unit: false })}
          unit="tCO₂e"
          icon={Factory}
          trend={{ percent: report.previous.changePercent, label: 'vs prior period' }}
          hint={`${formatPercent(report.totals.shareOfCampus, { digits: 1, alreadyPercent: true })} of campus footprint`}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <ChartCard
          title="Monthly consumption trend"
          description={`${activeMetric.label} recorded for this building over the selected period.`}
          action={
            <div>
              <label htmlFor="building-metric" className="sr-only">
                Trend metric
              </label>
              <select
                id="building-metric"
                value={metric}
                onChange={(event) => setMetric(event.target.value)}
                className={inputClasses(false, 'w-auto')}
              >
                {Object.entries(METRICS).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          }
          footer={
            metric === 'water'
              ? 'Water is tracked as a resource metric and is never assigned a GHG scope.'
              : activeMetric.label === 'Waste generated'
                ? 'Only waste records explicitly linked to this building are shown.'
                : 'Estimated using the active factor set in Settings.'
          }
        >
          {metricEmpty ? (
            <div className="flex h-[210px] flex-col items-center justify-center rounded-xl border border-dashed border-line bg-sand-50/50 px-4 text-center">
              <p className="text-[13px] font-medium text-ink-700">No {activeMetric.label.toLowerCase()} in this period</p>
              <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-ink-400">
                {metric === 'waste'
                  ? 'Waste is usually recorded campus-wide. Link a waste record to this building in Consumption to see it here.'
                  : 'Add a metered reading in Consumption to populate this trend.'}
              </p>
            </div>
          ) : (
            <TrendAreaChart
              data={chartData}
              unit={activeMetric.unit}
              seriesName={activeMetric.label}
              color={activeMetric.color}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Comparison with other buildings"
          description="Estimated emissions for every building in the same period."
          footer={
            report.totals.rank
              ? `This building ranks ${report.totals.rank} of ${report.totals.buildingCount} by estimated emissions.`
              : 'No building-attributed emissions in this period.'
          }
        >
          <HorizontalBarChart
            data={report.comparison.map((item) => ({ ...item, secondary: item.kg }))}
            height={Math.max(220, report.comparison.length * 38)}
            nameWidth={156}
            wrapNames
            valueFormatter={(value) => `${formatNumber(value, { digits: 1 })} tCO₂e`}
            secondaryFormatter={(value) => `${formatNumber(value, { digits: 0 })} kgCO₂e`}
          />
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Card className="p-5">
          <h3 className="font-display text-[16px] font-semibold leading-snug text-ink-900">Building profile</h3>
          <dl className="mt-3 divide-y divide-line text-[13px]">
            {[
              { label: 'Building type', value: building.type },
              { label: 'Department', value: departmentName ?? 'Not assigned' },
              { label: 'Floors', value: building.floors ? formatNumber(building.floors) : 'Not set' },
              {
                label: 'Approximate area',
                value: building.areaSqm ? formatArea(building.areaSqm) : 'Not set',
              },
              {
                label: 'Regular occupants',
                value: building.occupants ? formatNumber(building.occupants) : 'Not set',
              },
              {
                label: 'Emissions intensity',
                value:
                  report.totals.intensityKgPerSqm === null
                    ? 'Add floor area to calculate'
                    : `${formatNumber(report.totals.intensityKgPerSqm, { digits: 1 })} kgCO₂e/m²`,
              },
              {
                label: 'Water per occupant',
                value:
                  report.totals.waterPerOccupant === null
                    ? 'Add occupants to calculate'
                    : `${formatNumber(report.totals.waterPerOccupant, { digits: 1 })} kL per occupant`,
              },
              {
                label: 'Last reading',
                value: report.meta.lastReading
                  ? monthLabel(report.meta.lastReading)
                  : 'No linked records',
              },
              {
                label: 'Linked records',
                value: `${formatNumber(linkedActivities)} activit${linkedActivities === 1 ? 'y' : 'ies'} · ${formatNumber(linkedBills)} bill${linkedBills === 1 ? '' : 's'}`,
              },
            ].map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-4 py-2.5">
                <dt className="text-ink-500">{row.label}</dt>
                <dd className="text-right font-medium text-ink-900">{row.value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/data-entry" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
              Open consumption
            </Link>
            <Link to="/emissions" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
              Campus emissions
            </Link>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h3 className="font-display text-[16px] font-semibold leading-snug text-ink-900">Recent records</h3>
              <p className="mt-0.5 text-[12px] text-ink-400">
                The latest activity records linked to this building. Campus-wide records are excluded.
              </p>
            </div>
            <Link to="/data-entry" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
              View all
            </Link>
          </div>
          <DataTable
            columns={columns}
            rows={report.records}
            pageSize={6}
            emptyState={
              <EmptyState
                icon={Layers}
                title="No linked records"
                description="Electricity and water readings are attached to buildings. Add one in Consumption."
                action={
                  <Link to="/data-entry" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                    Add a reading
                  </Link>
                }
              />
            }
          />
        </Card>
      </div>

      {report.records.length === 0 ? (
        <Callout tone="info" title="Building analytics are waiting for data">
          This building has no linked activity records in the selected period, so its emissions and
          consumption show as zero. Campus-wide commuting, waste and generator fuel are not split into
          buildings automatically.
        </Callout>
      ) : null}

      <BuildingFormModal
        open={modalOpen}
        onClose={() => {
          if (!isSubmitting) setModalOpen(false);
        }}
        onSubmit={handleSave}
        initialBuilding={building}
        departments={departments}
        isSubmitting={isSubmitting}
      />

      <DeleteBuildingDialog
        open={deleteOpen}
        building={building}
        buildings={buildings}
        linkedActivities={linkedActivities}
        linkedBills={linkedBills}
        onClose={() => {
          if (!isDeleting) setDeleteOpen(false);
        }}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}

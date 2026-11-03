import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Building2,
  Droplets,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
  UsersRound,
  Zap,
} from 'lucide-react';
import { useCampus } from '../context/CampusContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { BuildingFormModal } from '../components/buildings/BuildingFormModal.jsx';
import { DeleteBuildingDialog } from '../components/buildings/DeleteBuildingDialog.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button, buttonClasses } from '../components/ui/Button.jsx';
import { Callout } from '../components/ui/Callout.jsx';
import { Card } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { ProgressBar } from '../components/ui/ProgressBar.jsx';
import { getRecentMonths, monthRangeLabel } from '../utils/dates.js';
import { rankBuildings, summarizeActivities } from '../utils/analytics.js';
import {
  formatArea,
  formatNumber,
  formatPercent,
  formatTonnes,
  formatWater,
} from '../utils/format.js';
import { inputClasses } from '../components/ui/styles.js';

function MetaItem({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="h-3 w-3 text-ink-400" aria-hidden="true" />
      {children}
    </span>
  );
}

export function BuildingsPage() {
  const {
    buildings,
    departments,
    departmentMap,
    activities,
    bills,
    factors,
    addBuilding,
    editBuilding,
    removeBuilding,
  } = useCampus();
  const { push } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sort, setSort] = useState('emissions');

  const months = useMemo(() => getRecentMonths(12), []);
  const from = months[0];
  const to = months[months.length - 1];

  const ranking = useMemo(
    () => rankBuildings(activities, buildings, factors, from, to),
    [activities, buildings, factors, from, to],
  );
  const summary = useMemo(
    () => summarizeActivities(activities, factors, from, to),
    [activities, factors, from, to],
  );

  const totalArea = buildings.reduce((sum, building) => sum + (Number(building.areaSqm) || 0), 0);
  const buildingAttributedKg = ranking.reduce((sum, building) => sum + building.kg, 0);
  const portfolioIntensity = totalArea > 0 ? buildingAttributedKg / totalArea : null;
  const assignedDepartments = new Set(
    buildings.map((building) => building.departmentId).filter(Boolean),
  ).size;
  const types = useMemo(
    () => [...new Set(buildings.map((building) => building.type))].sort(),
    [buildings],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = ranking.filter((building) => {
      if (typeFilter !== 'all' && building.type !== typeFilter) return false;
      if (departmentFilter === 'unassigned' && building.departmentId) return false;
      if (
        departmentFilter !== 'all' &&
        departmentFilter !== 'unassigned' &&
        building.departmentId !== departmentFilter
      ) {
        return false;
      }
      if (!needle) return true;
      return [building.name, building.type, building.description, building.notes, departmentMap[building.departmentId]?.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
    if (sort === 'name') {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sort === 'area') {
      return [...filtered].sort((a, b) => b.areaSqm - a.areaSqm);
    }
    return filtered;
  }, [ranking, query, typeFilter, departmentFilter, sort, departmentMap]);

  const filtersActive = query.trim() || typeFilter !== 'all' || departmentFilter !== 'all';

  const openAdd = () => {
    setEditingBuilding(null);
    setModalOpen(true);
  };

  const openEdit = (building) => {
    setEditingBuilding(building);
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      if (editingBuilding) {
        await editBuilding(editingBuilding.id, values);
        push({ title: 'Building updated', description: `${values.name} was saved.` });
      } else {
        await addBuilding(values);
        push({
          title: 'Building added',
          description: `${values.name} is ready for metered records.`,
        });
      }
      setModalOpen(false);
      setEditingBuilding(null);
    } catch (error) {
      push({
        tone: 'error',
        title: 'Building not saved',
        description: error instanceof Error ? error.message : 'Try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const linkedActivities = deleteTarget
    ? activities.filter((activity) => activity.buildingId === deleteTarget.id).length
    : 0;
  const linkedBills = deleteTarget
    ? bills.filter((bill) => bill.buildingId === deleteTarget.id).length
    : 0;

  const confirmDelete = async ({ recordStrategy, reassignTo }) => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const result = await removeBuilding(deleteTarget.id, { recordStrategy, reassignTo });
      const targetName = reassignTo
        ? buildings.find((item) => item.id === reassignTo)?.name
        : null;
      const moved = (result?.movedActivities ?? 0) + (result?.movedBills ?? 0);
      push({
        title: 'Building removed',
        description:
          result?.recordStrategy === 'reassign' && moved > 0
            ? `${deleteTarget.name} was deleted and ${moved} linked record${moved === 1 ? '' : 's'} moved to ${targetName ?? 'another building'}.`
            : result?.recordStrategy === 'unassign' && moved > 0
              ? `${deleteTarget.name} was deleted. ${moved} linked record${moved === 1 ? '' : 's'} kept as campus-wide.`
              : `${deleteTarget.name} was deleted.`,
      });
      setDeleteTarget(null);
    } catch (error) {
      push({
        tone: 'error',
        title: 'Building not removed',
        description: error instanceof Error ? error.message : 'Try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Campus portfolio"
        title="Buildings"
        description={`Organise metered electricity, water and related records by building and department. Analytics below cover ${monthRangeLabel(
          from,
          to,
        )}.`}
        actions={
          <>
            <Link to="/departments" className={buttonClasses({ variant: 'secondary' })}>
              <UsersRound className="h-4 w-4" aria-hidden="true" />
              Manage departments
            </Link>
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add building
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 divide-y divide-line sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              Buildings
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-ink-900">
              {buildings.length}{' '}
              <span className="text-[11px] font-medium text-ink-400">
                in {assignedDepartments} department{assignedDepartments === 1 ? '' : 's'}
              </span>
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              Floor area
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-ink-900">
              {totalArea > 0 ? formatNumber(totalArea) : '—'}{' '}
              {totalArea > 0 ? <span className="text-xs font-medium text-ink-500">m²</span> : null}
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              Campus footprint · 12 months
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-ink-900">
              {formatTonnes(summary.totalKg, { digits: 0 })}
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              Metered intensity
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-ink-900">
              {portfolioIntensity === null
                ? '—'
                : `${formatNumber(portfolioIntensity, { digits: 1 })} `}
              {portfolioIntensity === null ? null : (
                <span className="text-xs font-medium text-ink-500">kgCO₂e/m²</span>
              )}
            </p>
          </div>
        </div>
      </Card>

      {activities.length === 0 ? (
        <Callout tone="info" title="No activity data yet">
          Buildings are ready, but there are no metered records. Add electricity or water readings in{' '}
          <Link to="/data-entry" className="font-semibold underline decoration-from-font">
            Consumption
          </Link>{' '}
          to populate intensity metrics.
        </Callout>
      ) : null}

      {buildings.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title="No buildings yet"
            description="Add the academic blocks, residences and facilities that you want to track."
            action={
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add your first building
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_170px_190px_170px]">
            <div className="relative">
              <label htmlFor="building-search" className="sr-only">
                Search buildings
              </label>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
                aria-hidden="true"
              />
              <input
                id="building-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, type or department"
                className={inputClasses(false, 'pl-9')}
              />
            </div>
            <div>
              <label htmlFor="building-type-filter" className="sr-only">
                Filter by building type
              </label>
              <select
                id="building-type-filter"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className={inputClasses()}
              >
                <option value="all">All types</option>
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="building-department-filter" className="sr-only">
                Filter by department
              </label>
              <select
                id="building-department-filter"
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
                className={inputClasses()}
              >
                <option value="all">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
                <option value="unassigned">No department</option>
              </select>
            </div>
            <div>
              <label htmlFor="building-sort" className="sr-only">
                Sort buildings
              </label>
              <select
                id="building-sort"
                value={sort}
                onChange={(event) => setSort(event.target.value)}
                className={inputClasses()}
              >
                <option value="emissions">Highest emissions</option>
                <option value="name">Name A–Z</option>
                <option value="area">Largest area</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 px-0.5">
            <p className="text-[12px] text-ink-400">
              Showing {formatNumber(visible.length)} of {formatNumber(buildings.length)} buildings
            </p>
            {filtersActive ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setTypeFilter('all');
                  setDepartmentFilter('all');
                }}
                className="text-[12px] font-medium text-forest-700 transition hover:text-forest-800"
              >
                Clear filters
              </button>
            ) : null}
          </div>

          {visible.length === 0 ? (
            <Card>
              <EmptyState
                icon={Search}
                title="No buildings match these filters"
                description="Try a different search term, type or department."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery('');
                      setTypeFilter('all');
                      setDepartmentFilter('all');
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            </Card>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((building) => {
                const department = building.departmentId
                  ? departmentMap[building.departmentId]
                  : null;
                const description = building.description ?? building.notes ?? '';
                return (
                  <Card key={building.id} className="flex flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-forest-100 bg-forest-50 text-forest-600">
                        <Building2 className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(building)}
                          className="rounded-lg p-1.5 text-ink-400 transition hover:bg-sand-100 hover:text-forest-700"
                          aria-label={`Edit ${building.name}`}
                          title="Edit building"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(building)}
                          className="rounded-lg p-1.5 text-ink-400 transition hover:bg-danger-50 hover:text-danger-700"
                          aria-label={`Delete ${building.name}`}
                          title="Delete building"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <h2 className="mt-3 font-display text-[16px] font-semibold leading-snug text-ink-900">
                      <Link
                        to={`/buildings/${building.id}`}
                        className="transition hover:text-forest-700"
                      >
                        {building.name}
                      </Link>
                    </h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge tone="neutral">{building.type}</Badge>
                      {department ? (
                        <Badge tone="blue">{department.name}</Badge>
                      ) : (
                        <Badge tone="amber">No department</Badge>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-400">
                      <MetaItem icon={Layers}>
                        {building.floors ? `${formatNumber(building.floors)} floors` : 'Floors not set'}
                      </MetaItem>
                      <MetaItem icon={Building2}>
                        {building.areaSqm ? formatArea(building.areaSqm) : 'Area not set'}
                      </MetaItem>
                      <MetaItem icon={UsersRound}>
                        {building.occupants
                          ? `${formatNumber(building.occupants)} occupants`
                          : 'Occupants not set'}
                      </MetaItem>
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-3 rounded-xl border border-line bg-sand-50/70 p-3">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-400">
                          12-month emissions
                        </p>
                        <p className="mt-0.5 font-display text-lg font-semibold text-ink-900">
                          {formatTonnes(building.kg, { digits: 1 })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-400">
                          Intensity
                        </p>
                        <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-ink-900">
                          {building.intensityKgPerSqm === null
                            ? '—'
                            : `${formatNumber(building.intensityKgPerSqm, { digits: 1 })} kg/m²`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-ink-500">
                      <span className="flex items-center gap-1.5">
                        <Zap className="h-3 w-3 text-forest-500" aria-hidden="true" />
                        {formatNumber(building.electricityKwh / 1000, { digits: 1 })} MWh
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Droplets className="h-3 w-3 text-water" aria-hidden="true" />
                        {formatWater(building.waterM3)}
                      </span>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] text-ink-400">
                        <span>Share of campus footprint</span>
                        <span className="font-medium text-ink-700">
                          {formatPercent(building.share, { digits: 0, alreadyPercent: true })}
                        </span>
                      </div>
                      <ProgressBar value={building.share} className="mt-1.5" />
                    </div>

                    {description ? (
                      <p className="mt-3 line-clamp-2 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-400">
                        {description}
                      </p>
                    ) : null}

                    <div className="mt-auto pt-3">
                      <Link
                        to={`/buildings/${building.id}`}
                        className="inline-flex items-center gap-1 text-[12px] font-medium text-forest-700 transition hover:text-forest-800"
                      >
                        View building analytics
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      <div className="pb-1 text-center">
        <Link to="/analytics" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
          Compare building emissions in analytics
        </Link>
      </div>

      <BuildingFormModal
        open={modalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setModalOpen(false);
            setEditingBuilding(null);
          }
        }}
        onSubmit={handleSubmit}
        initialBuilding={editingBuilding}
        departments={departments}
        isSubmitting={isSubmitting}
      />

      <DeleteBuildingDialog
        open={Boolean(deleteTarget)}
        building={deleteTarget}
        buildings={buildings}
        linkedActivities={linkedActivities}
        linkedBills={linkedBills}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}

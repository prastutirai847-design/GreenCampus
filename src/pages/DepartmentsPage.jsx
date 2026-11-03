import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Droplets,
  Pencil,
  Plus,
  Trash2,
  UsersRound,
  Zap,
} from 'lucide-react';
import { useCampus } from '../context/CampusContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { DepartmentFormModal } from '../components/departments/DepartmentFormModal.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button, buttonClasses } from '../components/ui/Button.jsx';
import { Callout } from '../components/ui/Callout.jsx';
import { Card } from '../components/ui/Card.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { ProgressBar } from '../components/ui/ProgressBar.jsx';
import { getRecentMonths, monthRangeLabel } from '../utils/dates.js';
import { buildDepartmentReport } from '../utils/buildingAnalytics.js';
import {
  formatNumber,
  formatPercent,
  formatTonnes,
  formatWater,
} from '../utils/format.js';

export function DepartmentsPage() {
  const {
    departments,
    buildings,
    activities,
    factors,
    addDepartment,
    editDepartment,
    removeDepartment,
  } = useCampus();
  const { push } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const months = useMemo(() => getRecentMonths(12), []);
  const from = months[0];
  const to = months[months.length - 1];

  const report = useMemo(
    () => buildDepartmentReport({ departments, buildings, activities, factors, from, to }),
    [departments, buildings, activities, factors, from, to],
  );

  const assignedBuildings = buildings.filter((building) => building.departmentId).length;
  const directRecords = report.departments.reduce(
    (sum, department) => sum + department.directRecordCount,
    0,
  );

  const openAdd = () => {
    setEditingDepartment(null);
    setModalOpen(true);
  };

  const openEdit = (department) => {
    setEditingDepartment(department);
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      if (editingDepartment) {
        await editDepartment(editingDepartment.id, values);
        push({ title: 'Department updated', description: `${values.name} was saved.` });
      } else {
        await addDepartment(values);
        push({
          title: 'Department added',
          description: `${values.name} is ready for buildings and records.`,
        });
      }
      setModalOpen(false);
      setEditingDepartment(null);
    } catch (error) {
      push({
        tone: 'error',
        title: 'Department not saved',
        description: error instanceof Error ? error.message : 'Try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDelete = (department) => {
    const linkedBuildings = buildings.filter(
      (building) => building.departmentId === department.id,
    ).length;
    const linkedRecords = activities.filter(
      (activity) =>
        activity.departmentId === department.id ||
        (!activity.departmentId && activity.department === department.name),
    ).length;
    if (linkedBuildings > 0 || linkedRecords > 0) {
      push({
        tone: 'error',
        title: 'Department is still in use',
        description: `${department.name} has ${linkedBuildings} building${
          linkedBuildings === 1 ? '' : 's'
        } and ${linkedRecords} linked record${
          linkedRecords === 1 ? '' : 's'
        }. Reassign them before deleting.`,
      });
      return;
    }
    setDeleteTarget(department);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await removeDepartment(deleteTarget.id);
      push({ title: 'Department removed', description: `${deleteTarget.name} was deleted.` });
      setDeleteTarget(null);
    } catch (error) {
      push({
        tone: 'error',
        title: 'Department not removed',
        description: error instanceof Error ? error.message : 'Try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Campus organisation"
        title="Departments"
        description={`Group buildings and directly attributed consumption into departmental footprints. Rollups cover ${monthRangeLabel(
          from,
          to,
        )}.`}
        actions={
          <>
            <Link to="/buildings" className={buttonClasses({ variant: 'secondary' })}>
              <Building2 className="h-4 w-4" aria-hidden="true" />
              Manage buildings
            </Link>
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add department
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 divide-y divide-line sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              Departments
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-ink-900">
              {departments.length}
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              Buildings assigned
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-ink-900">
              {assignedBuildings}{' '}
              <span className="text-[11px] font-medium text-ink-400">
                of {buildings.length}
              </span>
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              Directly tagged records
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-ink-900">
              {formatNumber(directRecords)}
            </p>
          </div>
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              Campus footprint · 12 months
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-ink-900">
              {formatTonnes(report.meta.campusKg, { digits: 0 })}
            </p>
          </div>
        </div>
      </Card>

      <Callout tone="info" title="How department totals are built">
        A department footprint is the sum of its assigned buildings plus fuel records explicitly
        tagged to the department. Buildings without a department, campus-wide commuting and
        campus-wide waste appear in the unassigned bucket. Water is a resource metric and does not add
        to emissions.
      </Callout>

      {departments.length === 0 ? (
        <Card>
          <EmptyState
            icon={UsersRound}
            title="No departments yet"
            description="Create departments such as Facilities, Transport or Academic Affairs, then assign buildings to them."
            action={
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add your first department
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {report.departments.map((department) => (
            <Card key={department.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-forest-100 bg-forest-50 text-forest-600">
                  <UsersRound className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(department)}
                    className="rounded-lg p-1.5 text-ink-400 transition hover:bg-sand-100 hover:text-forest-700"
                    aria-label={`Edit ${department.name}`}
                    title="Edit department"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDelete(department)}
                    className="rounded-lg p-1.5 text-ink-400 transition hover:bg-danger-50 hover:text-danger-700"
                    aria-label={`Delete ${department.name}`}
                    title="Delete department"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <h2 className="font-display text-[15px] font-semibold leading-snug text-ink-900">
                  {department.name}
                </h2>
                {department.code ? <Badge tone="neutral">{department.code}</Badge> : null}
              </div>
              {department.head ? (
                <p className="mt-0.5 text-[11px] text-ink-400">{department.head}</p>
              ) : null}
              {department.description ? (
                <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-ink-500">
                  {department.description}
                </p>
              ) : null}

              <div className="mt-3">
                {department.buildings.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {department.buildings.map((building) => (
                      <Link
                        key={building.id}
                        to={`/buildings/${building.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-line bg-sand-50 px-2 py-1 text-[11px] text-ink-600 transition hover:border-forest-200 hover:text-forest-700"
                      >
                        <Building2 className="h-3 w-3" aria-hidden="true" />
                        {building.name}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-ink-400">
                    No buildings assigned. Assign one when editing a building.
                  </p>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-line bg-sand-50/70 p-3">
                <div>
                  <p className="text-[9px] font-medium uppercase tracking-[0.08em] text-ink-400">
                    Emissions · 12 mo
                  </p>
                  <p className="mt-0.5 font-display text-[16px] font-semibold text-ink-900">
                    {formatTonnes(department.totals.kg, { digits: 1 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-medium uppercase tracking-[0.08em] text-ink-400">
                    Share of campus
                  </p>
                  <p className="mt-0.5 font-display text-[16px] font-semibold text-ink-900">
                    {formatPercent(department.totals.shareOfCampus, { digits: 1, alreadyPercent: true })}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 text-[11px] text-ink-500">
                  <Zap className="h-3 w-3 text-forest-500" aria-hidden="true" />
                  {formatNumber(department.totals.electricityKwh / 1000, { digits: 1 })} MWh
                </span>
                <span className="flex items-center justify-end gap-1.5 text-[11px] text-ink-500">
                  <Droplets className="h-3 w-3 text-water" aria-hidden="true" />
                  {formatWater(department.totals.waterM3)}
                </span>
              </div>

              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] text-ink-400">
                  <span>
                    {department.buildings.length} building
                    {department.buildings.length === 1 ? '' : 's'} ·{' '}
                    {formatNumber(department.totals.entryCount)} records
                  </span>
                  <span className="font-medium text-ink-700">
                    {department.directRecordCount} tagged directly
                  </span>
                </div>
                <ProgressBar value={department.totals.shareOfCampus} className="mt-1.5" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {report.unassigned.entryCount > 0 || report.unassigned.buildings.length > 0 ? (
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-[16px] font-semibold leading-snug text-ink-900">
                Unassigned footprint
              </h2>
              <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-ink-500">
                {report.unassigned.buildings.length
                  ? `${report.unassigned.buildings.length} building${
                      report.unassigned.buildings.length === 1 ? '' : 's'
                    } without a department, plus campus-wide commuting, waste and other records.`
                  : 'Campus-wide commuting, waste and other records not linked to a building.'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-400">
                Estimated emissions
              </p>
              <p className="mt-0.5 font-display text-lg font-semibold text-ink-900">
                {formatTonnes(report.unassigned.kg, { digits: 1 })}
              </p>
              <p className="text-[10px] text-ink-400">
                {formatPercent(report.unassigned.shareOfCampus, { digits: 1, alreadyPercent: true })} of campus
              </p>
            </div>
          </div>
          {report.unassigned.buildings.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {report.unassigned.buildings.map((building) => (
                <Link
                  key={building.id}
                  to={`/buildings/${building.id}`}
                  className="inline-flex items-center gap-1 rounded-md border border-line bg-sand-50 px-2 py-1 text-[11px] text-ink-600 transition hover:border-forest-200 hover:text-forest-700"
                >
                  <Building2 className="h-3 w-3" aria-hidden="true" />
                  {building.name}
                </Link>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}

      <DepartmentFormModal
        open={modalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setModalOpen(false);
            setEditingDepartment(null);
          }
        }}
        onSubmit={handleSubmit}
        initialDepartment={editingDepartment}
        isSubmitting={isSubmitting}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title="Delete this department?"
        description={
          deleteTarget
            ? `${deleteTarget.name} will be removed. It has no linked buildings or records.`
            : ''
        }
        confirmLabel="Delete department"
        tone="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bus,
  Download,
  Droplets,
  Flame,
  Plus,
  Trash2,
  Upload,
  Zap,
} from 'lucide-react';
import { useCampus } from '../context/CampusContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { ActivityFormModal } from '../components/activities/ActivityFormModal.jsx';
import { ActivityTable } from '../components/activities/ActivityTable.jsx';
import { BillPreviewDialog } from '../components/consumption/BillPreviewDialog.jsx';
import { BillUploadDialog } from '../components/consumption/BillUploadDialog.jsx';
import { BillsCard } from '../components/consumption/BillsCard.jsx';
import { ConsumptionSummary } from '../components/consumption/ConsumptionSummary.jsx';
import { RecordFilters } from '../components/consumption/RecordFilters.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Callout } from '../components/ui/Callout.jsx';
import { Card } from '../components/ui/Card.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Tabs } from '../components/ui/Tabs.jsx';
import { CATEGORY_META, CATEGORY_ORDER } from '../data/options.js';
import { lastCompleteMonthKey, monthLabel } from '../utils/dates.js';
import { formatDateOnly } from '../utils/format.js';
import { describeActivity } from '../utils/activityLabels.js';
import {
  availablePeriods,
  filterBills,
  filterConsumptionRecords,
  sortBills,
  summarizeConsumption,
} from '../utils/consumption.js';
import { buildActivityCsv, downloadCsv } from '../utils/csv.js';

const CATEGORY_ICONS = {
  electricity: Zap,
  fuel: Flame,
  waste: Trash2,
  commuting: Bus,
  water: Droplets,
};

function recordLabel(record) {
  if (!record) return '';
  return record.date ? formatDateOnly(record.date) : monthLabel(record.period);
}

export function DataEntryPage() {
  const {
    activities,
    buildings,
    departments,
    buildingMap,
    bills,
    factors,
    addActivity,
    editActivity,
    removeActivity,
    addBill,
    editBill,
    removeBill,
  } = useCampus();
  const { push } = useToast();

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCategory = searchParams.get('category');
  const [activeCategory, setActiveCategory] = useState(() =>
    CATEGORY_ORDER.includes(requestedCategory) ? requestedCategory : 'electricity',
  );

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [search, setSearch] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');

  const [billDialogOpen, setBillDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [billDefaults, setBillDefaults] = useState({});
  const [billPreview, setBillPreview] = useState(null);
  const [isBillSubmitting, setIsBillSubmitting] = useState(false);
  const [billDeleteTarget, setBillDeleteTarget] = useState(null);
  const [isBillDeleting, setIsBillDeleting] = useState(false);

  const meta = CATEGORY_META[activeCategory];
  const Icon = CATEGORY_ICONS[activeCategory];
  const billsApplicable = activeCategory !== 'commuting';

  const resetFilters = () => {
    setSearch('');
    setBuildingFilter('all');
    setPeriodFilter('all');
  };

  useEffect(() => {
    if (
      requestedCategory &&
      CATEGORY_ORDER.includes(requestedCategory) &&
      requestedCategory !== activeCategory
    ) {
      setActiveCategory(requestedCategory);
      setEditing(null);
      setFormOpen(false);
      setBillDialogOpen(false);
      setBillPreview(null);
      resetFilters();
    }
    // Intentionally reacts to URL changes only; tab clicks keep state in sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedCategory]);

  const categoryRecords = useMemo(
    () => activities.filter((activity) => activity.category === activeCategory),
    [activities, activeCategory],
  );

  const categoryBills = useMemo(
    () => bills.filter((bill) => bill.category === activeCategory),
    [bills, activeCategory],
  );

  const periods = useMemo(() => {
    const merged = [
      ...availablePeriods(categoryRecords),
      ...availablePeriods(categoryBills),
    ];
    return [...new Set(merged)].sort((a, b) => b.localeCompare(a));
  }, [categoryRecords, categoryBills]);

  useEffect(() => {
    if (periodFilter !== 'all' && !periods.includes(periodFilter)) {
      setPeriodFilter('all');
    }
  }, [periods, periodFilter]);

  const filteredRecords = useMemo(
    () =>
      filterConsumptionRecords(categoryRecords, {
        search,
        buildingId: buildingFilter,
        period: periodFilter,
        buildingMap,
      }),
    [categoryRecords, search, buildingFilter, periodFilter, buildingMap],
  );

  const filteredBills = useMemo(
    () =>
      sortBills(
        filterBills(categoryBills, {
          search,
          buildingId: activeCategory === 'commuting' ? 'all' : buildingFilter,
          period: periodFilter,
        }),
      ),
    [categoryBills, search, buildingFilter, periodFilter, activeCategory],
  );

  const summary = useMemo(
    () => summarizeConsumption(activeCategory, filteredRecords, factors, filteredBills),
    [activeCategory, filteredRecords, factors, filteredBills],
  );

  const filtersActive =
    Boolean(search.trim()) ||
    (activeCategory !== 'commuting' && buildingFilter !== 'all') ||
    periodFilter !== 'all';

  const tabs = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        id: category,
        label: CATEGORY_META[category].label,
        count: activities.filter((activity) => activity.category === category).length,
      })),
    [activities],
  );

  const linkedActivity = useMemo(() => {
    const id = editingBill?.activityId ?? billDefaults.activityId;
    return id ? activities.find((activity) => activity.id === id) : null;
  }, [editingBill, billDefaults.activityId, activities]);

  const linkedRecordLabel = linkedActivity
    ? `${describeActivity(linkedActivity, buildingMap).title} · ${monthLabel(linkedActivity.period)}`
    : '';

  const handleTabChange = (category) => {
    setActiveCategory(category);
    setEditing(null);
    setFormOpen(false);
    setBillDialogOpen(false);
    setBillPreview(null);
    resetFilters();
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('category', category);
    setSearchParams(nextParams, { replace: true });
  };

  const openAddRecord = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEditRecord = (activity) => {
    setEditing(activity);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (isSubmitting) return;
    setFormOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      if (editing) {
        await editActivity(editing.id, values, activeCategory);
        push({
          title: 'Record updated',
          description: `${meta.label} data for ${recordLabel(values)} was saved.`,
        });
      } else {
        await addActivity(activeCategory, values);
        push({
          title: 'Record added',
          description: `${meta.label} data for ${recordLabel(values)} was added.`,
        });
      }
      setFormOpen(false);
      setEditing(null);
      return true;
    } catch (error) {
      push({
        tone: 'error',
        title: 'Record not saved',
        description: error instanceof Error ? error.message : 'Try again.',
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await removeActivity(deleteTarget.id);
      push({
        title: 'Record deleted',
        description: `${recordLabel(deleteTarget)} ${meta.label.toLowerCase()} data was removed.`,
      });
      if (editing?.id === deleteTarget.id) {
        setEditing(null);
        setFormOpen(false);
      }
      setDeleteTarget(null);
    } catch (error) {
      push({
        tone: 'error',
        title: 'Record not deleted',
        description: error instanceof Error ? error.message : 'Try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = () => {
    if (!filteredRecords.length) return;
    const csv = buildActivityCsv(filteredRecords, { buildingMap, factors });
    const suffix = periodFilter === 'all' ? lastCompleteMonthKey() : periodFilter;
    downloadCsv(`greencampus-${activeCategory}-${suffix}.csv`, csv);
    push({
      title: 'CSV exported',
      description: `${filteredRecords.length} ${meta.label.toLowerCase()} records downloaded.`,
    });
  };

  const openBillUpload = (defaults = {}) => {
    setEditingBill(null);
    setBillDefaults({
      category: activeCategory,
      period: periodFilter !== 'all' ? periodFilter : lastCompleteMonthKey(),
      buildingId:
        buildingFilter !== 'all' && buildingFilter !== '__none' ? buildingFilter : '',
      ...defaults,
    });
    setBillDialogOpen(true);
  };

  const attachBill = (activity) => {
    openBillUpload({
      category: activity.category,
      period: activity.period,
      buildingId: activity.buildingId ?? '',
      activityId: activity.id,
    });
  };

  const openEditBill = (bill) => {
    setBillPreview(null);
    setEditingBill(bill);
    setBillDefaults({
      category: bill.category,
      period: bill.period,
      buildingId: bill.buildingId ?? '',
    });
    setBillDialogOpen(true);
  };

  const closeBillDialog = () => {
    if (isBillSubmitting) return;
    setBillDialogOpen(false);
    setEditingBill(null);
  };

  const handleBillSubmit = async ({ file, values }) => {
    setIsBillSubmitting(true);
    try {
      if (editingBill) {
        await editBill(editingBill.id, { file, values });
        push({
          title: 'Bill updated',
          description: `${values.title || editingBill.fileName} was saved.`,
        });
      } else {
        await addBill({ file, values });
        push({
          title: 'Bill uploaded',
          description: `${values.title || file?.name || 'Attachment'} was added to ${
            CATEGORY_META[values.category]?.label ?? 'the workspace'
          }.`,
        });
      }
      setBillDialogOpen(false);
      setEditingBill(null);
      if (values.category && values.category !== activeCategory && values.category !== 'commuting') {
        handleTabChange(values.category);
      }
      return true;
    } catch (error) {
      push({
        tone: 'error',
        title: 'Bill not saved',
        description: error instanceof Error ? error.message : 'Try again.',
      });
      return false;
    } finally {
      setIsBillSubmitting(false);
    }
  };

  const confirmBillDelete = async () => {
    if (!billDeleteTarget) return;
    setIsBillDeleting(true);
    try {
      await removeBill(billDeleteTarget.id);
      if (billPreview?.id === billDeleteTarget.id) setBillPreview(null);
      push({
        title: 'Bill deleted',
        description: `${billDeleteTarget.title || billDeleteTarget.fileName} was removed.`,
      });
      setBillDeleteTarget(null);
    } catch (error) {
      push({
        tone: 'error',
        title: 'Bill not deleted',
        description: error instanceof Error ? error.message : 'Try again.',
      });
    } finally {
      setIsBillDeleting(false);
    }
  };

  const previewBuildingName = billPreview?.buildingId
    ? buildingMap[billPreview.buildingId]?.name
    : '';
  const previewActivity = billPreview?.activityId
    ? activities.find((activity) => activity.id === billPreview.activityId)
    : null;
  const previewLinkedLabel = previewActivity
    ? `${describeActivity(previewActivity, buildingMap).title} · ${monthLabel(
        previewActivity.period,
      )}`
    : '';

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Resource consumption"
        title="Consumption & bills"
        description="Record electricity, water, fuel, waste and commuting data, attach invoices and keep every entry editable. Emissions are estimated from the factors in Settings."
        actions={
          <>
            <span className="hidden items-center rounded-xl border border-line bg-white px-3 py-2 text-[11px] text-ink-500 shadow-sm sm:inline-flex">
              {activities.length} records{billsApplicable ? ` · ${bills.length} bills` : ''}
            </span>
            {billsApplicable ? (
              <Button variant="secondary" onClick={() => openBillUpload()}>
                <Upload className="h-4 w-4" aria-hidden="true" />
                Upload bill
              </Button>
            ) : null}
            <Button onClick={openAddRecord}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add record
            </Button>
          </>
        }
      />

      <Callout tone="info" title="Measured inputs, transparent estimates">
        Enter readings from meters, utility bills, fuel logs or a travel survey. Attachments stay in
        this browser and are never parsed — type and verify every figure manually.
      </Callout>

      <Tabs items={tabs} value={activeCategory} onChange={handleTabChange} />

      <ConsumptionSummary items={summary.items} />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-4">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forest-50 text-forest-600">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-[16px] font-semibold leading-snug text-ink-900">
                {meta.label} records
              </h2>
              <p className="mt-1 text-[13px] text-ink-500">
                {filteredRecords.length === categoryRecords.length
                  ? `${categoryRecords.length} ${
                      categoryRecords.length === 1 ? 'record' : 'records'
                    } · newest first`
                  : `${filteredRecords.length} of ${categoryRecords.length} records shown`}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            disabled={!filteredRecords.length}
            title={
              filteredRecords.length ? 'Download the records in view as CSV' : 'Add a record to export'
            }
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export CSV
          </Button>
        </div>

        <RecordFilters
          search={search}
          onSearchChange={setSearch}
          buildingId={buildingFilter}
          onBuildingChange={setBuildingFilter}
          period={periodFilter}
          onPeriodChange={setPeriodFilter}
          buildings={buildings}
          periods={periods}
          showUnassigned={activeCategory === 'fuel' || activeCategory === 'waste'}
          showBuilding={activeCategory !== 'commuting'}
          filtersActive={filtersActive}
          onClear={resetFilters}
          resultCount={filteredRecords.length}
          totalCount={categoryRecords.length}
          searchPlaceholder={
            activeCategory === 'electricity' || activeCategory === 'water'
              ? 'Search notes, provider, building…'
              : 'Search notes, department, building…'
          }
        />

        <div className="border-t border-line">
          <ActivityTable
            activities={filteredRecords}
            buildings={buildings}
            factors={factors}
            bills={categoryBills}
            showBills={billsApplicable}
            onEdit={openEditRecord}
            onDelete={setDeleteTarget}
            onAttachBill={attachBill}
            onViewBill={setBillPreview}
            emptyTitle={
              filtersActive
                ? 'No matching records'
                : `No ${meta.label.toLowerCase()} records yet`
            }
            emptyDescription={
              filtersActive
                ? 'Nothing in this category matches the current search or filters. Clear them to see every entry.'
                : 'Use Add record to enter the first billing period, fuel log, waste entry or survey group.'
            }
          />
        </div>
      </Card>

      {billsApplicable ? (
        <BillsCard
          bills={filteredBills}
          categoryLabel={meta.label}
          buildings={buildings}
          activities={activities}
          filtersActive={filtersActive}
          onUpload={() => openBillUpload()}
          onView={setBillPreview}
          onEdit={openEditBill}
          onDelete={setBillDeleteTarget}
        />
      ) : null}

      <ActivityFormModal
        open={formOpen}
        category={activeCategory}
        buildings={buildings}
        departments={departments}
        factors={factors}
        initialActivity={editing}
        onClose={closeForm}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      <BillUploadDialog
        open={billDialogOpen}
        onClose={closeBillDialog}
        onSubmit={handleBillSubmit}
        initialBill={editingBill}
        defaults={billDefaults}
        buildings={buildings}
        linkedRecordLabel={linkedRecordLabel}
        isSubmitting={isBillSubmitting}
      />

      <BillPreviewDialog
        open={Boolean(billPreview)}
        onClose={() => setBillPreview(null)}
        bill={billPreview}
        buildingName={previewBuildingName}
        linkedLabel={previewLinkedLabel}
        onEdit={() => openEditBill(billPreview)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        title="Delete this record?"
        description={
          deleteTarget
            ? `The ${recordLabel(deleteTarget)} ${meta.label.toLowerCase()} record will be removed from this browser. Attached bills stay in the bills list but are unlinked.`
            : ''
        }
        confirmLabel="Delete record"
        tone="danger"
        isLoading={isDeleting}
      />

      <ConfirmDialog
        open={Boolean(billDeleteTarget)}
        onClose={() => {
          if (!isBillDeleting) setBillDeleteTarget(null);
        }}
        onConfirm={confirmBillDelete}
        title="Delete this bill attachment?"
        description={
          billDeleteTarget
            ? `${billDeleteTarget.title || billDeleteTarget.fileName} will be removed from this browser. The linked usage record is not deleted.`
            : ''
        }
        confirmLabel="Delete bill"
        tone="danger"
        isLoading={isBillDeleting}
      />
    </div>
  );
}

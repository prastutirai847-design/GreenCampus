import { useMemo } from 'react';
import { ClipboardList, Paperclip, Pencil, Trash2, Upload } from 'lucide-react';
import { DataTable } from '../ui/DataTable.jsx';
import { Badge, ScopeBadge } from '../ui/Badge.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { dataQualityMeta } from '../../data/ghgProtocol.js';
import { calculateActivityEmissions } from '../../utils/emissions.js';
import { describeActivity } from '../../utils/activityLabels.js';
import { monthLabel } from '../../utils/dates.js';
import {
  formatCurrency,
  formatDateOnly,
  formatEmissions,
  formatNumber,
  truncate,
} from '../../utils/format.js';

export function ActivityTable({
  activities,
  buildings,
  factors,
  bills = [],
  onEdit,
  onDelete,
  onAttachBill,
  onViewBill,
  showBills = true,
  pageSize = 10,
  emptyTitle = 'No records in this category',
  emptyDescription = 'Add your first record to see it here.',
}) {
  const buildingMap = useMemo(
    () => Object.fromEntries(buildings.map((building) => [building.id, building])),
    [buildings],
  );

  const billsByActivity = useMemo(() => {
    const map = new Map();
    bills.forEach((bill) => {
      if (!bill.activityId) return;
      const list = map.get(bill.activityId) ?? [];
      list.push(bill);
      map.set(bill.activityId, list);
    });
    return map;
  }, [bills]);

  const columns = useMemo(
    () => [
      {
        key: 'period',
        header: 'Period',
        render: (activity) => {
          const dated = (activity.category === 'fuel' || activity.category === 'waste') && activity.date;
          return (
            <div className="whitespace-nowrap">
              <p className="text-[13px] font-medium text-ink-900">
                {dated ? formatDateOnly(activity.date) : monthLabel(activity.period)}
              </p>
              <p className="mt-0.5 max-w-[170px] truncate text-[11px] text-ink-400">
                {activity.notes
                  ? truncate(activity.notes, 34)
                  : dated
                    ? monthLabel(activity.period, 'compact')
                    : activity.category === 'commuting'
                      ? 'Survey month'
                      : activity.category === 'fuel' || activity.category === 'waste'
                        ? 'Month recorded'
                        : 'Metered month'}
              </p>
            </div>
          );
        },
      },
      {
        key: 'detail',
        header: 'Record',
        render: (activity) => {
          const info = describeActivity(activity, buildingMap);
          const quality = dataQualityMeta(activity.dataQuality);
          return (
            <div className="min-w-[170px]">
              <p className="text-[13px] font-medium text-ink-900">{info.title}</p>
              <p className="mt-0.5 text-[11px] text-ink-400">{info.subtitle}</p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge tone={quality.tone}>{quality.shortLabel}</Badge>
                {activity.sourceReference ? (
                  <span
                    className="max-w-[150px] truncate text-[10px] text-ink-400"
                    title={activity.sourceReference}
                  >
                    {activity.sourceReference}
                  </span>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        key: 'quantity',
        header: 'Recorded',
        render: (activity) => {
          const info = describeActivity(activity, buildingMap);
          return (
            <span className="whitespace-nowrap text-[13px] tabular-nums text-ink-700">
              {formatNumber(info.quantity, {
                digits: Number.isInteger(info.quantity) ? 0 : 2,
              })}{' '}
              <span className="text-ink-400">{info.unit}</span>
            </span>
          );
        },
      },
      {
        key: 'bill',
        header: 'Bill & attachments',
        render: (activity) => {
          const attached = billsByActivity.get(activity.id) ?? [];
          const showAmount =
            activity.category === 'electricity' || activity.category === 'water';
          const manualAmount = Number(activity.billAmount) || 0;
          const recordedAmount =
            manualAmount ||
            attached.reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0);
          const provider = activity.provider || attached[0]?.provider || '';
          return (
            <div className="min-w-[130px]">
              {showAmount ? (
                <>
                  <p className="whitespace-nowrap text-[13px] font-medium tabular-nums text-ink-900">
                    {formatCurrency(recordedAmount || null)}
                  </p>
                  <p className="mt-0.5 max-w-[150px] truncate text-[11px] text-ink-400">
                    {provider || 'No provider recorded'}
                  </p>
                </>
              ) : null}
              <div className="mt-1.5 flex items-center gap-1">
                {attached.length ? (
                  <button
                    type="button"
                    onClick={() => onViewBill(attached[0])}
                    className="inline-flex items-center gap-1 rounded-md border border-info-100 bg-info-50 px-1.5 py-0.5 text-[10px] font-[550] text-info-700 transition hover:bg-info-100"
                    title={`View ${attached[0].fileName}`}
                  >
                    <Paperclip className="h-3 w-3" aria-hidden="true" />
                    {attached.length} bill{attached.length === 1 ? '' : 's'}
                  </button>
                ) : (
                  <span className="text-[10px] text-ink-400">No file</span>
                )}
                <button
                  type="button"
                  onClick={() => onAttachBill(activity)}
                  className="rounded-md p-1 text-ink-400 transition hover:bg-sand-100 hover:text-forest-700"
                  aria-label="Attach a bill to this record"
                  title={attached.length ? 'Attach another bill' : 'Attach a bill'}
                >
                  <Upload className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        },
      },
      {
        key: 'emissions',
        header: 'Est. emissions',
        align: 'right',
        render: (activity) => {
          const calc = calculateActivityEmissions(activity, factors);
          if (!calc.scope) {
            return (
              <div className="flex flex-col items-end gap-1">
                <span className="text-[13px] text-ink-400">Not calculated</span>
                <Badge tone="blue">Resource metric</Badge>
              </div>
            );
          }
          return (
            <div className="flex flex-col items-end gap-1">
              <span className="whitespace-nowrap text-[13px] font-medium tabular-nums text-ink-900">
                {formatEmissions(calc.kg)}
              </span>
              <ScopeBadge scope={calc.scope} />
            </div>
          );
        },
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (activity) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => onEdit(activity)}
              className="rounded-lg p-1.5 text-ink-400 transition hover:bg-sand-100 hover:text-forest-700"
              aria-label={`Edit record for ${activity.date ?? monthLabel(activity.period)}`}
              title="Edit record"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(activity)}
              className="rounded-lg p-1.5 text-ink-400 transition hover:bg-danger-50 hover:text-danger-700"
              aria-label={`Delete record for ${activity.date ?? monthLabel(activity.period)}`}
              title="Delete record"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ),
      },
    ],
    [billsByActivity, buildingMap, factors, onAttachBill, onDelete, onEdit, onViewBill],
  );

  return (
    <DataTable
      columns={showBills ? columns : columns.filter((column) => column.key !== 'bill')}
      rows={activities}
      getRowId={(row) => row.id}
      pageSize={pageSize}
      tableClassName={showBills ? 'min-w-[900px]' : 'min-w-[760px]'}
      emptyState={
        <EmptyState icon={ClipboardList} title={emptyTitle} description={emptyDescription} />
      }
    />
  );
}

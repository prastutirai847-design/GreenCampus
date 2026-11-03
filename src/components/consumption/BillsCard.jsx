import { useMemo } from 'react';
import { Eye, FileImage, FileText, Pencil, Trash2, Upload } from 'lucide-react';
import { Card } from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';
import { DataTable } from '../ui/DataTable.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { describeActivity } from '../../utils/activityLabels.js';
import { monthLabel } from '../../utils/dates.js';
import { formatBytes, formatCurrency, formatDateOnly } from '../../utils/format.js';
import { billHasPreview } from '../../services/billService.js';

export function BillsCard({
  bills,
  categoryLabel,
  buildings,
  activities,
  filtersActive,
  onUpload,
  onView,
  onEdit,
  onDelete,
}) {
  const buildingMap = useMemo(
    () => Object.fromEntries(buildings.map((building) => [building.id, building])),
    [buildings],
  );
  const activityMap = useMemo(
    () => Object.fromEntries(activities.map((activity) => [activity.id, activity])),
    [activities],
  );

  const totalAmount = bills.reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0);

  const columns = useMemo(
    () => [
      {
        key: 'file',
        header: 'File',
        render: (bill) => (
          <div className="flex min-w-[210px] items-center gap-3">
            {billHasPreview(bill) ? (
              <img
                src={bill.dataUrl}
                alt=""
                className="h-10 w-10 shrink-0 rounded-lg border border-line object-cover"
              />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-sand-50 text-ink-400">
                {String(bill.mimeType ?? '').startsWith('image/') ? (
                  <FileImage className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <FileText className="h-4 w-4" aria-hidden="true" />
                )}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-ink-900" title={bill.title}>
                {bill.title || bill.fileName}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-400">
                {formatBytes(bill.sizeBytes)}
                {bill.sample ? (
                  <Badge tone="amber" className="ml-2 align-middle">
                    Sample
                  </Badge>
                ) : null}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: 'period',
        header: 'Billing period',
        render: (bill) => (
          <div className="whitespace-nowrap">
            <p className="text-[13px] text-ink-900">{monthLabel(bill.period)}</p>
            <p className="mt-0.5 text-[11px] text-ink-400">
              Uploaded {formatDateOnly(bill.uploadedAt)}
            </p>
          </div>
        ),
      },
      {
        key: 'link',
        header: 'Linked to',
        render: (bill) => {
          const activity = bill.activityId ? activityMap[bill.activityId] : null;
          const building = bill.buildingId ? buildingMap[bill.buildingId] : null;
          if (activity) {
            const info = describeActivity(activity, buildingMap);
            return (
              <div className="min-w-[150px]">
                <p className="text-[12px] font-medium text-ink-900">
                  {monthLabel(activity.period)} record
                </p>
                <p className="mt-0.5 text-[11px] text-ink-400">
                  {info.title} · {info.buildingName}
                </p>
              </div>
            );
          }
          return (
            <div className="min-w-[130px]">
              <p className="text-[12px] text-ink-900">{building?.name ?? 'Campus-wide'}</p>
              <p className="mt-0.5 text-[11px] text-ink-400">Not linked to a record</p>
            </div>
          );
        },
      },
      {
        key: 'amount',
        header: 'Amount',
        align: 'right',
        render: (bill) => (
          <div className="whitespace-nowrap">
            <p className="text-[13px] font-medium tabular-nums text-ink-900">
              {formatCurrency(bill.amount)}
            </p>
            <p className="mt-0.5 max-w-[140px] truncate text-[11px] text-ink-400">
              {bill.provider || 'No provider'}
            </p>
          </div>
        ),
      },
      {
        key: 'actions',
        header: '',
        align: 'right',
        render: (bill) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => onView(bill)}
              className="rounded-lg p-1.5 text-ink-400 transition hover:bg-sand-100 hover:text-forest-700"
              aria-label={`View ${bill.title || bill.fileName}`}
              title="View bill"
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onEdit(bill)}
              className="rounded-lg p-1.5 text-ink-400 transition hover:bg-sand-100 hover:text-forest-700"
              aria-label={`Edit ${bill.title || bill.fileName}`}
              title="Edit metadata"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(bill)}
              className="rounded-lg p-1.5 text-ink-400 transition hover:bg-danger-50 hover:text-danger-700"
              aria-label={`Delete ${bill.title || bill.fileName}`}
              title="Delete bill"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ),
      },
    ],
    [activityMap, buildingMap, onDelete, onEdit, onView],
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-4">
        <div>
          <h2 className="font-display text-[16px] font-semibold leading-snug text-ink-900">Bills & invoices</h2>
          <p className="mt-1 text-[13px] text-ink-500">
            {bills.length} {bills.length === 1 ? 'attachment' : 'attachments'} for {categoryLabel}
            {totalAmount > 0 ? ` · ${formatCurrency(totalAmount)} recorded` : ''}. PDFs are stored as
            metadata only.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onUpload}>
          <Upload className="h-3.5 w-3.5" aria-hidden="true" />
          Upload bill
        </Button>
      </div>
      <div className="border-t border-line">
        <DataTable
          columns={columns}
          rows={bills}
          getRowId={(bill) => bill.id}
          pageSize={5}
          tableClassName="min-w-[860px]"
          emptyState={
            <EmptyState
              icon={FileText}
              title={filtersActive ? 'No bills match these filters' : 'No bills attached yet'}
              description={
                filtersActive
                  ? 'Clear the search, building or period filter to see every attachment in this category.'
                  : 'Upload a PDF or image invoice. The prototype keeps file details and image previews in this browser — nothing is extracted.'
              }
              action={
                filtersActive ? null : (
                  <Button onClick={onUpload}>
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    Upload the first bill
                  </Button>
                )
              }
            />
          }
        />
      </div>
      <div className="border-t border-line bg-sand-50/60 px-5 py-3">
        <p className="text-[11px] leading-relaxed text-ink-400">
          Attachments stay in this browser's local storage. PDF content is never parsed — enter the
          bill amount and usage figures manually and verify them against the document.
        </p>
      </div>
    </Card>
  );
}

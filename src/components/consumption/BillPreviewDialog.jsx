import { Download, FileText, Pencil } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button, buttonClasses } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';
import { CATEGORY_META } from '../../data/options.js';
import { billHasPreview } from '../../services/billService.js';
import { formatBytes, formatCurrency, formatDateOnly } from '../../utils/format.js';
import { monthLabel } from '../../utils/dates.js';

function Detail({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-400">{label}</dt>
      <dd className="mt-0.5 truncate text-[13px] text-ink-900">{children || '—'}</dd>
    </div>
  );
}

export function BillPreviewDialog({ open, onClose, bill, buildingName, linkedLabel, onEdit }) {
  if (!bill) return null;
  const previewable = billHasPreview(bill);
  const categoryLabel = CATEGORY_META[bill.category]?.label ?? bill.category;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={bill.title || bill.fileName}
      description={`${categoryLabel} · ${monthLabel(bill.period)}`}
      footer={
        <>
          {onEdit ? (
            <Button variant="secondary" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              Edit metadata
            </Button>
          ) : null}
          {previewable ? (
            <a
              href={bill.dataUrl}
              download={bill.fileName}
              className={buttonClasses({ variant: 'secondary' })}
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Download preview
            </a>
          ) : (
            <Button variant="secondary" disabled title="No file contents are stored for this bill">
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              No file stored
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={bill.sample ? 'amber' : 'green'}>
            {bill.sample ? 'Sample metadata' : 'Uploaded attachment'}
          </Badge>
          <span className="text-[11px] text-ink-400">
            {bill.fileName} · {formatBytes(bill.sizeBytes)}
          </span>
        </div>

        {previewable ? (
          <img
            src={bill.dataUrl}
            alt={`Preview of ${bill.fileName}`}
            className="max-h-[48vh] w-full rounded-xl border border-line bg-sand-50 object-contain"
          />
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-line bg-sand-50/70 p-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-ink-400">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-ink-900">{bill.fileName}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-400">
                {bill.sample
                  ? 'Sample record — no file is stored in this prototype.'
                  : 'Only metadata is stored for this file. PDF contents are not read or displayed.'}
              </p>
            </div>
          </div>
        )}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-line p-4 sm:grid-cols-3">
          <Detail label="Utility">{categoryLabel}</Detail>
          <Detail label="Billing period">{monthLabel(bill.period)}</Detail>
          <Detail label="Amount">{formatCurrency(bill.amount)}</Detail>
          <Detail label="Provider">{bill.provider}</Detail>
          <Detail label="Bill number">{bill.billNumber}</Detail>
          <Detail label="Building">{buildingName || 'Campus-wide'}</Detail>
          <Detail label="Uploaded">{formatDateOnly(bill.uploadedAt)}</Detail>
          <Detail label="Linked record">{linkedLabel || 'Not linked'}</Detail>
          <Detail label="Preview">{billHasPreview(bill) ? 'Image stored' : 'Metadata only'}</Detail>
        </dl>

        {bill.notes ? (
          <p className="rounded-xl bg-sand-50 px-3.5 py-3 text-[12px] leading-relaxed text-ink-500">
            {bill.notes}
          </p>
        ) : null}

        <p className="text-[11px] leading-relaxed text-ink-400">
          Attachments live in this browser only. Figures are entered manually; no document data is
          extracted. Download the original file from your records before clearing the workspace.
        </p>
      </div>
    </Modal>
  );
}

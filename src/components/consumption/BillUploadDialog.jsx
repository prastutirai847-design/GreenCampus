import { useEffect, useMemo, useState } from 'react';
import { FileImage, FileText, Upload } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Field } from '../ui/Field.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Callout } from '../ui/Callout.jsx';
import { inputClasses, textareaClasses } from '../ui/styles.js';
import { CATEGORY_META, CATEGORY_ORDER } from '../../data/options.js';import {
  BILL_MAX_BYTES,
  BILL_PREVIEW_MAX_BYTES,
  billAcceptAttribute,
  fileKind,
  validateBillFile,
} from '../../services/billService.js';
import { lastCompleteMonthKey } from '../../utils/dates.js';
import { formatBytes, formatDateOnly } from '../../utils/format.js';
import { hasErrors, validateBillInput } from '../../utils/validation.js';

// Commuting is a survey, not an invoiced utility, so it has no bill category.
const BILLABLE_CATEGORIES = CATEGORY_ORDER.filter((category) => category !== 'commuting');

function buildValues(defaults = {}, initialBill = null) {
  if (initialBill) {
    return {
      category: initialBill.category,
      period: initialBill.period,
      buildingId: initialBill.buildingId ?? '',
      activityId: initialBill.activityId ?? null,
      title: initialBill.title ?? '',
      provider: initialBill.provider ?? '',
      billNumber: initialBill.billNumber ?? '',
      amount: initialBill.amount ?? '',
      notes: initialBill.notes ?? '',
    };
  }
  return {
    category: defaults.category ?? 'electricity',
    period: defaults.period ?? lastCompleteMonthKey(),
    buildingId: defaults.buildingId ?? '',
    activityId: defaults.activityId ?? null,
    title: '',
    provider: '',
    billNumber: '',
    amount: '',
    notes: '',
  };
}

export function BillUploadDialog({
  open,
  onClose,
  onSubmit,
  initialBill = null,
  defaults = {},
  buildings = [],
  linkedRecordLabel = '',
  isSubmitting = false,
}) {
  const editing = Boolean(initialBill);
  const [values, setValues] = useState(() => buildValues(defaults, initialBill));
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!open) return;
    setValues(buildValues(defaults, initialBill));
    setFile(null);
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialBill]);

  useEffect(() => {
    if (!file || fileKind(file) !== 'image') {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const visibleFile = useMemo(() => {
    if (file) {
      return {
        name: file.name,
        size: file.size,
        type: file.type || 'Unknown type',
        kind: fileKind(file),
        previewAvailable: fileKind(file) === 'image' && file.size <= BILL_PREVIEW_MAX_BYTES,
      };
    }
    if (initialBill) {
      return {
        name: initialBill.fileName,
        size: initialBill.sizeBytes,
        type: initialBill.mimeType,
        kind: String(initialBill.mimeType ?? '').startsWith('image/') ? 'image' : 'pdf',
        previewAvailable: Boolean(initialBill.hasPreview),
      };
    }
    return null;
  }, [file, initialBill]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => {
      if (!previous[name]) return previous;
      const next = { ...previous };
      delete next[name];
      return next;
    });
  };

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setErrors((previous) => {
      const next = { ...previous };
      delete next.file;
      if (selected) {
        const message = validateBillFile(selected);
        if (message) next.file = message;
      }
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateBillInput(values);
    if (!editing || file) {
      const fileError = validateBillFile(file);
      if (fileError) nextErrors.file = fileError;
    }
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    await onSubmit({ file, values });
  };

  const FileIcon = visibleFile?.kind === 'image' ? FileImage : FileText;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? 'Edit bill attachment' : 'Upload a bill'}
      description="Attach a PDF or image, then record the figures by hand. Nothing is extracted automatically."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="bill-form" isLoading={isSubmitting}>
            {editing ? 'Save bill' : 'Upload bill'}
          </Button>
        </>
      }
    >
      <form id="bill-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <p className="mb-1.5 block text-[13px] font-medium text-ink-700">
            Bill file
            {!editing ? <span className="ml-0.5 text-danger">*</span> : null}
          </p>
          <label
            htmlFor="bill-file"
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-dashed border-line bg-sand-50/70 p-4 transition hover:border-forest-200 hover:bg-forest-50/40"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-forest-600">
              {visibleFile ? (
                <FileIcon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Upload className="h-4 w-4" aria-hidden="true" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              {visibleFile ? (
                <>
                  <span className="block truncate text-[13px] font-medium text-ink-900">
                    {visibleFile.name}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-ink-400">
                    {formatBytes(visibleFile.size)} · {visibleFile.type || 'unknown type'}
                    {visibleFile.previewAvailable
                      ? ' · preview stored locally'
                      : visibleFile.kind === 'image'
                        ? ' · preview too large to store'
                        : ' · metadata only'}
                  </span>
                  <span className="mt-1 block text-[11px] font-medium text-forest-700">
                    Choose a different file
                  </span>
                </>
              ) : (
                <>
                  <span className="block text-[13px] font-medium text-ink-900">
                    Choose a PDF or image
                  </span>
                  <span className="mt-0.5 block text-[11px] text-ink-400">
                    PDF, PNG, JPEG or WebP · up to 5 MB
                  </span>
                </>
              )}
            </span>
          </label>
          <input
            id="bill-file"
            type="file"
            accept={billAcceptAttribute()}
            max={BILL_MAX_BYTES}
            onChange={handleFileChange}
            className="sr-only"
          />
          {errors.file ? (
            <p className="mt-1.5 text-xs text-danger-700" role="alert">
              {errors.file}
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] text-ink-400">
              Images under {formatBytes(BILL_PREVIEW_MAX_BYTES)} keep a local preview. PDFs keep
              metadata only — their contents are never read.
            </p>
          )}
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Selected bill preview"
              className="mt-3 max-h-44 w-full rounded-xl border border-line object-contain"
            />
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Title"
            htmlFor="bill-title"
            error={errors.title}
            hint="Optional; defaults to the file name."
          >
            <input
              id="bill-title"
              name="title"
              type="text"
              value={values.title}
              onChange={handleChange}
              placeholder="e.g. Science block electricity bill"
              className={inputClasses(Boolean(errors.title))}
            />
          </Field>
          <Field
            label="Utility"
            htmlFor="bill-category"
            error={errors.category}
            required
            hint={
              values.activityId || editing?.activityId
                ? 'Fixed for bills linked to a consumption record.'
                : undefined
            }
          >
            <select
              id="bill-category"
              name="category"
              value={values.category}
              onChange={handleChange}
              disabled={Boolean(values.activityId || editing?.activityId)}
              className={inputClasses(Boolean(errors.category))}
            >
              {BILLABLE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_META[category].label}
                </option>
              ))}
              {!BILLABLE_CATEGORIES.includes(values.category) ? (
                <option value={values.category}>
                  {CATEGORY_META[values.category]?.label ?? values.category}
                </option>
              ) : null}
            </select>
          </Field>
          <Field label="Billing period" htmlFor="bill-period" error={errors.period} required>
            <input
              id="bill-period"
              name="period"
              type="month"
              value={values.period}
              onChange={handleChange}
              className={inputClasses(Boolean(errors.period))}
              aria-invalid={Boolean(errors.period)}
            />
          </Field>
          <Field label="Building" htmlFor="bill-building" error={errors.buildingId}>
            <select
              id="bill-building"
              name="buildingId"
              value={values.buildingId}
              onChange={handleChange}
              className={inputClasses(Boolean(errors.buildingId))}
            >
              <option value="">Campus-wide / no building</option>
              {buildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Provider" htmlFor="bill-provider" error={errors.provider}>
            <input
              id="bill-provider"
              name="provider"
              type="text"
              value={values.provider}
              onChange={handleChange}
              placeholder="e.g. State electricity board"
              className={inputClasses(Boolean(errors.provider))}
            />
          </Field>
          <Field label="Bill number" htmlFor="bill-number" error={errors.billNumber}>
            <input
              id="bill-number"
              name="billNumber"
              type="text"
              value={values.billNumber}
              onChange={handleChange}
              placeholder="e.g. EB-202609-0412"
              className={inputClasses(Boolean(errors.billNumber))}
            />
          </Field>
        </div>

        <Field
          label="Bill amount"
          htmlFor="bill-amount"
          error={errors.amount}
          hint="Optional. Enter the figure exactly as printed."
        >
          <div className="relative">
            <input
              id="bill-amount"
              name="amount"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={values.amount}
              onChange={handleChange}
              placeholder="e.g. 315000"
              className={inputClasses(Boolean(errors.amount), 'pl-8')}
              aria-invalid={Boolean(errors.amount)}
            />
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-xs text-ink-400">
              ₹
            </span>
          </div>
        </Field>

        {values.activityId ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-sand-50/70 px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-ink-700">Linked to a consumption record</p>
              <p className="mt-0.5 truncate text-[11px] text-ink-400">
                {linkedRecordLabel || values.activityId}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="green">Linked</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setValues((previous) => ({ ...previous, activityId: null }))}
                disabled={isSubmitting}
              >
                Unlink
              </Button>
            </div>
          </div>
        ) : null}

        <Field
          label="Notes"
          htmlFor="bill-notes"
          error={errors.notes}
          hint="Optional, up to 200 characters."
        >
          <textarea
            id="bill-notes"
            name="notes"
            rows={2}
            value={values.notes}
            onChange={handleChange}
            placeholder="What this bill covers, or why it differs from the meter record"
            className={textareaClasses(Boolean(errors.notes))}
          />
        </Field>

        <Callout tone="warning" title="No automatic extraction">
          This prototype stores the attachment and the figures you type. It does not read PDFs or
          images, so verify each amount against the bill before saving.
        </Callout>

        {initialBill?.sample ? (
          <p className="text-[11px] leading-relaxed text-ink-400">
            This is sample bill metadata seeded with the demo workspace. Replace it with a real
            attachment or delete it.
          </p>
        ) : null}
        {initialBill?.uploadedAt ? (
          <p className="text-[11px] text-ink-400">
            Uploaded {formatDateOnly(initialBill.uploadedAt)}
            {initialBill.updatedAt && initialBill.updatedAt !== initialBill.uploadedAt
              ? ` · last edited ${formatDateOnly(initialBill.updatedAt)}`
              : ''}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}

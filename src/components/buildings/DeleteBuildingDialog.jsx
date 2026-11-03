import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRightLeft, Building2 } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Field } from '../ui/Field.jsx';
import { Callout } from '../ui/Callout.jsx';
import { inputClasses } from '../ui/styles.js';
import { classNames, formatNumber } from '../../utils/format.js';

export function DeleteBuildingDialog({
  open,
  building,
  buildings = [],
  linkedActivities = 0,
  linkedBills = 0,
  onClose,
  onConfirm,
  isDeleting,
}) {
  const alternatives = buildings.filter((item) => item.id !== building?.id);
  const needsDecision = linkedActivities + linkedBills > 0;
  const [strategy, setStrategy] = useState('reassign');
  const [reassignTo, setReassignTo] = useState('');

  useEffect(() => {
    if (!open) return;
    setStrategy(alternatives.length ? 'reassign' : 'unassign');
    setReassignTo(alternatives[0]?.id ?? '');
  }, [open, building?.id, alternatives.length]);

  const canSubmit = !needsDecision || strategy === 'unassign' || Boolean(reassignTo);

  const options = [
    {
      id: 'reassign',
      icon: ArrowRightLeft,
      title: 'Move linked records to another building',
      description: 'The records and their bills keep their history, attached to the building you choose.',
      disabled: alternatives.length === 0,
    },
    {
      id: 'unassign',
      icon: Building2,
      title: 'Keep records as campus-wide',
      description: 'Records stay in the workspace with no building. Bills also become unattached.',
      disabled: false,
    },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Delete building"
      description={
        building
          ? `${building.name} will be removed from the portfolio. This cannot be undone.`
          : ''
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            isLoading={isDeleting}
            disabled={!canSubmit}
            onClick={() => onConfirm({ recordStrategy: strategy, reassignTo: reassignTo || null })}
          >
            Delete building
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {needsDecision ? (
          <>
            <Callout tone="warning" title="This building still has linked records">
              {formatNumber(linkedActivities)} activity record
              {linkedActivities === 1 ? '' : 's'} and {formatNumber(linkedBills)} bill
              {linkedBills === 1 ? '' : 's'} reference this building. Choose what happens to them
              before deleting — nothing is discarded silently.
            </Callout>

            <fieldset className="space-y-2">
              <legend className="sr-only">What should happen to linked records?</legend>
              {options.map((option) => {
                const Icon = option.icon;
                const active = strategy === option.id;
                return (
                  <label
                    key={option.id}
                    className={classNames(
                      'flex cursor-pointer gap-3 rounded-xl border p-3.5 transition',
                      active
                        ? 'border-forest-500 bg-forest-50/60 ring-2 ring-forest-500/10'
                        : 'border-line bg-white hover:border-forest-200',
                      option.disabled ? 'cursor-not-allowed opacity-50' : '',
                    )}
                  >
                    <input
                      type="radio"
                      name="record-strategy"
                      value={option.id}
                      checked={active}
                      disabled={option.disabled || isDeleting}
                      onChange={() => setStrategy(option.id)}
                      className="mt-1 h-4 w-4 accent-forest-700"
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-[13px] font-medium text-ink-900">
                        <Icon className="h-3.5 w-3.5 text-forest-600" aria-hidden="true" />
                        {option.title}
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-500">
                        {option.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </fieldset>

            {strategy === 'reassign' ? (
              <Field
                label="Move records to"
                htmlFor="reassign-building"
                hint="Only other buildings in the portfolio can receive the records."
              >
                <select
                  id="reassign-building"
                  value={reassignTo}
                  onChange={(event) => setReassignTo(event.target.value)}
                  className={inputClasses(false)}
                  disabled={isDeleting || alternatives.length === 0}
                >
                  {alternatives.length === 0 ? (
                    <option value="">No other buildings available</option>
                  ) : (
                    alternatives.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))
                  )}
                </select>
              </Field>
            ) : null}
          </>
        ) : (
          <div className="flex gap-3 rounded-xl border border-line bg-sand-50 p-3.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-700" aria-hidden="true" />
            <p className="text-[13px] leading-relaxed text-ink-600">
              No activity records or bills reference this building. Deleting it will not change any
              consumption totals.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

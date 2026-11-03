import { Modal } from '../ui/Modal.jsx';
import { ActivityForm } from './ActivityForm.jsx';
import { CATEGORY_META } from '../../data/options.js';

export function ActivityFormModal({
  open,
  category,
  buildings,
  departments,
  factors,
  initialActivity,
  onClose,
  onSubmit,
  isSubmitting,
}) {
  const meta = CATEGORY_META[category];
  const editing = Boolean(initialActivity);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={`${editing ? 'Edit' : 'Add'} ${meta?.singular ?? 'record'}`}
      description={meta?.description}
    >
      <ActivityForm
        key={`${category}-${initialActivity?.id ?? 'new'}-${open ? 'open' : 'closed'}`}
        category={category}
        buildings={buildings}
        departments={departments}
        factors={factors}
        initialActivity={initialActivity}
        onSubmit={onSubmit}
        onCancelEdit={onClose}
        isSubmitting={isSubmitting}
        resetSignal={0}
      />
    </Modal>
  );
}

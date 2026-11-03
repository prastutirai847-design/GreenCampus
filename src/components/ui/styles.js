import { classNames } from '../../utils/format.js';

export const inputBase =
  'w-full rounded-xl border bg-white px-3.5 text-sm text-ink-900 shadow-sm transition placeholder:text-ink-400 disabled:cursor-not-allowed disabled:bg-sand-100 disabled:text-ink-400';

export function inputClasses(hasError = false, extra) {
  return classNames(
    inputBase,
    'h-10',
    hasError
      ? 'border-danger-200 focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/15'
      : 'border-line hover:border-forest-200 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/15',
    extra,
  );
}

export function textareaClasses(hasError = false, extra) {
  return classNames(
    inputBase,
    'min-h-[76px] resize-y py-2.5 leading-relaxed',
    hasError
      ? 'border-danger-200 focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger/15'
      : 'border-line hover:border-forest-200 focus:border-forest-600 focus:outline-none focus:ring-2 focus:ring-forest-600/15',
    extra,
  );
}

export const labelClass = 'block text-[13px] font-[550] text-ink-700';

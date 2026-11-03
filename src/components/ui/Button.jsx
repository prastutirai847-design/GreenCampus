import { Loader2 } from 'lucide-react';
import { classNames } from '../../utils/format.js';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-[550] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/35 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

const variants = {
  primary: 'bg-forest-800 text-white shadow-sm hover:bg-forest-700 active:bg-forest-900',
  secondary: 'border border-line bg-white text-ink-900 hover:border-forest-200 hover:bg-sand-100',
  ghost: 'text-ink-700 hover:bg-sand-100 hover:text-ink-900',
  soft: 'bg-forest-50 text-forest-700 hover:bg-forest-100',
  danger: 'bg-danger text-white shadow-sm hover:bg-danger-700',
};

const sizes = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
};

export function buttonClasses({ variant = 'primary', size = 'md', className } = {}) {
  return classNames(base, variants[variant] ?? variants.primary, sizes[size] ?? sizes.md, className);
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  isLoading = false,
  disabled = false,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, className })}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

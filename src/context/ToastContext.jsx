import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { classNames } from '../utils/format.js';

const ToastContext = createContext(null);

let toastCounter = 0;

const TONES = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-success',
    ring: 'bg-success-50',
  },
  error: {
    icon: AlertTriangle,
    iconClass: 'text-danger',
    ring: 'bg-danger-50',
  },
  info: {
    icon: Info,
    iconClass: 'text-info',
    ring: 'bg-info-50',
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (toast) => {
      toastCounter += 1;
      const id = toastCounter;
      const item = {
        tone: 'success',
        title: 'Done',
        description: '',
        ...toast,
        id,
      };
      setToasts((previous) => [...previous.slice(-3), item]);
      const timer = window.setTimeout(() => {
        setToasts((previous) => previous.filter((entry) => entry.id !== id));
        timers.current.delete(id);
      }, 4600);
      timers.current.set(id, timer);
      return id;
    },
    [],
  );

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
    },
    [],
  );

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="no-print pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-full sm:max-w-sm"
      >
        {toasts.map((toast) => {
          const tone = TONES[toast.tone] ?? TONES.info;
          const Icon = tone.icon;
          return (
            <div
              key={toast.id}
              role="status"
              className="pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-line bg-white p-3.5 shadow-lift animate-toast-in"
            >
              <span className={classNames('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tone.ring)}>
                <Icon className={classNames('h-4 w-4', tone.iconClass)} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-900">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-0.5 text-[13px] leading-snug text-ink-500">{toast.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded-md p-1 text-ink-400 transition hover:bg-sand-100 hover:text-ink-700"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside a ToastProvider.');
  return context;
}

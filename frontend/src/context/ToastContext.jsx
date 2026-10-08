import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);
let nextToastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback(id => {
    setToasts(current => current.filter(toast => toast.id !== id));
  }, []);

  const toast = useCallback((message, type = 'success') => {
    const id = ++nextToastId;
    setToasts(current => [...current, { id, message, type }]);
    window.setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {toasts.map(item => (
          <div
            key={item.id}
            role="status"
            className={`flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 text-sm shadow-card ${
              item.type === 'error'
                ? 'border-red-200 bg-white text-red-700'
                : 'border-leaf/15 bg-white text-ink'
            }`}
          >
            <span>{item.message}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(item.id)}
              className="font-bold text-muted hover:text-ink"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context.toast;
}

'use client';

import { createContext, useCallback, useContext, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const TOAST_DURATION = 3500;

const typeStyles: Record<ToastType, string> = {
  success: 'bg-green-500/10 border-green-500/30 text-green-400',
  error: 'bg-red-500/10 border-red-500/30 text-red-400',
  info: 'bg-chimera-gold/10 border-chimera-gold/30 text-chimera-gold',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION);
  }, []);

  return (
    <ToastContext value={{ toast: addToast }}>
      {children}

      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 max-w-sm">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`px-5 py-3 rounded-xl border text-sm font-medium shadow-lg backdrop-blur-sm animate-fade-up ${typeStyles[t.type]}`}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
    </ToastContext>
  );
}

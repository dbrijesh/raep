import { useState, useCallback } from 'react';

export type ToastKind = 'success' | 'error';

export interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
}

interface UseToastReturn {
  toasts: Toast[];
  addToast: (message: string, kind?: ToastKind) => void;
  removeToast: (id: string) => void;
}

export function useToast(): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string): void => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, kind: ToastKind = 'success'): void => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, kind }]);
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast],
  );

  return { toasts, addToast, removeToast };
}

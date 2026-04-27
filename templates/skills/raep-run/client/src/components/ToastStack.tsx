import React from 'react';
import type { Toast } from '../hooks/useToast';

interface ToastStackProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastStack({ toasts, onRemove }: ToastStackProps): React.JSX.Element {
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast--${t.kind}`}
          onClick={() => onRemove(t.id)}
          title="Click to dismiss"
        >
          <span>{t.kind === 'success' ? '✓' : '✕'}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

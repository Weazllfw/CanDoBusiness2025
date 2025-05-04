import { useState, useCallback } from 'react';

interface ToastOptions {
  title: string;
  description?: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface Toast extends ToastOptions {
  id: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    ({ title, description, type = 'info', duration = 5000 }: ToastOptions) => {
      const id = Math.random().toString(36).substr(2, 9);
      const toast: Toast = { id, title, description, type, duration };

      setToasts((currentToasts) => [...currentToasts, toast]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((currentToasts) =>
            currentToasts.filter((t) => t.id !== id)
          );
        }, duration);
      }

      return id;
    },
    []
  );

  const hideToast = useCallback((id: string) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id)
    );
  }, []);

  return {
    toasts,
    showToast,
    hideToast,
  };
} 
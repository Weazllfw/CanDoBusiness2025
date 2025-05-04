'use client';

import { useToast } from '@/lib/hooks/useToast';
import { Toast } from './Toast';

export function ToastContainer() {
  const { toasts, hideToast } = useToast();

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 z-50 flex items-end px-4 py-6 sm:items-start sm:p-6"
    >
      <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={hideToast} />
        ))}
      </div>
    </div>
  );
} 
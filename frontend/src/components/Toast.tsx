'use client';

import { useEffect } from 'react';

export type ToastTone = 'error' | 'success' | 'info';

const TONE_STYLES: Record<ToastTone, string> = {
  error:   'bg-red-600 text-white',
  success: 'bg-green-600 text-white',
  info:    'bg-gray-800 text-white',
};

export function Toast({
  message,
  tone = 'error',
  durationMs = 3000,
  onClose,
}: {
  message: string | null;
  tone?: ToastTone;
  durationMs?: number;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, durationMs);
    return () => clearTimeout(t);
  }, [message, durationMs, onClose]);

  if (!message) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-sm">
      <div className={`${TONE_STYLES[tone]} rounded-lg shadow-lg px-4 py-3 text-sm font-medium text-center`}>
        {message}
      </div>
    </div>
  );
}

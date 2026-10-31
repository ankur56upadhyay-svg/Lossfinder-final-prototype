import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function Toast() {
  const { toast, hideToast } = useApp();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      hideToast();
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast, hideToast]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 pointer-events-auto">
      <div className="af-toast-enter flex items-center gap-3 bg-[#0B1F3A] text-white px-5 py-3 rounded-xl shadow-2xl text-sm border border-[#2A3040]">
        <span className="material-symbols-outlined text-emerald-400 text-lg">info</span>
        <span className="font-medium">{toast.message}</span>
        {toast.actionLabel && (
          <button
            type="button"
            onClick={() => {
              if (toast.onAction) toast.onAction();
              hideToast();
            }}
            className="font-bold underline text-blue-400 hover:text-blue-300 ml-2"
          >
            {toast.actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

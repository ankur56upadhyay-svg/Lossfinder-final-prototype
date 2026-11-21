import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';

export default function Toast() {
  const { toast, hideToast } = useApp();
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setExiting(false);
    const fade = setTimeout(() => setExiting(true), Math.max(0, (toast.duration || 3000) - 200));
    const timer = setTimeout(() => {
      hideToast();
    }, toast.duration || 3000);
    return () => { clearTimeout(fade); clearTimeout(timer); };
  }, [toast, hideToast]);

  if (!toast) return null;

  return (
    <div className="lf-toast-wrap fixed bottom-3 left-1/2 z-50 pointer-events-auto">
      <div className={`${exiting ? 'af-toast-exit' : 'af-toast-enter'} flex items-center gap-3 bg-[#111827] text-white px-5 py-3 rounded-xl text-sm border border-white/10`}>
        <span className="material-symbols-outlined text-blue-400 text-lg">info</span>
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

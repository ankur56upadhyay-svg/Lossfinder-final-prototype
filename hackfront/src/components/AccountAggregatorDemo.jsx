import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function AccountAggregatorDemo() {
  const { aaDemoAccounts, loadAccountAggregatorDemo } = useApp();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() => aaDemoAccounts.map(account => account.id));
  const [error, setError] = useState('');

  function toggle(id) {
    setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
    setError('');
  }

  function runDemo() {
    try {
      loadAccountAggregatorDemo(selected);
    } catch (cause) {
      setError(cause.message || 'Could not load the demo accounts.');
    }
  }

  return <section className="af-card mt-5 text-left" aria-labelledby="aa-demo-title">
    <div className="flex items-start gap-3">
      <span className="w-9 h-9 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-xl" aria-hidden="true">account_balance</span>
      </span>
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="aa-demo-title" className="font-semibold text-sm">Account Aggregator demo</h2>
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Fictional data</span>
        </div>
        <p className="text-xs text-[#5A6B80] dark:text-[#8899AA] mt-1">
          Preview how optional account selection could work. No bank, AA provider, phone number or OTP is connected. Demo data stays in this browser session.
        </p>
      </div>
    </div>

    <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open}
      className="af-btn af-btn-secondary mt-4 w-full py-2.5 text-sm">
      {open ? 'Close AA demo' : 'Explore AA demo'}
    </button>

    {open && <div className="mt-4 border-t border-[#E2E5EA] dark:border-[#2A3040] pt-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Choose fictional accounts</h3>
        <p className="text-xs text-[#5A6B80] dark:text-[#8899AA] mt-1">Only selected accounts appear in this demo analysis.</p>
        <div className="mt-2 space-y-2" role="group" aria-label="Fictional accounts">
          {aaDemoAccounts.map(account => <label key={account.id} className="flex items-center gap-3 p-3 rounded-lg border border-[#E2E5EA] dark:border-[#2A3040] cursor-pointer">
            <input type="checkbox" checked={selected.includes(account.id)} onChange={() => toggle(account.id)} className="accent-blue-600" />
            <span className="text-xs"><strong className="block text-sm">{account.bank}</strong>{account.account}</span>
          </label>)}
        </div>
      </div>
      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 p-3 text-xs space-y-1">
        <p className="font-semibold">Demo consent preview</p>
        <p>Purpose: find recurring charges and price changes.</p>
        <p>Data: fictional bank transactions from April to November 2026.</p>
        <p>Access: one-time simulation. No real consent is created or stored.</p>
      </div>
      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <button type="button" onClick={runDemo} disabled={!selected.length} className="af-btn af-btn-primary w-full py-2.5 text-sm disabled:opacity-50">
        Analyse {selected.length} fictional {selected.length === 1 ? 'account' : 'accounts'}
      </button>
      <p className="text-[11px] text-[#5A6B80] dark:text-[#8899AA] text-center">A live AA connection requires an eligible FIU integration and user consent through an AA provider.</p>
    </div>}
  </section>;
}

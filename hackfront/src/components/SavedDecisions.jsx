import React from 'react';
import { useApp } from '../context/AppContext';
import { money } from './dashboardView';

const groups = [
  { key: 'keep', title: 'Keep', description: 'Subscriptions you chose to keep.' },
  { key: 'review', title: 'Remind me', description: 'Payments you want to review later. This does not send a notification.' },
  { key: 'consider_cancelling', title: 'Plan to cancel', description: 'Payments you plan to cancel with the provider.' }
];

function nextRenewal(sub, today) {
  if (['ended', 'cancelled', 'ignored'].includes(sub.status?.kind)) return null;
  const last = new Date(sub.lastPaymentDate);
  if (!sub.lastPaymentDate || !Number.isFinite(last.getTime()) || last > today) return null;
  if ((today - last) / 86400000 > (sub.per === 'yr' ? 400 : 65)) return null;
  const next = new Date(last);
  if (sub.per === 'yr') next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  if (next < today) {
    if (sub.per === 'yr') next.setFullYear(next.getFullYear() + 1);
    else next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export default function SavedDecisions() {
  const { subscriptions, reviewDecisions, navigateTo } = useApp();
  const savedCount = subscriptions.filter(sub => reviewDecisions[sub.id]).length;
  const today = new Date();
  const upcoming = subscriptions.map(sub => ({ sub, date: nextRenewal(sub, today) }))
    .filter(item => item.date && (item.date - today) / 86400000 <= 30)
    .sort((a, b) => a.date - b.date);

  return <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Saved decisions</h1>
        <p className="text-sm text-[#5A6B80] dark:text-[#8899AA] mt-2">{savedCount} of {subscriptions.length} subscriptions have a saved choice.</p>
      </div>
      <button type="button" onClick={() => navigateTo('dashboard')} className="af-btn af-btn-primary">Edit choices on dashboard</button>
    </div>

    {groups.map(group => {
      const items = subscriptions.filter(sub => reviewDecisions[sub.id] === group.key);
      return <section key={group.key} className="af-card af-decision-section" aria-label={group.title}>
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <h2 className="text-lg font-semibold">{group.title}</h2>
          <span className="text-sm font-semibold text-[#0B5FD8] dark:text-[#4D9AFF]">{items.length}</span>
        </div>
        <p className="text-xs text-[#5A6B80] dark:text-[#8899AA] mb-4">{group.description}</p>
        {items.length ? <div className="divide-y divide-[#E2E5EA] dark:divide-[#2A3040]">
          {items.map(sub => <div key={sub.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <div>
              <button type="button" onClick={() => navigateTo('detail', sub.id)} className="font-semibold text-[#0B5FD8] dark:text-[#4D9AFF] hover:underline">{sub.name}</button>
              <p className="text-xs text-[#5A6B80] dark:text-[#8899AA]">{sub.category || 'Other'} · {['unused', 'unknown'].includes(sub.status?.kind) ? 'Active' : sub.status?.label || 'Detected'}</p>
            </div>
            <span className="font-semibold">{money(sub.price)}/{sub.per || 'mo'}</span>
          </div>)}
        </div> : <p className="text-sm text-[#5A6B80] dark:text-[#8899AA]">No subscriptions saved in this group yet.</p>}
      </section>;
    })}

    <section className="af-card af-decision-section">
      <h2 className="text-lg font-semibold mb-2">Upcoming renewals</h2>
      <p className="text-xs text-[#5A6B80] dark:text-[#8899AA] mb-4">Estimated from your latest statement. Dates are not confirmed by the provider, and no notification is sent.</p>
      {upcoming.length ? <div className="space-y-3">{upcoming.map(({ sub, date }) => <div key={sub.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E5EA] dark:border-[#2A3040] pb-3">
        <div><p className="font-semibold">{sub.name}</p><p className="text-xs text-[#5A6B80] dark:text-[#8899AA]">Estimated {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
        <span className="font-semibold">{money(sub.price)}</span>
      </div>)}</div> : <p className="text-sm text-[#5A6B80] dark:text-[#8899AA]">No upcoming renewal can be estimated from this analysis. Upload a recent statement to refresh it.</p>}
    </section>
  </main>;
}

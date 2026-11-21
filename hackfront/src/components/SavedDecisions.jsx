import React from 'react';
import { useApp } from '../context/AppContext';

const groups = [
  { key: 'keep', title: 'Keep', description: 'Subscriptions you chose to keep.' },
  { key: 'review', title: 'Review later', description: 'Payments you want to reconsider.' },
  { key: 'consider_cancelling', title: 'Consider cancelling', description: 'Payments worth checking before you cancel.' }
];

export default function SavedDecisions() {
  const { subscriptions, reviewDecisions, navigateTo } = useApp();
  const savedCount = subscriptions.filter(sub => reviewDecisions[sub.id]).length;

  return <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Saved Decisions</h1>
        <p className="text-sm text-[#5A6B80] dark:text-[#8899AA] mt-2">{savedCount} of {subscriptions.length} subscriptions reviewed.</p>
      </div>
      <button type="button" onClick={() => navigateTo('review')} className="af-btn af-btn-primary">Edit choices</button>
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
              <p className="text-xs text-[#5A6B80] dark:text-[#8899AA]">{sub.category || 'Other'} · {sub.status?.label || 'Detected'}</p>
            </div>
            <span className="font-semibold">₹{Number(sub.price || 0).toLocaleString('en-IN')}/{sub.per || 'mo'}</span>
          </div>)}
        </div> : <p className="text-sm text-[#5A6B80] dark:text-[#8899AA]">No subscriptions saved in this group yet.</p>}
      </section>;
    })}
  </main>;
}

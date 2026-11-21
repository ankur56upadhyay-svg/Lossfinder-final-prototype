import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

const choices = [
  ['keep', 'Keep'],
  ['review', 'Review later'],
  ['consider_cancelling', 'Consider cancelling']
];

function nextRenewal(sub, today) {
  if (['ended', 'cancelled', 'ignored'].includes(sub.status?.kind)) return null;
  const raw = sub.lastPaymentDate;
  if (!raw) return null;
  const last = new Date(raw);
  if (Number.isNaN(last.getTime()) || last > today) return null;
  const daysOld = (today - last) / 86400000;
  if (daysOld > (sub.per === 'yr' ? 400 : 65)) return null;
  const next = new Date(last);
  if (sub.per === 'yr') next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  if (next < today) {
    if (sub.per === 'yr') next.setFullYear(next.getFullYear() + 1);
    else next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export default function ReviewCentre() {
  const { subscriptions, reviewDecisions, saveReviewDecisions, navigateTo } = useApp();
  const [draft, setDraft] = useState(reviewDecisions);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const today = new Date();
  const upcoming = subscriptions.map(sub => ({ sub, date: nextRenewal(sub, today) }))
    .filter(item => item.date && (item.date - today) / 86400000 <= 30)
    .sort((a, b) => a.date - b.date);
  const pending = subscriptions.filter(sub => !draft[sub.id]).length;
  const unsavedCount = subscriptions.filter(sub => draft[sub.id] && draft[sub.id] !== reviewDecisions[sub.id]).length;

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      const result = await saveReviewDecisions(draft);
      if (result.failed) {
        setSaveError(`${result.failed} decision${result.failed === 1 ? '' : 's'} could not be saved. Check your connection and retry.`);
      } else {
        navigateTo('saved');
      }
    } catch (error) {
      setSaveError('Could not save your choices. Please retry.');
    } finally {
      setSaving(false);
    }
  }

  return <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold">Subscription Review Centre</h1>
      <p className="text-sm text-[#5A6B80] dark:text-[#8899AA] mt-2">Decide what to keep and see what may renew next. {pending} of {subscriptions.length} need a decision.</p>
    </div>

    <div className="af-card flex flex-wrap items-center justify-between gap-3" aria-live="polite">
      <div>
        <p className="font-semibold">{unsavedCount ? `${unsavedCount} unsaved choice${unsavedCount === 1 ? '' : 's'}` : 'Your choices are up to date'}</p>
        <p className="text-xs text-[#5A6B80] dark:text-[#8899AA]">Choose below, then save to see them grouped on your Saved Decisions page.</p>
        {saveError && <p className="text-sm text-red-500 mt-1" role="alert">{saveError}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => navigateTo('saved')} className="af-btn af-btn-secondary">View saved decisions</button>
        <button type="button" onClick={handleSave} disabled={!unsavedCount || saving} className="af-btn af-btn-primary disabled:opacity-50 disabled:cursor-not-allowed">{saving ? 'Saving…' : 'Save choices'}</button>
      </div>
    </div>

    <section className="af-card">
      <h2 className="text-lg font-semibold mb-2">Upcoming renewal reminders</h2>
      <p className="text-xs text-[#5A6B80] dark:text-[#8899AA] mb-4">In-app estimates based on your latest statement. We do not send emails or confirm merchant billing dates.</p>
      {upcoming.length ? <div className="space-y-3">{upcoming.map(({ sub, date }) => <div key={sub.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E5EA] dark:border-[#2A3040] pb-3">
        <div><p className="font-semibold">{sub.name}</p><p className="text-xs text-[#5A6B80] dark:text-[#8899AA]">Estimated {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
        <span className="font-semibold">₹{Number(sub.price || 0).toLocaleString('en-IN')}</span>
      </div>)}</div> : <p className="text-sm text-[#5A6B80] dark:text-[#8899AA]">No upcoming payments can be estimated from recent statement data. Upload a recent statement to refresh this view.</p>}
    </section>

    <section className="space-y-3" aria-label="Review subscriptions">
      {subscriptions.map(sub => <article key={sub.id} className="af-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button type="button" onClick={() => navigateTo('detail', sub.id)} className="font-semibold text-[#0B5FD8] dark:text-[#4D9AFF] hover:underline">{sub.name}</button>
          <p className="text-sm text-[#5A6B80] dark:text-[#8899AA]">₹{Number(sub.price || 0).toLocaleString('en-IN')}/{sub.per || 'mo'} · {sub.status?.label || 'Detected'} · {sub.category || 'Other'}</p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label={`Decision for ${sub.name}`}>
          {choices.map(([value, label]) => <button key={value} type="button" onClick={() => setDraft(current => ({ ...current, [sub.id]: value }))} aria-pressed={draft[sub.id] === value}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border ${draft[sub.id] === value ? 'bg-[#0B5FD8] text-white border-[#0B5FD8]' : 'border-[#E2E5EA] dark:border-[#2A3040] hover:border-[#0B5FD8]'}`}>{label}</button>)}
        </div>
      </article>)}
    </section>
    {unsavedCount > 0 && <div className="flex justify-end"><button type="button" onClick={handleSave} disabled={saving} className="af-btn af-btn-primary disabled:opacity-50">{saving ? 'Saving…' : `Save ${unsavedCount} choice${unsavedCount === 1 ? '' : 's'}`}</button></div>}
  </main>;
}

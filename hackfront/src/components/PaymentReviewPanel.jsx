import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

const answers = [
  ['subscription', 'Subscription'],
  ['other_recurring', 'Other recurring bill'],
  ['not_recurring', 'Not recurring'],
];

export default function PaymentReviewPanel() {
  const { paymentCandidates, classifyPayment } = useApp();
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  if (!paymentCandidates?.length) return null;

  const unanswered = paymentCandidates.filter(sub => !sub.classificationDecision).length;

  async function answer(sub, choice) {
    setSavingId(sub.id);
    setError('');
    try {
      await classifyPayment(sub.id, choice);
    } catch (cause) {
      setError(`Could not save your answer for ${sub.name}. ${cause.message || 'Please try again.'}`);
    } finally {
      setSavingId(null);
    }
  }

  return <section className="af-card mb-8" aria-labelledby="payment-review-title">
    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
      <div>
        <h2 id="payment-review-title" className="text-lg font-bold">Needs your review</h2>
        <p className="text-sm text-[#5A6B80] dark:text-[#8899AA] mt-1">
          {unanswered} payment{unanswered === 1 ? '' : 's'} to check. These are excluded from subscription totals until you confirm them. You can skip this step.
        </p>
      </div>
      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">{unanswered} unanswered</span>
    </div>
    {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>}
    <div className="divide-y divide-[#E2E5EA] dark:divide-[#2A3040]">
      {paymentCandidates.map(sub => <article key={sub.id} className="py-4 first:pt-1 last:pb-0">
        <div className="flex flex-wrap justify-between gap-2">
          <div>
            <p className="font-semibold">{sub.name}</p>
            <p className="text-xs text-[#5A6B80] dark:text-[#8899AA]">{sub.assessmentReason}</p>
          </div>
          <span className="font-semibold">₹{Number(sub.price || 0).toLocaleString('en-IN')}/{sub.per || 'mo'}</span>
        </div>
        <details className="text-xs text-[#5A6B80] dark:text-[#8899AA] mt-2">
          <summary className="cursor-pointer text-[#0B5FD8] dark:text-[#4D9AFF]">Why was this found?</summary>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            {(sub.evidence || []).slice(0, 3).map((line, index) => <li key={index}>{line}</li>)}
          </ul>
          {sub.code && <p className="mt-2 break-all">Latest statement description: {sub.code}</p>}
        </details>
        <div className="flex flex-wrap items-center gap-2 mt-3" aria-label={`Classify ${sub.name}`}>
          {answers.map(([value, label]) => <button key={value} type="button" disabled={savingId === sub.id}
            onClick={() => answer(sub, value)} aria-pressed={sub.classificationDecision === value}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border disabled:opacity-50 ${sub.classificationDecision === value ? 'bg-[#0B5FD8] border-[#0B5FD8] text-white' : 'border-[#E2E5EA] dark:border-[#2A3040] hover:border-[#0B5FD8]'}`}>{label}</button>)}
          {sub.classificationDecision && <button type="button" disabled={savingId === sub.id} onClick={() => answer(sub, null)} className="text-xs underline text-[#5A6B80] dark:text-[#8899AA] disabled:opacity-50">Clear answer</button>}
          <span className="text-xs text-[#5A6B80] dark:text-[#8899AA]" aria-live="polite">
            {savingId === sub.id ? 'Saving…' : sub.classificationDecision === 'subscription' ? 'Included in subscription totals' : sub.classificationDecision ? 'Excluded from subscription totals' : 'Not counted yet'}
          </span>
        </div>
      </article>)}
    </div>
  </section>;
}

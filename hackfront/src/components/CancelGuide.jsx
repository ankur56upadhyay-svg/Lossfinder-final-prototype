import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getCancellationCandidates } from '../engine/cancellationCandidates';

function getMechanismSteps(sub) {
  const mech = (sub.mech || '').toLowerCase();
  const name = sub.name || 'the merchant';

  if (/upi/i.test(mech)) {
    return [
      { title: 'Open your UPI app', desc: 'Open Google Pay, PhonePe, Paytm, BHIM, or your primary UPI payment app.' },
      { title: 'Find automatic payments', desc: 'Go to Profile or Settings and open AutoPay or Mandates (your list of approved automatic payments).' },
      { title: `Find ${name}`, desc: 'Locate the automatic payment for this service.' },
      { title: 'Stop AutoPay', desc: 'Tap Revoke or Cancel on the payment detail screen.' },
      { title: 'Confirm with your UPI app', desc: 'Enter your UPI PIN there if the app asks. Never enter your PIN in Loss Finder.' }
    ];
  }

  if (/bank|ach|nach/i.test(mech)) {
    return [
      { title: 'Cancel with merchant first', desc: `Contact ${name} or log in to their website to cancel your subscription.` },
      { title: 'Open your bank portal', desc: "Log in to your bank's mobile app or internet banking portal." },
      { title: 'Find automatic payments', desc: 'Under Services, look for recurring payments, NACH/ECS mandates, or standing instructions.' },
      { title: 'Select the payment', desc: `Find the automatic payment for ${name} or statement text ${sub.code || 'this service'}.` },
      { title: 'Request cancellation', desc: 'Submit the bank cancellation request and keep the confirmation.' }
    ];
  }

  if (/app|apple|google/i.test(mech)) {
    return [
      { title: 'Apple iOS device', desc: `Open Settings → tap your Name at the top → tap "Subscriptions" → find ${name} → tap "Cancel Subscription".` },
      { title: 'Google Android device', desc: `Open Google Play Store → tap Profile icon → "Payments & subscriptions" → "Subscriptions" → find ${name} → tap "Cancel subscription".` }
    ];
  }

  // Default Card instructions
  return [
    { title: "Open merchant website / app", desc: `Open ${name}'s mobile app or log into their official website.` },
    { title: 'Go to Account Settings', desc: 'Navigate to Account → Subscription / Billing settings.' },
    { title: 'Cancel subscription', desc: 'Click "Cancel subscription" or "Turn off auto-renewal" and follow the prompts to confirm.' },
    { title: 'Open your bank app', desc: "After cancelling with the merchant, log in to your bank's mobile application." },
    { title: 'Find automatic card payments', desc: 'Under Cards, look for recurring payments or standing instructions (approved automatic card payments).' },
    { title: 'Stop the card payment', desc: `Find the recurring payment for ${name} and tap Revoke or Cancel.` }
  ];
}

function buildCancellationEmail(sub) {
  const merchant = sub.name || 'Merchant';
  const code = sub.code || (sub.name + ' Account');
  return `Dear ${merchant} Support,

I would like to cancel my subscription (Account/Reference: ${code}). Please confirm cancellation and ensure no further charges are made to my payment method.

Please send a written confirmation of this cancellation request to my email address.

Thank you.`;
}

export default function CancelGuide() {
  const {
    subscriptions,
    reviewDecisions,
    user,
    selectedSubId,
    navigateTo,
    cancelledMap,
    markCancelled,
    showToast,
    isDemo
  } = useApp();

  const sub = selectedSubId ? subscriptions.find(s => s.id === selectedSubId) : null;
  const [copied, setCopied] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState([]);
  const steps = sub ? getMechanismSteps(sub) : [];
  useEffect(() => setCheckedSteps([]), [sub?.id]);

  if (!sub) {
    if (subscriptions.length === 0) {
      return (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="af-card text-center py-16 px-6 max-w-lg mx-auto">
            <span className="material-symbols-outlined text-5xl text-blue-500 mb-4">cancel</span>
            <h1 className="text-2xl font-bold text-[#0B1F3A] dark:text-[#E8ECF1] mb-2">
              No Subscriptions Found
            </h1>
            <p className="text-[#5A6B80] dark:text-[#8899AA] text-sm mb-6">
              Upload a bank statement first to generate cancellation instructions.
            </p>
            <button
              type="button"
              onClick={() => navigateTo('upload')}
              className="af-btn af-btn-primary inline-flex"
            >
              <span className="material-symbols-outlined text-base">upload_file</span>
              <span>Upload Statement</span>
            </button>
          </div>
        </main>
      );
    }

    const candidates = getCancellationCandidates(subscriptions, reviewDecisions, cancelledMap);

    function getStatusClasses(kind) {
      const map = {
        hike: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        trial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        ended: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
      };
      return map[kind] || 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
    }

    function getStatusIcon(kind) {
      const map = {
        hike: 'trending_up',
        trial: 'new_releases',
        active: 'check_circle',
        ended: 'cancel'
      };
      return map[kind] || 'help';
    }

    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1F3A] dark:text-[#E8ECF1]">
              Cancellation Guides
            </h1>
            <p className="text-xs sm:text-sm text-[#5A6B80] dark:text-[#8899AA] mt-1">
              {candidates.length} active subscription{candidates.length === 1 ? '' : 's'} with cancellation steps. Your “Consider cancelling” choices and statement flags appear first.
            </p>
          </div>
          {isDemo && (
            <span className="af-demo-chip">
              <span className="material-symbols-outlined text-xs">science</span> Demo Mode
            </span>
          )}
        </div>

        {candidates.length === 0 ? (
          <div className="af-card text-center py-12 px-6">
            <span className="material-symbols-outlined text-4xl text-[#5A6B80] dark:text-[#8899AA]">check_circle</span>
            <h2 className="mt-3 text-lg font-semibold text-[#0B1F3A] dark:text-[#E8ECF1]">No subscriptions to show</h2>
            <p className="mt-2 text-sm text-[#5A6B80] dark:text-[#8899AA] max-w-lg mx-auto">
              {user
                ? 'All detected subscriptions are marked Keep or are no longer active. Change a choice on the dashboard to see its cancellation guide here.'
                : 'This statement has no active subscriptions. Upload a newer statement to check again.'}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {user && <button type="button" onClick={() => navigateTo('dashboard')} className="af-btn af-btn-primary">View subscriptions</button>}
              <button type="button" onClick={() => navigateTo('dashboard')} className="af-btn af-btn-secondary">View dashboard</button>
            </div>
          </div>
        ) : <div className="space-y-3">
          {candidates.map(s => {
            const kind = ['unused', 'unknown'].includes(s.status?.kind) ? 'active' : s.status?.kind || 'active';
            const chosenByUser = reviewDecisions[s.id] === 'consider_cancelling';
            const flagged = !reviewDecisions[s.id] && ['hike', 'trial'].includes(kind);
            const label = chosenByUser ? 'Chosen by you' : reviewDecisions[s.id] === 'review' ? 'Review later' : flagged ? s.status?.label : 'Active';
            return (
              <article
                key={s.id}
                className="af-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-base font-bold text-[#0B1F3A] dark:text-[#E8ECF1] truncate">{s.name}</h3>
                    <span className={`af-pill ${chosenByUser ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : flagged ? getStatusClasses(kind) : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
                      <span className="material-symbols-outlined text-xs">{chosenByUser ? 'bookmark' : flagged ? getStatusIcon(kind) : 'info'}</span>
                      <span>{label}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800 text-[#5A6B80] dark:text-[#8899AA]">
                      {(s.mech || 'Card').replace('Bank mandate', 'Bank automatic payment')}
                    </span>
                  </div>
                  <p className="text-xs text-[#5A6B80] dark:text-[#8899AA] af-code truncate mb-1">
                    {s.code || ''}
                  </p>
                  <p className="text-xs text-[#0B1F3A] dark:text-[#E8ECF1] font-semibold">
                    ₹{Number(s.price || 0).toLocaleString('en-IN')}/{s.per || 'mo'} · {s.category || 'Other'}
                  </p>
                </div>
                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={() => navigateTo('guide', s.id)}
                    className="af-btn af-btn-primary text-xs"
                  >
                    <span className="material-symbols-outlined text-sm">cancel</span>
                    <span>View cancel guide</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>}
        <p className="mt-5 text-xs text-[#5A6B80] dark:text-[#8899AA]">
          This list does not recommend cancelling every payment. Opening a guide does not stop a payment.
        </p>
      </main>
    );
  }

  // Individual guide view
  const isCancelled = !!cancelledMap[sub.id];
  const emailText = buildCancellationEmail(sub);
  const method = /upi/i.test(sub.mech || '') ? 'UPI AutoPay' : /app|apple|google/i.test(sub.mech || '') ? 'App Store' : /bank|ach|nach/i.test(sub.mech || '') ? 'Bank payment' : /card/i.test(sub.mech || '') ? 'Card payment' : 'Website';
  const doneCount = checkedSteps.filter(Boolean).length + (isCancelled ? 1 : 0);

  function toggleStep(index) {
    setCheckedSteps(current => {
      const next = [...current];
      next[index] = !next[index];
      return next;
    });
  }

  async function copySteps() {
    try {
      await navigator.clipboard.writeText([`How to cancel ${sub.name} (${method})`, ...steps.map((step, index) => `${index + 1}. ${step.title}: ${step.desc}`), `${steps.length + 1}. After you finish, mark it as cancelled in Loss Finder.`].join('\n'));
      showToast('Cancellation steps copied.');
    } catch { showToast('Could not copy the steps. Select and copy them manually.'); }
  }

  function getStatusClasses(kind) {
    const map = {
      hike: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      trial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      ended: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
    };
    return map[kind] || 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
  }

  function getStatusIcon(kind) {
    const map = {
      hike: 'trending_up',
      trial: 'new_releases',
      active: 'check_circle',
      ended: 'cancel'
    };
    return map[kind] || 'help';
  }

  const statusKind = ['unused', 'unknown'].includes(sub.status?.kind) ? 'active' : sub.status?.kind || 'active';
  const statusLabel = statusKind === 'active' ? 'Active' : sub.status?.label || 'Active';

  async function handleCopy() {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(emailText);
      } else {
        const ta = document.getElementById('cancellation-email-ta');
        if (ta) { ta.select(); document.execCommand('copy'); }
      }
      setCopied(true);
      showToast('Cancellation email template copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Could not copy automatically — please select and copy manually.');
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Back Link */}
      <div className="mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigateTo('guide')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5A6B80] hover:text-[#0B1F3A] dark:text-[#8899AA] dark:hover:text-[#E8ECF1] transition-colors focus:outline-none"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>All cancel guides</span>
        </button>
        {isDemo && (
          <span className="af-demo-chip">
            <span className="material-symbols-outlined text-xs">science</span> Demo Mode
          </span>
        )}
      </div>

      {/* Header Card */}
      <div className="af-card mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
                Cancel Guide
              </span>
              <span className={`af-pill ${getStatusClasses(statusKind)}`}>
                <span className="material-symbols-outlined text-xs">{getStatusIcon(statusKind)}</span>
                <span>{statusLabel}</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1F3A] dark:text-[#E8ECF1] mt-1">
              Cancel {sub.name}
            </h1>
            <span className="af-pill lf-method-tag mt-3">{method}</span>
            <p className="text-xs sm:text-sm text-[#5A6B80] dark:text-[#8899AA] mt-1">
              Currently billed at ₹{sub.price.toLocaleString('en-IN')}/{sub.per || 'mo'} via{' '}
              <strong className="text-[#0B1F3A] dark:text-[#E8ECF1] font-semibold">
                {sub.mech || 'Card'}
              </strong>
            </p>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => navigateTo('detail', sub.id)}
              className="af-btn af-btn-secondary text-xs"
            >
              <span className="material-symbols-outlined text-base">info</span>
              <span>View Details</span>
            </button>
          </div>
        </div>
      </div>

      {/* Step-by-Step Cancellation Guide Card */}
      <div className="af-card mb-6 shadow-sm">
        <div className="border-b border-[#E2E5EA] dark:border-[#2A3040] pb-3 mb-4">
          <h2 className="text-base font-semibold text-[#0B1F3A] dark:text-[#E8ECF1] flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-blue-600 dark:text-blue-400">
              checklist
            </span>
            <span>Step-by-Step Cancellation Guide</span>
          </h2>
          <p className="text-xs text-[#5A6B80] dark:text-[#8899AA] mt-0.5">
            Follow these steps in the provider or bank app to stop the recurring payment.
          </p>
          <div className="lf-guide-progress"><span>{doneCount} of {steps.length + 1} done</span><button type="button" onClick={copySteps} className="lf-link">Copy steps</button></div>
          <div className="lf-guide-progress-track" role="progressbar" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={steps.length + 1} aria-label="Cancellation progress"><span style={{ width: `${doneCount / (steps.length + 1) * 100}%` }} /></div>
        </div>

        {/* Distinct numbered circles with bold headers and muted subtext */}
        <div className="space-y-5">
          {steps.map((step, idx) => (
            <label key={idx} className="lf-guide-step flex items-start gap-3.5">
              {/* Numbered Circle */}
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-bold text-sm shrink-0 mt-0.5 border border-blue-200 dark:border-blue-800/40">
                {idx + 1}
              </div>
              <input type="checkbox" checked={!!checkedSteps[idx]} onChange={() => toggleStep(idx)} aria-label={`Done: ${step.title}`} />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[#0B1F3A] dark:text-[#E8ECF1]">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#5A6B80] dark:text-[#8899AA] mt-0.5 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </label>
          ))}
          <label className="lf-guide-step lf-guide-final flex items-start gap-3.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-bold text-sm shrink-0 mt-0.5">{steps.length + 1}</div>
            <input type="checkbox" checked={isCancelled} onChange={event => markCancelled(sub.id, event.target.checked)} />
            <div><h3 className="text-sm font-semibold">I've cancelled it</h3><p className="text-xs mt-1">Only check this after the provider or bank confirms cancellation. This updates your tracked savings; it cannot stop a payment.</p></div>
          </label>
        </div>
      </div>

      {/* Copyable Cancellation Email — Dark-grey text area module */}
      <div className="af-card mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold text-[#0B1F3A] dark:text-[#E8ECF1] flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-blue-600 dark:text-blue-400">
                mail
              </span>
              <span>Copyable Cancellation Email</span>
            </h2>
            <p className="text-xs text-[#5A6B80] dark:text-[#8899AA] mt-0.5">
              Copy and send this pre-written message to the merchant's customer support.
            </p>
          </div>

          {/* Functional Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="af-btn af-btn-primary text-xs shrink-0"
          >
            {copied ? (
              <>
                <span className="material-symbols-outlined text-sm">check</span>
                <span>Copied!</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">content_copy</span>
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Pre-written cancellation email — dark-grey textarea */}
        <textarea
          id="cancellation-email-ta"
          rows={6}
          readOnly
          value={emailText}
          className="af-copyable"
        />
      </div>

      {/* Escalation Path Card */}
      <div className="af-card af-highlight-amber mb-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#0B1F3A] dark:text-[#E8ECF1] flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-lg text-amber-500">gavel</span>
          <span>Escalation Path (If Merchant Refuses or Continues Debiting)</span>
        </h2>
        <p className="text-xs text-[#5A6B80] dark:text-[#8899AA] mb-3">
          Under RBI digital payment guidelines, banks and merchants are required to process cancellation requests promptly.
        </p>
        <ol className="space-y-2 text-xs sm:text-sm text-[#0B1F3A] dark:text-[#E8ECF1]">
          <li className="flex items-start gap-2">
            <span className="font-bold text-amber-600 dark:text-amber-400 shrink-0">1.</span>
            <span>Contact the merchant's customer support directly with the message above and save their written response.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-amber-600 dark:text-amber-400 shrink-0">2.</span>
            <span>File a written dispute with your issuing bank's grievance redressal cell to block recurring transactions.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="font-bold text-amber-600 dark:text-amber-400 shrink-0">3.</span>
            <span>
              If unresolved after 30 days, escalate directly to the <strong>RBI Ombudsman</strong> at{' '}
              <a
                href="https://cms.rbi.org.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 font-semibold underline inline-flex items-center gap-0.5"
              >
                cms.rbi.org.in
                <span className="material-symbols-outlined text-xs">open_in_new</span>
              </a>.
            </span>
          </li>
        </ol>
      </div>

      {/* Mark as Cancelled Section */}
      <div className="mb-8">
        {isCancelled ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-emerald-600 dark:text-emerald-400 shrink-0">
                task_alt
              </span>
              <div>
                <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  Marked as Cancelled
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                  This subscription is excluded from your active cost totals.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                markCancelled(sub.id, false);
                showToast(`Restored ${sub.name} to active status`, {
                  actionLabel: 'Undo',
                  onAction: () => markCancelled(sub.id, true)
                });
              }}
              className="af-btn af-btn-secondary lf-confirm-button text-xs shrink-0"
            >
              <span className="material-symbols-outlined text-sm">undo</span>
              <span>Undo</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-xl bg-[#F5F6F8] dark:bg-[#0F1419] border border-[#E2E5EA] dark:border-[#2A3040]">
            <div>
              <h3 className="text-sm font-semibold text-[#0B1F3A] dark:text-[#E8ECF1]">
                Have you cancelled this subscription?
              </h3>
              <p className="text-xs text-[#5A6B80] dark:text-[#8899AA] mt-0.5">
                Track your progress and exclude cancelled subscriptions from your annual spend totals.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                markCancelled(sub.id, true);
                showToast(`Marked ${sub.name} as cancelled`, {
                  actionLabel: 'Undo',
                  onAction: () => markCancelled(sub.id, false)
                });
              }}
              className="af-btn af-btn-primary text-xs shrink-0"
            >
              <span className="material-symbols-outlined text-base">check</span>
              <span>Mark as Cancelled</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Navigation Links */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E2E5EA] dark:border-[#2A3040]">
        <button
          type="button"
          onClick={() => navigateTo('dashboard')}
          className="af-btn af-btn-secondary"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Back to Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => navigateTo('detail', sub.id)}
          className="af-btn af-btn-secondary"
        >
          <span className="material-symbols-outlined text-base">arrow_forward</span>
          <span>Subscription Details</span>
        </button>
      </div>
    </main>
  );
}

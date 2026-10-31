import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

function getMechanismSteps(sub) {
  const mech = (sub.mech || '').toLowerCase();
  const name = sub.name || 'the merchant';

  if (/upi/i.test(mech)) {
    return [
      { title: 'Open your UPI app', desc: 'Open Google Pay, PhonePe, Paytm, BHIM, or your primary UPI payment app.' },
      { title: 'Navigate to Mandates', desc: 'Go to Profile/Settings → select "AutoPay" or "Mandates".' },
      { title: `Find ${name}`, desc: 'Locate the recurring mandate for this service in your active mandates list.' },
      { title: 'Revoke AutoPay', desc: 'Tap "Revoke" or "Cancel mandate" on the mandate detail screen.' },
      { title: 'Confirm cancellation', desc: 'Enter your UPI PIN if prompted to permanently revoke the mandate.' }
    ];
  }

  if (/bank|ach|nach/i.test(mech)) {
    return [
      { title: 'Cancel with merchant first', desc: `Contact ${name} or log in to their website to cancel your subscription.` },
      { title: 'Open your bank portal', desc: "Log in to your bank's mobile app or internet banking portal." },
      { title: 'Locate Mandate Management', desc: 'Go to Services → select "Mandate Management", "NACH/ECS Mandates", or "Standing Instructions".' },
      { title: 'Select mandate', desc: `Find the mandate registered for ${name} or code ${sub.code || 'this service'}.` },
      { title: 'Request cancellation', desc: 'Submit a cancellation request for the mandate so no further debits occur.' }
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
    { title: 'Manage e-mandates', desc: 'Go to Cards → select "Manage e-mandates" or "Standing Instructions / Recurring Payments".' },
    { title: 'Revoke card mandate', desc: `Find the standing instruction for ${name} and tap "Revoke / Cancel Mandate".` }
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
    selectedSubId,
    navigateTo,
    cancelledMap,
    markCancelled,
    showToast,
    isDemo
  } = useApp();

  const sub = subscriptions.find(s => s.id === selectedSubId) || subscriptions[0];
  const [copied, setCopied] = useState(false);

  if (!sub) {
    // Guide index view: show all subscriptions
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

    function getStatusClasses(kind) {
      const map = {
        hike: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        trial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        unused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        ended: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
      };
      return map[kind] || 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
    }

    function getStatusIcon(kind) {
      const map = {
        hike: 'trending_up',
        trial: 'new_releases',
        unused: 'visibility_off',
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
              Select any recurring payment below for step-by-step instructions to revoke mandates and stop charges.
            </p>
          </div>
          {isDemo && (
            <span className="af-demo-chip">
              <span className="material-symbols-outlined text-xs">science</span> Demo Mode
            </span>
          )}
        </div>

        <div className="space-y-3">
          {subscriptions.map(s => {
            const isCancelled = !!cancelledMap[s.id];
            const kind = s.status?.kind || 'active';
            return (
              <div
                key={s.id}
                className="af-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigateTo('guide', s.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="text-base font-bold text-[#0B1F3A] dark:text-[#E8ECF1] truncate">{s.name}</h3>
                    {isCancelled ? (
                      <span className="af-pill bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold">
                        <span className="material-symbols-outlined text-xs">task_alt</span> Cancelled
                      </span>
                    ) : (
                      <span className={`af-pill ${getStatusClasses(kind)}`}>
                        <span className="material-symbols-outlined text-xs">{getStatusIcon(kind)}</span>
                        <span>{s.status?.label || 'Active'}</span>
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-800 text-[#5A6B80] dark:text-[#8899AA]">
                      {s.mech || 'Card'}
                    </span>
                  </div>
                  <p className="text-xs text-[#5A6B80] dark:text-[#8899AA] af-code truncate mb-1">
                    {s.code || ''}
                  </p>
                  <p className="text-xs text-[#0B1F3A] dark:text-[#E8ECF1] font-semibold">
                    ₹{s.price.toLocaleString('en-IN')}/{s.per || 'mo'} · {s.category || 'Other'}
                  </p>
                </div>
                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); navigateTo('guide', s.id); }}
                    className="af-btn af-btn-primary text-xs"
                  >
                    <span className="material-symbols-outlined text-sm">cancel</span>
                    <span>Cancel Guide</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    );
  }

  // Individual guide view
  const isCancelled = !!cancelledMap[sub.id];
  const steps = getMechanismSteps(sub);
  const emailText = buildCancellationEmail(sub);

  function getStatusClasses(kind) {
    const map = {
      hike: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      trial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      unused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      ended: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
    };
    return map[kind] || 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
  }

  function getStatusIcon(kind) {
    const map = {
      hike: 'trending_up',
      trial: 'new_releases',
      unused: 'visibility_off',
      active: 'check_circle',
      ended: 'cancel'
    };
    return map[kind] || 'help';
  }

  const statusKind = sub.status?.kind || 'active';
  const statusLabel = sub.status?.label || 'Active';

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
          onClick={() => navigateTo('dashboard')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5A6B80] hover:text-[#0B1F3A] dark:text-[#8899AA] dark:hover:text-[#E8ECF1] transition-colors focus:outline-none"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          <span>Back to Dashboard</span>
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
            Follow these instructions to stop debits from both the merchant and your payment mandate.
          </p>
        </div>

        {/* Distinct numbered circles with bold headers and muted subtext */}
        <div className="space-y-5">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-3.5">
              {/* Numbered Circle */}
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-bold text-sm shrink-0 mt-0.5 border border-blue-200 dark:border-blue-800/40">
                {idx + 1}
              </div>

              <div className="flex-1">
                <h3 className="text-sm font-semibold text-[#0B1F3A] dark:text-[#E8ECF1]">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#5A6B80] dark:text-[#8899AA] mt-0.5 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
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
      <div className="af-card mb-6 shadow-sm border-l-4 border-l-amber-500">
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
              className="af-btn af-btn-secondary text-xs shrink-0 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
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

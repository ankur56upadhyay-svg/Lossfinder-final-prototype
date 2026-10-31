import React from 'react';
import { useApp } from '../context/AppContext';
import PriceChart from './PriceChart';

export default function DetailView() {
  const {
    subscriptions,
    selectedSubId,
    navigateTo,
    cancelledMap,
    isDemo
  } = useApp();

  const sub = subscriptions.find(s => s.id === selectedSubId) || subscriptions[0];

  if (!sub) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="af-card text-center py-16 px-6 max-w-lg mx-auto shadow-sm">
          <span className="material-symbols-outlined text-5xl text-amber-500 mb-4">search_off</span>
          <h1 className="text-2xl font-bold text-[#0B1F3A] dark:text-[#E8ECF1] mb-2">
            Subscription Not Found
          </h1>
          <p className="text-[#5A6B80] dark:text-[#8899AA] text-sm mb-6">
            We couldn't locate details for this item.
          </p>
          <button
            type="button"
            onClick={() => navigateTo('dashboard')}
            className="af-btn af-btn-primary inline-flex"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Back to Dashboard</span>
          </button>
        </div>
      </main>
    );
  }

  const isCancelled = !!cancelledMap[sub.id];
  const statusKind = sub.status?.kind || 'active';
  const statusLabel = sub.status?.label || 'Active';

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

  const annualizedText = sub.per === 'yr'
    ? `Equivalent to ₹${Math.round(sub.price / 12).toLocaleString('en-IN')}/mo`
    : `Annualized cost: ₹${(sub.price * 12).toLocaleString('en-IN')}/year`;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb Navigation */}
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
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1F3A] dark:text-[#E8ECF1]">
              {sub.name}
            </h1>

            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className={`af-pill ${getStatusClasses(statusKind)}`}>
                <span className="material-symbols-outlined text-xs">
                  {getStatusIcon(statusKind)}
                </span>
                <span>{statusLabel}</span>
              </span>

              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E2E5EA]/70 dark:bg-[#2A3040] text-[#0B1F3A] dark:text-[#E8ECF1]">
                {sub.category || sub.what || 'Other'}
              </span>

              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                {sub.mech || 'Card'}
              </span>

              {isCancelled && (
                <span className="af-pill bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  <span className="material-symbols-outlined text-xs">check_circle</span>
                  <span>Cancelled</span>
                </span>
              )}
            </div>

            {/* Raw Narration Code */}
            <div className="mt-3 af-code text-xs text-[#5A6B80] dark:text-[#8899AA] flex items-center gap-2 flex-wrap">
              <span className="font-sans font-medium text-xs text-[#5A6B80] dark:text-[#8899AA]">
                Narration code:
              </span>
              <span className="bg-[#F5F6F8] dark:bg-[#0F1419] px-2 py-0.5 rounded border border-[#E2E5EA] dark:border-[#2A3040]">
                {sub.code || 'None'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
            <button
              type="button"
              onClick={() => navigateTo('guide', sub.id)}
              className="af-btn af-btn-primary"
            >
              <span className="material-symbols-outlined text-base">cancel</span>
              <span>View Cancel Guide</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pricing & Billing History Card */}
      <div className="af-card mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-[#0B1F3A] dark:text-[#E8ECF1] flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-blue-600 dark:text-blue-400">
              payments
            </span>
            <span>Pricing &amp; Billing History</span>
          </h2>
          <span className="text-xs text-[#5A6B80] dark:text-[#8899AA]">Monthly amounts (₹)</span>
        </div>

        {/* Big Price & Hike Block */}
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 border-b border-[#E2E5EA] dark:border-[#2A3040] pb-4 mb-4">
          <div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1F3A] dark:text-[#E8ECF1] font-mono">
                ₹{sub.price.toLocaleString('en-IN')}
              </span>
              <span className="text-lg text-[#5A6B80] dark:text-[#8899AA] font-medium">
                /{sub.per || 'mo'}
              </span>

              {typeof sub.was === 'number' && sub.was < sub.price && (
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  <span className="material-symbols-outlined text-sm">trending_up</span>
                  <span>was ₹{sub.was.toLocaleString('en-IN')} (+₹{(sub.price - sub.was).toLocaleString('en-IN')})</span>
                </div>
              )}
            </div>

            <p className="text-xs text-[#5A6B80] dark:text-[#8899AA] mt-1 font-mono">
              {annualizedText}
            </p>
          </div>

          <div className="text-xs text-[#5A6B80] dark:text-[#8899AA]">
            Billed via <span className="font-semibold text-[#0B1F3A] dark:text-[#E8ECF1]">{sub.mech || 'Card'}</span>
          </div>
        </div>

        {/* Bar Chart Container */}
        <div className="w-full mt-2">
          <PriceChart history={sub.history || []} />
        </div>
      </div>

      {/* Evidence & Explanation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Evidence Card */}
        <div className="af-card shadow-sm">
          <h2 className="text-base font-semibold text-[#0B1F3A] dark:text-[#E8ECF1] mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-blue-600 dark:text-blue-400">
              fact_check
            </span>
            <span>Evidence &amp; Observations</span>
          </h2>

          {sub.evidence && sub.evidence.length > 0 ? (
            <ul className="space-y-2.5">
              {sub.evidence.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-[#0B1F3A] dark:text-[#E8ECF1]">
                  <span className="material-symbols-outlined text-base text-blue-600 dark:text-blue-400 mt-0.5 shrink-0">
                    check_circle
                  </span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[#5A6B80] dark:text-[#8899AA] italic">
              No specific transaction observations recorded.
            </p>
          )}
        </div>

        {/* Explanation Card */}
        <div className="af-card shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#0B1F3A] dark:text-[#E8ECF1] mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg text-amber-500">
                lightbulb
              </span>
              <span>Summary &amp; Guidance</span>
            </h2>
            <p className="text-sm leading-relaxed text-[#0B1F3A] dark:text-[#E8ECF1]">
              {sub.explain || `${sub.name} charges ₹${sub.price} per ${sub.per || 'month'} via ${sub.mech || 'card'}.`}
            </p>
          </div>

          <div className="pt-6 mt-4 border-t border-[#E2E5EA] dark:border-[#2A3040] flex items-center justify-between">
            <span className="text-xs text-[#5A6B80] dark:text-[#8899AA]">
              Need to stop this auto-debit?
            </span>
            <button
              type="button"
              onClick={() => navigateTo('guide', sub.id)}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 focus:outline-none"
            >
              <span>How to cancel</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Actions */}
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
          onClick={() => navigateTo('guide', sub.id)}
          className="af-btn af-btn-primary"
        >
          <span className="material-symbols-outlined text-base">cancel</span>
          <span>View Cancel Guide</span>
        </button>
      </div>
    </main>
  );
}

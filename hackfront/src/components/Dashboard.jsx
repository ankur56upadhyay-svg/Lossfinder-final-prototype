import React from 'react';
import { useApp } from '../context/AppContext';
import { computeTotals } from '../engine/totals';

export default function Dashboard() {
  const {
    subscriptions,
    bankName,
    isDemo,
    cancelledMap,
    navigateTo,
    user
  } = useApp();

  const totals = computeTotals(subscriptions);
  const totalCount = subscriptions.length;
  const subWord = totalCount === 1 ? 'subscription' : 'subscriptions';
  const hikeCount = totals.hikeCount || 0;
  const hikeWord = hikeCount === 1 ? 'price increase' : 'price increases';

  if (!subscriptions.length) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="af-card flex flex-col items-center justify-center text-center py-16 px-6 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-[#0B5FD8] dark:text-[#4D9AFF] flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-4xl">search_off</span>
          </div>
          <h3 className="text-xl font-bold text-[#0B1F3A] dark:text-[#E8ECF1] mb-2">
            No recurring payments found
          </h3>
          <p className="text-sm text-[#5A6B80] dark:text-[#8899AA] max-w-md mb-6 leading-relaxed">
            We analyzed your statement but could not detect standing instructions, recurring cycles, or active subscriptions.
          </p>
          <button
            type="button"
            onClick={() => navigateTo('upload')}
            className="af-btn af-btn-primary"
          >
            <span className="material-symbols-outlined text-lg">upload_file</span>
            <span>Upload another statement</span>
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
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] dark:text-[#E8ECF1] tracking-tight">
              Subscriptions &amp; Recurring Payments
            </h1>
            {isDemo && (
              <span className="af-demo-chip">
                <span className="material-symbols-outlined text-xs">science</span> Demo Mode
              </span>
            )}
          </div>
          <p className="text-sm text-[#5A6B80] dark:text-[#8899AA] mt-1">
            {isDemo ? (
              'Viewing sample recurring auto-debit profile'
            ) : (
              <>
                Statement source:{' '}
                <strong className="text-[#0B1F3A] dark:text-[#E8ECF1]">{bankName}</strong>
                {user && (
                  <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Neo4j Synchronized
                  </span>
                )}
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigateTo('annual')}
            className="af-btn af-btn-secondary text-xs py-2 px-4 shadow-sm"
          >
            <span className="material-symbols-outlined text-base">bar_chart</span>
            <span>Annual View</span>
          </button>
          <button
            type="button"
            onClick={() => navigateTo('upload')}
            className="af-btn af-btn-secondary text-xs py-2 px-4 shadow-sm"
          >
            <span className="material-symbols-outlined text-base">upload_file</span>
            <span>New Statement</span>
          </button>
        </div>
      </div>

      {/* Top 3 Distinct Metric Cards with proper gap spacing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {/* Card 1: Total Yearly Spend */}
        <div className="af-card flex flex-col justify-between p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5A6B80] dark:text-[#8899AA]">
              TOTAL YEARLY SPEND
            </span>
            <span className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-[#0B5FD8] dark:text-[#4D9AFF] flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">payments</span>
            </span>
          </div>
          <div>
            <div className="text-3xl font-bold text-[#0B1F3A] dark:text-[#E8ECF1] mb-1 font-sans">
              ₹{totals.yearlySpend.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-[#5A6B80] dark:text-[#8899AA]">
              across {totalCount} {subWord}
            </div>
          </div>
        </div>

        {/* Card 2: Extra From Price Hikes */}
        <div className="af-card flex flex-col justify-between p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5A6B80] dark:text-[#8899AA]">
              EXTRA FROM PRICE HIKES
            </span>
            <span className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">trending_up</span>
            </span>
          </div>
          <div>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1 font-sans">
              ₹{totals.hikeExtra.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-[#5A6B80] dark:text-[#8899AA]">
              per year from {hikeCount} {hikeWord}
            </div>
          </div>
        </div>

        {/* Card 3: Possibly Unused */}
        {totals.unusedAmount === 0 ? (
          <div className="af-card flex flex-col justify-between p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5A6B80] dark:text-[#8899AA]">
                POSSIBLY UNUSED
              </span>
              <span className="w-9 h-9 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">check_circle</span>
              </span>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1 font-sans">
                ₹0
              </div>
              <div className="text-xs text-green-700 dark:text-green-400 font-medium">
                All services appear active
              </div>
            </div>
          </div>
        ) : (
          <div className="af-card flex flex-col justify-between p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5A6B80] dark:text-[#8899AA]">
                POSSIBLY UNUSED
              </span>
              <span className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">visibility_off</span>
              </span>
            </div>
            <div>
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-1 font-sans">
                ₹{totals.unusedAmount.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-[#5A6B80] dark:text-[#8899AA]">
                per year on unknown-usage services
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Subscriptions Data Table */}
      <div className="af-card p-0 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#E2E5EA] dark:border-[#2A3040] flex items-center justify-between">
          <h2 className="font-bold text-base text-[#0B1F3A] dark:text-[#E8ECF1]">
            Detected Subscriptions
          </h2>
          <span className="text-xs text-[#5A6B80] dark:text-[#8899AA]">
            {subscriptions.length} active &amp; past debits
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="af-table w-full">
            <thead>
              <tr>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Frequency</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => {
                const isCancelled = !!cancelledMap[sub.id];
                const statusKind = sub.status?.kind || 'active';
                const statusLabel = sub.status?.label || 'Active';
                const frequency = sub.per === 'yr' ? 'Yearly' : 'Monthly';

                return (
                  <tr
                    key={sub.id}
                    onClick={() => navigateTo('detail', sub.id)}
                    className={`transition-colors ${isCancelled ? 'opacity-65' : ''}`}
                  >
                    {/* Service */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center">
                        <span className={`font-semibold text-[#0B1F3A] dark:text-[#E8ECF1] truncate max-w-[200px] sm:max-w-xs ${isCancelled ? 'line-through text-gray-500' : ''}`}>
                          {sub.name}
                        </span>
                        {isCancelled && (
                          <span className="af-pill bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 ml-2">
                            Cancelled
                          </span>
                        )}
                      </div>
                      <div className="af-code mt-0.5 truncate max-w-[200px] sm:max-w-xs" title={sub.code}>
                        {sub.code || ''}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {typeof sub.was === 'number' && sub.was < sub.price ? (
                        <>
                          <span className="line-through text-xs text-[#5A6B80] dark:text-[#8899AA] mr-1.5 font-mono">
                            ₹{sub.was.toLocaleString('en-IN')}
                          </span>
                          <span className="font-bold text-[#0B1F3A] dark:text-[#E8ECF1] font-mono">
                            ₹{sub.price.toLocaleString('en-IN')}
                          </span>
                        </>
                      ) : (
                        <span className="font-bold text-[#0B1F3A] dark:text-[#E8ECF1] font-mono">
                          ₹{sub.price.toLocaleString('en-IN')}
                        </span>
                      )}
                    </td>

                    {/* Frequency */}
                    <td className="py-3.5 px-4 text-[#5A6B80] dark:text-[#8899AA] whitespace-nowrap">
                      {frequency}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`af-pill ${getStatusClasses(statusKind)}`}>
                        <span className="material-symbols-outlined text-[13px]">
                          {getStatusIcon(statusKind)}
                        </span>
                        <span>{statusLabel}</span>
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 text-[#5A6B80] dark:text-[#8899AA] whitespace-nowrap">
                      {sub.category || sub.what || 'Other'}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-3 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => navigateTo('detail', sub.id)}
                          className="text-[#0B5FD8] dark:text-[#4D9AFF] hover:underline focus:outline-none"
                        >
                          Details
                        </button>
                        <span className="text-[#E2E5EA] dark:text-[#2A3040]">|</span>
                        <button
                          type="button"
                          onClick={() => navigateTo('guide', sub.id)}
                          className="text-red-600 dark:text-red-400 hover:underline focus:outline-none"
                        >
                          Cancel guide
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

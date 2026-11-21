import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

function formatDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Date unavailable'
    : date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function AnalysisHistory() {
  const [openError, setOpenError] = useState('');
  const {
    analysisHistory,
    historyLoading,
    historyError,
    openingImportId,
    refreshAnalysisHistory,
    openAnalysis,
    navigateTo
  } = useApp();

  async function handleOpen(importId) {
    setOpenError('');
    try {
      await openAnalysis(importId);
    } catch (error) {
      // Keep the list visible so the user can retry opening this analysis.
      setOpenError(error.message || 'Could not open this analysis. Please retry.');
    }
  }

  return <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#0B5FD8] dark:text-[#4D9AFF]">Your workspace</p>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1">Past analyses</h1>
        <p className="text-sm text-[#5A6B80] dark:text-[#8899AA] mt-2">Each upload is saved as a separate analysis. Open one to see its results and decisions.</p>
      </div>
      <button type="button" onClick={() => navigateTo('upload')} className="af-btn af-btn-primary shrink-0">
        <span className="material-symbols-outlined text-lg">upload_file</span>
        Upload new statement
      </button>
    </div>

    {historyError && <div className="af-card border border-red-300 dark:border-red-900/60" role="alert">
      <p className="text-sm text-red-600 dark:text-red-400">{historyError}</p>
      <button type="button" onClick={() => refreshAnalysisHistory().catch(() => {})} className="text-sm font-semibold text-[#0B5FD8] dark:text-[#4D9AFF] mt-2 hover:underline">Retry loading</button>
    </div>}
    {openError && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{openError}</p>}

    {historyLoading && <div className="af-card flex items-center gap-3" role="status"><div className="af-spinner" /><span>Loading your analyses…</span></div>}

    {!historyLoading && !historyError && !analysisHistory.length && <div className="af-card text-center py-14 px-6">
      <span className="material-symbols-outlined text-4xl text-[#0B5FD8] dark:text-[#4D9AFF]">folder_open</span>
      <h2 className="text-lg font-semibold mt-3">No saved analyses yet</h2>
      <p className="text-sm text-[#5A6B80] dark:text-[#8899AA] mt-2">Upload a bank statement to create your first one.</p>
      <button type="button" onClick={() => navigateTo('upload')} className="af-btn af-btn-primary mt-5">Upload new statement</button>
    </div>}

    {!!analysisHistory.length && <section className="space-y-3" aria-label="Saved analyses">
      {analysisHistory.map(item => {
        const names = item.fileNames?.length ? item.fileNames.join(', ') : item.bankName || 'Earlier statement';
        const busy = openingImportId === item.importId;
        return <article key={item.importId} className="af-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-semibold truncate" title={names}>{names}</h2>
            <p className="text-xs text-[#5A6B80] dark:text-[#8899AA] mt-1">{formatDate(item.importedAt)} · {item.transactionCount ?? 0} transactions</p>
            {item.dateRangeStart && item.dateRangeEnd && <p className="text-xs text-[#5A6B80] dark:text-[#8899AA] mt-1">Statement dates: {item.dateRangeStart} to {item.dateRangeEnd}</p>}
          </div>
          <button type="button" onClick={() => handleOpen(item.importId)} disabled={!!openingImportId} className="af-btn af-btn-secondary shrink-0 disabled:opacity-50">
            {busy ? 'Opening…' : 'Open analysis'}
          </button>
        </article>;
      })}
    </section>}
  </main>;
}

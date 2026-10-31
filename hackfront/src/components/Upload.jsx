import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { validateBankCsvHeaders } from '../engine/parse';
import { SAMPLE_STATEMENT_CSV, SAMPLE_USAGE_CSV } from '../data/demoData';

export default function Upload() {
  const {
    user,
    isGuest,
    startGuestMode,
    openAuthModal,
    analyzeStatement,
    loadSampleData,
    showToast
  } = useApp();

  // If user is already authenticated or has clicked Guest, show upload screen directly
  const [showUploadBoxes, setShowUploadBoxes] = useState(isGuest || !!user);

  // File state
  const [bankFile, setBankFile] = useState(null);
  const [bankCsvText, setBankCsvText] = useState('');
  const [usageFile, setUsageFile] = useState(null);
  const [usageCsvText, setUsageCsvText] = useState('');

  // Info toggles
  const [showBankHelp, setShowBankHelp] = useState(false);
  const [showUsageHelp, setShowUsageHelp] = useState(false);

  // Drag states
  const [bankDragOver, setBankDragOver] = useState(false);
  const [usageDragOver, setUsageDragOver] = useState(false);

  // Loading & error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // File input refs
  const bankInputRef = useRef(null);
  const usageInputRef = useRef(null);

  // File handlers
  function handleBankFileSelect(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a .csv file for the bank statement.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      if (!validateBankCsvHeaders(content)) {
        setError('Invalid CSV format: Statement must include Date, Narration/Description, and Debit/Amount columns.');
        return;
      }
      setError('');
      setBankFile(file);
      setBankCsvText(content);
    };
    reader.onerror = () => {
      setError('Failed to read the statement file. Please try again.');
    };
    reader.readAsText(file);
  }

  function handleUsageFileSelect(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Usage log must be a .csv file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setUsageFile(file);
      setUsageCsvText(e.target.result);
      setError('');
    };
    reader.readAsText(file);
  }

  function clearBankFile(e) {
    e?.stopPropagation();
    setBankFile(null);
    setBankCsvText('');
    if (bankInputRef.current) bankInputRef.current.value = '';
  }

  function clearUsageFile(e) {
    e?.stopPropagation();
    setUsageFile(null);
    setUsageCsvText('');
    if (usageInputRef.current) usageInputRef.current.value = '';
  }

  async function handleAnalyze() {
    if (!bankCsvText) {
      setError('Please select a bank statement CSV to analyze.');
      return;
    }

    setError('');
    setLoading(true);

    setTimeout(async () => {
      try {
        await analyzeStatement(bankCsvText, usageCsvText);
      } catch (err) {
        setError(err.message || 'An error occurred during analysis.');
      } finally {
        setLoading(false);
      }
    }, 400);
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col">
      {/* Main centered content */}
      <main className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 flex flex-col items-center text-center">

    {/* Back to Home button for Guest mode */}
      {isGuest && (
        <div className="w-full flex justify-start mb-4">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-1 text-xs font-semibold text-[#5A6B80] dark:text-[#8899AA] hover:text-[#0B1F3A] dark:hover:text-[#E8ECF1]"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Back to Home</span>
          </button>
        </div>
      )}
      
      {/* App Logo & Title */}
      <div className="flex items-center justify-center gap-3 mb-2">
        <span className="material-symbols-outlined text-[#0B5FD8] dark:text-[#4D9AFF] text-4xl">
          account_balance_wallet
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0B1F3A] dark:text-[#E8ECF1]">
          Loss Finder
        </h1>
      </div>

      {/* Subtitle */}
      <p className="text-base sm:text-lg text-[#5A6B80] dark:text-[#8899AA] mb-6">
        Find the recurring payments hiding in your bank statement
      </p>

      {/* Privacy Badge — Restored exact prototype UI */}
      {(!user || isGuest) ? (
        <div className="af-privacy mb-8 text-left max-w-md shadow-sm">
          <span className="material-symbols-outlined text-lg text-emerald-600 dark:text-emerald-400 flex-shrink-0">
            lock
          </span>
          <span className="text-xs sm:text-sm font-medium">
            Secure statement analysis. No bank login required.
          </span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 text-xs sm:text-sm font-medium mb-8 text-left max-w-md">
          <span className="material-symbols-outlined text-lg text-[#0B5FD8] dark:text-[#4D9AFF]">
            cloud_sync
          </span>
          <span>
            Logged in as <strong>{user.email}</strong>. Analysis will sync to your Neo4j graph.
          </span>
        </div>
      )}

      {/* Auth Section (Initial View if not chosen yet) */}
      {!showUploadBoxes && !user ? (
        <div className="w-full max-w-md flex flex-col gap-3">
          <button
            type="button"
            onClick={() => {
              startGuestMode();
              setShowUploadBoxes(true);
            }}
            className="af-btn af-btn-primary w-full py-3.5 text-base shadow-sm"
          >
            <span>Continue as Guest</span>
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>

          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="af-btn af-btn-secondary w-full py-3 text-base"
          >
            <span className="material-symbols-outlined text-xl">account_circle</span>
            <span>Sign in / Register for Neo4j Storage</span>
          </button>
        </div>
      ) : (
        /* Restored Upload Section */
        <div className="w-full text-left">
          {/* Error State Alert Box */}
          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm flex items-start gap-2.5">
              <span className="material-symbols-outlined text-lg flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5">
                error
              </span>
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* Bank Statement CSV Dropzone (Required) */}
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <label className="block text-xs font-semibold text-[#5A6B80] dark:text-[#8899AA] uppercase tracking-wider">
                Bank Statement CSV <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowBankHelp(prev => !prev)}
                className="text-[#0B5FD8] dark:text-[#4D9AFF] hover:opacity-80 transition-opacity flex items-center"
                title="How to download statement"
              >
                <span className="material-symbols-outlined text-[16px]">info</span>
              </button>
            </div>

            {/* Instruction Help Box */}
            {showBankHelp && (
              <div className="mb-3 p-3.5 rounded-xl bg-blue-50 dark:bg-[#0B5FD8]/10 border border-blue-100 dark:border-[#0B5FD8]/20 text-xs text-left animate-fadeIn">
                <p className="font-semibold text-[#0B1F3A] dark:text-[#E8ECF1] mb-1.5">
                  How to download your bank statement:
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-[#5A6B80] dark:text-[#8899AA]">
                  <li>Log into your net banking portal (e.g., HDFC, SBI, ICICI, Axis) on desktop.</li>
                  <li>Navigate to <strong>Account Statements</strong> or <strong>Historical Transactions</strong>.</li>
                  <li>Select a date range (exporting the last 6 to 12 months yields the highest accuracy).</li>
                  <li>Click <strong>Download</strong> and choose the <strong>CSV</strong> format.</li>
                </ol>
              </div>
            )}

            {/* Primary Dropzone */}
            <div
              onClick={() => bankInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setBankDragOver(true); }}
              onDragLeave={() => setBankDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setBankDragOver(false);
                if (e.dataTransfer.files?.[0]) handleBankFileSelect(e.dataTransfer.files[0]);
              }}
              className={`af-dropzone flex flex-col items-center justify-center gap-2 p-6 transition-colors ${
                bankDragOver ? 'active' : ''
              }`}
            >
              <input
                ref={bankInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => e.target.files?.[0] && handleBankFileSelect(e.target.files[0])}
                className="hidden"
              />
              <span className="material-symbols-outlined text-4xl text-[#0B5FD8] dark:text-[#4D9AFF]">
                upload_file
              </span>

              {!bankFile ? (
                <div className="text-center">
                  <p className="font-medium text-sm text-[#0B1F3A] dark:text-[#E8ECF1]">
                    <span className="text-[#0B5FD8] dark:text-[#4D9AFF] font-semibold underline">Browse</span> or drag &amp; drop statement CSV
                  </p>
                  <p className="text-xs text-[#5A6B80] dark:text-[#8899AA] mt-1">
                    Supports HDFC, ICICI, SBI, Axis, Kotak, and standard bank CSVs
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-xs font-medium">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span className="font-semibold truncate max-w-[220px]">{bankFile.name}</span>
                  <button
                    type="button"
                    onClick={clearBankFile}
                    className="text-xs underline ml-1 text-gray-500 hover:text-red-600 focus:outline-none"
                    title="Remove file"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Usage CSV Dropzone (Optional) */}
          <div className="mb-5">
            <div className="flex items-center gap-1.5 mb-2">
              <label className="block text-xs font-semibold text-[#5A6B80] dark:text-[#8899AA] uppercase tracking-wider">
                Usage Log CSV <span className="text-xs font-normal lowercase">(optional)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowUsageHelp(prev => !prev)}
                className="text-[#0B5FD8] dark:text-[#4D9AFF] hover:opacity-80 transition-opacity flex items-center"
                title="Where to get usage logs"
              >
                <span className="material-symbols-outlined text-[16px]">info</span>
              </button>
            </div>

            {/* Instruction Help Box */}
            {showUsageHelp && (
              <div className="mb-3 p-3.5 rounded-xl bg-blue-50 dark:bg-[#0B5FD8]/10 border border-blue-100 dark:border-[#0B5FD8]/20 text-xs text-left animate-fadeIn">
                <p className="font-semibold text-[#0B1F3A] dark:text-[#E8ECF1] mb-1.5">
                  Where to find activity logs:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-[#5A6B80] dark:text-[#8899AA]">
                  <li><strong>Apple / iOS:</strong> Export reports via Screen Time settings.</li>
                  <li><strong>Google / Android:</strong> Use Google Takeout to export YouTube or app history.</li>
                  <li><strong>Streaming (Netflix, etc.):</strong> Download "Viewing Activity" from account settings.</li>
                  <li><strong>Physical Gyms:</strong> Request a check-in export from front desk.</li>
                </ul>
              </div>
            )}

            {/* Secondary Dropzone */}
            <div
              onClick={() => usageInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setUsageDragOver(true); }}
              onDragLeave={() => setUsageDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setUsageDragOver(false);
                if (e.dataTransfer.files?.[0]) handleUsageFileSelect(e.dataTransfer.files[0]);
              }}
              className={`af-dropzone flex items-center justify-center gap-3 py-3 px-4 transition-colors ${
                usageDragOver ? 'active' : ''
              }`}
            >
              <input
                ref={usageInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => e.target.files?.[0] && handleUsageFileSelect(e.target.files[0])}
                className="hidden"
              />
              <span className="material-symbols-outlined text-xl text-[#5A6B80] dark:text-[#8899AA]">
                history
              </span>

              {!usageFile ? (
                <div className="text-xs text-[#5A6B80] dark:text-[#8899AA]">
                  <span className="text-[#0B5FD8] dark:text-[#4D9AFF] font-semibold underline">Upload usage log</span> for dormancy &amp; waste insights
                </div>
              ) : (
                <div className="flex items-center gap-2 px-2.5 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md text-xs font-medium">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span className="truncate max-w-[180px]">{usageFile.name}</span>
                  <button
                    type="button"
                    onClick={clearUsageFile}
                    className="text-xs underline text-gray-500 hover:text-red-600 focus:outline-none"
                    title="Remove file"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Upload & Analyze Action or Spinner */}
          {!loading ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!bankFile}
                className="af-btn af-btn-primary w-full py-3.5 text-base shadow-sm"
              >
                <span className="material-symbols-outlined text-lg">auto_awesome</span>
                <span>Upload &amp; Analyze</span>
              </button>

              {/* OR Separator */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="w-full border-t border-[#E2E5EA] dark:border-[#2A3040]" />
                <span className="absolute px-3 bg-[#F5F6F8] dark:bg-[#0F1419] text-xs font-semibold text-[#5A6B80] dark:text-[#8899AA] uppercase tracking-wider">
                  or
                </span>
              </div>

              {/* Load Sample Button */}
              <button
                type="button"
                onClick={loadSampleData}
                className="af-btn af-btn-secondary w-full py-2.5 text-sm"
              >
                <span className="material-symbols-outlined text-base">visibility</span>
                <span>Load sample data</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 gap-3">
              <div className="af-spinner" />
              <p className="text-sm font-medium text-[#5A6B80] dark:text-[#8899AA]">
                Analyzing statement &amp; identifying recurring debits...
              </p>
            </div>
          )}
        </div>
      )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 text-xs text-[#5A6B80] dark:text-[#8899AA]">
        Loss Finder — 100% In-Browser Private Statement Analysis
      </footer>
    </div>
  );
}

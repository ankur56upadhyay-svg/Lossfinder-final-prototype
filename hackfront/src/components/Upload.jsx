import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { validateBankCsvHeaders, parseCSV } from '../engine/parse';
import { readPdfStatement } from '../engine/readPdfStatement';
import AccountAggregatorDemo from './AccountAggregatorDemo';
import LandingBackdrop from './landing-effects/LandingBackdrop';
import CursorGlow from './landing-effects/CursorGlow';
import './LandingPage.css';
import './UploadPage.css';

const MAX_FILES_PER_TWO_WEEKS = 10;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_ROWS = 20000;
const MAX_STATEMENT_DAYS = 731;
const GUEST_QUOTA_KEY = 'lossfinder_guest_upload_times';

function guestUploadTimes() {
  try {
    const saved = JSON.parse(localStorage.getItem(GUEST_QUOTA_KEY) || '[]');
    const cutoff = Date.now() - 14 * 86400000;
    return Array.isArray(saved) ? saved.filter(time => Number.isFinite(time) && time >= cutoff) : [];
  } catch {
    return [];
  }
}

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
  const [bankFiles, setBankFiles] = useState([]);
  const [usageFile, setUsageFile] = useState(null);
  const [usageCsvText, setUsageCsvText] = useState('');

  // Info toggles
  const [showBankHelp, setShowBankHelp] = useState(false);
  const [showUsageHelp, setShowUsageHelp] = useState(false);
  const [showUsageUpload, setShowUsageUpload] = useState(false);

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
  async function handleBankFileSelect(files) {
    const picked = Array.from(files || []);
    if (!picked.length) return;
    try {
      const known = new Set(bankFiles.map(item => `${item.name}:${item.size}:${item.lastModified}`));
      const added = [];
      if (bankFiles.length + picked.length > MAX_FILES_PER_TWO_WEEKS) throw new Error('You can select at most 10 statements in one analysis. Signed-in accounts can upload 10 files every 14 days.');
      if (!user && guestUploadTimes().length + bankFiles.length + picked.length > MAX_FILES_PER_TWO_WEEKS) {
        throw new Error('This browser has reached the 10 statement files per 14 days limit. Please try again when an earlier upload expires.');
      }
      for (const file of picked) {
        const extension = file.name.toLowerCase().split('.').pop();
        if (!['csv', 'pdf'].includes(extension)) throw new Error(`${file.name}: please select a CSV or PDF statement.`);
        if (file.size > MAX_FILE_BYTES) throw new Error(`${file.name}: the 5 MB file limit was exceeded. Export a shorter date range.`);
        const key = `${file.name}:${file.size}:${file.lastModified}`;
        if (known.has(key)) continue;
        let rows;
        if (extension === 'pdf') {
          rows = await readPdfStatement(file);
        } else {
          const text = await file.text();
          if (!validateBankCsvHeaders(text)) throw new Error(`${file.name}: Date, Narration and Debit/Amount columns are required.`);
          rows = parseCSV(text);
        }
        if (!rows.length) throw new Error(`${file.name}: no readable transactions were found.`);
        const first = rows[0].transactionDate;
        const last = rows[rows.length - 1].transactionDate;
        if ((Date.parse(last) - Date.parse(first)) / 86400000 > MAX_STATEMENT_DAYS) {
          throw new Error(`${file.name}: this statement spans more than two years. Export a shorter date range.`);
        }
        added.push({ name: file.name, size: file.size, lastModified: file.lastModified, transactions: rows, count: rows.length });
        known.add(key);
      }
      if (bankFiles.reduce((total, file) => total + file.count, 0) + added.reduce((total, file) => total + file.count, 0) > MAX_TOTAL_ROWS) {
        throw new Error('An analysis can contain at most 20,000 transaction rows. Upload fewer statements together.');
      }
      setBankFiles(previous => [...previous, ...added]);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not read the selected statements.');
    }
  }

  function handleUsageFileSelect(file) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError('Usage log exceeds the 5 MB file limit.');
      return;
    }
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

  function clearBankFile(e, name) {
    e?.stopPropagation();
    setBankFiles(previous => previous.filter(file => file.name !== name));
    if (bankInputRef.current) bankInputRef.current.value = '';
  }

  function clearUsageFile(e) {
    e?.stopPropagation();
    setUsageFile(null);
    setUsageCsvText('');
    if (usageInputRef.current) usageInputRef.current.value = '';
  }

  async function handleAnalyze() {
    if (!bankFiles.length) {
      setError('Please select a bank statement CSV or PDF to analyze.');
      return;
    }
    if (!user && guestUploadTimes().length + bankFiles.length > MAX_FILES_PER_TWO_WEEKS) {
      setError('This browser has reached the 10 statement files per 14 days limit.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await analyzeStatement(bankFiles, usageCsvText);
      if (!user) {
        try {
          localStorage.setItem(GUEST_QUOTA_KEY, JSON.stringify([...guestUploadTimes(), ...bankFiles.map(() => Date.now())]));
        } catch {
          // Guest analyses still work when browser storage is disabled.
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred during analysis.');
    } finally {
      setLoading(false);
    }
  }

  if (!showUploadBoxes && !user) {
    return (
      <div className="lf-landing">
        <LandingBackdrop />
        <CursorGlow />
        <main className="lf-landing-main">
          <div className="lf-landing-content">
            <h1 className="lf-landing-title">
              <span className="lf-landing-mask"><span className="lf-landing-line lf-landing-line-one">Find the recurring payments</span></span>
              <span className="lf-landing-mask"><span className="lf-landing-line lf-landing-line-two">hiding in your bank statement</span></span>
            </h1>
            <div className="lf-landing-privacy">
              <span className="material-symbols-outlined" aria-hidden="true">lock</span>
              Secure statement analysis. No bank login required.
            </div>
            <div className="lf-landing-actions">
              <button type="button" onClick={() => { startGuestMode(); setShowUploadBoxes(true); }} className="lf-landing-button lf-landing-button-primary">
                Continue as Guest
              </button>
              <button type="button" onClick={() => openAuthModal('login')} className="lf-landing-button lf-landing-button-secondary">
                Sign in / Register for Neo4j Storage
              </button>
            </div>
          </div>
        </main>
        <footer className="lf-landing-footer">Guest analysis stays in your browser. Signed-in imports save transactions to Neo4j.</footer>
      </div>
    );
  }

  return (
    <div className="lf-upload-page min-h-[calc(100vh-64px)] flex flex-col">
      {/* Main centered content */}
      <main className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="lf-upload-content w-full max-w-[590px] mx-auto px-4 sm:px-6 py-8 flex flex-col items-center text-center">

      <h1 className="lf-upload-title text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] dark:text-[#F1F5F9] mb-3">
        Upload your statements
      </h1>
      <p className="lf-upload-subtitle">Find recurring payments, price rises and subscriptions worth reviewing.</p>

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
            Logged in as <strong>{user.email}</strong>. CSV/PDF imports save to Neo4j; the AA demo stays in this browser session.
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

          {/* Bank statement dropzone (Required) */}
          <div className="mb-4">
            <div className="flex items-center justify-between gap-1.5 mb-2">
              <label className="block text-xs font-semibold text-[#5A6B80] dark:text-[#8899AA] uppercase tracking-wider">
                Bank Statement CSVs or PDFs <span className="text-red-500">*</span>
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
                  <li>Click <strong>Download</strong> and choose <strong>CSV</strong> or a text-based <strong>PDF</strong>. Scanned image PDFs are not supported.</li>
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
                handleBankFileSelect(e.dataTransfer.files);
              }}
              className={`af-dropzone lf-upload-bank-dropzone flex flex-col items-center justify-center gap-2 p-6 transition-colors ${
                bankDragOver ? 'active' : ''
              }`}
            >
              <input
                ref={bankInputRef}
                type="file"
                multiple
                accept=".csv,.pdf,text/csv,application/pdf"
                onChange={(e) => { handleBankFileSelect(e.target.files); e.target.value = ''; }}
                className="hidden"
              />
              <span className="lf-upload-file-icon material-symbols-outlined text-4xl text-[#0B5FD8] dark:text-[#4D9AFF]">
                upload_file
              </span>

              {!bankFiles.length ? (
                <div className="text-center">
                  <p className="font-medium text-sm text-[#0B1F3A] dark:text-[#E8ECF1]">
                    <span className="text-[#0B5FD8] dark:text-[#4D9AFF] font-semibold underline">Browse</span> or drag &amp; drop one or more statement CSVs or PDFs
                  </p>
                  <p className="text-xs text-[#5A6B80] dark:text-[#8899AA] mt-1">
                    Supports bank CSVs and text-based PDF tables with date, description and debit/credit columns
                  </p>
                  <p className="text-xs text-[#5A6B80] dark:text-[#8899AA] mt-1">Up to 5 MB and two years per statement · 10 files every 14 days</p>
                </div>
              ) : (
                <div className="w-full text-left text-xs" onClick={e => e.stopPropagation()}>
                  <p className="font-semibold text-emerald-600 mb-2">{bankFiles.length} statement{bankFiles.length === 1 ? '' : 's'} ready · {bankFiles.reduce((sum, file) => sum + file.count, 0)} rows read</p>
                  {bankFiles.map(file => <div key={`${file.name}:${file.lastModified}`} className="flex justify-between gap-2 py-1">
                    <span className="truncate">{file.name} · {file.count} rows</span>
                    <button type="button" onClick={e => clearBankFile(e, file.name)} className="text-red-500 underline">Remove</button>
                  </div>)}
                  <p className="text-[#5A6B80] dark:text-[#8899AA] mt-2">Click here to add more statements.</p>
                </div>
              )}
            </div>
          </div>

          {!user && !loading && <button type="button" onClick={loadSampleData} className="af-btn af-btn-primary w-full mb-4">
            <span className="material-symbols-outlined text-base">visibility</span>
            Try demo statement
          </button>}

          <button type="button" className="lf-optional-toggle" onClick={() => setShowUsageUpload(value => !value)} aria-expanded={showUsageUpload}>
            <span className="material-symbols-outlined text-base">add</span>{showUsageUpload ? 'Hide optional usage log' : usageFile ? `Usage log selected: ${usageFile.name}` : 'Add usage log (optional)'}
          </button>
          {/* Usage CSV Dropzone (Optional) */}
          {showUsageUpload && <div className="mb-5">
            <div className="flex items-center justify-between gap-1.5 mb-2">
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
              className={`af-dropzone lf-upload-usage-dropzone flex items-center justify-center gap-3 py-3 px-4 transition-colors ${
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
          </div>}

          {/* Upload & Analyze Action or Spinner */}
          {!loading ? (
            <div className="lf-upload-actions space-y-3">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!bankFiles.length}
                className="af-btn af-btn-secondary lf-upload-submit w-full text-base"
              >
                <span className="material-symbols-outlined text-lg">auto_awesome</span>
                <span>Upload &amp; analyze statement</span>
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
          {!loading && <AccountAggregatorDemo />}
        </div>
      )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full text-center py-4 text-xs text-[#5A6B80] dark:text-[#8899AA]">
        Guest analysis and the fictional AA demo stay in your browser session. Signed-in CSV/PDF imports save transactions to Neo4j.
      </footer>
    </div>
  );
}

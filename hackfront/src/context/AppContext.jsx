import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { useLossFinderApi } from '../hooks/useLossFinderApi';
import { api } from '../services/api';
import { parseCSV, parseUsageCSV } from '../engine/parse';
import { enrichTransactions } from '../engine/merchants';
import { findRecurring } from '../engine/recurring';
import { applyFlags } from '../engine/flags';
import { computeTotals } from '../engine/totals';
import { DEMO_SUBSCRIPTIONS, SAMPLE_STATEMENT_CSV, SAMPLE_USAGE_CSV } from '../data/demoData';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Theme state: dark / light
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('af_theme');
      if (stored) return stored;
      return 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('af_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  // API hook
  const {
    user,
    setUser,
    loadingUser,
    apiLoading,
    apiError,
    setApiError,
    login,
    register,
    logout:apiLogout,
    deleteAccount:apiDeleteAccount,
    importToNeo4j
  } = useLossFinderApi();

  // Navigation state: 'history' | 'upload' | 'dashboard' | 'detail' | 'guide'
  const [view, setView] = useState('upload');
  const [selectedSubId, setSelectedSubId] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [openingImportId, setOpeningImportId] = useState(null);
  const [activeImportId, setActiveImportId] = useState(null);

  // Guest mode toggle (ephemeral in-memory state: wiped on refresh or tab close!)
  const [isGuest, setIsGuest] = useState(false);

  // Subscriptions & statement state (kept strictly in React memory for Guest mode)
  const [subscriptions, setSubscriptions] = useState([]);
  const [bankName, setBankName] = useState('Uploaded Bank Statement');
  const [isDemo, setIsDemo] = useState(false);
  const [cancelledMap, setCancelledMap] = useState({});
  const [reviewDecisions, setReviewDecisions] = useState({});

  // Auth Modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' | 'register'
  const [deleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
  const openDeleteAccountModal = useCallback(() => setDeleteAccountModalOpen(true), []);
  const closeDeleteAccountModal = useCallback(() => setDeleteAccountModalOpen(false), []);

  // Toast notification state
  const [toast, setToast] = useState(null);
  const clearAccountView = useCallback(() => {
    setView('upload');
    setSelectedSubId(null);
    setSubscriptions([]);
    setBankName('Uploaded Bank Statement');
    setIsDemo(false);
    setIsGuest(false);
    setCancelledMap({});
    setReviewDecisions({});
    setAnalysisHistory([]);
    setHistoryLoading(false);
    setHistoryError('');
    setOpeningImportId(null);
    setActiveImportId(null);
    setAuthModalOpen(false);
    setDeleteAccountModalOpen(false);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    clearAccountView();
  }, [apiLogout, clearAccountView]);

  const showToast = useCallback((message, options = {}) => {
    setToast({
      id: Date.now(),
      message,
      actionLabel: options.actionLabel || null,
      onAction: options.onAction || null
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const deleteAccount = useCallback(async (password) => {
    await apiDeleteAccount(password);
    clearAccountView();
    showToast('Your account and saved data were deleted.');
  }, [apiDeleteAccount, clearAccountView, showToast]);

  const refreshAnalysisHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const result = await api.imports.list();
      setAnalysisHistory(result.imports || []);
      return result.imports || [];
    } catch (error) {
      setHistoryError(error.message || 'Could not load your analyses.');
      throw error;
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Sign-in always lands on the user's analysis list, including for a new account.
  useLayoutEffect(() => {
    if (!user) return;
    let active = true;
    setIsGuest(false);
    setIsDemo(false);
    setSubscriptions([]);
    setReviewDecisions({});
    setCancelledMap({});
    setActiveImportId(null);
    setSelectedSubId(null);
    setView('history');
    setHistoryLoading(true);
    setHistoryError('');
    api.imports.list()
      .then(result => { if (active) setAnalysisHistory(result.imports || []); })
      .catch(error => { if (active) setHistoryError(error.message || 'Could not load your analyses.'); })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [user]);

  const openAnalysis = useCallback(async (importId) => {
    setOpeningImportId(importId);
    try {
      const result = await api.imports.analysis(importId);
      const subs = result.subs || [];
      setSubscriptions(subs);
      setReviewDecisions(Object.fromEntries(subs.filter(sub => sub.reviewDecision).map(sub => [sub.id, sub.reviewDecision])));
      setCancelledMap(Object.fromEntries(subs.filter(sub => sub.cancelled).map(sub => [sub.id, true])));
      setActiveImportId(importId);
      setBankName(result.import?.bankName || 'Uploaded Bank Statement');
      setIsDemo(false);
      setSelectedSubId(null);
      setView('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return result;
    } finally {
      setOpeningImportId(null);
    }
  }, []);

  // Navigate function
  const navigateTo = useCallback((targetView, subId = null) => {
    setView(targetView);
    setSelectedSubId(subId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Toggle cancellation
  const markCancelled = useCallback(async (subId, cancelled) => {
    setCancelledMap(prev => {
      const next = { ...prev };
      if (cancelled) {
        next[subId] = Date.now();
      } else {
        delete next[subId];
      }
      return next;
    });

    if (user && activeImportId) {
      try {
        await api.imports.updateAnalysis(activeImportId, subId, { cancelled });
      } catch (error) {
        setCancelledMap(previous => {
          const restored = { ...previous };
          if (cancelled) delete restored[subId];
          else restored[subId] = true;
          return restored;
        });
        showToast('Could not save the cancellation choice. Please retry.');
      }
    }
  }, [user, activeImportId, showToast]);

  const saveReviewDecisions = useCallback(async (draft) => {
    const changes = Object.entries(draft).filter(([id, choice]) =>
      subscriptions.some(sub => sub.id === id) && choice !== reviewDecisions[id]
    );
    if (!changes.length) return { saved: 0, failed: 0 };

    const saved = {};
    let failed = 0;
    for (const [id, choice] of changes) {
      if (user) {
        try {
          if (!activeImportId) throw new Error('Open an analysis before saving choices.');
          await api.imports.updateAnalysis(activeImportId, id, { reviewDecision: choice });
        } catch (error) {
          failed++;
          continue;
        }
      }
      saved[id] = choice;
    }
    setReviewDecisions(current => ({ ...current, ...saved }));
    return { saved: Object.keys(saved).length, failed };
  }, [subscriptions, reviewDecisions, user, activeImportId]);

  // Start guest mode
  const startGuestMode = useCallback(() => {
    setIsGuest(true);
    // Ephemeral state reset
    setSubscriptions([]);
    setBankName('Bank Statement');
    setIsDemo(false);
    setCancelledMap({});
    setReviewDecisions({});
    setActiveImportId(null);
  }, []);

  // Load sample data
  const loadSampleData = useCallback(() => {
    setIsGuest(true);
    setIsDemo(true);
    setBankName('Demo Bank (Sample Statement)');
    setSubscriptions(DEMO_SUBSCRIPTIONS);
    setReviewDecisions({});
    setActiveImportId(null);
    setView('dashboard');
    showToast('Loaded sample subscription profile');
  }, [showToast]);

  // Analyze CSV statement (either Guest or Authenticated)
  const analyzeStatement = useCallback(async (bankFiles, usageCsvText) => {
    const files = Array.isArray(bankFiles) ? bankFiles : [{ name: 'Statement', text: bankFiles }];
    const parsed = files.map(file => ({ name: file.name, transactions: parseCSV(file.text) }));
    const seen = new Set();
    const rawTxns = parsed.flatMap(file => file.transactions).filter(tx => {
      const ref = tx.ref?.trim();
      if (!ref) return true;
      const key = [tx.transactionDate, tx.direction, tx.amount, tx.deposit, tx.narration?.trim().toLowerCase(), ref].join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (!rawTxns || !rawTxns.length) {
      throw new Error('We could not read any transactions from this statement. Please check the file format.');
    }

    const detectedBank = files.length > 1 ? `${files.length} bank statements` : (parsed[0]?.transactions.bank || files[0]?.name || 'Uploaded Bank Statement');

    // 2. Client-side parse optional usage log if provided
    let usageEvents = [];
    if (usageCsvText && usageCsvText.trim()) {
      usageEvents = parseUsageCSV(usageCsvText);
    }

    // 3. Client-side enrichment and recurring analysis
    const enriched = enrichTransactions(rawTxns);
    const recurring = findRecurring(enriched);
    const flagged = applyFlags(recurring, usageEvents);

    if (user) {
      // Authenticated Mode: Send normalized transactions to Neo4j
      let imported;
      try {
        imported = await importToNeo4j(detectedBank, enriched, files.map(file => file.name));
      } catch (err) {
        throw new Error(`Could not save the new analysis: ${err.message}`);
      }
      refreshAnalysisHistory().catch(() => {});
      try {
        await openAnalysis(imported.importId);
        showToast(`New analysis saved with ${imported.acceptedCount ?? enriched.length} transactions.`);
      } catch (err) {
        setView('history');
        setHistoryError('Your statement was saved, but its results could not be opened. Retry from My analyses.');
      }
    } else {
      // Guest Mode: Store strictly in memory, zero network/db writes
      setSubscriptions(flagged);
      setReviewDecisions({});
      setBankName(detectedBank);
      setIsDemo(false);
      setView('dashboard');
      showToast('Analysis complete! All data stored ephemerally.');
    }
  }, [user, importToNeo4j, openAnalysis, refreshAnalysisHistory, showToast]);

  // Open Auth modal
  const openAuthModal = useCallback((mode = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        user,
        setUser,
        loadingUser,
        apiLoading,
        apiError,
        setApiError,
        login,
        register,
        logout,
        deleteAccount,
        deleteAccountModalOpen,
        openDeleteAccountModal,
        closeDeleteAccountModal,
        view,
        setView,
        selectedSubId,
        setSelectedSubId,
        analysisHistory,
        historyLoading,
        historyError,
        openingImportId,
        activeImportId,
        refreshAnalysisHistory,
        openAnalysis,
        navigateTo,
        isGuest,
        startGuestMode,
        subscriptions,
        setSubscriptions,
        bankName,
        isDemo,
        cancelledMap,
        markCancelled,
        reviewDecisions,
        saveReviewDecisions,
        loadSampleData,
        analyzeStatement,
        authModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        toast,
        showToast,
        hideToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

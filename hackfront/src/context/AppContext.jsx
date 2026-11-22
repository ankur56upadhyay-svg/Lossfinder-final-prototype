import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useLossFinderApi } from '../hooks/useLossFinderApi';
import { api } from '../services/api';
import { parseCSV } from '../engine/parse';
import { enrichTransactions } from '../engine/merchants';
import { findRecurring } from '../engine/recurring';
import { applyFlags } from '../engine/flags';
import { computeTotals } from '../engine/totals';
import { assessPayment, countsAsSubscription } from '../engine/paymentAssessment';
import { analyzeTransactions, dedupeStatementTransactions, formatStatementTransactions } from '../engine/analysis';
import { DEMO_SUBSCRIPTIONS, SAMPLE_STATEMENT_CSV } from '../data/demoData';
import { AA_DEMO_ACCOUNTS, buildAaDemoTransactions } from '../data/aaDemoData';

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
  const [statementCoverageDays, setStatementCoverageDays] = useState(null);
  const dashboardScroll = useRef(0);

  // Guest mode toggle (ephemeral in-memory state: wiped on refresh or tab close!)
  const [isGuest, setIsGuest] = useState(false);

  // Subscriptions & statement state (kept strictly in React memory for Guest mode)
  const [subscriptions, setSubscriptions] = useState([]);
  const [bankName, setBankName] = useState('Uploaded Bank Statement');
  const [isDemo, setIsDemo] = useState(false);
  const [demoSource, setDemoSource] = useState(null);
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
    setDemoSource(null);
    setIsGuest(false);
    setCancelledMap({});
    setReviewDecisions({});
    setAnalysisHistory([]);
    setHistoryLoading(false);
    setHistoryError('');
    setOpeningImportId(null);
    setActiveImportId(null);
    setStatementCoverageDays(null);
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
      onAction: options.onAction || null,
      duration: options.duration || 3000
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
    setDemoSource(null);
    setSubscriptions([]);
    setReviewDecisions({});
    setCancelledMap({});
    setActiveImportId(null);
    setStatementCoverageDays(null);
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
      const subs = (result.subs || []).map(sub => sub.assessment ? sub : {
        ...sub,
        ...assessPayment({
          name: sub.name,
          category: sub.category,
          narrations: sub.code ? [sub.code] : [],
          amounts: (sub.history || []).map(point => point.a).filter(Boolean)
        })
      });
      setSubscriptions(subs);
      setReviewDecisions(Object.fromEntries(subs.filter(sub => sub.reviewDecision).map(sub => [sub.id, sub.reviewDecision])));
      setCancelledMap(Object.fromEntries(subs.filter(sub => sub.cancelled).map(sub => [sub.id, true])));
      setActiveImportId(importId);
      setBankName(result.import?.bankName || 'Uploaded Bank Statement');
      const firstDate = result.import?.dateRangeStart;
      const lastDate = result.import?.dateRangeEnd;
      setStatementCoverageDays(firstDate && lastDate ? Math.round((new Date(lastDate) - new Date(firstDate)) / 86400000) : null);
      setIsDemo(false);
      setDemoSource(null);
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
    if (view === 'dashboard' && targetView !== 'dashboard') dashboardScroll.current = window.scrollY;
    setView(targetView);
    setSelectedSubId(subId);
    if (targetView === 'dashboard' && (view === 'detail' || view === 'guide')) {
      requestAnimationFrame(() => window.scrollTo({ top: dashboardScroll.current, behavior: 'instant' }));
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [view]);

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

    if (user && activeImportId && !isDemo) {
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
  }, [user, activeImportId, isDemo, showToast]);

  const saveReviewDecisions = useCallback(async (draft) => {
    const changes = Object.entries(draft).filter(([id, choice]) =>
      subscriptions.some(sub => sub.id === id) && choice !== reviewDecisions[id]
    );
    if (!changes.length) return { saved: 0, failed: 0 };

    const saved = {};
    let failed = 0;
    for (const [id, choice] of changes) {
      if (user && !isDemo) {
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
  }, [subscriptions, reviewDecisions, user, isDemo, activeImportId]);

  const classifyPayment = useCallback(async (id, classificationDecision) => {
    if (!subscriptions.some(sub => sub.id === id)) throw new Error('Payment was not found in this analysis.');
    if (user && !isDemo) {
      if (!activeImportId) throw new Error('Open an analysis before saving your answer.');
      await api.imports.updateAnalysis(activeImportId, id, { classificationDecision });
    }
    setSubscriptions(current => current.map(sub => sub.id === id ? { ...sub, classificationDecision } : sub));
    showToast(classificationDecision === null ? 'Answer cleared.' : 'Your answer was saved.');
  }, [subscriptions, user, isDemo, activeImportId, showToast]);

  // Start guest mode
  const startGuestMode = useCallback(() => {
    setIsGuest(true);
    // Ephemeral state reset
    setSubscriptions([]);
    setBankName('Bank Statement');
    setIsDemo(false);
    setDemoSource(null);
    setCancelledMap({});
    setReviewDecisions({});
    setActiveImportId(null);
    setStatementCoverageDays(null);
  }, []);

  const returnToIntro = useCallback(() => setIsGuest(false), []);

  // Load sample data
  const loadSampleData = useCallback(() => {
    setIsGuest(true);
    setIsDemo(true);
    setDemoSource('statement');
    setBankName('Demo Bank (Sample Statement)');
    setSubscriptions(DEMO_SUBSCRIPTIONS);
    setReviewDecisions({});
    setActiveImportId(null);
    setStatementCoverageDays(null);
    setView('dashboard');
    showToast('Loaded sample subscription profile');
  }, [showToast]);

  const loadAccountAggregatorDemo = useCallback((accountIds) => {
    const rawRows = buildAaDemoTransactions(accountIds);
    const flagged = applyFlags(findRecurring(enrichTransactions(rawRows)));
    const bankCount = accountIds.length;
    setIsGuest(!user);
    setIsDemo(true);
    setDemoSource('phone');
    setBankName(`Phone login demo - ${bankCount} fictional ${bankCount === 1 ? 'account' : 'accounts'}`);
    setSubscriptions(flagged);
    setReviewDecisions({});
    setCancelledMap({});
    setActiveImportId(null);
    setStatementCoverageDays(214);
    setSelectedSubId(null);
    setView('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('Phone login demo loaded with fictional transactions. No bank was connected.');
  }, [user, showToast]);

  // Analyze normalized statement rows from CSV or PDF (either Guest or Authenticated)
  const analyzeStatement = useCallback(async (bankFiles) => {
    const files = Array.isArray(bankFiles) ? bankFiles : [{ name: 'Statement', text: bankFiles }];
    const parsed = files.map(file => ({ name: file.name, transactions: file.transactions || parseCSV(file.text) }));
    const rawTxns = parsed.flatMap((file, sourceFileIndex) => file.transactions.map(tx => ({ ...tx, sourceFileIndex })));
    const normalized = dedupeStatementTransactions(formatStatementTransactions(rawTxns));
    if (!normalized.length) {
      throw new Error('We could not read any transactions from this statement. Please check the file format.');
    }
    const dates = normalized.map(tx => new Date(tx.transactionDate).getTime()).filter(Number.isFinite);
    const coverageDays = dates.length ? Math.round((Math.max(...dates) - Math.min(...dates)) / 86400000) : null;

    const detectedBank = files.length > 1 ? `${files.length} bank statements` : (parsed[0]?.transactions.bank || files[0]?.name || 'Uploaded Bank Statement');

    const flagged = analyzeTransactions(normalized);

    if (user) {
      // Authenticated Mode: Send normalized transactions to Neo4j
      let imported;
      try {
        imported = await importToNeo4j(detectedBank, normalized, files.map(file => file.name));
      } catch (err) {
        throw new Error(`Could not save the new analysis: ${err.message}`);
      }
      refreshAnalysisHistory().catch(() => {});
      try {
        await openAnalysis(imported.importId);
        showToast(`New analysis saved with ${imported.acceptedCount ?? normalized.length} transactions.`);
      } catch (err) {
        setView('history');
        setHistoryError('Your statement was saved, but its results could not be opened. Retry from My analyses.');
      }
    } else {
      // Guest Mode: Store strictly in memory, zero network/db writes
      setSubscriptions(flagged);
      setReviewDecisions({});
      setBankName(detectedBank);
      setStatementCoverageDays(coverageDays);
      setIsDemo(false);
      setDemoSource(null);
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

  const visibleSubscriptions = subscriptions.filter(countsAsSubscription);
  const paymentCandidates = subscriptions.filter(sub => sub.assessment === 'needs_review');

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
        statementCoverageDays,
        refreshAnalysisHistory,
        openAnalysis,
        navigateTo,
        isGuest,
        startGuestMode,
        returnToIntro,
        subscriptions: visibleSubscriptions,
        paymentCandidates,
        classifyPayment,
        setSubscriptions,
        bankName,
        isDemo,
        demoSource,
        cancelledMap,
        markCancelled,
        reviewDecisions,
        saveReviewDecisions,
        loadSampleData,
        aaDemoAccounts: AA_DEMO_ACCOUNTS,
        loadAccountAggregatorDemo,
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

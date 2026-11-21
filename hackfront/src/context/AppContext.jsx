import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLossFinderApi } from '../hooks/useLossFinderApi';
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
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'dark'; // Dark theme default
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
    importToNeo4j,
    fetchSubscriptions,
    updateSubscriptionStatus
  } = useLossFinderApi();

  // Navigation state: 'upload' | 'dashboard' | 'detail' | 'guide'
  const [view, setView] = useState('upload');
  const [selectedSubId, setSelectedSubId] = useState(null);

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

  // When user logs in, if they already have saved data in Neo4j, fetch it
  // useEffect(() => {
  //   if (user) {
  //     setIsGuest(false);
  //     fetchSubscriptions()
  //       .then(subs => {
  //         if (subs && subs.length > 0) {
  //           setSubscriptions(subs);
  //           setBankName('Neo4j Graph Database');
  //           setIsDemo(false);
  //         }
  //       })
  //       .catch(err => {
  //         console.warn('Could not load user subscriptions:', err);
  //       });
  //   }
  // }, [user, fetchSubscriptions]);
  // Restore user's saved data after login or page reload
useEffect(() => {
  if (user) {
    let active = true;
    setIsGuest(false);

    fetchSubscriptions()
      .then(subs => {
        if (!active) return;
        if (subs && subs.length > 0) {
        setSubscriptions(subs);
        setReviewDecisions(Object.fromEntries(subs.filter(s => s.reviewDecision).map(s => [s.id, s.reviewDecision])));
          setBankName('Neo4j Graph Database');
          setIsDemo(false);

          // Automatically open dashboard if saved data exists
          setView('dashboard');
        } else {
          // New user without saved data
          setSubscriptions([]);
          setReviewDecisions({});
          setView('upload');
        }
      })
      .catch(err => {
        if (active) console.warn('Could not load user subscriptions:', err);
      });
    return () => { active = false; };
  }
}, [user, fetchSubscriptions]);

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

    // If logged in, also persist cancellation override to Neo4j
    if (user) {
      try {
        await updateSubscriptionStatus(subId, cancelled ? 'ended' : 'active', cancelled ? 'Cancelled by user' : 'Reactivated');
      } catch (e) {
        console.warn('Backend update failed:', e);
      }
    }
  }, [user, updateSubscriptionStatus]);

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
          await updateSubscriptionStatus(id, undefined, undefined, choice);
        } catch (error) {
          failed++;
          continue;
        }
      }
      saved[id] = choice;
    }
    setReviewDecisions(current => ({ ...current, ...saved }));
    return { saved: Object.keys(saved).length, failed };
  }, [subscriptions, reviewDecisions, user, updateSubscriptionStatus]);

  // Start guest mode
  const startGuestMode = useCallback(() => {
    setIsGuest(true);
    // Ephemeral state reset
    setSubscriptions([]);
    setBankName('Bank Statement');
    setIsDemo(false);
    setCancelledMap({});
    setReviewDecisions({});
  }, []);

  // Load sample data
  const loadSampleData = useCallback(() => {
    setIsGuest(true);
    setIsDemo(true);
    setBankName('Demo Bank (Sample Statement)');
    setSubscriptions(DEMO_SUBSCRIPTIONS);
    setReviewDecisions({});
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
      try {
        const importRes = await importToNeo4j(detectedBank, enriched);
        setSubscriptions(importRes.subscriptions || []);
        setReviewDecisions(Object.fromEntries((importRes.subscriptions || []).filter(s => s.reviewDecision).map(s => [s.id, s.reviewDecision])));
        setBankName(detectedBank);
        setIsDemo(false);
        setView('dashboard');
        showToast(`Saved to Neo4j: ${importRes.import?.acceptedCount ?? enriched.length} new transactions stored.`);
      } catch (err) {
        throw new Error(`Could not complete the saved import: ${err.message}. Please check your account before retrying.`);
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
  }, [user, importToNeo4j, showToast]);

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

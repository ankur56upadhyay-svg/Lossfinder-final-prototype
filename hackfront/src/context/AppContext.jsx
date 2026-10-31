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

  // Auth Modal state
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' | 'register'

  // Toast notification state
  const [toast, setToast] = useState(null);
  const logout = useCallback(async () => {
    await apiLogout();

    setView('upload');
    setSelectedSubId(null);
    setSubscriptions([]);
    setBankName('Uploaded Bank Statement');
    setIsDemo(false);
    setIsGuest(false);
    setCancelledMap({});
    setAuthModalOpen(false);
}, [apiLogout]);

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
    setIsGuest(false);

    fetchSubscriptions()
      .then(subs => {
        if (subs && subs.length > 0) {
          setSubscriptions(subs);
          setBankName('Neo4j Graph Database');
          setIsDemo(false);

          // Automatically open dashboard if saved data exists
          setView('dashboard');
        } else {
          // New user without saved data
          setView('upload');
        }
      })
      .catch(err => {
        console.warn('Could not load user subscriptions:', err);
      });
  }
}, [user, fetchSubscriptions]);

  // Navigate function
  const navigateTo = useCallback((targetView, subId = null) => {
    setView(targetView);
    if (subId) setSelectedSubId(subId);
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

  // Start guest mode
  const startGuestMode = useCallback(() => {
    setIsGuest(true);
    // Ephemeral state reset
    setSubscriptions([]);
    setBankName('Bank Statement');
    setIsDemo(false);
    setCancelledMap({});
  }, []);

  // Load sample data
  const loadSampleData = useCallback(() => {
    setIsGuest(true);
    setIsDemo(true);
    setBankName('Demo Bank (Sample Statement)');
    setSubscriptions(DEMO_SUBSCRIPTIONS);
    setView('dashboard');
    showToast('Loaded sample subscription profile');
  }, [showToast]);

  // Analyze CSV statement (either Guest or Authenticated)
  const analyzeStatement = useCallback(async (bankCsvText, usageCsvText) => {
    // 1. Client-side parse bank statement
    const rawTxns = parseCSV(bankCsvText);
    if (!rawTxns || !rawTxns.length) {
      throw new Error('We could not read any transactions from this statement. Please check the file format.');
    }

    const detectedBank = rawTxns.bank || 'Uploaded Bank Statement';

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
        setSubscriptions(importRes.subscriptions && importRes.subscriptions.length ? importRes.subscriptions : flagged);
        setBankName(detectedBank);
        setIsDemo(false);
        setView('dashboard');
        showToast(`Saved to Neo4j: ${importRes.import?.acceptedCount || enriched.length} transactions stored.`);
      } catch (err) {
        // Fallback to local flagged if backend fails
        console.warn('Neo4j import failed, falling back to local memory:', err);
        setSubscriptions(flagged);
        setBankName(detectedBank);
        setIsDemo(false);
        setView('dashboard');
        showToast('Processed locally. Neo4j connection offline.');
      }
    } else {
      // Guest Mode: Store strictly in memory, zero network/db writes
      setSubscriptions(flagged);
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

import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';

export function useLossFinderApi() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Check current session on mount
  const checkSession = useCallback(async () => {
    setLoadingUser(true);
    try {
      const res = await api.auth.me();
      if (res && res.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = useCallback(async (email, password) => {
    setApiLoading(true);
    setApiError(null);
    try {
      const res = await api.auth.login(email, password);
      setUser(res.user);
      return res.user;
    } catch (err) {
      setApiError(err.message || 'Login failed');
      throw err;
    } finally {
      setApiLoading(false);
    }
  }, []);

  const register = useCallback(async (email, password) => {
    setApiLoading(true);
    setApiError(null);
    try {
      const res = await api.auth.register(email, password);
      setUser(res.user);
      return res.user;
    } catch (err) {
      setApiError(err.message || 'Registration failed');
      throw err;
    } finally {
      setApiLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setApiLoading(true);
    try {
      await api.auth.logout();
      setUser(null);
    } catch (err) {
      console.warn('Logout warning:', err);
      setUser(null);
    } finally {
      setApiLoading(false);
    }
  }, []);

  const importToNeo4j = useCallback(async (bankName, transactions) => {
    setApiLoading(true);
    setApiError(null);
    try {
      const formatted = transactions.map(t => ({
        transactionDate: t.transactionDate || (t.date instanceof Date ? t.date.toISOString().slice(0, 10) : String(t.date).slice(0, 10)),
        description: t.narration || t.description || 'Debit',
        amount: Number(t.amount || t.debit || 0),
        direction: t.direction || 'debit',
        currency: 'INR',
        ref: t.ref || '',
        method: t.mech || '',
        status: t.direction === 'credit' ? 'CREDIT' : 'DEBIT'
      }));

      const res = await api.imports.create({
        bankName: bankName || 'Your Bank',
        transactions: formatted
      });

      // Also fetch subscriptions right after import
      const subsRes = await api.subscriptions.list();
      return {
        import: res.import,
        subscriptions: subsRes.subs || []
      };
    } catch (err) {
      setApiError(err.message || 'Failed to import into Neo4j');
      throw err;
    } finally {
      setApiLoading(false);
    }
  }, []);

  const fetchSubscriptions = useCallback(async () => {
    setApiLoading(true);
    setApiError(null);
    try {
      const res = await api.subscriptions.list();
      return res.subs || [];
    } catch (err) {
      setApiError(err.message || 'Failed to fetch subscriptions');
      throw err;
    } finally {
      setApiLoading(false);
    }
  }, []);

  const updateSubscriptionStatus = useCallback(async (id, status, notes) => {
    try {
      const res = await api.subscriptions.update(id, { status, notes });
      return res.subscription;
    } catch (err) {
      console.error('Error updating subscription:', err);
      throw err;
    }
  }, []);

  return {
    user,
    setUser,
    loadingUser,
    apiLoading,
    apiError,
    setApiError,
    checkSession,
    login,
    register,
    logout,
    importToNeo4j,
    fetchSubscriptions,
    updateSubscriptionStatus
  };
}

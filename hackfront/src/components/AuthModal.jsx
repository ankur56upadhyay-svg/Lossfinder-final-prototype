import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function AuthModal() {
  const {
    authModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    login,
    register,
    showToast,
    navigateTo
  } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!authModalOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      if (authModalMode === 'login') {
        await login(email, password);
        showToast('Successfully signed in! Neo4j cloud synchronization active.');
      } else {
        await register(email, password);
        showToast('Account created and logged in! Ready for Neo4j persistence.');
      }
      closeAuthModal();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white dark:bg-[#1C2028] border border-[#E2E5EA] dark:border-[#2A3040] rounded-2xl shadow-2xl p-6 sm:p-8 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute top-5 right-5 text-[#5A6B80] dark:text-[#8899AA] hover:text-[#0B1F3A] dark:hover:text-[#E8ECF1] transition-colors"
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-6">
          <span className="material-symbols-outlined text-[#0B5FD8] dark:text-[#4D9AFF] text-3xl">
            lock
          </span>
          <div>
            <h2 className="text-xl font-bold text-[#0B1F3A] dark:text-[#E8ECF1]">
              {authModalMode === 'login' ? 'Sign into Loss Finder' : 'Create Account'}
            </h2>
            <p className="text-xs text-[#5A6B80] dark:text-[#8899AA]">
              Persistent recurring payment analytics with Neo4j
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-[#E2E5EA] dark:border-[#2A3040] mb-6">
          <button
            type="button"
            onClick={() => { openAuthModal('login'); setError(''); }}
            className={`pb-2.5 px-4 text-sm font-semibold transition-colors relative ${
              authModalMode === 'login'
                ? 'text-[#0B5FD8] dark:text-[#4D9AFF] border-b-2 border-[#0B5FD8] dark:border-[#4D9AFF]'
                : 'text-[#5A6B80] dark:text-[#8899AA] hover:text-[#0B1F3A] dark:hover:text-[#E8ECF1]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { openAuthModal('register'); setError(''); }}
            className={`pb-2.5 px-4 text-sm font-semibold transition-colors relative ${
              authModalMode === 'register'
                ? 'text-[#0B5FD8] dark:text-[#4D9AFF] border-b-2 border-[#0B5FD8] dark:border-[#4D9AFF]'
                : 'text-[#5A6B80] dark:text-[#8899AA] hover:text-[#0B1F3A] dark:hover:text-[#E8ECF1]'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-base shrink-0">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#5A6B80] dark:text-[#8899AA] uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E5EA] dark:border-[#2A3040] bg-[#F5F6F8] dark:bg-[#0F1419] text-[#0B1F3A] dark:text-[#E8ECF1] text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5FD8]/40"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5A6B80] dark:text-[#8899AA] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#E2E5EA] dark:border-[#2A3040] bg-[#F5F6F8] dark:bg-[#0F1419] text-[#0B1F3A] dark:text-[#E8ECF1] text-sm focus:outline-none focus:ring-2 focus:ring-[#0B5FD8]/40"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="af-btn af-btn-primary w-full py-3 mt-2 text-sm shadow-sm"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </span>
            ) : (
              <span>{authModalMode === 'login' ? 'Sign In' : 'Create Account'}</span>
            )}
          </button>
        </form>

        <p className="text-[11px] text-center text-[#5A6B80] dark:text-[#8899AA] mt-4">
          Data is protected with Bcrypt hashing and isolated per user in Neo4j Aura.
        </p>

        {/* Back to Home link */}
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => {
              closeAuthModal();
              navigateTo('upload');
            }}
            className="text-xs text-[#5A6B80] dark:text-[#8899AA] hover:text-[#0B1F3A] dark:hover:text-[#E8ECF1] inline-flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">home</span>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

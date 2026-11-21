import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';

export default function DeleteAccountModal() {
  const { user, deleteAccountModalOpen, closeDeleteAccountModal, deleteAccount } = useApp();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!deleteAccountModalOpen) {
      setPassword('');
      setConfirmation('');
      setError('');
      return;
    }

    const handleEscape = event => {
      if (event.key === 'Escape' && !submitting) closeDeleteAccountModal();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [deleteAccountModalOpen, submitting, closeDeleteAccountModal]);

  if (!deleteAccountModalOpen || !user) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!password || confirmation !== 'DELETE' || submitting) return;

    setSubmitting(true);
    setError('');
    try {
      await deleteAccount(password);
    } catch (err) {
      setError(err.message || 'Could not delete your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
        aria-describedby="delete-account-description"
        className="lf-modal-panel w-full max-w-md rounded-2xl border border-[#E2E5EA] dark:border-[#2A3040] bg-white dark:bg-[#1C2028] p-6 sm:p-8 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">warning</span>
          <div>
            <h2 id="delete-account-title" className="text-xl font-bold text-[#0B1F3A] dark:text-[#E8ECF1]">Delete your account?</h2>
            <p id="delete-account-description" className="mt-2 text-sm text-[#5A6B80] dark:text-[#AAB6C5]">
              This permanently removes your account, imported transactions, subscriptions, usage history and saved decisions. You cannot undo this action.
            </p>
          </div>
        </div>

        <p className="mt-5 rounded-lg bg-[#F5F6F8] dark:bg-[#0F1419] px-3 py-2 text-xs text-[#5A6B80] dark:text-[#AAB6C5] break-all">
          Account: <strong className="text-[#0B1F3A] dark:text-[#E8ECF1]">{user.email}</strong>
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="delete-account-password" className="block text-sm font-semibold text-[#0B1F3A] dark:text-[#E8ECF1] mb-1.5">Confirm your password</label>
            <input
              id="delete-account-password"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
              value={password}
              onChange={event => setPassword(event.target.value)}
              disabled={submitting}
              className="w-full rounded-xl border border-[#E2E5EA] dark:border-[#2A3040] bg-[#F5F6F8] dark:bg-[#0F1419] px-3.5 py-2.5 text-sm text-[#0B1F3A] dark:text-[#E8ECF1] focus:outline-none focus:ring-2 focus:ring-red-500/40"
            />
          </div>
          <div>
            <label htmlFor="delete-account-confirmation" className="block text-sm font-semibold text-[#0B1F3A] dark:text-[#E8ECF1] mb-1.5">
              Type <strong>DELETE</strong> to confirm
            </label>
            <input
              id="delete-account-confirmation"
              type="text"
              autoComplete="off"
              spellCheck="false"
              required
              value={confirmation}
              onChange={event => setConfirmation(event.target.value)}
              disabled={submitting}
              className="w-full rounded-xl border border-[#E2E5EA] dark:border-[#2A3040] bg-[#F5F6F8] dark:bg-[#0F1419] px-3.5 py-2.5 text-sm text-[#0B1F3A] dark:text-[#E8ECF1] focus:outline-none focus:ring-2 focus:ring-red-500/40"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={closeDeleteAccountModal}
              disabled={submitting}
              className="af-btn af-btn-secondary flex-1 justify-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !password || confirmation !== 'DELETE'}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Deleting...' : 'Delete account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

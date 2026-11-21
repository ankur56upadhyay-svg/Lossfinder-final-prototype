import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function Navbar() {
  const {
    view,
    navigateTo,
    theme,
    toggleTheme,
    user,
    logout,
    openDeleteAccountModal,
    openAuthModal,
    subscriptions,
    bankName,
    isGuest
  } = useApp();

  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const mobileLinks = [
    ...(user ? [['history', 'My analyses']] : []),
    ...((user || subscriptions.length) ? [['upload', 'New Statement']] : []),
    ...(subscriptions.length && view !== 'upload' && view !== 'history'
      ? [['dashboard', 'Dashboard'], ['annual', 'Annual View'], ['review', 'Review & renewals'], ['saved', 'Saved decisions'], ['guide', 'Cancel guides']]
      : [])
  ];

  return (
    <header className="w-full bg-[#FFFFFF]/90 dark:bg-[#1C2028]/90 backdrop-blur-md border-b border-[#E2E5EA] dark:border-[#2A3040] sticky top-0 z-40 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Brand & Status */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => user ? navigateTo('history') : openAuthModal('login')}
            className="flex items-center gap-2.5 text-left focus:outline-none"
            title="Go to Home"
          >
            <span className="material-symbols-outlined text-[#0B5FD8] dark:text-[#4D9AFF] text-3xl">
              account_balance_wallet
            </span>
            <span className={`${user ? 'hidden sm:inline' : ''} font-extrabold text-xl tracking-tight text-[#0B1F3A] dark:text-[#E8ECF1]`}>
              Loss Finder
            </span>
          </button>

          {/* Statement loaded chip */}
         {/* Statement loaded chip */}
          {subscriptions.length > 0 && view !== 'upload' && view !== 'history' && (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              <span className="truncate max-w-[160px]">{bankName}</span>
            </div>
          )}
        </div>

        {/* Center / Right: Nav links & Controls */}
        {/* Center / Right: Nav links & Controls */}
        <div className="flex items-center gap-3">
          {user && <button type="button" onClick={() => navigateTo('history')}
            className={`hidden xl:inline-flex px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${view === 'history' ? 'bg-[#0B1F3A] text-white dark:bg-[#E8ECF1] dark:text-[#0B1F3A]' : 'text-[#5A6B80] dark:text-[#8899AA] hover:text-[#0B1F3A] dark:hover:text-[#E8ECF1]'}`}>
            My analyses
          </button>}
          {subscriptions.length > 0 && view !== 'upload' && view !== 'history' && (
            <nav className="hidden xl:flex items-center gap-1">
              <button
                type="button"
                onClick={() => navigateTo('dashboard')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  view === 'dashboard'
                    ? 'bg-[#0B1F3A] text-white dark:bg-[#E8ECF1] dark:text-[#0B1F3A]'
                    : 'text-[#5A6B80] dark:text-[#8899AA] hover:text-[#0B1F3A] dark:hover:text-[#E8ECF1]'
                }`}
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => navigateTo('annual')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  view === 'annual'
                    ? 'bg-[#0B1F3A] text-white dark:bg-[#E8ECF1] dark:text-[#0B1F3A]'
                    : 'text-[#5A6B80] dark:text-[#8899AA] hover:text-[#0B1F3A] dark:hover:text-[#E8ECF1]'
                }`}
              >
                Annual View
              </button>
              <button type="button" onClick={() => navigateTo('review')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${view === 'review' ? 'bg-[#0B1F3A] text-white dark:bg-[#E8ECF1] dark:text-[#0B1F3A]' : 'text-[#5A6B80] dark:text-[#8899AA] hover:text-[#0B1F3A] dark:hover:text-[#E8ECF1]'}`}>
                Review &amp; renewals
              </button>
              <button type="button" onClick={() => navigateTo('saved')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${view === 'saved' ? 'bg-[#0B1F3A] text-white dark:bg-[#E8ECF1] dark:text-[#0B1F3A]' : 'text-[#5A6B80] dark:text-[#8899AA] hover:text-[#0B1F3A] dark:hover:text-[#E8ECF1]'}`}>
                Saved decisions
              </button>
              <button
                type="button"
                onClick={() => navigateTo('guide')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  view === 'guide'
                    ? 'bg-[#0B1F3A] text-white dark:bg-[#E8ECF1] dark:text-[#0B1F3A]'
                    : 'text-[#5A6B80] dark:text-[#8899AA] hover:text-[#0B1F3A] dark:hover:text-[#E8ECF1]'
                }`}
              >
                Cancel guides
              </button>
            </nav>
          )}

          {(user || subscriptions.length > 0) && view !== 'history' && <button type="button" onClick={() => navigateTo('upload')}
            className="hidden xl:inline-flex items-center gap-1 text-xs font-semibold text-[#0B5FD8] dark:text-[#4D9AFF] px-2.5 py-1.5 hover:underline">
            <span className="material-symbols-outlined text-sm">upload_file</span>
            New Statement
          </button>}

          {mobileLinks.length > 0 && <div className="relative xl:hidden">
            <button type="button" onClick={() => setNavOpen(open => !open)} aria-label="Open navigation" aria-expanded={navOpen}
              className="w-9 h-9 rounded-full flex items-center justify-center text-[#5A6B80] dark:text-[#8899AA] hover:bg-black/5 dark:hover:bg-white/5">
              <span className="material-symbols-outlined">menu</span>
            </button>
            {navOpen && <nav className="absolute right-0 top-11 w-52 p-2 rounded-xl bg-white dark:bg-[#1C2028] border border-[#E2E5EA] dark:border-[#2A3040] shadow-xl z-50" aria-label="Mobile navigation">
              {mobileLinks.map(([target, label]) => <button key={target} type="button" onClick={() => { navigateTo(target); setNavOpen(false); }}
                className={`block w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 ${view === target ? 'text-[#0B5FD8] dark:text-[#4D9AFF]' : ''}`}>
                {label}
              </button>)}
            </nav>}
          </div>}

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-9 h-9 rounded-full flex items-center justify-center text-[#5A6B80] dark:text-[#8899AA] hover:text-[#0B1F3A] dark:hover:text-[#E8ECF1] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            <span className="material-symbols-outlined text-xl">
              {theme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>

          {/* Auth Button or User Menu */}
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(prev => !prev)}
                className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full border border-[#E2E5EA] dark:border-[#2A3040] text-xs font-semibold text-[#0B1F3A] dark:text-[#E8ECF1] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">
                  {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </span>
                <span className="hidden 2xl:inline max-w-[120px] truncate">{user.email}</span>
                <span className="material-symbols-outlined text-sm">expand_more</span>
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-[#1C2028] shadow-xl border border-[#E2E5EA] dark:border-[#2A3040] py-2 z-50 text-xs"
                  onClick={() => setMenuOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-[#E2E5EA] dark:border-[#2A3040]">
                    <p className="font-semibold text-[#0B1F3A] dark:text-[#E8ECF1] truncate">{user.email}</p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Neo4j Synchronized</p>
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-[#0B1F3A] dark:text-[#E8ECF1] hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">logout</span>
                    Sign out
                  </button>
                  <div className="my-1 border-t border-[#E2E5EA] dark:border-[#2A3040]" />
                  <button
                    type="button"
                    onClick={openDeleteAccountModal}
                    className="w-full text-left px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">delete_forever</span>
                    Delete account
                  </button>
                </div>
              )}
            </div>
         ) : view !== 'upload' ? (
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="af-btn af-btn-secondary text-xs py-1.5 px-3.5"
            >
              <span className="material-symbols-outlined text-base">account_circle</span>
              <span>Sign in</span>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

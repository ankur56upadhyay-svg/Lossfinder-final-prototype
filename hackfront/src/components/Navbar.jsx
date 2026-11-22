import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function Navbar() {
  const {
    view, navigateTo, theme, toggleTheme, user, logout, openDeleteAccountModal,
    openAuthModal, subscriptions, isDemo, isGuest, showToast
  } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  if (!user && !subscriptions.length) return null;
  const intro = view === 'upload' && !user && !isGuest && !subscriptions.length;
  const tabs = [
    ...(user ? [['history', 'My analyses']] : []),
    ['dashboard', 'Dashboard'], ['annual', 'Annual view'],
    ['saved', 'Saved decisions'], ['guide', 'Cancel guides']
  ];

  function openTab(target) {
    setNavOpen(false);
    if (target === 'saved' && (!user || isDemo)) { navigateTo(target); return; }
    if (!subscriptions.length && target !== 'history') {
      showToast('Open an analysis or try the demo to see this page.');
      return;
    }
    navigateTo(target);
  }

  function replayTour() {
    if (!subscriptions.length) {
      showToast('Open an analysis or try the demo before starting the tour.');
      return;
    }
    if (view === 'dashboard') window.dispatchEvent(new Event('lf:replay-tour'));
    else { sessionStorage.setItem('lf_tour_replay', '1'); navigateTo('dashboard'); }
  }

  return <header className="lf-navbar w-full sticky top-0 z-40">
    <div className="mx-auto h-16 flex items-center justify-between gap-4">
      <button type="button" onClick={() => user ? navigateTo('history') : navigateTo('upload')} className="lf-brand" aria-label="Loss Finder home">
        <span className="lf-brand-icon material-symbols-outlined" aria-hidden="true">account_balance_wallet</span>
        <span>Loss Finder</span>
      </button>
      {!intro && <nav className="lf-desktop-nav hidden xl:flex" aria-label="Main navigation">
        {tabs.map(([target, label]) => {
          const locked = target === 'saved' && (!user || isDemo);
          return <button key={target} type="button" onClick={() => openTab(target)} aria-current={view === target ? 'page' : undefined} className={locked ? 'lf-locked-tab' : ''}>
            {locked && <span className="material-symbols-outlined" aria-hidden="true">lock</span>}{label}
          </button>;
        })}
      </nav>}
      <div className="lf-nav-actions">
        {!intro && (user || subscriptions.length > 0) && <button type="button" className="lf-nav-action" onClick={() => navigateTo('upload')}><span className="material-symbols-outlined" aria-hidden="true">upload_file</span><span className="hidden sm:inline">New statement</span></button>}
        {!intro && <button type="button" className="lf-icon-button" onClick={replayTour} aria-label="Replay dashboard tour" title="Help"><span className="material-symbols-outlined" aria-hidden="true">help</span></button>}
        <button type="button" className="lf-icon-button" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme"><span className="material-symbols-outlined" aria-hidden="true">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span></button>
        {!intro && <div className="relative xl:hidden">
          <button type="button" className="lf-icon-button" onClick={() => setNavOpen(value => !value)} aria-expanded={navOpen} aria-label="Open navigation"><span className="material-symbols-outlined" aria-hidden="true">menu</span></button>
          {navOpen && <nav className="lf-mobile-menu" aria-label="Mobile navigation">{tabs.map(([target,label]) => {
            const locked = target === 'saved' && (!user || isDemo);
            return <button key={target} type="button" aria-current={view === target ? 'page' : undefined} onClick={() => openTab(target)} className={locked ? 'lf-locked-tab' : ''}>{locked && <span className="material-symbols-outlined" aria-hidden="true">lock</span>}{label}</button>;
          })}</nav>}
        </div>}
        {user ? <div className="relative">
          <button type="button" className="lf-user-button" onClick={() => setMenuOpen(value => !value)} aria-expanded={menuOpen}><span className="material-symbols-outlined" aria-hidden="true">account_circle</span><span className="hidden sm:inline">Account</span></button>
          {menuOpen && <div className="lf-account-menu">
            <p>{user.email}</p>
            <button type="button" onClick={() => { setMenuOpen(false); logout(); }}>Sign out</button>
            <button type="button" onClick={() => { setMenuOpen(false); openDeleteAccountModal(); }}>Delete account</button>
          </div>}
        </div> : !intro && <button type="button" className="lf-user-button" onClick={() => openAuthModal('login')}>Sign in</button>}
      </div>
    </div>
  </header>;
}

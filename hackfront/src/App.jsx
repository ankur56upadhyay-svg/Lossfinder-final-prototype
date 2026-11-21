import React from 'react'
import { useApp } from './context/AppContext'
import Navbar from './components/Navbar'
import Upload from './components/Upload'
import Dashboard from './components/Dashboard'
import DetailView from './components/DetailView'
import CancelGuide from './components/CancelGuide'
import AnnualView from './components/AnnualView'
import Toast from './components/Toast'
import AuthModal from './components/AuthModal'
import ReviewCentre from './components/ReviewCentre'
import SavedDecisions from './components/SavedDecisions'

export default function App() {
  const { view, loadingUser, user, openAuthModal, navigateTo } = useApp()

  if (loadingUser) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--af-page)',
        }}
      >
        <div className="af-spinner" />
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--af-page)',
        color: 'var(--af-text)',
      }}
    >
      <Navbar />
      <div style={{ flex: 1 }}>
        {view === 'upload'    && <Upload />}
        {view === 'dashboard' && <Dashboard />}
        {view === 'detail'    && <DetailView />}
        {view === 'guide'     && <CancelGuide />}
        {view === 'annual'    && <AnnualView />}
        {(view === 'review' || view === 'saved') && !user && (
          <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
            <div className="af-card text-center py-12 px-6">
              <span className="material-symbols-outlined text-4xl text-[#0B5FD8] dark:text-[#4D9AFF]">lock</span>
              <h1 className="text-2xl font-bold mt-4">Sign in required</h1>
              <p className="text-sm text-[#5A6B80] dark:text-[#8899AA] mt-3 max-w-md mx-auto">
                The Review Centre and Saved Decisions pages are available only to signed-in users. Sign in, then upload your statements to review subscriptions and keep your choices across visits.
              </p>
              <div className="flex flex-wrap justify-center gap-3 mt-6">
                <button type="button" onClick={() => openAuthModal('login')} className="af-btn af-btn-primary">Sign in</button>
                <button type="button" onClick={() => openAuthModal('register')} className="af-btn af-btn-secondary">Create account</button>
                <button type="button" onClick={() => navigateTo('dashboard')} className="af-btn af-btn-secondary">Back to dashboard</button>
              </div>
            </div>
          </main>
        )}
        {view === 'review' && user && <ReviewCentre />}
        {view === 'saved' && user && <SavedDecisions />}
      </div>
      <Toast />
      <AuthModal />
    </div>
  )
}

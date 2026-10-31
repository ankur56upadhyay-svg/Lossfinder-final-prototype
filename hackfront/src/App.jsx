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

export default function App() {
  const { view, loadingUser } = useApp()

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
      </div>
      <Toast />
      <AuthModal />
    </div>
  )
}

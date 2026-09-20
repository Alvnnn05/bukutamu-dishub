import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import FormInput from './components/FormInput/FormInput';
import QrModal from './components/QrModal/QrModal';
import Dashboard from './components/Dashboard/Dashboard';
import UploadHP from './pages/UploadHP/UploadHP';
import logoDishub from './assets/guesthub.png';
import './App.css';

function HomePC() {
  const [activeSession, setActiveSession] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="pc-layout">
      {/* HEADER UTAMA DENGAN LOGO & SUB-JUDUL */}
      <header className="app-header">
        <div className="header-brand">
          <img src={logoDishub} alt="Logo GuestHub Dishub" className="header-logo" />
          <div className="header-text-group">
            <h1 className="main-title">GuestHub</h1>
            <span className="title-divider">|</span>
            <span className="sub-title">Sistem Buku Tamu Digital Dinas Perhubungan</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="content-grid">
          <FormInput onSessionCreated={(sessionId) => setActiveSession(sessionId)} />
          <Dashboard refreshTrigger={refreshTrigger} />
        </div>
      </main>

      {activeSession && (
        <QrModal
          sessionId={activeSession}
          onClose={() => setActiveSession(null)}
          onSuccess={() => {
            setActiveSession(null);
            setRefreshTrigger((prev) => prev + 1);
          }}
        />
      )}

      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} GuestHub - Dinas Perhubungan. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePC />} />
        <Route path="/upload-foto" element={<UploadHP />} />
      </Routes>
    </BrowserRouter>
  );
}
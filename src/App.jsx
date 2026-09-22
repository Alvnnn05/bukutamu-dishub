import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import FormInput from './components/FormInput/FormInput';
import Dashboard from './components/Dashboard/Dashboard';
import Login from './components/Login/Login';
import logoDishub from './assets/guesthub.png';
import './App.css';

export default function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('input'); // 'input' atau 'admin'
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Tentukan email mana saja yang berhak menjadi Admin
  // Ganti dengan email admin resmi yang kamu daftarkan di Supabase
  const ADMIN_EMAILS = [
    'hermanbsa1999@gmail.com',
    'vinandrian05@gmail.com',
    'andrianvin1205@gmail.com'
  ]; 

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setActiveTab('input');
  };

  // Cek apakah user yang sedang login adalah Admin
  const isAdmin = session && ADMIN_EMAILS.includes(session.user.email);

  return (
    <div className="pc-layout">
      {/* HEADER UTAMA */}
      <header className="app-header">
        <div className="header-brand">
          <img src={logoDishub} alt="Logo GuestHub Dishub" className="header-logo" />
          <div className="header-text-group">
            <h1 className="main-title">GuestHub</h1>
            <span className="title-divider">|</span>
            <span className="sub-title">Sistem Buku Tamu Digital Dinas Perhubungan</span>
          </div>
        </div>

        {/* TAB NAVIGASI */}
        <nav className="header-nav">
          <button
            className={`nav-btn ${activeTab === 'input' ? 'active' : ''}`}
            onClick={() => setActiveTab('input')}
          >
            Form Input Tamu
          </button>

          <button
            className={`nav-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            Dashboard Admin
          </button>

          {session && (
            <button className="nav-btn btn-logout" onClick={handleLogout}>
              🚪 Logout ({session.user.email.split('@')[0]})
            </button>
          )}
        </nav>
      </header>

      {/* KONTEN UTAMA */}
      <main className="app-main">
        {/* 1. Jika belum login sama sekali */}
        {!session ? (
          <Login
            targetRole={activeTab}
            onLoginSuccess={() => setRefreshTrigger((prev) => prev + 1)}
          />
        ) : (
          <>
            {/* 2. Jika di Tab Form Input Tamu */}
            {activeTab === 'input' && (
              <FormInput onDataSubmitted={() => setRefreshTrigger((prev) => prev + 1)} />
            )}

            {/* 3. Jika di Tab Dashboard Admin */}
            {activeTab === 'admin' && (
              isAdmin ? (
                <Dashboard refreshTrigger={refreshTrigger} />
              ) : (
                <div className="unauthorized-card">
                  <h2>⛔ Akses Ditolak</h2>
                  <p>
                    Akun Anda (<strong>{session.user.email}</strong>) terdaftar sebagai <strong>Resepsionis</strong> dan tidak memiliki hak akses ke Dashboard Admin.
                  </p>
                  <button className="nav-btn btn-logout" onClick={handleLogout}>
                    Logout & Login sebagai Admin
                  </button>
                </div>
              )
            )}
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} GuestHub - Project Magang - Buku Tamu Digital.</p>
      </footer>
    </div>
  );
}
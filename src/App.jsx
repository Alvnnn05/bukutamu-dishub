import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import Login from './components/Login/Login';
import FormInput from './components/FormInput/FormInput';
import ProfileModal from './components/ProfileModal/ProfileModal';
import adminIcon from './assets/admin.png'; 
import receptionistIcon from './assets/custservice.png';
import './App.css';

// Import file logo (sesuaikan path dan nama filenya dengan lokasi logomu)
import logoApp from './assets/guesthub.png'; 

const ADMIN_EMAILS = [
  'vinandrian05@gmail.com'
];

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div className="loading-screen">Memuat aplikasi...</div>;
  }

  if (!session) {
    return <Login onLoginSuccess={() => {}} />;
  }

  const userEmail = session.user.email;
  const isAdmin = ADMIN_EMAILS.includes(userEmail);
  const userName = session.user.user_metadata?.full_name || userEmail.split('@')[0];

  return (
    <div className="app-container">
      {/* NAVBAR ATAS */}
      <header className="main-header">
        <div className="header-brand">
          <img src={logoApp} alt="Logo GuestHub" className="header-logo-img" />
          
          <div>
            <h1 className="header-title">GuestHub</h1>
            <p className="header-subtitle">Sistem Buku Tamu Digital Dinas Perhubungan</p>
          </div>
        </div>

        <div className="header-actions">
          <span className={`role-badge ${isAdmin ? 'admin' : 'resepsionis'}`}>
            {isAdmin ? (
              <>
                <img src={adminIcon} alt="Admin" className="badge-icon" /> Admin
              </>
            ) : (
              <>
                <img src={receptionistIcon} alt="Resepsionis" className="badge-icon badge-icon-resepsionis" /> Resepsionis
              </>
            )}
          </span>

          <button className="btn-header-profile" onClick={() => setShowProfile(true)}>
            ⚙️ Profil ({userName})
          </button>

          <button className="btn-header-logout" onClick={handleLogout}>
             Logout
          </button>
        </div>
      </header>

      {/* TAMPILAN UTAMA */}
      <main className="main-content">
        <FormInput userSession={session} isAdmin={isAdmin} />
      </main>

      {/* MODAL PROFIL */}
      {showProfile && (
        <ProfileModal
          session={session}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}
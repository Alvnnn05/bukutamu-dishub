import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './Login.css';

// 1. Import file logo dari folder assets
import logoDishub from '../../assets/guesthub2.png'; // Sesuaikan dengan nama & lokasi file logomu

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert('Gagal Login: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header-icon">
          <img src={logoDishub} alt="Logo Dishub" className="login-logo-img" />
        </div>

        <h2 className="login-title">GuestHub</h2>
        <p className="login-subtitle">Sistem Buku Tamu Digital Dinas Perhubungan</p>

        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group-login">
            <label>Email Akun</label>
            <input
              type="email"
              placeholder="Masukkan email Anda"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group-login">
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-login-submit" disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk ke Sistem'}
          </button>
        </form>
      </div>

      <div className="login-footer-text">
        © {new Date().getFullYear()} Project Magang - GuestHub Dishub Ponorogo
      </div>
    </div>
  );
}
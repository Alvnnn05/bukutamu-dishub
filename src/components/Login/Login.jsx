import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './Login.css';

export default function Login({ onLoginSuccess, targetRole }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg('Login gagal: Email atau password salah.');
    } else if (data?.user) {
      onLoginSuccess(data.user);
    }
    setLoading(false);
  };

  return (
    <div className="login-card">
      <h2 className="login-title">
        {targetRole === 'admin' ? 'Login Admin Dishub' : 'Login Resepsionis'}
      </h2>
      <p className="login-subtitle">
        {targetRole === 'admin'
          ? 'Masuk untuk mengelola data & ekspor laporan'
          : 'Masuk untuk membuka Form Input Tamu'}
      </p>

      {errorMsg && <div className="login-error">{errorMsg}</div>}

      <form onSubmit={handleLogin} className="login-form">
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            placeholder={targetRole === 'admin' ? 'admin@dishub.com' : 'resepsionis@dishub.com'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="btn-login" disabled={loading}>
          {loading ? 'Proses Login...' : `Masuk sebagai ${targetRole === 'admin' ? 'Admin' : 'Resepsionis'}`}
        </button>
      </form>
    </div>
  );
}
import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './ProfileModal.css';

export default function ProfileModal({ session, onClose }) {
  const [fullName, setFullName] = useState(session?.user?.user_metadata?.full_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Ambil email langsung dari prop session
  const email = session?.user?.email || '';

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Update Nama Lengkap (Metadata)
      const { error: nameError } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });
      if (nameError) throw nameError;

      // 2. Update Password jika diisi
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error('Konfirmasi password baru tidak cocok.');
        }
        if (newPassword.length < 6) {
          throw new Error('Password minimal terdiri dari 6 karakter.');
        }
        const { error: passError } = await supabase.auth.updateUser({
          password: newPassword
        });
        if (passError) throw passError;
      }

      alert('Profil berhasil diperbarui!');
      onClose();
    } catch (err) {
      alert(err.message || 'Gagal memperbarui data profil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⚙️ Pengaturan Profil Akun</h3>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleUpdateProfile} className="profile-form">
          {/* INPUT EMAIL STATIS / DISABLED */}
          <div className="form-group">
            <label>Email Akun</label>
            <input
              type="email"
              name="email"
              value={email}
              disabled
              style={{
                backgroundColor: '#f1f5f9',
                color: '#64748b',
                cursor: 'not-allowed'
              }}
            />
            <small style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '4px' }}>
              Email akun terdaftar tidak dapat diubah.
            </small>
          </div>

          <div className="form-group">
            <label>Nama Lengkap / Username</label>
            <input
              type="text"
              placeholder="Masukkan nama pengguna"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <hr className="divider" />

          <div className="form-group">
            <label>Password Baru (Kosongkan jika tidak diubah)</label>
            <input
              type="password"
              placeholder="Minimal 6 karakter"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          {newPassword && (
            <div className="form-group">
              <label>Konfirmasi Password Baru</label>
              <input
                type="password"
                placeholder="Ulangi password baru"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
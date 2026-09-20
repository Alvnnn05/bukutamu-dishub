import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './FormInput.css';

export default function FormInput({ onSessionCreated }) {
  const [formData, setFormData] = useState({
    nama_tamu: '',
    instansi_asal: '',
    no_hp: '',
    tujuan_bidang: 'Sekretariat',
    perihal: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const sessionId = 'SES-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);

    const { error } = await supabase.from('tamu').insert([
      { ...formData, session_id: sessionId, status: 'draft' }
    ]);

    setLoading(false);
    if (error) {
      alert('Gagal menyimpan data: ' + error.message);
    } else {
      onSessionCreated(sessionId);
    }
  };

  return (
    <div className="form-card">
      <h2 className="form-title">Pencatatan Tamu Baru</h2>
      <form onSubmit={handleSubmit} className="guest-form">
        <div className="form-group">
          <label>Nama Lengkap Tamu</label>
          <input type="text" name="nama_tamu" value={formData.nama_tamu} onChange={handleChange} required placeholder="Contoh: Budi Santoso" />
        </div>
        <div className="form-group">
          <label>Instansi / Lembaga Asal</label>
          <input type="text" name="instansi_asal" value={formData.instansi_asal} onChange={handleChange} required placeholder="Contoh: Dinas Pertanian" />
        </div>
        <div className="form-group">
          <label>Nomor Telepon / WA</label>
          <input type="tel" name="no_hp" value={formData.no_hp} onChange={handleChange} required placeholder="08123456789" />
        </div>
        <div className="form-group">
          <label>Tujuan Bidang / Unit Kerja</label>
          <select name="tujuan_bidang" value={formData.tujuan_bidang} onChange={handleChange}>
            <option value="Sekretariat">Sekretariat</option>
            <option value="Bidang Lalu Lintas">Bidang Lalu Lintas</option>
            <option value="Bidang Angkutan Jalan">Bidang Angkutan Jalan</option>
            <option value="Bidang Sarana & Prasarana">Bidang Sarana & Prasarana</option>
            <option value="Divisi DALOPS">Bidang DALOPS</option>
            <option value="Divisi Perparkiran">Bidang Perparkiran</option>
            <option value="UPTD Pengujian Kendaraan">Bidang Pengujian Kendaraan</option>
          </select>
        </div>
        <div className="form-group">
          <label>Perihal / Maksud Kunjungan</label>
          <textarea name="perihal" value={formData.perihal} onChange={handleChange} required placeholder="Contoh: Rapat koordinasi dinas"></textarea>
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Memproses...' : 'Lanjut ke Foto'}
        </button>
      </form>
    </div>
  );
}
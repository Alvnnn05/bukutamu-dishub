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
            <option value="Sub Bagian Umum Dan Kepegawaian">Sub Bagian Umum Dan Kepegawaian</option>
            <option value="Sub Bagian Keuangan Dan Penyusunan Program">Sub Bagian Keuangan Dan Penyusunan Program</option>
            <option value="Bidang Angkutan">Bidang Angkutan</option>
            <option value="Seksi Angkutan Orang">Seksi Angkutan Orang</option>
            <option value="Seksi Angkutan Barang">Seksi Angkutan Barang</option>
            <option value="Bidang Lalu Lintas, Sarana, Prasarana">Bidang Lalu Lintas, Sarana, Prasarana</option>
            <option value="Seksi Parkir">Seksi Parkir</option>
            <option value="Seksi Manajemen Rekayasa Lalu Lintas">Seksi Manajemen Rekayasa Lalu Lintas</option>
            <option value="Seksi Penerangan Jalan Umum">Seksi Penerangan Jalan Umum</option>
            <option value="Bidang Pengendalian Operasional Lalu Lintas Dan Angkutan Jalan">Bidang Pengendalian Operasional Lalu Lintas Dan Angkutan Jalan</option>
            <option value="UPT Pengujian Kendaraan Bermotor">UPT Pengujian Kendaraan Bermotor</option>
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
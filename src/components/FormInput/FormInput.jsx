import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import * as XLSX from 'xlsx';
import './FormInput.css';

export default function FormInput({ userSession, isAdmin }) {
  const [formData, setFormData] = useState({
    nama_tamu: '',
    instansi_asal: '',
    no_hp: '',
    tujuan_bidang: 'Sekretariat',
    perihal: ''
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);

  // State Tabel Sisi Kanan (Daftar Tamu + Filter)
  const [guests, setGuests] = useState([]);
  const [filteredGuests, setFilteredGuests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // State Modal Hapus & Check-out
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [checkoutTarget, setCheckoutTarget] = useState(null);

  // State Notifikasi Sukses
  const [successMessage, setSuccessMessage] = useState(null);

  // State Preview Gambar dari Tabel
  const [previewImage, setPreviewImage] = useState(null);

  // State Paginasi (5 Data per Halaman)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchGuests = async () => {
    const { data, error } = await supabase
      .from('tamu')
      .select('*')
      .neq('status', 'draft')
      .order('created_at', { ascending: false });

    if (!error) {
      setGuests(data || []);
      setFilteredGuests(data || []);
    }
  };

  useEffect(() => {
    fetchGuests();

    const channel = supabase
      .channel('realtime-tamu-unified')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tamu' }, () => fetchGuests())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let result = guests;

    if (searchTerm) {
      result = result.filter(
        (g) =>
          g.nama_tamu?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          g.instansi_asal?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((g) => g.status === statusFilter);
    }

    if (dateFilter) {
      result = result.filter((g) => {
        const guestDate = new Date(g.created_at).toISOString().split('T')[0];
        return guestDate === dateFilter;
      });
    }

    setFilteredGuests(result);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateFilter, guests]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let foto_url = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `tamu/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('foto-tamu')
          .upload(filePath, imageFile);

        if (uploadError) throw new Error('Gagal unggah foto: ' + uploadError.message);

        const { data: urlData } = supabase.storage
          .from('foto-tamu')
          .getPublicUrl(filePath);

        foto_url = urlData.publicUrl;
      }

      const { error: dbError } = await supabase.from('tamu').insert([
        {
          ...formData,
          foto_url: foto_url,
          session_id: `direct-${Date.now()}`,
          status: 'active',
          created_at: new Date().toISOString()
        }
      ]);

      if (dbError) throw dbError;

      // Pop-up Sukses Simpan Data
      setSuccessMessage('Data tamu berhasil disimpan!');

      setFormData({
        nama_tamu: '',
        instansi_asal: '',
        no_hp: '',
        tujuan_bidang: 'Sekretariat',
        perihal: ''
      });
      setImageFile(null);
      setImagePreview(null);

      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';

      fetchGuests();
    } catch (err) {
      alert(err.message || 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setLoading(false);
    }
  };

  // Eksekusi Check-out Tamu
  const confirmCheckout = async () => {
    if (!checkoutTarget) return;

    const checkOutTime = new Date().toISOString();
    const { error } = await supabase
      .from('tamu')
      .update({ status: 'completed', check_out_at: checkOutTime })
      .eq('id', checkoutTarget.id);

    if (error) {
      alert('Gagal check-out: ' + error.message);
    } else {
      setSuccessMessage(`Tamu "${checkoutTarget.nama_tamu}" berhasil check-out.`);
      setCheckoutTarget(null);
      fetchGuests();
    }
  };

  // Hapus Data Tamu (Hanya untuk Admin)
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('tamu').delete().eq('id', deleteTarget.id);

    if (error) {
      alert('Gagal menghapus data: ' + error.message);
    } else {
      setSuccessMessage(`Data tamu "${deleteTarget.nama_tamu}" berhasil dihapus.`);
      setDeleteTarget(null);
      fetchGuests();
    }
  };

  // Export Data Excel (Hanya untuk Admin)
  const handleExportExcel = () => {
    if (filteredGuests.length === 0) {
      alert('Tidak ada data untuk di-export.');
      return;
    }

    const dataToExport = filteredGuests.map((g, idx) => ({
      No: idx + 1,
      'Nama Tamu': g.nama_tamu,
      'Instansi Asal': g.instansi_asal,
      'No. HP': g.no_hp,
      'Tujuan Bidang': g.tujuan_bidang,
      'Perihal': g.perihal,
      'Masuk': new Date(g.created_at).toLocaleString('id-ID'),
      'Keluar': g.check_out_at ? new Date(g.check_out_at).toLocaleString('id-ID') : '-',
      Status: g.status === 'active' ? 'Berkunjung' : 'Selesai'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Tamu');
    XLSX.writeFile(workbook, `Buku_Tamu_Dishub_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredGuests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredGuests.length / itemsPerPage);

  return (
    <div className="form-input-container">
      {/* KIRI: FORM PENCATATAN TAMU BARU */}
      <div className="form-card">
        <h2 className="form-title">Pencatatan Tamu Baru</h2>
        
        <form onSubmit={handleSubmit} className="guest-form">
          <div className="form-group">
            <label>Nama Lengkap Tamu *</label>
            <input
              type="text"
              name="nama_tamu"
              placeholder="Contoh: Alvin Andriansyah"
              value={formData.nama_tamu}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Instansi / Lembaga Asal *</label>
            <input
              type="text"
              name="instansi_asal"
              placeholder="-"
              value={formData.instansi_asal}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Nomor Telepon / WA *</label>
            <input
              type="text"
              name="no_hp"
              placeholder="08123456789"
              value={formData.no_hp}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Tujuan Bidang / Unit Kerja *</label>
            <select
              name="tujuan_bidang"
              value={formData.tujuan_bidang}
              onChange={handleChange}
              required
            >
              <option value="Sekretariat">Sekretariat</option>
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
            <label>Perihal / Maksud Kunjungan *</label>
            <textarea
              name="perihal"
              value={formData.perihal}
              onChange={handleChange}
              rows="3"
              required
            />
          </div>

          <div className="form-group">
            <label>Foto Tamu (Ambil via Kamera / Upload) *</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageChange}
              required
            />
            
            {imagePreview && (
              <div className="image-preview-container">
                <img src={imagePreview} alt="Preview Foto Tamu" className="image-preview" />
              </div>
            )}
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Menyimpan...' : 'Simpan Data Tamu'}
          </button>
        </form>
      </div>

      {/* KANAN: TABEL DAFTAR TAMU AKTIF & RIWAYAT */}
      <div className="table-card-right">
        <div className="table-card-header">
          <h2 className="form-title">Daftar Tamu Aktif & Riwayat</h2>
          {/* Tombol Export Excel khusus Admin */}
          {isAdmin && (
            <button className="btn-export-excel-small" onClick={handleExportExcel}>
              Export Excel
            </button>
          )}
        </div>

        {/* Filter Baris Atas */}
        <div className="filter-row-input">
          <input
            type="text"
            className="search-input-right"
            placeholder="Cari Nama / Instansi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            className="filter-select-right"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Semua Status</option>
            <option value="active">Berkunjung</option>
            <option value="completed">Selesai</option>
          </select>

          <input
            type="date"
            className="filter-date-right"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        {/* Tabel Data Tamu */}
        <div className="table-responsive-right">
          <table className="guest-table-right">
            <thead>
              <tr>
                <th>Foto</th>
                <th>Nama & Kontak</th>
                <th>Instansi Asal</th>
                <th>Tujuan & Perihal</th>
                <th>Waktu Kunjungan</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-row-right">Data tidak ditemukan.</td>
                </tr>
              ) : (
                currentItems.map((guest) => (
                  <tr key={guest.id}>
                    <td>
                      {guest.foto_url ? (
                        <img
                          src={guest.foto_url}
                          alt={guest.nama_tamu}
                          className="table-avatar clickable-avatar"
                          onClick={() => setPreviewImage(guest.foto_url)}
                          title="Klik untuk memperbesar"
                        />
                      ) : (
                        <div className="no-avatar-cell">No Pic</div>
                      )}
                    </td>
                    <td>
                      <strong>{guest.nama_tamu}</strong>
                      <div className="sub-detail">{guest.no_hp}</div>
                    </td>
                    <td>{guest.instansi_asal}</td>
                    <td>
                      <strong>{guest.tujuan_bidang}</strong>
                      <div className="sub-detail">{guest.perihal}</div>
                    </td>
                    <td>
                      <div className="time-details">
                        <span><strong>Masuk:</strong> {new Date(guest.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
                        {guest.check_out_at && (
                          <span className="time-out-text">
                            <strong>Keluar:</strong> {new Date(guest.check_out_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${guest.status}`}>
                        {guest.status === 'active' ? 'Berkunjung' : 'Selesai'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons-cell">
                        {guest.status === 'active' && (
                          <button
                            className="btn-checkout-table"
                            onClick={() => setCheckoutTarget(guest)}
                          >
                            Check-Out
                          </button>
                        )}

                        {/* Tombol Hapus khusus Admin */}
                        {isAdmin && (
                          <button
                            className="btn-delete-table"
                            onClick={() => setDeleteTarget(guest)}
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* NAVIGASI PAGINASI */}
        {filteredGuests.length > 0 && (
          <div className="pagination-container-right">
            <span className="pagination-info-right">
              Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredGuests.length)} dari {filteredGuests.length} data
            </span>

            <div className="pagination-buttons-right">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
              >
                &laquo; Prev
              </button>
              <span>Halaman {currentPage} dari {totalPages || 1}</span>
              <button
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage((prev) => prev + 1)}
              >
                Next &raquo;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL KONFIRMASI CHECK-OUT */}
      {checkoutTarget && (
        <div className="modal-overlay" onClick={() => setCheckoutTarget(null)}>
          <div className="delete-modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🚪</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#1e3a8a' }}>Konfirmasi Check-Out</h3>
            <p style={{ margin: '0 0 20px 0', color: '#475569' }}>
              Proses Check-Out untuk tamu <strong>"{checkoutTarget.nama_tamu}"</strong>?
            </p>
            <div className="delete-modal-actions">
              <button className="btn-cancel" onClick={() => setCheckoutTarget(null)}>
                Batal
              </button>
              <button className="btn-confirm-delete" style={{ backgroundColor: '#10b981' }} onClick={confirmCheckout}>
                Ya, Check-Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS (KHUSUS ADMIN) */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="delete-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>⚠️ Konfirmasi Hapus Data</h3>
            <p>Apakah Anda yakin ingin menghapus data kunjungan dari <strong>"{deleteTarget.nama_tamu}"</strong>?</p>
            <div className="delete-modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteTarget(null)}>Batal</button>
              <button className="btn-confirm-delete" onClick={confirmDelete}>Ya, Hapus Data</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW FOTO TAMU (KLIK GAMBAR) */}
      {previewImage && (
        <div className="image-preview-overlay" onClick={() => setPreviewImage(null)}>
          <div className="image-preview-content" onClick={(e) => e.stopPropagation()}>
            <button className="preview-close-btn" onClick={() => setPreviewImage(null)}>
              &times;
            </button>
            <img src={previewImage} alt="Preview Foto Tamu" className="preview-full-img" />
          </div>
        </div>
      )}

      {/* MODAL NOTIFIKASI SUKSES */}
      {successMessage && (
        <div className="modal-overlay" onClick={() => setSuccessMessage(null)}>
          <div className="success-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="success-icon-badge">✅</div>
            <h3 className="success-modal-title">Berhasil!</h3>
            <p className="success-modal-text">{successMessage}</p>
            <button className="btn-success-ok" onClick={() => setSuccessMessage(null)}>
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
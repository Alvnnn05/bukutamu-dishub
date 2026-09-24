import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import React from 'react';
import Webcam from 'react-webcam';
import { supabase } from '../../lib/supabaseClient';
import * as XLSX from 'xlsx';
import './FormInput.css';

export default function FormInput({ userSession, isAdmin }) {
  // State Form Pencatatan Baru
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

  // State & Ref Modal Kamera
  const webcamRef = useRef(null);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [tempCameraImage, setTempCameraImage] = useState(null); // Gambar sementara sebelum disetujui

  // State Tabel Sisi Kanan (Daftar Tamu + Filter)
  const [guests, setGuests] = useState([]);
  const [filteredGuests, setFilteredGuests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [bidangFilter, setBidangFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // State Modal Hapus & Check-out
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [checkoutTarget, setCheckoutTarget] = useState(null);

  // State Modal Edit Data Tamu
  const [editingGuest, setEditingGuest] = useState(null);
  const [editFormData, setEditFormData] = useState({
    nama_tamu: '',
    instansi_asal: '',
    no_hp: '',
    tujuan_bidang: 'Sekretariat',
    perihal: ''
  });
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  // State Notifikasi Sukses
  const [successMessage, setSuccessMessage] = useState(null);

  // State Preview Gambar dari Tabel
  const [previewImage, setPreviewImage] = useState(null);

  // State Paginasi (5 Data per Halaman)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Helper: Konversi dataURL (Base64 dari Webcam) menjadi File Object
  const urlToFile = async (url, filename, mimeType) => {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    return new File([buf], filename, { type: mimeType });
  };

  // Tangkap Foto Sementara di Modal Kamera
  const handleCaptureTemp = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setTempCameraImage(imageSrc);
      }
    }
  }, [webcamRef]);

  // Konfirmasi Gunakan Foto dari Modal Kamera
  const handleConfirmCameraPhoto = async () => {
    if (tempCameraImage) {
      setImagePreview(tempCameraImage);
      const file = await urlToFile(tempCameraImage, `webcam-${Date.now()}.jpg`, 'image/jpeg');
      setImageFile(file);
      setIsCameraModalOpen(false);
      setTempCameraImage(null);
    }
  };

  // Batal Modal Kamera
  const handleCloseCameraModal = () => {
    setIsCameraModalOpen(false);
    setTempCameraImage(null);
  };

  // FUNGSI RESET SELURUH FILTER
  const handleResetFilter = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setBidangFilter('all');
    setDateFilter('');
  };

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

  const summaryStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const todayGuests = guests.filter(g => g.created_at && g.created_at.startsWith(todayStr));
    const activeGuests = guests.filter(g => g.status === 'active' || !g.check_out_at);
    const monthGuests = guests.filter(g => {
      if (!g.created_at) return false;
      const d = new Date(g.created_at);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const unitCounts = {};
    monthGuests.forEach(g => {
      const unit = g.tujuan_bidang || 'Lainnya';
      unitCounts[unit] = (unitCounts[unit] || 0) + 1;
    });

    let topUnit = '-';
    let topUnitCount = 0;
    Object.entries(unitCounts).forEach(([unit, count]) => {
      if (count > topUnitCount) {
        topUnit = unit;
        topUnitCount = count;
      }
    });

    return {
      todayCount: todayGuests.length,
      activeCount: activeGuests.length,
      monthCount: monthGuests.length,
      topUnitName: topUnit,
      topUnitCount: topUnitCount
    };
  }, [guests]);

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

  // LOGIKA PENYARINGAN DATA TABEL
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

    if (bidangFilter !== 'all') {
      result = result.filter((g) => g.tujuan_bidang === bidangFilter);
    }

    if (dateFilter) {
      result = result.filter((g) => {
        const guestDate = new Date(g.created_at).toISOString().split('T')[0];
        return guestDate === dateFilter;
      });
    }

    setFilteredGuests(result);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, bidangFilter, dateFilter, guests]);

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

  // Submit Simpan Tamu Baru
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let foto_url = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop() || 'jpg';
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

      const fileInput = document.getElementById('guest-photo-upload');
      if (fileInput) fileInput.value = '';

      fetchGuests();
    } catch (err) {
      alert(err.message || 'Terjadi kesalahan saat menyimpan.');
    } finally {
      setLoading(false);
    }
  };

  // HANDLER FITUR EDIT TAMU
  const handleOpenEdit = (guest) => {
    setEditingGuest(guest);
    setEditFormData({
      nama_tamu: guest.nama_tamu || '',
      instansi_asal: guest.instansi_asal || '',
      no_hp: guest.no_hp || '',
      tujuan_bidang: guest.tujuan_bidang || 'Sekretariat',
      perihal: guest.perihal || ''
    });
    setEditImageFile(null);
    setEditImagePreview(guest.foto_url || null);
  };

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleEditImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setEditImageFile(file);
      setEditImagePreview(URL.createObjectURL(file));
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingGuest) return;
    setEditLoading(true);

    try {
      let new_foto_url = editingGuest.foto_url;

      if (editImageFile) {
        const fileExt = editImageFile.name.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `tamu/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('foto-tamu')
          .upload(filePath, editImageFile);

        if (uploadError) throw new Error('Gagal unggah foto baru: ' + uploadError.message);

        const { data: urlData } = supabase.storage
          .from('foto-tamu')
          .getPublicUrl(filePath);

        new_foto_url = urlData.publicUrl;
      }

      const { error: updateError } = await supabase
        .from('tamu')
        .update({
          ...editFormData,
          foto_url: new_foto_url
        })
        .eq('id', editingGuest.id);

      if (updateError) throw updateError;

      setSuccessMessage(`Data tamu "${editFormData.nama_tamu}" berhasil diperbarui!`);
      setEditingGuest(null);
      fetchGuests();
    } catch (err) {
      alert(err.message || 'Gagal memperbarui data tamu.');
    } finally {
      setEditLoading(false);
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
    <div className="form-input-wrapper" style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
      
      {/* 4 SUMMARY CARDS DI PALING ATAS */}
      <div className="summary-cards-grid">
        <div className="summary-card card-yellow-border">
          <div className="card-header-content">
            <div>
              <span className="card-title">Tamu Hari Ini</span>
              <h3 className="card-value">{summaryStats.todayCount}</h3>
            </div>
            <div className="card-icon-badge bg-badge-orange">👥</div>
          </div>
          <div className="card-footer-text text-green">▲ Hari ini</div>
        </div>

        <div className="summary-card card-orange-border">
          <div className="card-header-content">
            <div>
              <span className="card-title">Sedang Berkunjung</span>
              <h3 className="card-value">{summaryStats.activeCount}</h3>
            </div>
            <div className="card-icon-badge bg-badge-yellow">🕒</div>
          </div>
          <div className="card-footer-text text-sub">belum checkout</div>
        </div>

        <div className="summary-card card-green-border">
          <div className="card-header-content">
            <div>
              <span className="card-title">Total Bulan Ini</span>
              <h3 className="card-value">{summaryStats.monthCount}</h3>
            </div>
            <div className="card-footer-text text-sub">
              per {new Date().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div className="summary-card card-blue-border">
          <div className="card-header-content">
            <div>
              <span className="card-title">Bidang Terbanyak</span>
              <h3 className="card-value text-truncate">{summaryStats.topUnitName}</h3>
            </div>
            <div className="card-icon-badge bg-badge-blue">🏢</div>
          </div>
          <div className="card-footer-text text-sub">
            {summaryStats.topUnitCount} kunjungan bulan ini
          </div>
        </div>
      </div>

      {/* CONTAINER LAYOUT KIRI (FORM) & KANAN (TABEL) */}
      <div className="form-input-container" style={{ padding: '0' }}>
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

            {/* SELEKSI FOTO TAMU RINGKAS */}
            <div className="form-group">
              <label>Foto Tamu *</label>

              {/* Tampilan jika foto sudah diambil/dipilih */}
              {imagePreview ? (
                <div className="photo-preview-box">
                  <img src={imagePreview} alt="Preview Foto Tamu" className="form-photo-thumbnail" />
                  <div className="photo-preview-actions">
                    <span className="photo-status-badge">✓ Foto Siap</span>
                    <button
                      type="button"
                      className="btn-remove-photo"
                      onClick={() => {
                        setImagePreview(null);
                        setImageFile(null);
                        const fileInput = document.getElementById('guest-photo-upload');
                        if (fileInput) fileInput.value = '';
                      }}
                    >
                       Hapus
                    </button>
                  </div>
                </div>
              ) : (
                /* Tampilan tombol opsi foto jika belum ada foto */
                <div className="photo-input-options">
                  <button
                    type="button"
                    className="btn-webcam-trigger"
                    onClick={() => setIsCameraModalOpen(true)}
                  >
                    Ambil via Kamera
                  </button>

                  <label htmlFor="guest-photo-upload" className="custom-file-upload">
                     Upload File
                  </label>
                  <input
                    id="guest-photo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden-file-input"
                    onChange={handleImageChange}
                  />
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
            {isAdmin && (
              <button className="btn-export-excel-small" onClick={handleExportExcel}>
                Export Excel
              </button>
            )}
          </div>

          <div className="filter-container-wrapper">
            <div className="filter-row-top">
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

            <div className="filter-row-bottom">
              <select
                className="filter-select-bidang-full"
                value={bidangFilter}
                onChange={(e) => setBidangFilter(e.target.value)}
              >
                <option value="all">-- Semua Tujuan Bidang / Unit Kerja --</option>
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

              <button 
                type="button" 
                className="btn-reset-filter"
                onClick={handleResetFilter}
                title="Reset seluruh penyaringan"
              >
                Reset
              </button>
            </div>
          </div>

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

                          <button
                            className="btn-edit-table"
                            onClick={() => handleOpenEdit(guest)}
                            title="Edit data tamu"
                          >
                            Edit
                          </button>

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
      </div>

      {/* MODAL KAMERA WEBCAM (POP-UP LENGKAP) */}
      {isCameraModalOpen && (
        <div className="modal-overlay" onClick={handleCloseCameraModal}>
          <div className="camera-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="camera-modal-header">
              <h3> Ambil Foto</h3>
              <button className="edit-modal-close" onClick={handleCloseCameraModal}>&times;</button>
            </div>

            <div className="camera-viewport-box">
              {tempCameraImage ? (
                <img src={tempCameraImage} alt="Foto Jepretan Kamera" className="camera-captured-img" />
              ) : (
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  width="100%"
                  height="100%"
                  videoConstraints={{ facingMode: 'user' }}
                  className="webcam-live-view"
                />
              )}
            </div>

            <div className="camera-modal-actions">
              {tempCameraImage ? (
                <>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => setTempCameraImage(null)}
                  >
                    🔄 Foto Ulang
                  </button>
                  <button
                    type="button"
                    className="btn-confirm-delete"
                    style={{ backgroundColor: '#10b981' }}
                    onClick={handleConfirmCameraPhoto}
                  >
                    ✅ Gunakan Foto Ini
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={handleCloseCameraModal}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    className="btn-capture-photo"
                    onClick={handleCaptureTemp}
                  >
                    📸 Tangkap Foto
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT DATA TAMU */}
      {editingGuest && (
        <div className="modal-overlay" onClick={() => setEditingGuest(null)}>
          <div className="edit-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <h3>✏️ Edit Data Tamu</h3>
              <button className="edit-modal-close" onClick={() => setEditingGuest(null)}>&times;</button>
            </div>

            <form onSubmit={handleEditSubmit} className="guest-form">
              <div className="form-group">
                <label>Nama Lengkap Tamu *</label>
                <input
                  type="text"
                  name="nama_tamu"
                  value={editFormData.nama_tamu}
                  onChange={handleEditChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Instansi / Lembaga Asal *</label>
                <input
                  type="text"
                  name="instansi_asal"
                  value={editFormData.instansi_asal}
                  onChange={handleEditChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Nomor Telepon / WA *</label>
                <input
                  type="text"
                  name="no_hp"
                  value={editFormData.no_hp}
                  onChange={handleEditChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Tujuan Bidang / Unit Kerja *</label>
                <select
                  name="tujuan_bidang"
                  value={editFormData.tujuan_bidang}
                  onChange={handleEditChange}
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
                  value={editFormData.perihal}
                  onChange={handleEditChange}
                  rows="3"
                  required
                />
              </div>

              <div className="form-group">
                <label>Ganti Foto (Opsional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleEditImageChange}
                />
                
                {editImagePreview && (
                  <div className="image-preview-container">
                    <img src={editImagePreview} alt="Preview Foto Tamu" className="image-preview" />
                  </div>
                )}
              </div>

              <div className="delete-modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setEditingGuest(null)}>
                  Batal
                </button>
                <button type="submit" className="btn-confirm-delete" style={{ backgroundColor: '#f59e0b' }} disabled={editLoading}>
                  {editLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* MODAL PREVIEW FOTO TAMU (KLIK GAMBAR TABEL) */}
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
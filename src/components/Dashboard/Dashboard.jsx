import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import './Dashboard.css';

export default function Dashboard({ refreshTrigger }) {
  const [guests, setGuests] = useState([]);
  const [filteredGuests, setFilteredGuests] = useState([]);
  
  // State untuk Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');

  // State untuk Paginasi
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const fetchGuests = async () => {
    const { data, error } = await supabase
      .from('tamu')
      .select('*')
      .neq('status', 'draft')
      .order('created_at', { ascending: false });

    if (!error) {
      setGuests(data);
      setFilteredGuests(data);
    }
  };

// Realtime Subscription + Fetch Awal
useEffect(() => {
  fetchGuests();

  // Berlangganan perubahan tabel 'tamu' secara real-time dari Supabase
  const channel = supabase
    .channel('realtime-tamu-dashboard')
    .on(
      'postgres_changes',
      { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'tamu' 
      },
      (payload) => {
        // Ketika ada event HAPUS dari Supabase/Web, langsung hapus ID tersebut dari state lokal
        if (payload.old && payload.old.id) {
          setGuests((prev) => prev.filter((g) => g.id !== payload.old.id));
        } else {
          // Fallback jika payload kosong, panggil ulang data
          fetchGuests();
        }
      }
    )
    .on(
      'postgres_changes',
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'tamu' 
      },
      () => {
        fetchGuests();
      }
    )
    .on(
      'postgres_changes',
      { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'tamu' 
      },
      () => {
        fetchGuests();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [refreshTrigger]);

  // Efek untuk Filter & Search
  useEffect(() => {
    let result = guests;

    // Filter Nama / Instansi
    if (searchTerm) {
      result = result.filter(
        (g) =>
          g.nama_tamu.toLowerCase().includes(searchTerm.toLowerCase()) ||
          g.instansi_asal.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter Status
    if (statusFilter !== 'all') {
      result = result.filter((g) => g.status === statusFilter);
    }

    // Filter Tanggal
    if (dateFilter) {
      result = result.filter((g) => {
        const guestDate = new Date(g.created_at).toISOString().split('T')[0];
        return guestDate === dateFilter;
      });
    }

    setFilteredGuests(result);
    setCurrentPage(1); // Reset ke halaman 1 tiap kali filter berubah
  }, [searchTerm, statusFilter, dateFilter, guests]);

  // Handler Check-Out
  const handleCheckout = async (id) => {
    const checkOutTime = new Date().toISOString();
    const { error } = await supabase
      .from('tamu')
      .update({
        status: 'completed',
        check_out_at: checkOutTime
      })
      .eq('id', id);

    if (error) {
      alert('Gagal check-out: ' + error.message);
    }
  };

  // Handler Hapus Data
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Apakah Anda yakin ingin menghapus data tamu ini?');
    if (!confirmDelete) return;

    const { error } = await supabase
      .from('tamu')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Gagal menghapus data: ' + error.message);
    }
  };

  // Logika Paginasi
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredGuests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredGuests.length / itemsPerPage);

  return (
    <div className="dashboard-card">
      <h2 className="dashboard-title">Daftar Tamu Aktif & Riwayat</h2>

      {/* 1. Baris Filter & Pencarian */}
      <div className="filter-container">
        <input
          type="text"
          className="search-input"
          placeholder="Cari Nama / Instansi..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Semua Status</option>
          <option value="active">Berkunjung (Aktif)</option>
          <option value="completed">Selesai</option>
        </select>

        <input
          type="date"
          className="filter-date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />

        {(searchTerm || statusFilter !== 'all' || dateFilter) && (
          <button
            className="btn-reset-filter"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setDateFilter('');
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Tabel Data */}
      <div className="table-responsive">
        <table className="guest-table">
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
                <td colSpan="7" className="empty-row">Data tidak ditemukan.</td>
              </tr>
            ) : (
              currentItems.map((guest) => (
                <tr key={guest.id}>
                  <td>
                    {guest.foto_url ? (
                      <img src={guest.foto_url} alt={guest.nama_tamu} className="guest-avatar" />
                    ) : (
                      <div className="no-avatar">No Pic</div>
                    )}
                  </td>
                  <td>
                    <strong>{guest.nama_tamu}</strong>
                    <div className="sub-text">{guest.no_hp}</div>
                  </td>
                  <td>{guest.instansi_asal}</td>
                  <td>
                    <strong>{guest.tujuan_bidang}</strong>
                    <div className="sub-text">{guest.perihal}</div>
                  </td>
                  <td>
                    <div className="time-info">
                      <span className="time-in">
                        <strong>Masuk:</strong> {new Date(guest.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </span>
                      {guest.check_out_at ? (
                        <span className="time-out">
                          <strong>Keluar:</strong> {new Date(guest.check_out_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                        </span>
                      ) : (
                        <span className="time-pending">Masih berkunjung</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${guest.status}`}>
                      {guest.status === 'active' ? 'Berkunjung' : 'Selesai'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {guest.status === 'active' && (
                        <button className="btn-checkout" onClick={() => handleCheckout(guest.id)}>
                          Check-Out
                        </button>
                      )}
                      
                      <button 
                        className="btn-delete" 
                        onClick={() => handleDelete(guest.id)}
                        style={{
                          backgroundColor: '#e63946',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 2. Navigasi Paginasi */}
      {filteredGuests.length > 0 && (
        <div className="pagination-container">
          <span className="pagination-info">
            Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredGuests.length)} dari {filteredGuests.length} data
          </span>

          <div className="pagination-buttons">
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
  );
}
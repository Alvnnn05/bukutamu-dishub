# 📚 Sistem Informasi Buku Tamu Digital (Dishub)

Sistem Informasi Buku Tamu Digital adalah aplikasi berbasis web yang dirancang untuk mencatat, mengelola, dan memantau kunjungan tamu secara *real-time*. Aplikasi ini dilengkapi dengan dashboard statistik kunjungan, filter data yang interaktif, pengambilan/pengunggahan foto tamu, ekspor laporan ke Excel, serta manajemen peran (*role*) pengguna.

## A. Fitur Utama

* **📊 Dashboard & Ringkasan Kunjungan**

  * Statistik *real-time* untuk tamu hari ini, tamu yang sedang berkunjung (belum check-out), total kunjungan bulan ini, dan unit kerja/bidang tujuan terbanyak.

* **📝 Pencatatan Tamu Baru**

  * Form pendaftaran tamu yang mudah dan cepat.

  * Integrasi pengambilan foto langsung via kamera (HP/Laptop) atau pengunggahan berkas gambar.

* **🔍 Filter & Pencarian Data**

  * Pencarian berdasarkan nama tamu atau instansi asal.

  * Filter status kunjungan (*Berkunjung* / *Selesai*).

  * Filter khusus per Tujuan Bidang / Unit Kerja.

  * Filter tanggal kunjungan.

  * Tombol **Reset Filter** untuk mengembalikan pencarian ke kondisi semula.

* **⚙️ Manajemen Data & Kunjungan**

  * **Check-Out Tamu:** Menandai waktu selesai kunjungan secara presisi.

  * **Edit Data Tamu:** Memperbarui detail informasi tamu atau memperbarui foto jika terjadi kesalahan input.

  * **Hapus Data Tamu:** Penghapusan data khusus pengguna dengan hak akses Admin.

* **📥 Ekspor Data (Export Excel)**

  * Mengunduh rekapitulasi data tamu yang tersaring ke dalam format file `.xlsx` (Excel).

* **🔒 Realtime Synchronization & Database Integration**

  * Integrasi dengan **Supabase** untuk basis data, otentikasi, dan penyimpanan berkas (*Storage* foto tamu) dengan update data secara *real-time*.

## B. Teknologi yang Digunakan

* **Frontend:** [React.js](https://reactjs.org/?utm_source=gemini) (Vite / CRA)

* **Styling:** CSS3 Custom (Responsive Layout, Popups, Cards Dashboard)

* **Backend & Database:** [Supabase](https://supabase.com/?utm_source=gemini) (PostgreSQL, Storage, & Realtime Channels)

* **Utility:**

  * `xlsx` (SheetJS) — Untuk pengolahan ekspor file Excel.

## C. Unit Kerja / Tujuan Bidang yang Disediakan Pada Form
* Sekretariat

* Sub Bagian Umum Dan Kepegawaian

* Sub Bagian Keuangan Dan Penyusunan Program

* Bidang Angkutan

* Seksi Angkutan Orang

* Seksi Angkutan Barang

* Bidang Lalu Lintas, Sarana, Prasarana

* Seksi Parkir

* Seksi Manajemen Rekayasa Lalu Lintas

* Seksi Penerangan Jalan Umum

* Bidang Pengendalian Operasional Lalu Lintas Dan Angkutan Jalan

* UPT Pengujian Kendaraan Bermotor

## D. Panduan Memulai (Installation & Setup)

### 1. Prasyarat

Pastikan komputer kamu sudah terinstal:

* [Node.js](https://nodejs.org/?utm_source=gemini) (Versi 16 atau lebih baru)

* NPM atau Yarn

### 2. Klon Repository

```
git clone https://github.com/username-kamu/nama-repo-buku-tamu.git
cd nama-repo-buku-tamu

```

### 3. Instalasi Dependensi

Jalankan perintah berikut untuk mengunduh semua modul yang dibutuhkan:

```
npm install

```

### 4. Konfigurasi Environment Variable (`.env`)

Buat file `.env` di direktori utama proyek dan tambahkan kunci akses Supabase milikmu:

```
VITE_SUPABASE_URL=https://your-supabase-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

```

### 5. Jalankan Aplikasi Web

Untuk menjalankan mode pengembangan (*development mode*):

```
npm run dev
# atau jika menggunakan Create React App:
npm start

```

Aplikasi akan berjalan secara lokal di `http://localhost:5173` (atau `http://localhost:3000`).

## E. Struktur Tabel Supabase (`tamu`)

Skema tabel `tamu` pada PostgreSQL Supabase:

| Kolom | Tipe Data | Keterangan | 
 | ----- | ----- | ----- | 
| `id` | `uuid` / `int` | Primary Key | 
| `nama_tamu` | `text` | Nama lengkap tamu | 
| `instansi_asal` | `text` | Instansi atau lembaga asal | 
| `no_hp` | `text` | Nomor kontak/WhatsApp | 
| `tujuan_bidang` | `text` | Unit kerja yang dituju | 
| `perihal` | `text` | Maksud/tujuan kunjungan | 
| `foto_url` | `text` | URL foto yang diunggah di Supabase Storage | 
| `status` | `text` | Status kunjungan (`active` / `completed`) | 
| `created_at` | `timestamp` | Waktu masuk kunjungan | 
| `check_out_at` | `timestamp` | Waktu keluar / check-out | 

## F. Tampilan Antarmuka (Preview Features)

* **Ringkasan Stats Card:** Menyajikan jumlah statistik harian, bulanan, dan unit terfavorit secara dinamis.

* **Tabel Interaktif:** Didukung navigasi paginasi (5 item per halaman) untuk menjaga kerapian visual.

* **Modal Popups:** Digunakan untuk konfirmasi Check-out, konfirmasi Hapus, Form Edit Data, serta Preview Foto Tamu secara penuh.

## G. ABOUT

Pengembangan aplikasi ini ditujukan untuk operasional instansi Dinas Perhubungan (Dishub) dalam rangka memenuhi tugas magang.
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import imageCompression from 'browser-image-compression';
import { supabase } from '../../lib/supabaseClient';
import './UploadHP.css';

export default function UploadHP() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [guestData, setGuestData] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (sessionId) {
      supabase
        .from('tamu')
        .select('*')
        .eq('session_id', sessionId)
        .single()
        .then(({ data }) => setGuestData(data));
    }
  }, [sessionId]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = async () => {
    if (!file || !sessionId) return;
    setUploading(true);

    try {
      const options = { maxSizeMB: 0.3, maxWidthOrHeight: 1024, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);

      const fileName = `${guestData ? guestData.instansi_asal : 'tamu'}_${Date.now()}.jpg`.toLowerCase().replace(/\s+/g, '-');
      const { error: uploadErr } = await supabase.storage.from('foto-tamu').upload(fileName, compressedFile);

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('foto-tamu').getPublicUrl(fileName);

      const { error: updateErr } = await supabase
        .from('tamu')
        .update({
          foto_url: urlData.publicUrl,
          status: 'active'
        })
        .eq('session_id', sessionId);

      if (updateErr) throw updateErr;

      setSuccess(true);
    } catch (err) {
      alert('Gagal upload: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (!sessionId) return <div className="upload-container"><p>Session ID tidak ditemukan.</p></div>;

  return (
    <div className="upload-container">
      <header className="upload-header">
        <h1>Buku Tamu Dishub</h1>
      </header>

      <main className="upload-main">
        {guestData && (
          <div className="guest-info-box">
            <p><strong>Nama:</strong> {guestData.nama_tamu}</p>
            <p><strong>Instansi:</strong> {guestData.instansi_asal}</p>
          </div>
        )}

        {success ? (
          <div className="success-card">
            <h3>✓ Foto Terkirim</h3>
            <p>Terima kasih, data kunjungan Anda telah disimpan.</p>
          </div>
        ) : (
          <div className="upload-card">
            <h3>Ambil Foto Tamu</h3>
            <input type="file" accept="image/*" capture="environment" id="camera-input" onChange={handleFileChange} hidden />
            <label htmlFor="camera-input" className="btn-camera">
              {preview ? 'Ulangi Ambil Foto' : 'Buka Kamera HP'}
            </label>

            {preview && (
              <div className="preview-box">
                <img src={preview} alt="Preview" />
              </div>
            )}

            {file && (
              <button className="btn-submit-upload" onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Mengompres & Mengirim...' : 'Kirim Foto'}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
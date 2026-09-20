import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../lib/supabaseClient';
import './QrModal.css';

export default function QrModal({ sessionId, onClose, onSuccess }) {
  const [status, setStatus] = useState('waiting');
  const uploadUrl = `${window.location.origin}/upload-foto?session_id=${sessionId}`;

  useEffect(() => {
    const channel = supabase
      .channel(`sync-${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tamu',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        if (payload.new.status === 'active') {
          setStatus('success');
          setTimeout(() => {
            onSuccess();
          }, 2000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, onSuccess]);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {status === 'waiting' ? (
          <>
            <h3 className="modal-title">Scan QR Code via HP</h3>
            <p className="modal-desc">Scan QR Code ini menggunakan HP petugas untuk memotret tamu.</p>
            <div className="qr-container">
              <QRCodeSVG value={uploadUrl} size={200} />
            </div>
            <p className="session-tag">Session ID: <span>{sessionId}</span></p>
            <button className="btn-cancel" onClick={onClose}>Batal</button>
          </>
        ) : (
          <div className="success-box">
            <div className="checkmark">✓</div>
            <h3>Foto Berhasil Diunggah!</h3>
            <p>Data tamu telah lengkap.</p>
          </div>
        )}
      </div>
    </div>
  );
}
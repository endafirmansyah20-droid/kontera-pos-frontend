import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Share, Plus, Check, AlertTriangle, Copy, ExternalLink } from 'lucide-react';
import { isSafari } from '../utils/device';

export default function IosInstallInstructionsModal({ open, onClose }) {
  const [copied, setCopied] = useState(false);
  if (!open) return null;

  const safari = isSafari();
  const url = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore — clipboard bisa gagal di iOS non-Safari, biarkan user copy manual
    }
  };

  const steps = [
    { icon: Share,  title: 'Tap ikon Share',           desc: 'Kotak dengan panah ke atas di toolbar Safari (bawah layar iPhone / atas iPad).' },
    { icon: Plus,   title: 'Pilih "Add to Home Screen"', desc: 'Scroll menu Share ke bawah — cari opsi bertuliskan "Add to Home Screen" / "Ke Layar Utama".' },
    { icon: Check,  title: 'Tap "Add"',                title2: 'di pojok kanan atas', desc: 'Ikon KonterA akan muncul di home screen seperti aplikasi biasa.' },
  ];

  const content = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(6,1,15,0.72)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        fontFamily: "'Plus Jakarta Sans',sans-serif",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto',
          background: 'linear-gradient(180deg, rgba(20,10,45,0.98) 0%, rgba(10,4,25,0.98) 100%)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 22,
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <div style={{ color: 'white', fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' }}>Install ke Home Screen</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>KonterA jadi seperti aplikasi native</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20 }}>
          {!safari && (
            <div style={{ display: 'flex', gap: 12, padding: '12px 14px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 12, marginBottom: 18 }}>
              <AlertTriangle size={18} style={{ color: '#facc15', flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fde68a', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Buka di Safari dulu</div>
                <div style={{ color: 'rgba(253,230,138,0.75)', fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>
                  Di iOS, hanya Safari yang bisa install PWA ke Home Screen. Chrome/Firefox iOS tidak support.
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleCopy}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    {copied ? <><Check size={13} /> Tersalin</> : <><Copy size={13} /> Salin link</>}
                  </button>
                  <a
                    href={url}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}
                  >
                    <ExternalLink size={13} /> Buka manual
                  </a>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex', gap: 14, padding: '13px 14px',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 14,
                  }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 12,
                      background: 'linear-gradient(135deg, rgba(37,99,235,0.25), rgba(124,58,237,0.25))',
                      border: '1px solid rgba(59,130,246,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#93c5fd',
                    }}>
                      <Icon size={19} />
                    </div>
                    <div style={{
                      position: 'absolute', top: -6, left: -6,
                      width: 20, height: 20, borderRadius: '50%',
                      background: '#eab308', color: '#0d0520',
                      fontSize: 11, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(234,179,8,0.4)',
                    }}>
                      {i + 1}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'white', fontSize: 14, fontWeight: 700, marginBottom: 3 }}>
                      {s.title}
                      {s.title2 && <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}> {s.title2}</span>}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12.5, lineHeight: 1.55 }}>{s.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 18, padding: '10px 12px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10 }}>
            <div style={{ color: 'rgba(191,219,254,0.9)', fontSize: 11.5, lineHeight: 1.5 }}>
              <b style={{ color: '#93c5fd' }}>Tips:</b> Kalau menu Share tidak muncul, pastikan halaman ini dibuka di tab Safari (bukan dalam in-app browser seperti dari Instagram/WhatsApp).
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}

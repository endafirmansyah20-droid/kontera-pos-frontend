import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { productAPI } from '../services/api';
import { AlertTriangle, X, Package, Bell, RefreshCw, Calendar } from 'lucide-react';
import { formatRupiah } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

// ── Notifikasi Stok Menipis ──────────────────────────────────────
function LowStockAlert({ products, onClose }) {
  if (!products || products.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-50 w-80 animate-fade-in-up">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-orange-200 dark:border-orange-700 overflow-hidden">
        {/* Header */}
        <div className="bg-orange-500 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-white" />
            <span className="text-white font-bold text-sm">Stok Menipis!</span>
            <span className="bg-white text-orange-600 text-xs font-black px-2 py-0.5 rounded-full">
              {products.length}
            </span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition">
            <X size={18} />
          </button>
        </div>
        {/* List produk */}
        <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
          {products.map(p => (
            <div key={p._id} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50">
              <div className="flex items-center gap-2 min-w-0">
                <Package size={14} className="text-orange-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.code}</p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <span className={`text-xs font-black ${p.stock === 0 ? 'text-red-600' : 'text-orange-500'}`}>
                  {p.stock === 0 ? 'HABIS' : `Sisa ${p.stock}`}
                </span>
                <p className="text-xs text-slate-400">Min: {p.minStock}</p>
              </div>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div className="px-4 py-2.5 bg-orange-50 dark:bg-orange-900/20 border-t border-orange-100 dark:border-orange-800">
          <p className="text-xs text-orange-600 dark:text-orange-400">
            ⚡ Segera lakukan restock untuk menghindari kehabisan stok
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Owner Top Bar (desktop-only) ─────────────────────────────────
// Route → title. Kalau ada route Owner baru, tambah di sini.
const OWNER_TITLE_MAP = {
  '/owner':           'Dashboard Owner',
  '/owner/cabang':    'Cabang',
  '/owner/karyawan':  'Karyawan',
  '/owner/penjualan': 'Penjualan',
  '/owner/service':   'Service HP',
  '/keuangan':        'Keuangan',
  '/pengaturan':      'Pengaturan',
};

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function OwnerTopBar({ user }) {
  const location = useLocation();
  const title = OWNER_TITLE_MAP[location.pathname] || 'Dashboard';
  const dateStr = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date());
  const notifCount = 0; // static — siap dihubungkan ke source notif nanti
  const initials = getInitials(user?.name);

  // Jam real-time HH:MM:SS. Init sinkron biar tidak flash string kosong.
  const [waktu, setWaktu] = useState(() =>
    new Date().toLocaleTimeString('id-ID', { hour12: false }));
  useEffect(() => {
    const id = setInterval(() => {
      setWaktu(new Date().toLocaleTimeString('id-ID', { hour12: false }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="hidden lg:flex items-center justify-between" style={{
      background: 'rgba(38,33,92,0.95)',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      padding: '12px 24px',
      minHeight: 56,
    }}>
      {/* Kiri: judul halaman + subtitle sambutan (hanya di /owner) */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>
          {title}
        </div>
        {location.pathname === '/owner' && (
          <p className="text-sm" style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.65)' }}>
            Selamat datang kembali, {user?.name || '—'} <span aria-hidden="true">👋</span>
          </p>
        )}
      </div>

      {/* Tengah: tanggal + jam realtime */}
      <div className="flex items-center gap-2" style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
        <Calendar size={14} style={{ color: 'rgba(255,255,255,0.6)' }} />
        <span>{dateStr}</span>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>|</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{waktu}</span>
      </div>

      {/* Kanan: notifikasi + avatar */}
      <div className="flex items-center gap-3">
        <div style={{ position: 'relative', display: 'flex' }}>
          <Bell size={18} strokeWidth={1.8} style={{ color: '#fff' }} />
          {notifCount > 0 && (
            <span style={{
              position: 'absolute', top: -6, right: -8,
              minWidth: 16, height: 16, padding: '0 4px',
              borderRadius: 999,
              background: '#ef4444', color: '#fff',
              fontSize: 10, fontWeight: 700, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{notifCount > 9 ? '9+' : notifCount}</span>
          )}
        </div>
        <button type="button" onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: '#3C3489', border: 'none', cursor: 'pointer' }}>
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: '#3C3489', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
          cursor: 'pointer',
          userSelect: 'none',
        }}>{initials}</div>
      </div>
    </div>
  );
}

export default function Layout({ children }) {
  const { isOwner, isSuperAdmin, user } = useAuth();
  const userId = user?._id;
  const [lowStockCount, setLowStockCount]       = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [showAlert, setShowAlert]               = useState(false);

  const checkLowStock = useCallback(async () => {
    if (isOwner || isSuperAdmin) return; // Owner & SuperAdmin tidak punya produk langsung
    try {
      const r = await productAPI.getLowStock();
      const products = r.data.data || [];
      const count    = r.data.count || products.length;
      setLowStockCount(count);
      setLowStockProducts(products);
      if (count > 0) {
        // Tampilkan alert hanya jika belum pernah ditutup di session ini
        const dismissed = sessionStorage.getItem('lowStockDismissed');
        if (!dismissed) setShowAlert(true);
      }
    } catch { /* silent */ }
  }, [isOwner, isSuperAdmin]);

  useEffect(() => {
    if (!userId) return; // Tunggu user siap dulu
    // Skip jadwal sama sekali untuk owner & superadmin (tidak punya produk)
    if (isOwner || isSuperAdmin) return;
    // Delay kecil agar token sudah siap di header
    const timeout = setTimeout(() => checkLowStock(), 500);
    // Cek ulang setiap 10 menit
    const interval = setInterval(checkLowStock, 10 * 60 * 1000);
    return () => { clearTimeout(timeout); clearInterval(interval); };
    // Sengaja pakai userId primitif (bukan user object) supaya effect tidak
    // re-fire saat AuthContext re-render dengan referensi user baru.
    // eslint-disable-next-line
  }, [userId, isOwner, isSuperAdmin]);

  const handleCloseAlert = () => {
    setShowAlert(false);
    sessionStorage.setItem('lowStockDismissed', '1');
  };

  return (
    <div className="min-h-screen dark:bg-slate-900 flex transition-colors duration-200">
      <Sidebar lowStockCount={lowStockCount} />
      <main
        className="flex-1 lg:ml-60 min-h-screen min-w-0 max-w-full overflow-x-hidden mobile-pt lg:pt-0"
        // Owner UI (Fase-2 redesign) dark-only: HERO_GRADIENT panels + white
        // text + glass controls (rgba white). Dulu light mode override ke
        // #FAFAFD bikin control putih tidak kebaca di light bg. Sekarang
        // Owner main selalu #0f172a — darkMode toggle jadi no-op untuk main
        // Owner (tetap berlaku untuk modal & komponen shared via html.dark).
        style={isOwner ? { background: '#0f172a' } : undefined}
      >
        {isOwner && (
          <div style={{
            height: 4,
            background: 'linear-gradient(90deg, #3C3489 0%, #F59E0B 100%)',
          }} />
        )}
        {isOwner && <OwnerTopBar user={user} />}
        <div className="p-4 lg:p-6 max-w-screen-2xl mx-auto mobile-pb lg:pb-6 min-w-0">
          {children}
        </div>
      </main>

      {/* Notifikasi stok menipis */}
      {showAlert && (
        <LowStockAlert products={lowStockProducts} onClose={handleCloseAlert} />
      )}
    </div>
  );
}

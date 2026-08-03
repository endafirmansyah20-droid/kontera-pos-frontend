import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { productAPI, notificationAPI } from '../services/api';
import {
  AlertTriangle, X, Package, Bell, RefreshCw, Calendar,
  Info, AlertCircle, ArrowRight,
} from 'lucide-react';
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
  '/owner/laporan':   'Laporan',
  '/owner/notifikasi':'Notifikasi',
  '/owner/bantuan':   'Bantuan',
  '/keuangan':        'Keuangan',
  '/pengaturan':      'Pengaturan',
};

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Notifikasi util ──────────────────────────────────────────────
export const SEVERITY_COLORS = {
  danger:  { fg: '#F87171', bg: 'rgba(248,113,113,0.15)', ring: 'rgba(248,113,113,0.35)' },
  warning: { fg: '#FBBF24', bg: 'rgba(251,191,36,0.15)',  ring: 'rgba(251,191,36,0.35)' },
  info:    { fg: '#60A5FA', bg: 'rgba(96,165,250,0.15)',  ring: 'rgba(96,165,250,0.35)' },
};

export function severityIcon(sev) {
  if (sev === 'danger')  return AlertCircle;
  if (sev === 'warning') return AlertTriangle;
  return Info;
}

// Waktu relatif ID: "baru saja", "5 mnt lalu", "3 jam lalu", "kemarin", "3 hari lalu"
export function formatRelativeID(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const sec  = Math.floor(diff / 1000);
  if (sec < 45)          return 'baru saja';
  const min = Math.floor(sec / 60);
  if (min < 60)          return `${min} mnt lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24)           return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if (day === 1)         return 'kemarin';
  if (day < 7)           return `${day} hari lalu`;
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(new Date(iso));
}

const LAST_SEEN_KEY = 'ownerNotifLastSeenAt';

function NotifBell() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [open, setOpen]   = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState(() => localStorage.getItem(LAST_SEEN_KEY) || '');
  const wrapRef = useRef(null);

  // Fetch on mount + 60s polling
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await notificationAPI.getAll();
        const data = Array.isArray(r.data?.data) ? r.data.data
                   : Array.isArray(r.data)       ? r.data
                   : [];
        if (!cancelled) setItems(data);
      } catch { /* silent */ }
    };
    load();
    const id = setInterval(load, 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Click di luar → tutup
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const unreadCount = items.reduce((n, it) => {
    const ts = it.createdAt ? new Date(it.createdAt).getTime() : 0;
    const seen = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
    return ts > seen ? n + 1 : n;
  }, 0);

  const handleToggle = () => {
    setOpen(o => {
      const next = !o;
      if (next) {
        const now = new Date().toISOString();
        localStorage.setItem(LAST_SEEN_KEY, now);
        setLastSeenAt(now);
      }
      return next;
    });
  };

  const top5 = items.slice(0, 5);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button type="button" onClick={handleToggle} aria-label="Notifikasi"
        style={{
          position: 'relative',
          background: open ? 'rgba(255,255,255,0.10)' : 'transparent',
          border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8,
          display: 'flex', alignItems: 'center',
        }}>
        <Bell size={18} strokeWidth={1.8} style={{ color: '#fff' }} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            minWidth: 16, height: 16, padding: '0 4px',
            borderRadius: 999,
            background: '#ef4444', color: '#fff',
            fontSize: 10, fontWeight: 700, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 340, maxWidth: 'calc(100vw - 32px)',
          background: 'rgba(30,25,70,0.98)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12,
          boxShadow: '0 20px 40px -12px rgba(0,0,0,0.5)',
          zIndex: 60,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>Notifikasi</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
              {items.length} total
            </span>
          </div>

          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {top5.length === 0 ? (
              <div style={{ padding: '24px 14px', textAlign: 'center' }}>
                <Bell size={22} style={{ color: 'rgba(255,255,255,0.3)', margin: '0 auto 8px' }} />
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>
                  Belum ada notifikasi
                </p>
              </div>
            ) : top5.map((n, i) => {
              const sev = SEVERITY_COLORS[n.severity] || SEVERITY_COLORS.info;
              const Icon = severityIcon(n.severity);
              return (
                <div key={n.id || n._id || i} style={{
                  padding: '10px 14px',
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  borderBottom: i < top5.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: sev.bg, color: sev.fg,
                    border: `1px solid ${sev.ring}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={14} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{
                      color: '#fff', fontSize: 12, fontWeight: 700,
                      margin: 0, lineHeight: 1.35,
                    }}>{n.title || '—'}</p>
                    {n.message && (
                      <p style={{
                        color: 'rgba(255,255,255,0.65)', fontSize: 11,
                        margin: '2px 0 0', lineHeight: 1.4,
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>{n.message}</p>
                    )}
                    <p style={{
                      color: 'rgba(255,255,255,0.4)', fontSize: 10,
                      margin: '4px 0 0',
                    }}>{formatRelativeID(n.createdAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <button type="button"
            onClick={() => { setOpen(false); navigate('/owner/notifikasi'); }}
            style={{
              width: '100%', padding: '10px 14px',
              background: 'rgba(255,255,255,0.05)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              border: 'none', cursor: 'pointer',
              color: '#A5B4FC', fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            Lihat semua <ArrowRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

function OwnerTopBar({ user }) {
  const location = useLocation();
  const title = OWNER_TITLE_MAP[location.pathname] || 'Dashboard';
  const dateStr = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date());
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
        <NotifBell />
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

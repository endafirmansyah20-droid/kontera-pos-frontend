import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, MapPin, Phone, Calendar,
  DollarSign, TrendingUp, ShoppingCart, Users,
  Power, History, ShoppingBag, ArrowRight,
  CheckCircle2, AlertTriangle, Package, Calculator, Ban,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { ownerAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatRupiah, formatDateTime } from '../utils/helpers';

const HERO_GRADIENT = 'linear-gradient(120deg, #26215C 0%, #3C3489 50%, #7F77DD 100%)';
const PAGE_SIZE = 20;

const fmtRp = v => formatRupiah(v || 0);

// ─── Helpers dark (konsisten dg halaman Owner lain) ─────────────
const AVATAR_COLORS = [
  { bg: 'rgba(127,119,221,0.25)', color: '#AFA9EC' },
  { bg: 'rgba(251,146,60,0.22)',  color: '#FDBA74' },
  { bg: 'rgba(59,130,246,0.22)',  color: '#93C5FD' },
  { bg: 'rgba(16,185,129,0.22)',  color: '#6EE7B7' },
  { bg: 'rgba(236,72,153,0.22)',  color: '#F9A8D4' },
  { bg: 'rgba(234,179,8,0.22)',   color: '#FDE68A' },
];

const ID_MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
const DOW_SHORT = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

const hashIdx = (s = '', len = 1) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % len;
};

const getInitials = (nama) => {
  if (!nama) return '?';
  const words = nama.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

const formatMemberSince = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return `${String(d.getDate()).padStart(2,'0')} ${ID_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const then = new Date(dateStr);
  if (isNaN(then.getTime())) return null;
  return Math.ceil((then.getTime() - Date.now()) / 86400000);
};

// ─── Badges (pola sama dg OwnerCabangPage) ──────────────────────
function StatusBadge({ status }) {
  const map = {
    gratis:   { bg: 'rgba(16,185,129,0.2)',  color: '#6EE7B7', label: 'GRATIS' },
    aktif:    { bg: 'rgba(127,119,221,0.25)', color: '#AFA9EC', label: 'AKTIF' },
    nonaktif: { bg: 'rgba(248,113,113,0.2)', color: '#F87171', label: 'NONAKTIF' },
  };
  const conf = map[status] || map.nonaktif;
  return (
    <span style={{
      padding: '3px 8px', borderRadius: 8,
      background: conf.bg, color: conf.color,
      fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
    }}>{conf.label}</span>
  );
}
function CountdownBadge({ days }) {
  if (days == null) return null;
  let bg, color, text;
  if (days <= 0)      { bg = 'rgba(248,113,113,0.2)'; color = '#F87171'; text = 'Expired'; }
  else if (days < 7)  { bg = 'rgba(251,146,60,0.2)';  color = '#FDBA74'; text = `${days} hari lagi`; }
  else                { bg = 'rgba(16,185,129,0.15)'; color = '#6EE7B7'; text = `${days} hari lagi`; }
  return (
    <span style={{
      padding: '3px 8px', borderRadius: 8,
      background: bg, color, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
    }}>{text}</span>
  );
}
function ActiveBadge({ active }) {
  return (
    <span style={{
      padding: '3px 8px', borderRadius: 8,
      background: active ? 'rgba(16,185,129,0.20)' : 'rgba(248,113,113,0.20)',
      color: active ? '#6EE7B7' : '#F87171',
      fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
      border: `0.5px solid ${active ? 'rgba(16,185,129,0.35)' : 'rgba(248,113,113,0.35)'}`,
    }}>{active ? 'Aktif' : 'Nonaktif'}</span>
  );
}

// ─── Quick stat card (mirip MetricCard di dashboard) ────────────
function StatCard({ label, value, icon: Icon, accent = 'violet' }) {
  const meta = {
    violet: { bg: 'rgba(127,119,221,0.25)', color: '#AFA9EC' },
    green:  { bg: 'rgba(16,185,129,0.22)',  color: '#6EE7B7' },
    amber:  { bg: 'rgba(239,159,39,0.25)',  color: '#FAC775' },
    blue:   { bg: 'rgba(59,130,246,0.22)',  color: '#93C5FD' },
  }[accent];
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      border: '0.5px solid rgba(255,255,255,0.10)',
      borderRadius: 12, padding: 14,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: meta.bg, color: meta.color, marginBottom: 10,
      }}>
        <Icon size={16} />
      </div>
      <p style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
        color: meta.color, margin: 0, textTransform: 'uppercase',
      }}>{label}</p>
      <p className="break-all" style={{
        fontSize: 15, fontWeight: 700, lineHeight: 1.2,
        color: '#fff', margin: '4px 0 0',
      }}>{value}</p>
    </div>
  );
}

// ─── Sparkline SVG (dipetik dari pola OwnerDashboardPage) ───────
function Sparkline({ data, color = '#AFA9EC', height = 44 }) {
  if (!data || data.length < 2) return null;
  const w = 100, h = height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  const pad = h * 0.15;
  const yFor = (v) => range === 0
    ? h / 2
    : h - pad - ((v - min) / range) * (h - 2 * pad);
  const stepX = w / (data.length - 1);
  const points = data.map((v, i) => `${(i * stepX).toFixed(2)},${yFor(v).toFixed(2)}`).join(' ');
  const areaPoints = `0,${h} ${points} ${w},${h}`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none" style={{ display: 'block' }}>
      <polygon points={areaPoints} fill={color} opacity="0.18" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ─── Tab bar ────────────────────────────────────────────────────
const TABS = [
  ['karyawan',  'Karyawan',          Users],
  ['closing',   'Riwayat Closing',   History],
  ['pembelian', 'Riwayat Pembelian', ShoppingBag],
];
function TabBar({ activeTab, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap min-w-0 max-w-full">
      {TABS.map(([key, label, Icon]) => {
        const active = activeTab === key;
        return (
          <button key={key} type="button" onClick={() => onChange(key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 999,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: active ? '#7F77DD' : 'rgba(255,255,255,0.06)',
              border: active ? '0.5px solid #7F77DD' : '0.5px solid rgba(255,255,255,0.15)',
              color: active ? '#fff' : 'rgba(255,255,255,0.7)',
              whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'background 0.15s',
            }}>
            <Icon size={13} /> {label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Karyawan tab ───────────────────────────────────────────────
function KaryawanTab({ cabangId }) {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get('/owner/users', { params: { cabang: cabangId } });
      const list = res.data || [];
      // Endpoint mungkin tidak filter server-side → filter juga di client
      const filtered = list.filter(u => {
        const id = u.cabang?._id || u.cabang;
        return String(id || '') === String(cabangId);
      });
      setUsers(filtered);
    } catch { toast.error('Gagal memuat karyawan cabang'); }
    finally { setLoading(false); }
  }, [cabangId]);

  useEffect(() => { if (cabangId) load(); }, [cabangId, load]);

  if (loading) {
    return (
      <div className="py-10 flex justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-white/40 border-t-transparent rounded-full" />
      </div>
    );
  }
  if (users.length === 0) {
    return (
      <div className="py-10 text-center">
        <Users size={32} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.25)' }} />
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>Belum ada karyawan di cabang ini</p>
      </div>
    );
  }

  return (
    <div>
      {users.map((u, idx) => {
        const av = AVATAR_COLORS[hashIdx(u._id || u.username || u.name || '', AVATAR_COLORS.length)];
        const isLast = idx === users.length - 1;
        return (
          <div key={u._id}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 4px',
              borderBottom: isLast ? 'none' : '0.5px solid rgba(255,255,255,0.08)',
              opacity: u.isActive ? 1 : 0.55,
            }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: av.bg, color: av.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 14, flexShrink: 0,
              border: '0.5px solid rgba(255,255,255,0.1)',
            }}>
              {(u.name?.[0] || '?').toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 600,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {u.name}
              </p>
              <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>
                @{u.username} · <span style={{ textTransform: 'capitalize' }}>{u.role}</span>
              </p>
            </div>
            <ActiveBadge active={!!u.isActive} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Closing tab (subset dari OwnerLaporanPage, di-filter cabang) ─
function TypeBadge({ type }) {
  const isProduk = type === 'produk';
  const color = isProduk ? '#FCD34D' : '#93C5FD';
  const label = isProduk ? 'Produk' : 'Cash';
  const Icon  = isProduk ? Package : Calculator;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 999,
      fontSize: 10, fontWeight: 700, color,
      background: `${color}22`, border: `0.5px solid ${color}55`,
    }}>
      <Icon size={10} /> {label}
    </span>
  );
}
function SelisihBadge({ status, selisih }) {
  const s = status || (selisih === 0 ? 'sesuai' : selisih > 0 ? 'lebih' : 'kurang');
  const color = s === 'sesuai' ? '#6EE7B7' : s === 'lebih' ? '#93C5FD' : '#F87171';
  const label = s === 'sesuai' ? 'Sesuai' : s === 'lebih' ? 'Lebih' : 'Kurang';
  const Icon  = s === 'sesuai' ? CheckCircle2 : s === 'lebih' ? TrendingUp : AlertTriangle;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 999,
      fontSize: 10, fontWeight: 700, color,
      background: `${color}22`, border: `0.5px solid ${color}55`,
    }}>
      <Icon size={10} /> {label}
    </span>
  );
}

function ClosingRow({ item }) {
  const selisih = item.selisih ?? 0;
  const sebelum = item.saldoKasSebelum ?? null;
  const setelah = item.saldoKasSetelah ?? null;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '0.5px solid rgba(255,255,255,0.08)',
      borderRadius: 10, padding: 12,
    }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <TypeBadge type={item.type || 'cash'} />
            <span style={{
              display: 'inline-flex', padding: '1px 7px', borderRadius: 999,
              fontSize: 10, fontWeight: 600,
              background: 'rgba(255,255,255,0.08)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.75)', textTransform: 'capitalize',
            }}>{item.shift || '—'}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
              {formatDateTime(item.createdAt)}
            </span>
          </div>
          <p className="mt-1 text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>
            oleh {item.createdByName || '—'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <SelisihBadge status={item.statusSelisih} selisih={selisih} />
          <p className="mt-1.5" style={{
            fontSize: 14, fontWeight: 700,
            color: selisih === 0 ? '#6EE7B7' : selisih > 0 ? '#93C5FD' : '#F87171',
          }}>
            {selisih > 0 ? '+' : ''}{fmtRp(selisih)}
          </p>
        </div>
      </div>
      {(sebelum != null || setelah != null) && (
        <div className="mt-2 pt-2 flex items-center gap-2 text-[11px]"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)' }}>
          <span>Saldo Kas:</span>
          <span style={{ color: '#fff', fontWeight: 600 }}>{fmtRp(sebelum)}</span>
          <ArrowRight size={11} style={{ color: 'rgba(255,255,255,0.4)' }} />
          <span style={{ color: '#fff', fontWeight: 600 }}>{fmtRp(setelah)}</span>
        </div>
      )}
    </div>
  );
}

function ClosingTab({ cabangId }) {
  const [items, setItems]       = useState([]);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]   = useState(false);

  const load = useCallback(async (targetPage = 1, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const r = await ownerAPI.getClosingRiwayat({
        cabang: cabangId, page: targetPage, limit: PAGE_SIZE,
      });
      const list = r.data?.data?.items ?? r.data?.data ?? r.data ?? [];
      const arr  = Array.isArray(list) ? list : [];
      setHasMore(arr.length >= PAGE_SIZE);
      if (append) {
        setItems(prev => {
          const seen = new Set(prev.map(x => x._id));
          return [...prev, ...arr.filter(x => !seen.has(x._id))];
        });
      } else { setItems(arr); }
    } catch {
      toast.error('Gagal memuat riwayat closing');
      if (!append) setItems([]);
      setHasMore(false);
    } finally {
      if (append) setLoadingMore(false); else setLoading(false);
    }
  }, [cabangId]);

  useEffect(() => { if (cabangId) { setPage(1); load(1, false); } }, [cabangId, load]);

  if (loading) {
    return (
      <div className="py-10 flex justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-white/40 border-t-transparent rounded-full" />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="py-10 text-center">
        <History size={32} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.25)' }} />
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Belum ada riwayat closing di cabang ini
        </p>
      </div>
    );
  }
  return (
    <>
      <div className="space-y-2">
        {items.map(it => <ClosingRow key={it._id} item={it} />)}
      </div>
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button type="button"
            onClick={() => { const next = page + 1; setPage(next); load(next, true); }}
            disabled={loadingMore}
            style={{
              padding: '9px 18px', borderRadius: 10,
              background: 'rgba(255,255,255,0.08)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              color: '#fff', fontSize: 12, fontWeight: 600,
              cursor: loadingMore ? 'wait' : 'pointer',
              opacity: loadingMore ? 0.7 : 1,
            }}>
            {loadingMore ? 'Memuat…' : 'Muat lebih banyak'}
          </button>
        </div>
      )}
    </>
  );
}

// ─── Pembelian tab ──────────────────────────────────────────────
function PembelianRow({ item }) {
  const nomorPO   = item.nomorPO || item.noPO || item.invoiceNumber || item._id?.slice(-6) || '—';
  const totalItem = item.totalItem ?? (Array.isArray(item.items) ? item.items.length : 0);
  const totalHarga = item.totalHarga ?? item.total ?? 0;
  const isBatal = !!item.isBatal;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '0.5px solid rgba(255,255,255,0.08)',
      borderRadius: 10, padding: 12,
      opacity: isBatal ? 0.65 : 1,
    }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
              padding: '2px 8px', borderRadius: 6,
              background: 'rgba(127,119,221,0.20)', color: '#AFA9EC',
            }}>{nomorPO}</span>
            {isBatal && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 999,
                fontSize: 10, fontWeight: 700, color: '#F87171',
                background: 'rgba(248,113,113,0.15)',
                border: '0.5px solid rgba(248,113,113,0.35)',
              }}><Ban size={10} /> Batal</span>
            )}
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
              {formatDateTime(item.tanggal || item.createdAt)}
            </span>
          </div>
          <p className="mt-1.5 text-sm font-semibold truncate" style={{ color: '#fff' }}>
            {item.supplier || item.supplierName || '—'}
          </p>
          <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>
            oleh {item.createdByName || '—'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p style={{
            fontSize: 14, fontWeight: 700, color: '#fff',
            textDecoration: isBatal ? 'line-through' : 'none',
          }}>{fmtRp(totalHarga)}</p>
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>{totalItem} item</p>
        </div>
      </div>
    </div>
  );
}

function PembelianTab({ cabangId }) {
  const [items, setItems]     = useState([]);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async (targetPage = 1, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const r = await ownerAPI.getPembelianRiwayat({
        cabang: cabangId, page: targetPage, limit: PAGE_SIZE,
      });
      const list = r.data?.data?.items ?? r.data?.data ?? r.data ?? [];
      const arr  = Array.isArray(list) ? list : [];
      setHasMore(arr.length >= PAGE_SIZE);
      if (append) {
        setItems(prev => {
          const seen = new Set(prev.map(x => x._id));
          return [...prev, ...arr.filter(x => !seen.has(x._id))];
        });
      } else { setItems(arr); }
    } catch {
      toast.error('Gagal memuat riwayat pembelian');
      if (!append) setItems([]);
      setHasMore(false);
    } finally {
      if (append) setLoadingMore(false); else setLoading(false);
    }
  }, [cabangId]);

  useEffect(() => { if (cabangId) { setPage(1); load(1, false); } }, [cabangId, load]);

  if (loading) {
    return (
      <div className="py-10 flex justify-center">
        <div className="animate-spin w-6 h-6 border-2 border-white/40 border-t-transparent rounded-full" />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="py-10 text-center">
        <ShoppingBag size={32} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.25)' }} />
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Belum ada riwayat pembelian di cabang ini
        </p>
      </div>
    );
  }
  return (
    <>
      <div className="space-y-2">
        {items.map(it => <PembelianRow key={it._id} item={it} />)}
      </div>
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button type="button"
            onClick={() => { const next = page + 1; setPage(next); load(next, true); }}
            disabled={loadingMore}
            style={{
              padding: '9px 18px', borderRadius: 10,
              background: 'rgba(255,255,255,0.08)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              color: '#fff', fontSize: 12, fontWeight: 600,
              cursor: loadingMore ? 'wait' : 'pointer',
              opacity: loadingMore ? 0.7 : 1,
            }}>
            {loadingMore ? 'Memuat…' : 'Muat lebih banyak'}
          </button>
        </div>
      )}
    </>
  );
}

// ─── Main ───────────────────────────────────────────────────────
export default function OwnerCabangDetailPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const [cabang, setCabang]     = useState(null); // dari cabang-summary
  const [sub, setSub]           = useState(null); // dari dashboard.subscriptions
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState('karyawan');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        api.get('/owner/cabang-summary'),
        api.get('/owner/dashboard'),
      ]);
      const list = r1.data?.data ?? r1.data ?? [];
      const subs = r2.data?.data?.subscriptions || [];
      const found = Array.isArray(list) ? list.find(c => String(c._id) === String(id)) : null;
      const foundSub = subs.find(s => String(s.cabang?._id) === String(id)) || null;
      setCabang(found || null);
      setSub(foundSub);
    } catch { toast.error('Gagal memuat detail cabang'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { if (user) load(); }, [user, load]);

  const handleToggle = async () => {
    if (!cabang) return;
    const currentlyActive = cabang.isActive ?? true;
    if (currentlyActive && !window.confirm(`Nonaktifkan cabang "${cabang.nama}"?`)) return;
    try {
      await api.patch(`/owner/cabang/${cabang._id}/toggle`);
      toast.success(currentlyActive ? 'Cabang dinonaktifkan' : 'Cabang diaktifkan');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal ubah status');
    }
  };

  // Data turunan
  const avatar = useMemo(() => {
    if (!cabang) return AVATAR_COLORS[0];
    return AVATAR_COLORS[hashIdx(cabang._id || cabang.kode || cabang.nama || '', AVATAR_COLORS.length)];
  }, [cabang]);

  const hariTersisa = cabang?.hariTersisa ?? sub?.hariTersisa ?? daysUntil(sub?.expiredAt);
  const memberSince = formatMemberSince(cabang?.createdAt);
  const active = cabang?.isActive ?? (sub ? ['aktif','gratis'].includes(sub?.status) : true);
  const karyawanN = cabang?.karyawanCount ?? cabang?.jumlahKaryawan ?? cabang?.users?.length ?? 0;

  const sparklineData = useMemo(() => {
    const sp = cabang?.sparkline || [];
    if (!Array.isArray(sp) || sp.length === 0) return [];
    return sp.map(d => d?.omset ?? 0);
  }, [cabang]);

  const sparkLabels = useMemo(() => {
    const sp = cabang?.sparkline || [];
    if (!Array.isArray(sp) || sp.length === 0) return [];
    return sp.map((d, i) => {
      if (d?.date) {
        const dt = new Date(d.date);
        if (!isNaN(dt.getTime())) return DOW_SHORT[dt.getDay()];
      }
      // fallback: mundur dari hari ini
      const dt = new Date();
      dt.setDate(dt.getDate() - (sp.length - 1 - i));
      return DOW_SHORT[dt.getDay()];
    });
  }, [cabang]);

  const alamat = cabang?.alamat || sub?.cabang?.alamat || '';
  const telepon = cabang?.telepon || sub?.cabang?.telepon || '';
  const nama = cabang?.nama || sub?.cabang?.nama || 'Cabang';
  const kode = cabang?.kode || sub?.cabang?.kode || '—';
  const mapsHref = alamat ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(alamat)}` : null;

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-white/40 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!cabang && !sub) {
    return (
      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        <button type="button" onClick={() => navigate('/owner/cabang')}
          style={{
            padding: 8, borderRadius: 10,
            background: 'rgba(255,255,255,0.08)',
            border: '0.5px solid rgba(255,255,255,0.15)',
            color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6,
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
            marginBottom: 16,
          }}>
          <ArrowLeft size={14} /> Kembali
        </button>
        <div style={{
          background: HERO_GRADIENT, borderRadius: 12, padding: 32, textAlign: 'center',
          boxShadow: '0 10px 28px -8px rgba(38,33,92,0.35)',
        }}>
          <Building2 size={32} style={{ color: 'rgba(255,255,255,0.35)', margin: '0 auto 12px', display: 'block' }} />
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, margin: 0 }}>
            Cabang tidak ditemukan atau kamu tidak memiliki akses.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto pb-24 lg:pb-6">
      {/* Back */}
      <div className="mb-4">
        <button type="button" onClick={() => navigate('/owner/cabang')}
          style={{
            padding: '7px 12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.08)',
            border: '0.5px solid rgba(255,255,255,0.15)',
            color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6,
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}>
          <ArrowLeft size={13} /> Kembali
        </button>
      </div>

      {/* Header */}
      <div style={{
        background: HERO_GRADIENT, borderRadius: 12, padding: 18,
        boxShadow: '0 10px 28px -8px rgba(38,33,92,0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
        marginBottom: 16,
      }}>
        <div className="flex items-start gap-3 flex-wrap">
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: avatar.bg, color: avatar.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 18, flexShrink: 0,
            border: '0.5px solid rgba(255,255,255,0.15)',
          }}>{getInitials(nama)}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, color: '#fff', fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}
              title={nama}>{nama}</p>
            <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.55)', fontSize: 12 }}>
              Kode: {kode}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <ActiveBadge active={active} />
              {sub?.status && <StatusBadge status={sub.status} />}
              {hariTersisa != null && <CountdownBadge days={hariTersisa} />}
            </div>
          </div>
          <button type="button" onClick={handleToggle}
            title={active ? 'Nonaktifkan cabang' : 'Aktifkan cabang'}
            style={{
              padding: '8px 12px', borderRadius: 10,
              background: active ? 'rgba(74,222,128,0.18)' : 'rgba(255,255,255,0.10)',
              color: active ? '#6EE7B7' : 'rgba(255,255,255,0.75)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0,
            }}>
            <Power size={13} /> {active ? 'Nonaktifkan' : 'Aktifkan'}
          </button>
        </div>

        {/* Info dasar */}
        <div className="mt-4 space-y-1.5">
          {alamat ? (
            <a href={mapsHref} target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-2 text-xs"
              style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}>
              <MapPin size={12} style={{ color: 'rgba(255,255,255,0.5)', marginTop: 2, flexShrink: 0 }} />
              <span>{alamat}</span>
            </a>
          ) : (
            <p className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.45)', margin: 0 }}>
              <MapPin size={12} /> Alamat belum diisi
            </p>
          )}
          {telepon && (
            <a href={`tel:${telepon}`}
              className="flex items-center gap-2 text-xs"
              style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}>
              <Phone size={12} style={{ color: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
              <span>{telepon}</span>
            </a>
          )}
          {memberSince && (
            <p className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>
              <Calendar size={12} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
              <span>Member sejak {memberSince}</span>
            </p>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Omset Hari Ini" value={fmtRp(cabang?.harian?.omset)} icon={DollarSign} accent="violet" />
        <StatCard label="Laba Hari Ini"  value={fmtRp(cabang?.harian?.laba)}  icon={TrendingUp} accent="green" />
        <StatCard label="Transaksi"      value={`${cabang?.harian?.count || 0} tx`} icon={ShoppingCart} accent="amber" />
        <StatCard label="Karyawan"       value={`${karyawanN} org`} icon={Users} accent="blue" />
      </div>

      {/* Sparkline 7 hari */}
      {sparklineData.length >= 2 && (
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          border: '0.5px solid rgba(255,255,255,0.10)',
          borderRadius: 12, padding: 16, marginBottom: 16,
        }}>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div>
              <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 700 }}>Tren Omset 7 Hari</p>
              <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>
                Per hari · dari cabang-summary
              </p>
            </div>
            <p style={{ margin: 0, color: '#AFA9EC', fontSize: 12, fontWeight: 700 }}>
              Total: {fmtRp(sparklineData.reduce((a, b) => a + b, 0))}
            </p>
          </div>
          <Sparkline data={sparklineData} color="#AFA9EC" height={56} />
          {sparkLabels.length === sparklineData.length && (
            <div className="mt-2 flex justify-between" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
              {sparkLabels.map((l, i) => <span key={i}>{l}</span>)}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4">
        <TabBar activeTab={tab} onChange={setTab} />
      </div>

      {/* Tab content */}
      <div style={{
        background: HERO_GRADIENT, borderRadius: 12, padding: 16,
        boxShadow: '0 10px 28px -8px rgba(38,33,92,0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
      }}>
        {tab === 'karyawan'  && <KaryawanTab  cabangId={id} />}
        {tab === 'closing'   && <ClosingTab   cabangId={id} />}
        {tab === 'pembelian' && <PembelianTab cabangId={id} />}
      </div>
    </div>
  );
}

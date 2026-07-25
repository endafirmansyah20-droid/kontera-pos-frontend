import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Building2, Users, CheckCircle,
  DollarSign, TrendingUp, ShoppingCart,
  BarChart3, Package,
  Banknote, Activity,
  QrCode, ArrowLeftRight, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { formatRupiah } from '../utils/helpers';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

const fmtRp   = v => formatRupiah(v || 0);
const PALETTE = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316'];
const PERIODS = [['harian','Hari Ini'],['mingguan','7 Hari'],['bulanan','Bulan Ini']];

// Delta harian vs kemarin. Mode 'hero' pakai label "Hari pertama"
// saat kemarin=0; mode 'card' pakai "Baru".
function deltaInfo(today, yesterday, mode = 'card') {
  const t = today || 0;
  const y = yesterday || 0;
  if (y === 0) {
    if (t === 0) return { label: 'Sama seperti kemarin', color: 'gray' };
    return { label: mode === 'hero' ? 'Hari pertama' : 'Baru', color: 'green' };
  }
  const pct = ((t - y) / y) * 100;
  const rounded = pct.toFixed(1);
  if (pct > 0) return { label: `+${rounded}% dari kemarin`, color: 'green' };
  if (pct < 0) return { label: `${rounded}% dari kemarin`, color: 'red' };
  return { label: 'Sama seperti kemarin', color: 'gray' };
}

const DELTA_COLOR_DARK = {
  green: '#4ade80',
  red:   '#f87171',
  gray:  'rgba(255,255,255,0.5)',
};

// ── Tooltip ──────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur border border-slate-100 rounded-2xl shadow-xl p-3 text-xs min-w-[140px]">
      <p className="font-bold text-slate-500 mb-1.5 pb-1.5 border-b border-slate-50">{label}</p>
      {payload.map((p,i) => (
        <div key={i} className="flex justify-between gap-4 mt-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{background:p.color}} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-bold text-slate-700">
            {['Tx','Transaksi'].includes(p.name) ? p.value : fmtRp(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Period Selector ───────────────────────────────────────────────
function PeriodSel({ value, onChange }) {
  return (
    <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
      {PERIODS.map(([k,l]) => (
        <button key={k} onClick={() => onChange(k)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            value===k ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}>{l}</button>
      ))}
    </div>
  );
}

// ── Mini Stat Strip ───────────────────────────────────────────────
function MiniStat({ icon: Icon, label, value, color }) {
  const colors = {
    blue:    'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet:  'bg-violet-50 text-violet-600',
  };
  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-slate-100 shadow-sm flex-1">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 truncate">{label}</p>
        <p className="text-lg font-black text-slate-800 leading-tight">{value}</p>
      </div>
    </div>
  );
}

// ── Sparkline (SVG murni, no library) ────────────────────────────
// Nge-stretch mengikuti lebar container via preserveAspectRatio="none".
// vectorEffect="non-scaling-stroke" jaga ketebalan garis tetap 1.5px
// meski viewBox di-stretch horizontal.
function Sparkline({ data, color, height = 40 }) {
  if (!data || data.length < 2) return null;
  const w = 100;
  const h = height;
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
      <polygon points={areaPoints} fill={color} opacity="0.15" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Metric Card ───────────────────────────────────────────────────
// Dark glassmorphism di atas wrapper gradient gelap. 2 aksen (violet & amber).
// Optional prop `sparkline` (array angka) → render mini chart di bawah value.
function MetricCard({ label, value, sub, delta, icon: Icon, accent = 'violet', sparkline }) {
  const isAmber = accent === 'amber';
  const badgeBg  = isAmber ? 'rgba(239,159,39,0.25)' : 'rgba(127,119,221,0.25)';
  const accentLight = isAmber ? '#FAC775' : '#AFA9EC';
  const hasSpark = sparkline && sparkline.length >= 2;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      border: '0.5px solid rgba(255,255,255,0.10)',
      borderRadius: 12,
      padding: hasSpark ? '16px 16px 8px' : 16,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: badgeBg, color: accentLight, marginBottom: 12,
      }}>
        <Icon size={18} />
      </div>
      <p style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
        color: accentLight, margin: 0,
      }}>{label}</p>
      <p className="break-all" style={{
        fontSize: 18, fontWeight: 600, lineHeight: 1.2,
        color: '#fff', margin: '4px 0 0',
      }}>{value}</p>
      {delta && <p style={{
        fontSize: 11, fontWeight: 600, color: DELTA_COLOR_DARK[delta.color],
        margin: '4px 0 0',
      }}>{delta.label}</p>}
      {sub && <p style={{
        fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0',
      }}>{sub}</p>}
      {hasSpark && (
        <div style={{ marginTop: 8 }}>
          <Sparkline data={sparkline} color={accentLight} height={40} />
        </div>
      )}
    </div>
  );
}

// ── Recent Activity (Aktivitas Terbaru) ──────────────────────────
function formatRelativeTime(dateStr) {
  if (!dateStr) return '—';
  const then = new Date(dateStr);
  if (isNaN(then.getTime())) return '—';
  const diffMs = Date.now() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHr = Math.floor(diffMs / 3600000);
  if (diffHr < 24) return `${diffHr} jam lalu`;
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffDay === 1) return 'Kemarin';
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return `${then.getDate()}/${then.getMonth() + 1}`;
}

// Icon tint dark: bg pakai rgba warna aksen 0.25, color dilighten
// agar kontras di glass card.
const ACTIVITY_TYPE_META = {
  penjualan:   { icon: ShoppingCart, bg: 'rgba(124,58,237,0.25)', color: '#C4B5FD' },
  pembelian:   { icon: Package,      bg: 'rgba(217,119,6,0.25)',  color: '#FCD34D' },
  tarik_tunai: { icon: Banknote,     bg: 'rgba(16,185,129,0.25)', color: '#6EE7B7' },
};
const getActivityMeta = (type) =>
  ACTIVITY_TYPE_META[type] || { icon: Activity, bg: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' };

function ActivityRow({ item }) {
  const meta = getActivityMeta(item.type);
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ background: meta.bg, color: meta.color }}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: '#fff' }}>
          {item.invoiceNumber || item.cabang?.nama || '—'}
        </p>
        <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {item.cashierName || '—'} · {item.cabang?.nama || '—'}
        </p>
      </div>
      <div className="text-right shrink-0 ml-2">
        <div className="flex items-center gap-1.5 justify-end">
          <p className="text-sm font-bold" style={{
            color: item.isVoid ? 'rgba(255,255,255,0.4)' : '#fff',
            textDecoration: item.isVoid ? 'line-through' : 'none',
          }}>
            {fmtRp(item.total)}
          </p>
          {item.isVoid && (
            <span className="badge badge-red text-[10px] px-1.5 py-0.5">VOID</span>
          )}
        </div>
        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {formatRelativeTime(item.transactionDate)}
        </p>
      </div>
    </div>
  );
}

function RecentActivity({ items, loading }) {
  const list = Array.isArray(items) ? items.slice(0, 10) : [];
  return (
    <div className="overflow-hidden" style={{
      background: 'rgba(255,255,255,0.06)',
      border: '0.5px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
    }}>
      <div className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <h4 className="font-bold text-sm tracking-tight" style={{ color: '#fff' }}>Aktivitas Terbaru</h4>
        <a href="#" onClick={(e) => e.preventDefault()}
          className="text-xs font-semibold" style={{ color: '#AFA9EC' }}>
          Lihat semua
        </a>
      </div>
      {loading ? (
        <div className="p-8 flex justify-center">
          <div className="animate-spin w-5 h-5 border-2 border-white/40 border-t-transparent rounded-full" />
        </div>
      ) : list.length === 0 ? (
        <div className="p-8 text-center">
          <Activity size={28} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.2)' }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Belum ada aktivitas</p>
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {list.map(item => <ActivityRow key={item._id} item={item} />)}
        </div>
      )}
    </div>
  );
}

// ── Top-N List Widget (Produk / Kategori Terlaris) ───────────────
// Ranking badge: #1 ungu solid, sisanya abu netral.
function TopListWidget({ title, items, loading, action }) {
  const list = Array.isArray(items) ? items.slice(0, 5) : [];
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
        <h4 className="font-bold text-slate-700 text-sm tracking-tight">{title}</h4>
        {action && (
          <a href={action.href || '#'}
            onClick={action.href ? undefined : (e) => e.preventDefault()}
            className="text-xs font-semibold text-violet-600 hover:text-violet-700">
            {action.label}
          </a>
        )}
      </div>
      {loading ? (
        <div className="p-8 flex justify-center">
          <div className="animate-spin w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full" />
        </div>
      ) : list.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm text-slate-400">Belum ada data</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {list.map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                i === 0 ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-500'
              }`}>{i + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">
                  {item.nama || item.name || item.kategori || '—'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {item.qty ?? item.count ?? item.terjual ?? 0} terjual
                </p>
              </div>
              <p className="text-sm font-bold text-slate-700 shrink-0">
                {fmtRp(item.omset ?? item.total)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Cabang Terbaik Widget ────────────────────────────────────────
// Ranking cabang by omset hari ini (desc). Deteksi aktif sama pola
// dengan RingkasanCabangPanel.
function CabangTerbaikWidget({ cabangList, loading }) {
  const navigate = useNavigate();
  const list = Array.isArray(cabangList)
    ? [...cabangList]
        .sort((a, b) => (b.harian?.omset ?? 0) - (a.harian?.omset ?? 0))
        .slice(0, 5)
    : [];

  return (
    <div className="overflow-hidden" style={{
      background: 'rgba(255,255,255,0.06)',
      border: '0.5px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
    }}>
      <div className="px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <h4 className="font-bold text-sm tracking-tight" style={{ color: '#fff' }}>Cabang Terbaik</h4>
        <a href="#" onClick={(e) => { e.preventDefault(); navigate('/owner/cabang'); }}
          className="text-xs font-semibold" style={{ color: '#AFA9EC' }}>
          Lihat semua
        </a>
      </div>
      {loading ? (
        <div className="p-8 flex justify-center">
          <div className="animate-spin w-5 h-5 border-2 border-white/40 border-t-transparent rounded-full" />
        </div>
      ) : list.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Belum ada cabang</p>
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {list.map((c, i) => {
            const active = c.isActive
              ?? (c.subscription ? ['aktif','gratis'].includes(c.subscription.status) : true);
            return (
              <div key={c._id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: i === 0 ? '#7F77DD' : 'rgba(255,255,255,0.1)',
                    color: i === 0 ? '#fff' : 'rgba(255,255,255,0.7)',
                  }}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold truncate" title={c.nama} style={{ color: '#fff' }}>{c.nama}</p>
                    {active && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0"
                        style={{ background: 'rgba(16,185,129,0.2)', color: '#6EE7B7' }}>
                        Aktif
                      </span>
                    )}
                  </div>
                  {c.kode && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{c.kode}</p>
                  )}
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-sm font-bold" style={{ color: '#fff' }}>{fmtRp(c.harian?.omset)}</p>
                  <p className="text-xs mt-0.5 whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {c.harian?.count || 0} tx · {fmtRp(c.harian?.laba)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Produk Terlaris Tabs (Fisik / Digital) ───────────────────────
// Card sama style dengan TopListWidget; header ada toggle 2 tab kecil.
function ProdukTerlarisTabs({ fisik, digital, loading }) {
  const [activeTab, setActiveTab] = useState('fisik');
  const items = activeTab === 'fisik' ? fisik : digital;
  const list = Array.isArray(items) ? items.slice(0, 5) : [];
  return (
    <div className="overflow-hidden" style={{
      background: 'rgba(255,255,255,0.06)',
      border: '0.5px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
    }}>
      <div className="px-5 py-4 flex items-center justify-between gap-2"
        style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <h4 className="font-bold text-sm tracking-tight" style={{ color: '#fff' }}>Produk Terlaris</h4>
        <div className="flex gap-1 rounded-lg p-0.5" style={{ background: 'rgba(255,255,255,0.1)' }}>
          {[['fisik','Fisik'],['digital','Digital']].map(([k,l]) => (
            <button key={k} type="button" onClick={() => setActiveTab(k)}
              className="px-2.5 py-1 rounded-md text-xs font-semibold transition-colors"
              style={{
                background: activeTab === k ? '#7F77DD' : 'transparent',
                color: activeTab === k ? '#fff' : 'rgba(255,255,255,0.7)',
                border: 'none', cursor: 'pointer',
              }}>{l}</button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="p-8 flex justify-center">
          <div className="animate-spin w-5 h-5 border-2 border-white/40 border-t-transparent rounded-full" />
        </div>
      ) : list.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Belum ada data</p>
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {list.map((item, i) => {
            const nama = item.nama || item.name || item.kategori || '—';
            return (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: i === 0 ? '#7F77DD' : 'rgba(255,255,255,0.1)',
                    color: i === 0 ? '#fff' : 'rgba(255,255,255,0.7)',
                  }}>{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" title={nama} style={{ color: '#fff' }}>
                    {nama}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {item.qty ?? item.count ?? item.terjual ?? 0} terjual
                  </p>
                </div>
                <p className="text-xs font-bold shrink-0" style={{ color: '#fff' }}>
                  {fmtRp(item.omset ?? item.total)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Metode Pembayaran Widget ─────────────────────────────────────
// Selalu render 4 metode dengan urutan tetap. Data bisa array
// [{metode, omset}] atau object {cash: N, ...} — dinormalisasi.
const METODE_META = {
  cash:     { label: 'Cash',     icon: Banknote },
  qris:     { label: 'QRIS',     icon: QrCode },
  transfer: { label: 'Transfer', icon: ArrowLeftRight },
  hutang:   { label: 'Hutang',   icon: Clock },
};
const METODE_ORDER = ['cash', 'qris', 'transfer', 'hutang'];

function MetodePembayaranWidget({ data, loading }) {
  const map = {};
  if (Array.isArray(data)) {
    data.forEach(m => {
      const key = m?.metode || m?.method;
      if (key) map[key] = Number(m.omset ?? m.total ?? 0);
    });
  } else if (data && typeof data === 'object') {
    Object.entries(data).forEach(([k, v]) => { map[k] = Number(v) || 0; });
  }
  const total = METODE_ORDER.reduce((s, k) => s + (map[k] || 0), 0);

  return (
    <div className="overflow-hidden" style={{
      background: 'rgba(255,255,255,0.06)',
      border: '0.5px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
    }}>
      <div className="px-5 py-4"
        style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
        <h4 className="font-bold text-sm tracking-tight" style={{ color: '#fff' }}>Metode Pembayaran</h4>
      </div>
      {loading ? (
        <div className="p-8 flex justify-center">
          <div className="animate-spin w-5 h-5 border-2 border-white/40 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="divide-y divide-white/10">
          {METODE_ORDER.map(key => {
            const value = map[key] || 0;
            const pct = total > 0 ? (value / total) * 100 : 0;
            const meta = METODE_META[key];
            const Icon = meta.icon;
            return (
              <div key={key} className="px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(127,119,221,0.2)', color: '#AFA9EC' }}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold" style={{ color: '#fff' }}>{meta.label}</p>
                      <p className="text-xs font-bold shrink-0" style={{ color: 'rgba(255,255,255,0.7)' }}>{pct.toFixed(1)}%</p>
                    </div>
                    <p className="text-sm font-bold mt-0.5 truncate" style={{ color: '#fff' }}>{fmtRp(value)}</p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 rounded-full overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(pct, 100)}%`, background: 'rgba(127,119,221,0.5)' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Ringkasan Cabang Panel (compact, glass) ──────────────────────
// Card glass — dibungkus wrapper dark gradient di DashToko bersama
// widget lain. Max 2 cabang biar tinggi seimbang dengan tetangganya.
function RingkasanCabangPanel({ cabangList }) {
  const navigate = useNavigate();
  const list = Array.isArray(cabangList) ? cabangList.slice(0, 2) : [];

  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      border: '0.5px solid rgba(255,255,255,0.1)',
      borderRadius: 12, padding: 16,
      display: 'flex', flexDirection: 'column',
    }}>
      <div className="flex items-center justify-between mb-3">
        <h4 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>
          Ringkasan Cabang
        </h4>
        <button onClick={() => navigate('/owner/cabang')} type="button"
          style={{
            fontSize: 11, fontWeight: 600, color: '#AFA9EC',
            background: 'transparent', border: 'none', cursor: 'pointer',
          }}>
          Lihat semua
        </button>
      </div>

      {list.length === 0 ? (
        <div style={{
          padding: '20px 12px', textAlign: 'center', flex: 1,
          fontSize: 12, color: 'rgba(255,255,255,0.5)',
        }}>
          Belum ada cabang
        </div>
      ) : (
        <div className="space-y-2" style={{ flex: 1 }}>
          {list.map(c => {
            const active = c.isActive
              ?? (c.subscription ? ['aktif','gratis'].includes(c.subscription.status) : true);
            return (
              <div key={c._id} style={{
                background: 'rgba(255,255,255,0.05)',
                border: '0.5px solid rgba(255,255,255,0.1)',
                borderRadius: 10, padding: 10,
              }}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="truncate" style={{
                    fontSize: 12, fontWeight: 600, color: '#fff', margin: 0,
                  }}>{c.nama}</p>
                  {active && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 6px',
                      borderRadius: 999, whiteSpace: 'nowrap',
                      background: 'rgba(16,185,129,0.2)', color: '#6EE7B7',
                    }}>Aktif</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'OMSET', value: fmtRp(c.harian?.omset), color: '#fff' },
                    { label: 'TX',    value: `${c.harian?.count || 0}`, color: '#fff' },
                    { label: 'LABA',  value: fmtRp(c.harian?.laba), color: '#6EE7B7' },
                  ].map(s => (
                    <div key={s.label} className="min-w-0">
                      <p style={{
                        fontSize: 9, fontWeight: 600, letterSpacing: '0.05em',
                        color: 'rgba(255,255,255,0.5)', margin: 0,
                      }}>{s.label}</p>
                      <p className="truncate" style={{
                        fontSize: 11, fontWeight: 700, color: s.color, margin: '2px 0 0',
                      }}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button onClick={() => navigate('/owner/cabang')} type="button"
        style={{
          marginTop: 12, width: '100%', padding: '9px 12px', borderRadius: 10,
          background: 'rgba(255,255,255,0.1)',
          border: '0.5px solid rgba(255,255,255,0.15)',
          color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
        }}>
        Kelola Semua Cabang
      </button>
    </div>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────────
function DashToko({ cabangList, period, recentActivity, loadingActivity }) {
  // Chart Omset/Laba per Cabang ikut prop `period` (top-level selector).
  // 'harian' → hourly hari ini, 'mingguan' → 7 hari, 'bulanan' → 30 hari.
  // Endpoint balik { labels, series }.
  const [chartData, setChartData]     = useState({ labels: [], series: [] });
  const [loadingChart, setLoadingChart] = useState(true);
  const [widgetData, setWidgetData] = useState({});
  const [loadingWidget, setLoadingWidget] = useState(true);

  useEffect(() => {
    let alive = true;
    api.get('/owner/dashboard-widgets')
      .then(r => { if (!alive) return;
        setWidgetData(r.data?.data ?? r.data ?? {});
      })
      .catch(() => { if (alive) setWidgetData({}); })
      .finally(() => { if (alive) setLoadingWidget(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    setLoadingChart(true);
    const qs = period === 'mingguan' ? '?range=7'
             : period === 'bulanan'  ? '?range=30'
             : '';
    api.get('/owner/hourly-chart' + qs)
      .then(r => { if (!alive) return;
        const d = r.data?.data ?? r.data ?? {};
        setChartData({ labels: d.labels || [], series: d.series || [] });
      })
      .catch(() => { if (alive) setChartData({ labels: [], series: [] }); })
      .finally(() => { if (alive) setLoadingChart(false); });
    return () => { alive = false; };
  }, [period]);

  // Baris chart untuk recharts: satu row per label, satu kolom per
  // cabang (pakai index-based key untuk hindari kolisi kode).
  const buildRows = (metric) => (chartData.labels || []).map((label, i) => {
    const row = { label };
    chartData.series.forEach((s, idx) => {
      row[`s${idx}`] = s?.[metric]?.[i] ?? 0;
    });
    return row;
  });
  const omsetRows = buildRows('omset');
  const labaRows  = buildRows('laba');

  const totalOmset = cabangList.reduce((t,c)=>t+(c[period]?.omset||0),0);
  const totalTx    = cabangList.reduce((t,c)=>t+(c[period]?.count||0),0);
  const totalLaba  = cabangList.reduce((t,c)=>t+(c[period]?.laba||0),0);
  const totalAset  = cabangList.reduce((s,c)=>s+(c.kasTunai||0)+(c.brankas||0)+(c.saldoDigital||0)+(c.nilaiStok||0),0);

  // Total hari ini vs kemarin (untuk delta % di kartu).
  // Selalu bandingkan harian vs kemarin, tidak ikut period tab.
  const totalOmsetHariIni  = cabangList.reduce((t,c)=>t+(c.harian?.omset  ||0),0);
  const totalLabaHariIni   = cabangList.reduce((t,c)=>t+(c.harian?.laba   ||0),0);
  const totalTxHariIni     = cabangList.reduce((t,c)=>t+(c.harian?.count  ||0),0);
  const totalOmsetKemarin  = cabangList.reduce((t,c)=>t+(c.kemarin?.omset ||0),0);
  const totalLabaKemarin   = cabangList.reduce((t,c)=>t+(c.kemarin?.laba  ||0),0);
  const totalTxKemarin     = cabangList.reduce((t,c)=>t+(c.kemarin?.count ||0),0);
  const deltaOmset = deltaInfo(totalOmsetHariIni, totalOmsetKemarin);
  const deltaLaba  = deltaInfo(totalLabaHariIni,  totalLabaKemarin);
  const deltaTx    = deltaInfo(totalTxHariIni,    totalTxKemarin);

  // Zip sparkline 7 hari dari semua cabang: sum omset/laba/tx per index tanggal.
  // Backend sudah pad 0 untuk hari kosong, jadi ?? 0 di sini defensif kalau
  // ada cabang yg belum kirim field sparkline.
  const sparklineGabungan = Array.from({ length: 7 }, (_, i) => ({
    omset:    cabangList.reduce((s, c) => s + (c.sparkline?.[i]?.omset    ?? 0), 0),
    laba:     cabangList.reduce((s, c) => s + (c.sparkline?.[i]?.laba     ?? 0), 0),
    jumlahTx: cabangList.reduce((s, c) => s + (c.sparkline?.[i]?.jumlahTx ?? 0), 0),
  }));

  const HERO_GRADIENT = 'linear-gradient(120deg, #26215C 0%, #3C3489 50%, #7F77DD 100%)';

  return (
    <div className="space-y-4">
      {/* Wrapper gradient gelap untuk 4 kartu statistik */}
      <div style={{
        background: HERO_GRADIENT, borderRadius: 12, padding: 16,
        boxShadow: '0 10px 28px -8px rgba(38,33,92,0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
      }}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard label="Total Omset" value={fmtRp(totalOmset)} sub="Semua cabang"
            delta={deltaOmset}
            icon={DollarSign}  accent="violet"
            sparkline={sparklineGabungan.map(d => d.omset)} />
          <MetricCard label="Total Laba"  value={fmtRp(totalLaba)}  sub="Semua cabang"
            delta={deltaLaba}
            icon={TrendingUp}  accent="amber"
            sparkline={sparklineGabungan.map(d => d.laba)} />
          <MetricCard label="Transaksi"   value={`${totalTx} tx`}   sub="Semua cabang"
            delta={deltaTx}
            icon={ShoppingCart} accent="violet"
            sparkline={sparklineGabungan.map(d => d.jumlahTx)} />
          <MetricCard label="Total Aset"  value={fmtRp(totalAset)}  sub="Kas · Stok · Digital"
            icon={Package}     accent="amber" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {[
            {title:'Omset per Cabang', metric:'omset', rows: omsetRows, ic:'#AFA9EC'},
            {title:'Laba per Cabang',  metric:'laba',  rows: labaRows,  ic:'#FAC775'},
          ].map(({title, metric, rows, ic}) => (
            <div key={metric} className="rounded-2xl p-5" style={{
              background: 'linear-gradient(120deg, #26215C 0%, #3C3489 50%, #7F77DD 100%)',
              boxShadow: '0 10px 28px -8px rgba(38,33,92,0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
            }}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-sm tracking-tight" style={{color: '#fff'}}>{title}</h4>
                <BarChart3 size={14} style={{color: ic}} />
              </div>
              {loadingChart ? (
                <div className="h-[180px] flex items-center justify-center">
                  <div className="animate-spin w-5 h-5 border-2 border-white/40 border-t-transparent rounded-full" />
                </div>
              ) : rows.length === 0 || chartData.series.length === 0 ? (
                <div className="h-[180px] flex items-center justify-center">
                  <p className="text-xs" style={{color: 'rgba(255,255,255,0.6)'}}>Belum ada data</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={rows} margin={{top:4,right:8,left:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" vertical={false} />
                    <XAxis dataKey="label" tick={{fontSize:10,fill:'rgba(255,255,255,0.65)'}} axisLine={false} tickLine={false}
                      interval="preserveStartEnd" minTickGap={12} />
                    <YAxis tick={{fontSize:10,fill:'rgba(255,255,255,0.65)'}} axisLine={false} tickLine={false}
                      tickFormatter={v=>v>=1e6?`${(v/1e6).toFixed(1)}jt`:v>=1e3?`${(v/1e3).toFixed(0)}k`:v} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={8}
                      wrapperStyle={{fontSize: 11, paddingTop: 4, color: 'rgba(255,255,255,0.85)'}} />
                    {chartData.series.map((s, i) => (
                      <Line key={`s${i}`} type="monotone" dataKey={`s${i}`}
                        name={s.nama || s.kode || `Cabang ${i+1}`}
                        stroke={PALETTE[i % PALETTE.length]} strokeWidth={2}
                        dot={{r: 2}} activeDot={{r: 5}} isAnimationActive={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          ))}
        </div>

      </div>

      <div style={{
        background: 'linear-gradient(120deg, #26215C 0%, #3C3489 50%, #7F77DD 100%)',
        borderRadius: 12, padding: 16,
        boxShadow: '0 10px 28px -8px rgba(38,33,92,0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
      }}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <RingkasanCabangPanel cabangList={cabangList} />
          <CabangTerbaikWidget cabangList={cabangList} />
          <ProdukTerlarisTabs
            fisik={widgetData.produkFisikTerlaris}
            digital={widgetData.produkDigitalTerlaris}
            loading={loadingWidget} />
          <MetodePembayaranWidget
            data={widgetData.metodePembayaran} loading={loadingWidget} />
        </div>
      </div>

      <div style={{
        background: 'linear-gradient(120deg, #26215C 0%, #3C3489 50%, #7F77DD 100%)',
        borderRadius: 12, padding: 16,
        boxShadow: '0 10px 28px -8px rgba(38,33,92,0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
      }}>
        <RecentActivity items={recentActivity} loading={loadingActivity} />
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export default function OwnerDashboardPage() {
  const { user } = useAuth();
  const [data, setData]             = useState(null);
  const [cabangList, setCabangList] = useState([]);
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [period, setPeriod]         = useState('harian');
  const [recentActivity, setRecentActivity]     = useState([]);
  const [loadingActivity, setLoadingActivity]   = useState(true);

  const load = async () => {
    try { const { data: res } = await api.get('/owner/dashboard'); setData(res.data); }
    catch { toast.error('Gagal memuat data'); }
    finally { setLoading(false); }
  };

  const loadCabangSummary = useCallback(async () => {
    try { const r = await api.get('/owner/cabang-summary'); setCabangList(r.data.data || []); }
    catch {}
  }, []);

  const loadUsers = async () => {
    try { const { data: res } = await api.get('/owner/users'); setUsers(res.data); }
    catch {}
  };

  const loadRecentActivity = async () => {
    try {
      const r = await api.get('/owner/recent-activity');
      const list = r.data?.data ?? r.data ?? [];
      setRecentActivity(Array.isArray(list) ? list : []);
    } catch { /* silent */ }
    finally { setLoadingActivity(false); }
  };

  useEffect(() => {
    if (!user) return; // Tunggu user siap
    const t = setTimeout(() => { load(); loadUsers(); loadCabangSummary(); loadRecentActivity(); }, 300);
    return () => clearTimeout(t);
  }, [user, loadCabangSummary]);

  const activeCabangs = data?.subscriptions?.filter(s=>['aktif','gratis'].includes(s.status)) || [];

  // Hero stats: totals dari cabangList untuk kolom Omset + delta.
  const totalCabang = data?.totalCabang ?? 0;
  const pctActive = totalCabang > 0
    ? Math.round((activeCabangs.length / totalCabang) * 100)
    : 0;
  const heroOmsetHariIni = cabangList.reduce((t,c)=>t+(c.harian?.omset  ||0),0);
  const heroOmsetKemarin = cabangList.reduce((t,c)=>t+(c.kemarin?.omset ||0),0);
  const heroOmsetDelta   = deltaInfo(heroOmsetHariIni, heroOmsetKemarin, 'hero');

  const heroStats = [
    { icon: Building2,  label: 'TOTAL CABANG', value: totalCabang,             sub: 'terdaftar' },
    { icon: CheckCircle,label: 'CABANG AKTIF', value: activeCabangs.length,    sub: `${pctActive}% dari total` },
    { icon: Users,      label: 'TOTAL USER',   value: users.length,            sub: 'Semua pengguna' },
    { icon: DollarSign, label: 'OMSET HARI INI', value: fmtRp(heroOmsetHariIni),
      sub: heroOmsetDelta.label, subColor: DELTA_COLOR_DARK[heroOmsetDelta.color] },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto pb-24 lg:pb-6">

      {/* ── Hero Banner (sambutan + 3 stat menyatu) ── */}
      <div style={{
        background: 'linear-gradient(120deg, #26215C 0%, #3C3489 50%, #7F77DD 100%)',
        borderRadius: 12, padding: '18px 20px', marginBottom: 20,
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 10px 28px -8px rgba(38,33,92,0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
      }}>
        {/* Ilustrasi dekoratif: laptop + grafik naik. Absolute di kanan,
            opacity rendah, hidden di mobile agar tidak menyita ruang. */}
        <div className="hidden md:block" aria-hidden="true" style={{
          position: 'absolute', right: 16, top: '50%',
          transform: 'translateY(-50%)', opacity: 0.18,
          pointerEvents: 'none',
        }}>
          <svg width="140" height="110" viewBox="0 0 140 110" fill="none"
            xmlns="http://www.w3.org/2000/svg">
            {/* Laptop screen */}
            <rect x="18" y="8" width="104" height="66" rx="4"
              stroke="#fff" strokeWidth="2" fill="rgba(255,255,255,0.06)" />
            {/* Laptop base */}
            <path d="M6 80 L134 80 L128 92 L12 92 Z"
              fill="rgba(255,255,255,0.15)" stroke="#fff" strokeWidth="2"
              strokeLinejoin="round" />
            {/* Bar chart di layar */}
            <rect x="30" y="52" width="10" height="16" rx="1" fill="#fff" />
            <rect x="46" y="44" width="10" height="24" rx="1" fill="#fff" />
            <rect x="62" y="34" width="10" height="34" rx="1" fill="#fff" />
            <rect x="78" y="26" width="10" height="42" rx="1" fill="#fff" />
            {/* Trendline naik + dot ujung */}
            <polyline points="34,48 52,40 68,30 84,22 108,15"
              fill="none" stroke="#fff" strokeWidth="1.6"
              strokeLinejoin="round" strokeLinecap="round" />
            <circle cx="108" cy="15" r="2.5" fill="#fff" />
          </svg>
        </div>

        {/* Konten diberi position relative supaya paint di atas SVG absolute */}
        <div style={{ position: 'relative' }}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-4">
          {heroStats.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.label}
                className={`text-center px-3 ${i > 0 ? 'lg:border-l lg:border-white/20' : ''}`}>
                <div className="mx-auto flex items-center justify-center" style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.12)', color: '#fff', marginBottom: 8,
                }}>
                  <Icon size={16} />
                </div>
                <p style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
                  color: 'rgba(255,255,255,0.65)', margin: 0,
                }}>{s.label}</p>
                <p className="break-all" style={{
                  fontSize: 18, fontWeight: 700, lineHeight: 1.2,
                  color: '#fff', margin: '4px 0 0',
                }}>{s.value}</p>
                {s.sub && (
                  <p style={{
                    fontSize: 10, fontWeight: 500,
                    color: s.subColor || 'rgba(255,255,255,0.5)',
                    margin: '2px 0 0',
                  }}>{s.sub}</p>
                )}
              </div>
            );
          })}
        </div>
        </div>
      </div>

      {/* ── Dashboard Content ── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-xs font-semibold text-slate-500">Data berdasarkan periode:</p>
        <PeriodSel value={period} onChange={setPeriod} />
      </div>
      {cabangList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 text-center py-16">
          <Building2 size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">Belum ada data cabang</p>
        </div>
      ) : (
        <DashToko
          cabangList={cabangList}
          period={period}
          recentActivity={recentActivity}
          loadingActivity={loadingActivity}
        />
      )}

    </div>
  );
}

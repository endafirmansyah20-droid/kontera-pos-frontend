import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, RefreshCw, BarChart3, Package, CreditCard, Clock, Ban,
  ArrowUp, ArrowDown, Minus, ChevronDown, ChevronRight, Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatRupiah, PAYMENT_LABELS } from '../utils/helpers';

const HERO_GRADIENT = 'linear-gradient(120deg, #26215C 0%, #3C3489 50%, #7F77DD 100%)';
const PALETTE = ['#93C5FD','#6EE7B7','#FCD34D','#AFA9EC','#F0ABFC','#5EEAD4','#FDBA74'];

const PERIODS = [
  ['today', 'Hari Ini'],
  ['7',     '7 Hari'],
  ['30',    '30 Hari'],
];

const fmtRp = v => formatRupiah(v || 0);
const fmtCompact = v => v >= 1e6 ? `${(v/1e6).toFixed(1)}jt` : v >= 1e3 ? `${(v/1e3).toFixed(0)}k` : v;

// Delta % between curr/prev (null = no baseline to compare)
const pctDelta = (curr, prev) => {
  if (!prev || prev === 0) return (!curr || curr === 0) ? 0 : null;
  return ((curr - prev) / prev) * 100;
};

// ── UI primitives ───────────────────────────────────────────────
function GradientPanel({ children, style = {}, className = '', ...rest }) {
  return (
    <div {...rest} className={`report-panel ${className}`.trim()} style={{
      background: HERO_GRADIENT, borderRadius: 12, padding: 16,
      boxShadow: '0 10px 28px -8px rgba(38,33,92,0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
      ...style,
    }}>{children}</div>
  );
}

function DarkCard({ children, style = {} }) {
  return (
    <div className="report-card" style={{
      background: 'rgba(255,255,255,0.06)',
      border: '0.5px solid rgba(255,255,255,0.1)',
      borderRadius: 10, padding: 12,
      ...style,
    }}>{children}</div>
  );
}

function PeriodSel({ value, onChange }) {
  return (
    <div className="flex gap-1 rounded-lg p-1"
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: '0.5px solid rgba(255,255,255,0.15)',
      }}>
      {PERIODS.map(([k, l]) => (
        <button key={k} type="button" onClick={() => onChange(k)}
          style={{
            padding: '4px 10px', borderRadius: 6,
            fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
            background: value === k ? '#7F77DD' : 'transparent',
            color: value === k ? '#fff' : 'rgba(255,255,255,0.65)',
            transition: 'background 0.15s',
          }}>{l}</button>
      ))}
    </div>
  );
}

function InlineTabs({ tabs, value, onChange }) {
  return (
    <div className="flex gap-1 mb-3 p-1 rounded-lg report-hide-print"
      style={{ background: 'rgba(255,255,255,0.08)', border: '0.5px solid rgba(255,255,255,0.15)' }}>
      {tabs.map(([k, l]) => (
        <button key={k} type="button" onClick={() => onChange(k)}
          style={{
            flex: 1, padding: '4px 8px', borderRadius: 6,
            fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
            background: value === k ? '#7F77DD' : 'transparent',
            color: value === k ? '#fff' : 'rgba(255,255,255,0.65)',
          }}>{l}</button>
      ))}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur border border-slate-100 rounded-2xl shadow-xl p-3 text-xs min-w-[140px]">
      <p className="font-bold text-slate-500 mb-1.5 pb-1.5 border-b border-slate-50">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between gap-4 mt-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
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

function DeltaBadge({ pct }) {
  if (pct == null) return null;
  const isFlat = pct === 0;
  const isUp = pct > 0;
  const Icon = isFlat ? Minus : (isUp ? ArrowUp : ArrowDown);
  const color = isFlat ? '#94a3b8' : (isUp ? '#6EE7B7' : '#F87171');
  const bg    = isFlat ? 'rgba(148,163,184,0.15)'
              : (isUp ? 'rgba(110,231,183,0.15)' : 'rgba(248,113,113,0.15)');
  return (
    <span className="inline-flex items-center gap-1"
      style={{
        padding: '2px 6px', borderRadius: 6, background: bg, color,
        fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
      }}>
      <Icon size={10} />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

// ── Section: Perbandingan Minggu ─────────────────────────────────
function PerbandinganPanel({ data }) {
  const now  = data?.thisWeek || {};
  const prev = data?.lastWeek || {};
  const delta = data?.delta || {
    omset: pctDelta(now.omset, prev.omset),
    laba:  pctDelta(now.laba,  prev.laba),
    count: pctDelta(now.count, prev.count),
  };

  const Row = ({ label, curr, prev, kind }) => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Minggu ini · {label}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-base font-bold" style={{ color: '#fff' }}>
            {kind === 'count' ? `${curr || 0} tx` : fmtRp(curr)}
          </span>
          <DeltaBadge pct={delta?.[kind]} />
        </div>
      </div>
      <div>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Minggu lalu</p>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {kind === 'count' ? `${prev || 0} tx` : fmtRp(prev)}
        </p>
      </div>
    </div>
  );

  return (
    <GradientPanel>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={14} style={{ color: '#AFA9EC' }} />
        <h4 className="font-bold text-sm" style={{ color: '#fff' }}>
          Perbandingan Minggu Ini vs Minggu Lalu
        </h4>
      </div>
      <div className="space-y-3">
        <Row label="Omset"     kind="omset" curr={now.omset} prev={prev.omset} />
        <Row label="Laba"      kind="laba"  curr={now.laba}  prev={prev.laba} />
        <Row label="Transaksi" kind="count" curr={now.count} prev={prev.count} />
      </div>
    </GradientPanel>
  );
}

// ── Section: Trend Harian ────────────────────────────────────────
function TrendPanel({ data }) {
  const labels = data?.labels || [];
  const series = data?.series || [];
  const rows = labels.map((label, i) => {
    const row = { label };
    series.forEach((s, idx) => { row[`s${idx}`] = s?.omset?.[i] ?? 0; });
    return row;
  });

  return (
    <GradientPanel style={{ padding: 20 }}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-sm" style={{ color: '#fff' }}>Trend Omset Harian</h4>
        <BarChart3 size={14} style={{ color: '#AFA9EC' }} />
      </div>
      {rows.length === 0 || series.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Belum ada data trend</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.65)' }}
              axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={12} />
            <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.65)' }}
              axisLine={false} tickLine={false} tickFormatter={fmtCompact} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 4, color: 'rgba(255,255,255,0.85)' }} />
            {series.map((s, i) => (
              <Line key={`s${i}`} type="monotone" dataKey={`s${i}`}
                name={s.nama || s.kode || `Cabang ${i+1}`}
                stroke={PALETTE[i % PALETTE.length]} strokeWidth={2}
                dot={{ r: 2 }} activeDot={{ r: 5 }} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </GradientPanel>
  );
}

// ── Widget: Produk Terlaris ─────────────────────────────────────
const PRODUK_TABS = [
  ['fisik',    'Fisik'],
  ['digital',  'Digital'],
  ['kategori', 'Kategori'],
];

function ProdukTerlarisPanel({ data }) {
  const [tab, setTab] = useState('fisik');
  const rows = (tab === 'fisik'   ? data?.produkFisik
              : tab === 'digital' ? data?.produkDigital
              :                     data?.kategori) || [];

  return (
    <GradientPanel>
      <div className="flex items-center gap-2 mb-3">
        <Package size={14} style={{ color: '#AFA9EC' }} />
        <h4 className="font-bold text-sm" style={{ color: '#fff' }}>Produk Terlaris</h4>
      </div>
      <InlineTabs tabs={PRODUK_TABS} value={tab} onChange={setTab} />
      {rows.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Belum ada data</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.slice(0, 5).map((r, i) => {
            const name = r.nama || r.kategori || '—';
            return (
              <div key={`${name}-${i}`} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
                    style={{ background: PALETTE[i % PALETTE.length] + '33', color: PALETTE[i % PALETTE.length] }}>
                    {i + 1}
                  </span>
                  <span className="text-xs truncate" style={{ color: '#fff' }} title={name}>
                    {name}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold" style={{ color: '#fff' }}>{r.terjual || 0}x</p>
                  <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{fmtRp(r.omset)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GradientPanel>
  );
}

// ── Widget: Metode Pembayaran ────────────────────────────────────
const METODE_TABS = [['global','Global'], ['perCabang','Per Cabang']];

function MetodePembayaranPanel({ data }) {
  const [mode, setMode] = useState('global');
  const [expanded, setExpanded] = useState({});

  const global    = data?.global    || [];
  const perCabang = data?.perCabang || [];
  const totalGlobal = global.reduce((s, x) => s + (x.total || 0), 0);

  return (
    <GradientPanel>
      <div className="flex items-center gap-2 mb-3">
        <CreditCard size={14} style={{ color: '#AFA9EC' }} />
        <h4 className="font-bold text-sm" style={{ color: '#fff' }}>Metode Pembayaran</h4>
      </div>
      <InlineTabs tabs={METODE_TABS} value={mode} onChange={setMode} />

      {mode === 'global' ? (
        global.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Belum ada data</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {global.map((m, i) => {
              const pct = totalGlobal > 0 ? (m.total / totalGlobal) * 100 : 0;
              const color = PALETTE[i % PALETTE.length];
              return (
                <div key={m.method || i}>
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <span style={{ color: '#fff', fontWeight: 600 }}>
                      {PAYMENT_LABELS[m.method] || m.method || '—'}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>{fmtRp(m.total)}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '0.5px solid rgba(255,255,255,0.08)',
                    }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: color, transition: 'width 0.3s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        perCabang.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Belum ada data</p>
          </div>
        ) : (
          <div className="space-y-2">
            {perCabang.map((cb, idx) => {
              const cbId = cb.cabangId || idx;
              const isOpen = expanded[cbId] !== false; // default open
              const methods = cb.methods || [];
              const totalCb = methods.reduce((s, x) => s + (x.total || 0), 0);
              return (
                <div key={cbId}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '0.5px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: 10,
                  }}>
                  <button type="button"
                    onClick={() => setExpanded(e => ({ ...e, [cbId]: !isOpen }))}
                    className="w-full flex items-center justify-between"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <div className="flex items-center gap-1.5">
                      {isOpen
                        ? <ChevronDown size={12} style={{ color: 'rgba(255,255,255,0.5)' }} />
                        : <ChevronRight size={12} style={{ color: 'rgba(255,255,255,0.5)' }} />}
                      <span className="text-xs font-semibold" style={{ color: '#fff' }}>
                        {cb.cabangNama || '—'}
                      </span>
                    </div>
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
                      {fmtRp(totalCb)}
                    </span>
                  </button>
                  {isOpen && methods.length > 0 && (
                    <div className="mt-2 space-y-1 pl-4">
                      {methods.map((m, i) => (
                        <div key={m.method || i} className="flex items-center justify-between text-[11px]">
                          <span style={{ color: 'rgba(255,255,255,0.75)' }}>
                            {PAYMENT_LABELS[m.method] || m.method || '—'}
                          </span>
                          <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                            {fmtRp(m.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </GradientPanel>
  );
}

// ── Widget: Peak Hours ──────────────────────────────────────────
function PeakHoursPanel({ data }) {
  const hours = Array.isArray(data) ? data : [];
  const bars = Array.from({ length: 24 }, (_, jam) => {
    const found = hours.find(h => h.jam === jam);
    return { jam, count: found?.count || 0, omset: found?.omset || 0 };
  });
  const hasData = bars.some(b => b.count > 0);
  const busiestJam = hasData
    ? bars.reduce((a, b) => (b.count > a.count ? b : a), bars[0]).jam
    : null;

  return (
    <GradientPanel>
      <div className="flex items-center gap-2 mb-3">
        <Clock size={14} style={{ color: '#AFA9EC' }} />
        <h4 className="font-bold text-sm" style={{ color: '#fff' }}>Peak Hours</h4>
      </div>
      {!hasData ? (
        <div className="py-6 text-center">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Belum ada data jam</p>
        </div>
      ) : (
        <>
          <p className="text-[10px] mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Tersibuk: <span style={{ color: '#FCD34D', fontWeight: 700 }}>
              {String(busiestJam).padStart(2,'0')}:00
            </span>
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={bars} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis dataKey="jam" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.6)' }}
                axisLine={false} tickLine={false} interval={3}
                tickFormatter={v => String(v).padStart(2,'0')} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Tx" radius={[3,3,0,0]}>
                {bars.map((b, i) => (
                  <Cell key={i} fill={b.jam === busiestJam ? '#FCD34D' : '#7F77DD'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </GradientPanel>
  );
}

// ── Widget: Ringkasan Void ──────────────────────────────────────
function VoidPanel({ data }) {
  const count      = data?.count      || 0;
  const totalNilai = data?.totalNilai || 0;
  const topReasons = data?.topReasons || [];
  const perCabang  = data?.perCabang  || [];

  return (
    <GradientPanel>
      <div className="flex items-center gap-2 mb-4">
        <Ban size={14} style={{ color: '#F87171' }} />
        <h4 className="font-bold text-sm" style={{ color: '#fff' }}>Ringkasan Void</h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Kolom 1: angka besar */}
        <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
          <DarkCard>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Jumlah Void</p>
            <p className="text-2xl font-black mt-1" style={{ color: '#F87171' }}>{count}</p>
          </DarkCard>
          <DarkCard>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Total Nilai</p>
            <p className="text-lg font-bold mt-1" style={{ color: '#F87171' }}>{fmtRp(totalNilai)}</p>
          </DarkCard>
        </div>
        {/* Kolom 2: top alasan */}
        <DarkCard>
          <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
            Top Alasan
          </p>
          {topReasons.length === 0 ? (
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>—</p>
          ) : (
            <div className="space-y-1.5">
              {topReasons.slice(0, 5).map((r, i) => (
                <div key={i} className="flex justify-between text-xs gap-2">
                  <span className="truncate" style={{ color: 'rgba(255,255,255,0.8)' }} title={r.reason}>
                    {i + 1}. {r.reason || '—'}
                  </span>
                  <span className="shrink-0 font-semibold" style={{ color: '#fff' }}>{r.count}x</span>
                </div>
              ))}
            </div>
          )}
        </DarkCard>
        {/* Kolom 3: per cabang (hanya kalau > 1 cabang) */}
        {perCabang.length > 1 ? (
          <DarkCard>
            <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
              Per Cabang
            </p>
            <div className="space-y-1.5">
              {perCabang.map((c, i) => (
                <div key={i} className="flex justify-between text-xs gap-2">
                  <span className="truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {c.cabangNama || '—'}
                  </span>
                  <span className="shrink-0" style={{ color: '#fff' }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{c.count || 0}x · </span>
                    {fmtRp(c.totalNilai)}
                  </span>
                </div>
              ))}
            </div>
          </DarkCard>
        ) : (
          <DarkCard style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Breakdown per cabang tersedia jika &gt; 1 cabang aktif
            </p>
          </DarkCard>
        )}
      </div>
    </GradientPanel>
  );
}

// ── Page ─────────────────────────────────────────────────────────
export default function OwnerPenjualanPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [activeCabangs, setActiveCabangs] = useState([]);
  const [range, setRange]       = useState('today');
  const [cabangId, setCabangId] = useState('');
  const [loading, setLoading]   = useState(true);

  const loadCabangs = useCallback(async () => {
    try {
      const { data: res } = await api.get('/owner/dashboard');
      const list = res.data?.subscriptions?.filter(s => ['aktif','gratis'].includes(s.status)) || [];
      setActiveCabangs(list);
    } catch { /* silent */ }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params = { range };
      if (cabangId) params.cabang = cabangId;
      const r = await api.get('/owner/penjualan-analytics', { params });
      setAnalytics(r.data?.data ?? r.data ?? null);
    } catch {
      toast.error('Gagal memuat analytics penjualan');
    } finally {
      setLoading(false);
    }
  }, [range, cabangId]);

  useEffect(() => { if (user) loadCabangs(); }, [user, loadCabangs]);
  useEffect(() => { if (user) loadAnalytics(); }, [user, loadAnalytics]);

  const periodeLabel = PERIODS.find(([k]) => k === range)?.[1] || range;
  const cabangLabel  = cabangId
    ? (activeCabangs.find(s => s.cabang?._id === cabangId)?.cabang?.nama || 'Cabang terpilih')
    : 'Semua Cabang';

  // Toggle body class → aktifkan @media print khusus laporan (bukan struk).
  // afterprint listener membersihkan class supaya UI kembali normal.
  const handlePrintLaporan = () => {
    document.documentElement.classList.add('printing-report');
    document.body.classList.add('printing-report');
    const cleanup = () => {
      document.documentElement.classList.remove('printing-report');
      document.body.classList.remove('printing-report');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    window.print();
  };

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto pb-24 lg:pb-6 owner-report-root">

      {/* Header laporan — hanya muncul saat cetak */}
      <div className="print-only" style={{ display: 'none' }}>
        <h1>Laporan Penjualan</h1>
        <p>
          Periode: {periodeLabel} · Cabang: {cabangLabel} · Dicetak:{' '}
          {new Date().toLocaleString('id-ID')}
        </p>
      </div>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap report-hide-print">
        <PeriodSel value={range} onChange={setRange} />
        <div className="flex items-center gap-2 shrink-0">
          <select value={cabangId} onChange={e => setCabangId(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              color: '#fff', borderRadius: 10,
              padding: '7px 10px', fontSize: 12,
              cursor: 'pointer', outline: 'none',
            }}>
            <option value="" style={{ color: '#1e293b' }}>Semua Cabang</option>
            {activeCabangs.map(sub => (
              <option key={sub.cabang?._id} value={sub.cabang?._id} style={{ color: '#1e293b' }}>
                {sub.cabang?.nama}
              </option>
            ))}
          </select>
          <button type="button" onClick={loadAnalytics} title="Muat ulang"
            style={{
              padding: 8, borderRadius: 10,
              background: 'rgba(255,255,255,0.08)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              color: '#fff', display: 'flex', alignItems: 'center',
              cursor: 'pointer',
            }}>
            <RefreshCw size={13} />
          </button>
          <button type="button" onClick={handlePrintLaporan} title="Cetak Laporan"
            style={{
              padding: '7px 12px', borderRadius: 10,
              background: '#7F77DD',
              border: '0.5px solid rgba(255,255,255,0.15)',
              color: '#fff', display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
            }}>
            <Printer size={13} />
            <span>Cetak Laporan</span>
          </button>
        </div>
      </div>

      {loading ? (
        <GradientPanel style={{ padding: 40 }}>
          <div className="flex justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-white/40 border-t-transparent rounded-full" />
          </div>
        </GradientPanel>
      ) : !analytics ? (
        <GradientPanel style={{ padding: 40 }}>
          <div className="text-center">
            <BarChart3 size={32} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.25)' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Belum ada data analytics
            </p>
          </div>
        </GradientPanel>
      ) : (
        <div className="space-y-4">
          <PerbandinganPanel data={analytics.comparePeriode} />
          <TrendPanel        data={analytics.trendHarian} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 report-grid-3">
            <ProdukTerlarisPanel   data={analytics.breakdown} />
            <MetodePembayaranPanel data={analytics.metodePembayaran} />
            <PeakHoursPanel        data={analytics.peakHours?.hours} />
          </div>
          <VoidPanel data={analytics.voidSummary} />
        </div>
      )}
    </div>
  );
}

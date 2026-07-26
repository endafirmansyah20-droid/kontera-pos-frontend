import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, Wrench, Package, DollarSign, TrendingUp, AlertTriangle,
  Clock, MessageSquare, Users, Search, ChevronRight, Smartphone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatRupiah } from '../utils/helpers';

// ── Theme ──────────────────────────────────────────────────────
const HERO_GRADIENT = 'linear-gradient(120deg, #26215C 0%, #3C3489 50%, #7F77DD 100%)';
const PALETTE = ['#93C5FD','#6EE7B7','#FCD34D','#AFA9EC','#F0ABFC','#5EEAD4','#FDBA74'];

const fmtRp = v => formatRupiah(v || 0);

const PERIODS = [
  ['today', 'Hari Ini'],
  ['7',     '7 Hari'],
  ['30',    '30 Hari'],
  ['month', 'Bulan Ini'],
];

// Empat status yang direkap (antrian sengaja di-skip sesuai spec).
const STATUS_ITEMS = [
  { key: 'proses',  label: 'Dikerjakan', color: '#93C5FD' },
  { key: 'selesai', label: 'Selesai',    color: '#6EE7B7' },
  { key: 'diambil', label: 'Diambil',    color: '#AFA9EC' },
  { key: 'batal',   label: 'Batal',      color: '#F87171' },
];
const STATUS_META = Object.fromEntries(STATUS_ITEMS.map(s => [s.key, s]));

const STATUS_FILTERS = [
  ['',        'Semua'],
  ['antrian', 'Antrian'],
  ['proses',  'Dikerjakan'],
  ['selesai', 'Selesai'],
  ['diambil', 'Diambil'],
  ['batal',   'Batal'],
];

// Format durasi jam → "X jam" atau "X hari Y jam" bila > 24 jam.
function formatDuration(hours) {
  if (hours == null || Number.isNaN(hours)) return '—';
  const h = Number(hours);
  if (h < 1)  return `${Math.round(h * 60)} menit`;
  if (h < 24) return `${h.toFixed(1)} jam`;
  const days = Math.floor(h / 24);
  const remH = Math.round(h - days * 24);
  return remH > 0 ? `${days} hari ${remH} jam` : `${days} hari`;
}

function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── UI primitives ──────────────────────────────────────────────
function GradientPanel({ children, style = {}, className = '', ...rest }) {
  return (
    <div {...rest} className={className} style={{
      background: HERO_GRADIENT, borderRadius: 12, padding: 16,
      boxShadow: '0 10px 28px -8px rgba(38,33,92,0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
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

// ── Metric Card ────────────────────────────────────────────────
function MetricCard({ label, value, sub, icon: Icon, accent = 'violet', compact = false, footer }) {
  const isAmber   = accent === 'amber';
  const isGreen   = accent === 'green';
  const isRed     = accent === 'red';
  const badgeBg   = isAmber ? 'rgba(239,159,39,0.25)'
                  : isGreen ? 'rgba(16,185,129,0.25)'
                  : isRed   ? 'rgba(248,113,113,0.25)'
                            : 'rgba(127,119,221,0.25)';
  const accentLight = isAmber ? '#FAC775'
                    : isGreen ? '#6EE7B7'
                    : isRed   ? '#FCA5A5'
                              : '#AFA9EC';
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      border: '0.5px solid rgba(255,255,255,0.10)',
      borderRadius: 12,
      padding: compact ? 12 : 16,
    }}>
      <div style={{
        width: compact ? 30 : 36, height: compact ? 30 : 36, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: badgeBg, color: accentLight, marginBottom: compact ? 8 : 12,
      }}>
        <Icon size={compact ? 15 : 18} />
      </div>
      <p style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.05em',
        color: accentLight, margin: 0,
      }}>{label}</p>
      <p className="break-all" style={{
        fontSize: compact ? 15 : 18, fontWeight: 700, lineHeight: 1.2,
        color: '#fff', margin: '4px 0 0',
      }}>{value}</p>
      {sub && <p style={{
        fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: '4px 0 0',
      }}>{sub}</p>}
      {footer}
    </div>
  );
}

// ── Status Badge (dark theme) ──────────────────────────────────
function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status || '—', color: '#94a3b8' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 999,
      fontSize: 10, fontWeight: 700,
      color: meta.color,
      background: `${meta.color}22`,
      border: `0.5px solid ${meta.color}55`,
      whiteSpace: 'nowrap',
    }}>{meta.label}</span>
  );
}

// ── Status Breakdown row ───────────────────────────────────────
function StatusBreakdown({ counts }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {STATUS_ITEMS.map((s, i) => {
        const count = counts?.[s.key] ?? 0;
        return (
          <div key={s.key} style={{
            background: 'rgba(255,255,255,0.06)',
            border: '0.5px solid rgba(255,255,255,0.10)',
            borderRadius: 12, padding: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
                color: s.color, margin: 0,
              }}>{s.label.toUpperCase()}</p>
              <p style={{
                fontSize: 22, fontWeight: 800, color: '#fff', margin: '2px 0 0', lineHeight: 1.1,
              }}>{count}</p>
            </div>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: `${s.color}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Top Keluhan ─────────────────────────────────────────────────
function TopKeluhanPanel({ rows }) {
  const data = Array.isArray(rows) ? rows : [];
  return (
    <GradientPanel>
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare size={14} style={{ color: '#AFA9EC' }} />
        <h4 className="font-bold text-sm" style={{ color: '#fff' }}>Top Keluhan</h4>
      </div>
      {data.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Belum ada data keluhan</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.slice(0, 6).map((r, i) => {
            const name = r.label || r.kategori || r.kata || r._id || '—';
            const count = r.count ?? r.jumlah ?? 0;
            const color = PALETTE[i % PALETTE.length];
            return (
              <div key={`${name}-${i}`} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
                    style={{ background: color + '33', color }}>
                    {i + 1}
                  </span>
                  <span className="text-xs truncate" style={{ color: '#fff' }} title={name}>
                    {name}
                  </span>
                </div>
                <p className="text-xs font-bold shrink-0" style={{ color: '#fff' }}>{count}x</p>
              </div>
            );
          })}
        </div>
      )}
    </GradientPanel>
  );
}

// ── Performa Teknisi ────────────────────────────────────────────
function PerformaTeknisiPanel({ rows }) {
  const data = Array.isArray(rows) ? rows : [];
  return (
    <GradientPanel>
      <div className="flex items-center gap-2 mb-3">
        <Users size={14} style={{ color: '#AFA9EC' }} />
        <h4 className="font-bold text-sm" style={{ color: '#fff' }}>Performa Teknisi</h4>
      </div>
      {data.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
            Belum ada data teknisi
          </p>
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Pastikan teknisi dipilih saat input service baru
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.slice(0, 6).map((r, i) => {
            const name  = r.nama || r.name || '—';
            const count = r.count ?? r.jumlah ?? 0;
            const omset = r.omset ?? r.total ?? 0;
            const color = PALETTE[i % PALETTE.length];
            return (
              <div key={`${r._id || name}-${i}`} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ background: color + '33', color, border: `0.5px solid ${color}55` }}>
                    {initials(name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: '#fff' }} title={name}>
                      {name}
                    </p>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{count} unit</p>
                  </div>
                </div>
                <p className="text-xs font-bold shrink-0" style={{ color: '#fff' }}>{fmtRp(omset)}</p>
              </div>
            );
          })}
        </div>
      )}
    </GradientPanel>
  );
}

// ── Service Terbaru list ────────────────────────────────────────
function ServiceRow({ item, onClick }) {
  const device = [item.deviceBrand, item.deviceModel].filter(Boolean).join(' ') || '—';
  const total  = item.totalCost ?? ((item.partsCost || 0) + (item.serviceFee || 0));
  return (
    <div onClick={onClick}
      className="grid grid-cols-[auto_1fr_auto] gap-3 items-center px-3 py-3 rounded-xl"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
    >
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'rgba(127,119,221,0.25)', color: '#AFA9EC' }}>
        <Smartphone size={15} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold truncate" style={{ color: '#fff' }}>{device}</p>
          <StatusBadge status={item.status} />
        </div>
        <p className="text-[11px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.65)' }}>
          {item.customerName || '—'}
          {item.complaint ? <span style={{ color: 'rgba(255,255,255,0.45)' }}> · {item.complaint}</span> : null}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <p className="text-sm font-bold" style={{ color: '#fff' }}>{fmtRp(total)}</p>
        <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.35)' }} />
      </div>
    </div>
  );
}

function ServiceTerbaruPanel({ list, loading, search, onSearch, statusFilter, onStatusFilter, onRowClick }) {
  return (
    <GradientPanel>
      <div className="flex items-center gap-2 mb-3">
        <Wrench size={14} style={{ color: '#AFA9EC' }} />
        <h4 className="font-bold text-sm" style={{ color: '#fff' }}>Service Terbaru</h4>
      </div>

      {/* Search + status filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1 min-w-0">
          <Search size={13} style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.5)',
          }} />
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Cari device, customer, invoice..."
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.08)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              color: '#fff', borderRadius: 8,
              padding: '7px 10px 7px 30px', fontSize: 12,
              outline: 'none',
            }}
          />
        </div>
        <select value={statusFilter} onChange={e => onStatusFilter(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '0.5px solid rgba(255,255,255,0.15)',
            color: '#fff', borderRadius: 8,
            padding: '7px 10px', fontSize: 12,
            cursor: 'pointer', outline: 'none',
          }}>
          {STATUS_FILTERS.map(([k, l]) => (
            <option key={k} value={k} style={{ color: '#1e293b' }}>{l}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-8 flex justify-center">
          <div className="animate-spin w-5 h-5 border-2 border-white/40 border-t-transparent rounded-full" />
        </div>
      ) : list.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Tidak ada data service</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(item => (
            <ServiceRow key={item._id} item={item} onClick={() => onRowClick(item)} />
          ))}
        </div>
      )}
    </GradientPanel>
  );
}

// ── Page ────────────────────────────────────────────────────────
export default function OwnerServicePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeCabangs, setActiveCabangs] = useState([]);
  const [range, setRange]       = useState('today');
  const [cabangId, setCabangId] = useState('');

  const [summary, setSummary]     = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loadingSum, setLoadingSum] = useState(true);

  const [list, setList]           = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Fetch daftar cabang aktif untuk dropdown
  const loadCabangs = useCallback(async () => {
    try {
      const { data: res } = await api.get('/owner/dashboard');
      const cabs = res.data?.subscriptions?.filter(s => ['aktif','gratis'].includes(s.status)) || [];
      setActiveCabangs(cabs);
    } catch { /* silent */ }
  }, []);

  // Fetch summary + analytics (satu useEffect biar sinkron dengan range/cabang)
  const loadSummaryAndAnalytics = useCallback(async () => {
    setLoadingSum(true);
    try {
      const params = { range };
      if (cabangId) params.cabang = cabangId;
      const [s, a] = await Promise.all([
        api.get('/owner/service-summary',  { params }),
        api.get('/owner/service-analytics', { params }),
      ]);
      setSummary(s.data?.data ?? s.data ?? null);
      setAnalytics(a.data?.data ?? a.data ?? null);
    } catch {
      toast.error('Gagal memuat ringkasan service');
      setSummary(null);
      setAnalytics(null);
    } finally { setLoadingSum(false); }
  }, [range, cabangId]);

  // Fetch service list (search + status filter dikirim ke server-side)
  const loadList = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = { range, limit: 10 };
      if (cabangId)     params.cabang = cabangId;
      if (search)       params.search = search;
      if (statusFilter) params.status = statusFilter;
      const r = await api.get('/owner/service-list', { params });
      setList(r.data?.data ?? []);
    } catch {
      toast.error('Gagal memuat daftar service');
      setList([]);
    } finally { setLoadingList(false); }
  }, [range, cabangId, search, statusFilter]);

  useEffect(() => { if (user) loadCabangs(); }, [user, loadCabangs]);
  useEffect(() => { if (user) loadSummaryAndAnalytics(); }, [user, loadSummaryAndAnalytics]);

  // Debounce search supaya tidak nembak endpoint tiap keystroke.
  useEffect(() => {
    if (!user) return;
    const id = setTimeout(loadList, 300);
    return () => clearTimeout(id);
  }, [user, loadList]);

  const handleRefreshAll = () => {
    loadSummaryAndAnalytics();
    loadList();
  };

  // Derive nilai untuk metric cards dari shape yang mungkin dikembalikan
  // backend (defensif: coba beberapa field name yg umum).
  const totalUnit    = summary?.totalUnit    ?? summary?.jumlahTx  ?? 0;
  const omset        = summary?.omset        ?? summary?.omsetMurni ?? 0;
  const laba         = summary?.laba         ?? summary?.labaBersih ?? 0;
  const belumSelesai = summary?.belumSelesai
    ?? ((summary?.statusCount?.antrian ?? 0) + (summary?.statusCount?.proses ?? 0));
  const avgH         = summary?.avgDurationHours;
  const avgN         = summary?.avgDurationSampleSize ?? 0;
  const statusCount  = summary?.statusCount ?? {};

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto pb-24 lg:pb-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
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
          <button type="button" onClick={handleRefreshAll} title="Muat ulang"
            style={{
              padding: 8, borderRadius: 10,
              background: 'rgba(255,255,255,0.08)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              color: '#fff', display: 'flex', alignItems: 'center',
              cursor: 'pointer',
            }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {loadingSum ? (
        <GradientPanel style={{ padding: 40 }}>
          <div className="flex justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-white/40 border-t-transparent rounded-full" />
          </div>
        </GradientPanel>
      ) : (
        <div className="space-y-4">

          {/* ── Metric cards ── */}
          <GradientPanel>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <MetricCard label="TOTAL UNIT"     value={totalUnit}
                icon={Package}       accent="violet" />
              <MetricCard label="OMSET"          value={fmtRp(omset)}
                icon={DollarSign}    accent="green" />
              <MetricCard label="LABA"           value={fmtRp(laba)}
                icon={TrendingUp}    accent="amber" />
              <MetricCard label="BELUM SELESAI"  value={belumSelesai}
                icon={AlertTriangle} accent="red" />
              <MetricCard label="RATA-RATA PENGERJAAN"
                value={formatDuration(avgH)}
                icon={Clock} accent="violet" compact
                footer={avgN > 0 && avgN < 3 ? (
                  <p style={{
                    fontSize: 10, color: 'rgba(255,255,255,0.5)',
                    margin: '4px 0 0', fontStyle: 'italic',
                  }}>berdasarkan {avgN} transaksi</p>
                ) : avgN >= 3 ? (
                  <p style={{
                    fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0',
                  }}>dari {avgN} transaksi</p>
                ) : null}
              />
            </div>
          </GradientPanel>

          {/* ── Status breakdown ── */}
          <StatusBreakdown counts={statusCount} />

          {/* ── Top Keluhan + Performa Teknisi ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TopKeluhanPanel   rows={analytics?.topKeluhan} />
            <PerformaTeknisiPanel rows={analytics?.performaTeknisi} />
          </div>

          {/* ── Service Terbaru ── */}
          <ServiceTerbaruPanel
            list={list}
            loading={loadingList}
            search={search}
            onSearch={setSearch}
            statusFilter={statusFilter}
            onStatusFilter={setStatusFilter}
            onRowClick={item => navigate(`/owner/service/${item._id}`)}
          />
        </div>
      )}
    </div>
  );
}

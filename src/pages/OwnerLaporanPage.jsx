import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw, History, Calendar, Filter, Package, Calculator,
  ArrowRight, CheckCircle2, TrendingUp, AlertTriangle, Search,
  ShoppingBag, BarChart3, PieChart, Printer, DollarSign, Ban,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import api, { ownerAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/UI';
import { formatRupiah, formatDateTime } from '../utils/helpers';

// ── Theme ────────────────────────────────────────────────────
const HERO_GRADIENT = 'linear-gradient(120deg, #26215C 0%, #3C3489 50%, #7F77DD 100%)';
const PAGE_SIZE = 20;

const fmtRp = v => formatRupiah(v || 0);
const fmtCompact = v => v >= 1e9 ? `${(v/1e9).toFixed(1)}M`
                    : v >= 1e6 ? `${(v/1e6).toFixed(1)}jt`
                    : v >= 1e3 ? `${(v/1e3).toFixed(0)}k` : v;

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
const MONTH_FULL  = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const PECAHAN = [
  { key: 'p100000', label: 'Rp 100.000', nilai: 100000 },
  { key: 'p50000',  label: 'Rp 50.000',  nilai: 50000  },
  { key: 'p20000',  label: 'Rp 20.000',  nilai: 20000  },
  { key: 'p10000',  label: 'Rp 10.000',  nilai: 10000  },
  { key: 'p5000',   label: 'Rp 5.000',   nilai: 5000   },
  { key: 'p2000',   label: 'Rp 2.000',   nilai: 2000   },
  { key: 'p1000',   label: 'Rp 1.000',   nilai: 1000   },
  { key: 'koin',    label: 'Koin',       nilai: 1      },
];

const TYPE_FILTERS = [
  ['',       'Semua'],
  ['cash',   'Cash'],
  ['produk', 'Produk'],
];

const TABS = [
  ['closing',     'Riwayat Closing',   History],
  ['pembelian',   'Riwayat Pembelian', ShoppingBag],
  ['bulanan',     'Laporan Bulanan',   BarChart3],
  ['ritelGrosir', 'Ritel vs Grosir',   PieChart],
];

// ── Primitives ───────────────────────────────────────────────
const controlBase = {
  background: 'rgba(255,255,255,0.08)',
  border: '0.5px solid rgba(255,255,255,0.15)',
  color: '#fff', borderRadius: 10,
  padding: '7px 10px', fontSize: 12,
  outline: 'none',
};

function GradientPanel({ children, style = {}, className = '', ...rest }) {
  return (
    <div {...rest} className={`report-panel ${className}`.trim()} style={{
      background: HERO_GRADIENT, borderRadius: 12, padding: 16,
      boxShadow: '0 10px 28px -8px rgba(38,33,92,0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
      ...style,
    }}>{children}</div>
  );
}

function CabangDropdown({ value, onChange, cabangs, allowAll = true }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ ...controlBase, cursor: 'pointer' }}>
      {allowAll && <option value="" style={{ color: '#1e293b' }}>Semua Cabang</option>}
      {cabangs.map(sub => (
        <option key={sub.cabang?._id} value={sub.cabang?._id} style={{ color: '#1e293b' }}>
          {sub.cabang?.nama}
        </option>
      ))}
    </select>
  );
}

function RefreshBtn({ onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title="Muat ulang"
      style={{
        padding: 8, borderRadius: 10,
        background: 'rgba(255,255,255,0.08)',
        border: '0.5px solid rgba(255,255,255,0.15)',
        color: '#fff', display: 'flex', alignItems: 'center',
        cursor: disabled ? 'wait' : 'pointer', opacity: disabled ? 0.6 : 1,
      }}>
      <RefreshCw size={13} />
    </button>
  );
}

function TabBar({ activeTab, onChange }) {
  return (
    <div className="report-hide-print flex gap-2 mb-4 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap min-w-0 max-w-full">
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

// ══════════════════════════════════════════════════════════════
// TAB 1 — RIWAYAT CLOSING (existing, refactored ke subcomponent
// tanpa mengubah logic filter/pagination/detail)
// ══════════════════════════════════════════════════════════════

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
      whiteSpace: 'nowrap',
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
      whiteSpace: 'nowrap',
    }}>
      <Icon size={10} /> {label}
    </span>
  );
}

function ShiftPill({ shift }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '1px 7px', borderRadius: 999,
      fontSize: 10, fontWeight: 600,
      background: 'rgba(255,255,255,0.08)',
      border: '0.5px solid rgba(255,255,255,0.15)',
      color: 'rgba(255,255,255,0.75)',
      textTransform: 'capitalize',
      whiteSpace: 'nowrap',
    }}>{shift || '—'}</span>
  );
}

function RiwayatClosingRow({ item, onClick }) {
  const type    = item.type || 'cash';
  const selisih = item.selisih ?? 0;
  const cabang  = item.cabang?.nama || item.cabangNama || '—';
  const sebelum = item.saldoKasSebelum ?? null;
  const setelah = item.saldoKasSetelah ?? null;
  return (
    <div onClick={onClick} style={{
      background: 'rgba(255,255,255,0.04)',
      border: '0.5px solid rgba(255,255,255,0.08)',
      borderRadius: 10, padding: 12,
      cursor: 'pointer', transition: 'background 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <TypeBadge type={type} />
            <ShiftPill shift={item.shift} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
              {formatDateTime(item.createdAt)}
            </span>
          </div>
          <p className="mt-1.5 text-sm font-semibold truncate" style={{ color: '#fff' }}>
            {cabang}
          </p>
          <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.6)' }}>
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

function ClosingDetailModal({ open, onClose, data, loading }) {
  return (
    <Modal open={open} onClose={onClose} title="Detail Closing" size="lg">
      {loading ? (
        <div className="py-8 flex justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : !data ? (
        <p className="text-sm text-slate-500">Data detail tidak tersedia.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="min-w-0">
              <p className="text-xs text-slate-400">Tanggal</p>
              <p className="text-sm font-semibold text-slate-700 break-words">
                {formatDateTime(data.createdAt)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400">Cabang</p>
              <p className="text-sm font-semibold text-slate-700 truncate">
                {data.cabang?.nama || data.cabangNama || '—'}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400">Shift</p>
              <p className="text-sm font-semibold text-slate-700 capitalize">
                {data.shift || '—'}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400">Kasir</p>
              <p className="text-sm font-semibold text-slate-700 truncate">
                {data.createdByName || '—'}
              </p>
            </div>
          </div>

          {(data.saldoKasSebelum != null || data.saldoKasSetelah != null) && (
            <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between text-sm">
              <div>
                <p className="text-xs text-slate-400">Saldo Kas Sebelum</p>
                <p className="font-bold text-slate-700">{fmtRp(data.saldoKasSebelum)}</p>
              </div>
              <ArrowRight size={16} className="text-slate-400" />
              <div className="text-right">
                <p className="text-xs text-slate-400">Saldo Kas Setelah</p>
                <p className="font-bold text-slate-700">{fmtRp(data.saldoKasSetelah)}</p>
              </div>
            </div>
          )}

          <div className={`rounded-xl p-3 text-center ${
            (data.selisih ?? 0) === 0 ? 'bg-green-50'
            : (data.selisih ?? 0) > 0 ? 'bg-blue-50' : 'bg-red-50'
          }`}>
            <p className="text-xs text-slate-500">Selisih</p>
            <p className={`text-2xl font-black ${
              (data.selisih ?? 0) === 0 ? 'text-green-600'
              : (data.selisih ?? 0) > 0 ? 'text-blue-600' : 'text-red-600'
            }`}>
              {(data.selisih ?? 0) > 0 ? '+' : ''}{fmtRp(data.selisih)}
            </p>
          </div>

          {(!data.type || data.type === 'cash') && (
            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wide mb-3">Ringkasan Kas</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">💵 Pemasukan Cash</span><span className="text-green-600 font-semibold">{fmtRp(data.totalPemasukanCash)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">📱 QRIS</span><span className="text-blue-600 font-semibold">{fmtRp(data.totalQris)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">🏦 Transfer</span><span className="text-purple-600 font-semibold">{fmtRp(data.totalTransfer)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">📤 Pengeluaran</span><span className="text-red-500 font-semibold">{fmtRp(data.totalPengeluaranCash)}</span></div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="font-bold text-slate-700">Saldo Sistem</span>
                  <span className="font-bold text-slate-700">{fmtRp(data.saldoSistem)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-slate-700">Uang Fisik</span>
                  <span className="font-bold text-slate-700">{fmtRp(data.totalFisik)}</span>
                </div>
              </div>
              {data.uangFisik && (
                <div className="mt-3">
                  <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wide mb-2">Pecahan</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {PECAHAN.map(p => {
                      const j = data.uangFisik?.[p.key] || 0;
                      if (!j) return null;
                      return (
                        <div key={p.key} className="flex justify-between items-center gap-2 text-xs py-1.5 px-2 bg-white rounded-lg">
                          <span className="text-slate-500 truncate">{p.label} × {j}</span>
                          <span className="font-semibold flex-shrink-0 text-slate-700">{fmtRp(j * p.nilai)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {data.type === 'produk' && Array.isArray(data.produkItems) && data.produkItems.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wide mb-2">
                Detail Produk ({data.produkItems.length} item)
              </h4>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {data.produkItems.map((item, i) => (
                  <div key={i} className={`flex justify-between items-center text-xs p-2.5 rounded-lg ${
                    item.selisih < 0 ? 'bg-red-50' : item.selisih > 0 ? 'bg-green-50' : 'bg-slate-50'
                  }`}>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-700 truncate">{item.productName}</p>
                      <p className="text-slate-400">{item.productCode} · Harga: {fmtRp(item.hargaJual)}</p>
                      <p className="text-slate-500">Sistem: {item.stokSistem} → Fisik: {item.stokFisik}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className={`font-bold text-sm ${
                        item.selisih === 0 ? 'text-green-600'
                        : item.selisih > 0 ? 'text-blue-600' : 'text-red-500'
                      }`}>{item.selisih > 0 ? '+' : ''}{item.selisih}</p>
                      {item.nilaiSelisih !== 0 && (
                        <p className={`font-bold text-xs ${item.nilaiSelisih > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                          {item.nilaiSelisih > 0 ? '+' : ''}{fmtRp(item.nilaiSelisih)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.catatan && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Catatan</p>
              <p className="text-sm bg-slate-50 p-3 rounded-xl text-slate-700">{data.catatan}</p>
            </div>
          )}
          {data.catatanSelisih && (
            <div>
              <p className="text-xs text-red-400 mb-1">Alasan Selisih</p>
              <p className="text-sm bg-red-50 p-3 rounded-xl text-red-700">{data.catatanSelisih}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function TabRiwayatClosing({ user, activeCabangs }) {
  const [cabangId, setCabangId]   = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');

  const [items, setItems]         = useState([]);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]     = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadRiwayat = useCallback(async (targetPage = 1, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const params = { page: targetPage, limit: PAGE_SIZE };
      if (cabangId)   params.cabang    = cabangId;
      if (typeFilter) params.type      = typeFilter;
      if (startDate)  params.startDate = startDate;
      if (endDate)    params.endDate   = endDate;
      const r = await ownerAPI.getClosingRiwayat(params);
      const list = r.data?.data?.items ?? r.data?.data ?? r.data ?? [];
      const arr  = Array.isArray(list) ? list : [];
      setHasMore(arr.length >= PAGE_SIZE);
      if (append) {
        setItems(prev => {
          const seen = new Set(prev.map(x => x._id));
          return [...prev, ...arr.filter(x => !seen.has(x._id))];
        });
      } else {
        setItems(arr);
      }
    } catch {
      toast.error('Gagal memuat riwayat closing');
      if (!append) setItems([]);
      setHasMore(false);
    } finally {
      if (append) setLoadingMore(false); else setLoading(false);
    }
  }, [cabangId, typeFilter, startDate, endDate]);

  useEffect(() => {
    if (!user) return;
    setPage(1);
    loadRiwayat(1, false);
  }, [user, loadRiwayat]);

  const handleMuatLebih = () => {
    const next = page + 1;
    setPage(next);
    loadRiwayat(next, true);
  };
  const handleRefresh = () => { setPage(1); loadRiwayat(1, false); };

  const handleRowClick = async (item) => {
    setDetailOpen(true); setDetailData(null); setDetailLoading(true);
    try {
      const r = await ownerAPI.getClosingDetail(item._id);
      setDetailData(r.data?.data ?? r.data ?? item);
    } catch {
      toast.error('Gagal memuat detail');
      setDetailData(item);
    } finally { setDetailLoading(false); }
  };

  return (
    <>
      {/* Header row: subtitle + cabang + refresh */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Riwayat closing kasir semua cabang
        </p>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <CabangDropdown value={cabangId} onChange={setCabangId} cabangs={activeCabangs} />
          <RefreshBtn onClick={handleRefresh} disabled={loading} />
        </div>
      </div>

      {/* Filter tipe + tanggal */}
      <GradientPanel style={{ padding: 12, marginBottom: 16 }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter size={13} style={{ color: 'rgba(255,255,255,0.65)' }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>Tipe:</span>
            <div className="flex gap-1 p-1 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.10)' }}>
              {TYPE_FILTERS.map(([k, l]) => (
                <button key={k} type="button" onClick={() => setTypeFilter(k)}
                  style={{
                    padding: '4px 10px', borderRadius: 6,
                    fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: typeFilter === k ? '#7F77DD' : 'transparent',
                    color: typeFilter === k ? '#fff' : 'rgba(255,255,255,0.65)',
                    transition: 'background 0.15s',
                  }}>{l}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={13} style={{ color: 'rgba(255,255,255,0.65)' }} />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ ...controlBase, colorScheme: 'dark' }} title="Dari tanggal" />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>—</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ ...controlBase, colorScheme: 'dark' }} title="Sampai tanggal" />
            {(startDate || endDate) && (
              <button type="button" onClick={() => { setStartDate(''); setEndDate(''); }}
                style={{
                  padding: '4px 8px', borderRadius: 6, background: 'transparent',
                  border: 'none', color: 'rgba(255,255,255,0.55)',
                  cursor: 'pointer', fontSize: 11, fontWeight: 600,
                }}>×</button>
            )}
          </div>
        </div>
      </GradientPanel>

      {/* Body */}
      <GradientPanel>
        <div className="flex items-center gap-2 mb-3">
          <History size={14} style={{ color: '#AFA9EC' }} />
          <h4 className="font-bold text-sm" style={{ color: '#fff' }}>Riwayat Closing</h4>
          {!loading && items.length > 0 && (
            <span className="text-[11px] ml-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
              ({items.length} entri)
            </span>
          )}
        </div>
        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-white/40 border-t-transparent rounded-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center">
            <History size={28} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.25)' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Belum ada riwayat closing
            </p>
            {(cabangId || typeFilter || startDate || endDate) && (
              <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Coba longgarkan filter di atas
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {items.map(item => (
                <RiwayatClosingRow key={item._id} item={item} onClick={() => handleRowClick(item)} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-3 flex justify-center">
                <button type="button" onClick={handleMuatLebih} disabled={loadingMore}
                  style={{
                    padding: '8px 18px', borderRadius: 10,
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
        )}
      </GradientPanel>

      <ClosingDetailModal
        open={detailOpen} onClose={() => setDetailOpen(false)}
        data={detailData} loading={detailLoading}
      />
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 2 — RIWAYAT PEMBELIAN (baru)
// ══════════════════════════════════════════════════════════════

function PembelianRow({ item, onClick }) {
  const cabang = item.cabang?.nama || item.cabangNama || '—';
  const nomorPO = item.nomorPO || item.noPO || item.invoiceNumber || item._id?.slice(-6) || '—';
  const totalItem = item.totalItem ?? (Array.isArray(item.items) ? item.items.length : 0);
  const totalHarga = item.totalHarga ?? item.total ?? 0;
  const isBatal = !!item.isBatal;
  return (
    <div onClick={onClick} style={{
      background: 'rgba(255,255,255,0.04)',
      border: '0.5px solid rgba(255,255,255,0.08)',
      borderRadius: 10, padding: 12,
      cursor: 'pointer', transition: 'background 0.15s',
      opacity: isBatal ? 0.65 : 1,
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
              padding: '2px 8px', borderRadius: 6,
              background: 'rgba(127,119,221,0.20)',
              color: '#AFA9EC',
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
            {cabang} · oleh {item.createdByName || '—'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', textDecoration: isBatal ? 'line-through' : 'none' }}>
            {fmtRp(totalHarga)}
          </p>
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {totalItem} item
          </p>
        </div>
      </div>
    </div>
  );
}

function PembelianDetailModal({ open, onClose, data, loading }) {
  return (
    <Modal open={open} onClose={onClose} title="Detail Pembelian" size="lg">
      {loading ? (
        <div className="py-8 flex justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : !data ? (
        <p className="text-sm text-slate-500">Data detail tidak tersedia.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="min-w-0">
              <p className="text-xs text-slate-400">Nomor PO</p>
              <p className="font-mono font-bold text-slate-700 truncate">
                {data.nomorPO || data.noPO || data.invoiceNumber || '—'}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400">Tanggal</p>
              <p className="font-semibold text-slate-700">
                {formatDateTime(data.tanggal || data.createdAt)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400">Supplier</p>
              <p className="font-semibold text-slate-700 truncate">
                {data.supplier || data.supplierName || '—'}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400">Cabang</p>
              <p className="font-semibold text-slate-700 truncate">
                {data.cabang?.nama || data.cabangNama || '—'}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400">Dicatat oleh</p>
              <p className="font-semibold text-slate-700 truncate">{data.createdByName || '—'}</p>
            </div>
            <div className="min-w-0 sm:col-span-3 text-right">
              {data.isBatal && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
                  <Ban size={12} /> Batal{data.alasanBatal ? ` · ${data.alasanBatal}` : ''}
                </span>
              )}
            </div>
          </div>

          {Array.isArray(data.items) && data.items.length > 0 ? (
            <div>
              <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wide mb-2">
                Item ({data.items.length})
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <th className="text-left py-2 px-3">Produk</th>
                      <th className="text-right py-2 px-3">Jumlah</th>
                      <th className="text-right py-2 px-3">Harga Modal</th>
                      <th className="text-right py-2 px-3">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((it, i) => {
                      const jumlah   = it.jumlah ?? it.qty ?? 0;
                      const modal    = it.hargaModalBaru ?? it.hargaModal ?? it.harga ?? 0;
                      const subtotal = it.subtotal ?? (jumlah * modal);
                      return (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="py-2 px-3 text-slate-700">
                            <div className="font-medium truncate">{it.productName || it.name || '—'}</div>
                            {it.productCode && (
                              <div className="text-xs text-slate-400">{it.productCode}</div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-700 font-semibold">{jumlah}</td>
                          <td className="py-2 px-3 text-right text-slate-700">{fmtRp(modal)}</td>
                          <td className="py-2 px-3 text-right text-slate-700 font-bold">{fmtRp(subtotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td className="py-2 px-3 font-bold text-slate-700" colSpan={3}>Total</td>
                      <td className="py-2 px-3 text-right font-black text-slate-800">
                        {fmtRp(data.totalHarga ?? data.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Tidak ada rincian item.</p>
          )}

          {data.catatan && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Catatan</p>
              <p className="text-sm bg-slate-50 p-3 rounded-xl text-slate-700">{data.catatan}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function TabRiwayatPembelian({ user, activeCabangs }) {
  const [cabangId, setCabangId] = useState('');
  const [supplier, setSupplier] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]   = useState('');

  const [items, setItems]       = useState([]);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]   = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadList = useCallback(async (targetPage = 1, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const params = { page: targetPage, limit: PAGE_SIZE };
      if (cabangId)  params.cabang    = cabangId;
      if (supplier)  params.supplier  = supplier;
      if (startDate) params.dateStart = startDate;
      if (endDate)   params.dateEnd   = endDate;
      const r = await ownerAPI.getPembelianRiwayat(params);
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
  }, [cabangId, supplier, startDate, endDate]);

  // Debounce supplier search 300ms; filter lain langsung fire.
  useEffect(() => {
    if (!user) return;
    const id = setTimeout(() => { setPage(1); loadList(1, false); }, 300);
    return () => clearTimeout(id);
  }, [user, loadList]);

  const handleMuatLebih = () => {
    const next = page + 1;
    setPage(next);
    loadList(next, true);
  };
  const handleRefresh = () => { setPage(1); loadList(1, false); };

  const handleRowClick = async (item) => {
    setDetailOpen(true); setDetailData(null); setDetailLoading(true);
    try {
      const r = await ownerAPI.getPembelianDetail(item._id);
      setDetailData(r.data?.data ?? r.data ?? item);
    } catch {
      toast.error('Gagal memuat detail');
      setDetailData(item);
    } finally { setDetailLoading(false); }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Riwayat pesanan pembelian semua cabang
        </p>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <CabangDropdown value={cabangId} onChange={setCabangId} cabangs={activeCabangs} />
          <RefreshBtn onClick={handleRefresh} disabled={loading} />
        </div>
      </div>

      <GradientPanel style={{ padding: 12, marginBottom: 16 }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'rgba(255,255,255,0.5)',
            }} />
            <input value={supplier} onChange={e => setSupplier(e.target.value)}
              placeholder="Cari supplier…"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.08)',
                border: '0.5px solid rgba(255,255,255,0.15)',
                color: '#fff', borderRadius: 8,
                padding: '7px 10px 7px 30px', fontSize: 12, outline: 'none',
              }} />
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={13} style={{ color: 'rgba(255,255,255,0.65)' }} />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ ...controlBase, colorScheme: 'dark' }} title="Dari tanggal" />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>—</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ ...controlBase, colorScheme: 'dark' }} title="Sampai tanggal" />
            {(startDate || endDate) && (
              <button type="button" onClick={() => { setStartDate(''); setEndDate(''); }}
                style={{
                  padding: '4px 8px', borderRadius: 6, background: 'transparent',
                  border: 'none', color: 'rgba(255,255,255,0.55)',
                  cursor: 'pointer', fontSize: 11, fontWeight: 600,
                }}>×</button>
            )}
          </div>
        </div>
      </GradientPanel>

      <GradientPanel>
        <div className="flex items-center gap-2 mb-3">
          <ShoppingBag size={14} style={{ color: '#AFA9EC' }} />
          <h4 className="font-bold text-sm" style={{ color: '#fff' }}>Riwayat Pembelian</h4>
          {!loading && items.length > 0 && (
            <span className="text-[11px] ml-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
              ({items.length} entri)
            </span>
          )}
        </div>
        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-white/40 border-t-transparent rounded-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center">
            <ShoppingBag size={28} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.25)' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Belum ada riwayat pembelian
            </p>
            {(cabangId || supplier || startDate || endDate) && (
              <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Coba longgarkan filter di atas
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {items.map(item => (
                <PembelianRow key={item._id} item={item} onClick={() => handleRowClick(item)} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-3 flex justify-center">
                <button type="button" onClick={handleMuatLebih} disabled={loadingMore}
                  style={{
                    padding: '8px 18px', borderRadius: 10,
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
        )}
      </GradientPanel>

      <PembelianDetailModal
        open={detailOpen} onClose={() => setDetailOpen(false)}
        data={detailData} loading={detailLoading}
      />
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 3 — LAPORAN BULANAN (chart 12-bulan + laba rugi + cetak)
// ══════════════════════════════════════════════════════════════

const ChartTooltip = ({ active, payload, label }) => {
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
          <span className="font-bold text-slate-700">{fmtRp(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

function LabaRugiCard({ data }) {
  const omset            = data?.ringkasan?.omset       ?? 0;
  const labaKotor        = data?.ringkasan?.labaKotor   ?? 0;
  const hpp              = omset - labaKotor;
  const pemasukanLain    = data?.ringkasan?.pemasukan   ?? 0;
  const totalPendapatan  = omset + pemasukanLain;
  const bebanOperasional = data?.ringkasan?.pengeluaran ?? 0;
  const labaBersih       = data?.ringkasan?.labaBersih  ?? 0;

  const Row = ({ label, value, bold, indent, big, negative, positive }) => (
    <div className={`flex items-center justify-between py-1.5 ${indent ? 'pl-6' : ''}`}
      style={{
        borderBottom: bold ? '1px solid rgba(255,255,255,0.15)' : 'none',
        borderTop:    bold ? '1px solid rgba(255,255,255,0.10)' : 'none',
      }}>
      <span style={{
        fontSize: big ? 13 : 12, fontWeight: bold ? 700 : 500,
        color: bold ? '#fff' : 'rgba(255,255,255,0.75)',
        textTransform: bold ? 'uppercase' : 'none',
        letterSpacing: bold ? '0.05em' : 'normal',
      }}>{label}</span>
      <span style={{
        fontSize: big ? 15 : 12,
        fontWeight: bold ? 800 : 600,
        color: negative ? '#F87171' : positive ? '#6EE7B7' : '#fff',
        fontVariantNumeric: 'tabular-nums',
      }}>{fmtRp(value)}</span>
    </div>
  );

  return (
    <GradientPanel>
      <div className="flex items-center gap-2 mb-3">
        <DollarSign size={14} style={{ color: '#AFA9EC' }} />
        <h4 className="font-bold text-sm" style={{ color: '#fff' }}>Laporan Laba Rugi</h4>
      </div>
      <div className="space-y-0.5">
        <Row label="Pendapatan"        value={omset}            bold />
        <Row label="Penjualan"         value={omset}            indent />
        <Row label="Pendapatan Lain"   value={pemasukanLain}    indent />
        <Row label="Total Pendapatan"  value={totalPendapatan}  bold positive />
        <Row label="HPP"               value={hpp}              negative />
        <Row label="Laba Kotor"        value={labaKotor}        bold
          positive={labaKotor >= 0} negative={labaKotor < 0} />
        <Row label="Beban Operasional" value={bebanOperasional} negative />
        <Row label="Laba Bersih"       value={labaBersih}       bold big
          positive={labaBersih >= 0} negative={labaBersih < 0} />
      </div>
    </GradientPanel>
  );
}

function TrendChart({ monthly }) {
  const rows = MONTH_SHORT.map((label, i) => {
    // backend bisa pakai bulan 1-indexed atau 0-indexed / month field
    const m = monthly?.find?.(x =>
      (x.bulan === i + 1) || (x.month === i + 1) || (x.bulan === i) || (x.month === i)
    );
    return {
      label,
      omset: m?.omset ?? m?.penjualan ?? 0,
      laba:  m?.laba  ?? m?.labaBersih ?? m?.netProfit ?? 0,
    };
  });
  const empty = rows.every(r => r.omset === 0 && r.laba === 0);

  return (
    <GradientPanel style={{ padding: 20 }}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-sm" style={{ color: '#fff' }}>Trend 12 Bulan</h4>
        <BarChart3 size={14} style={{ color: '#AFA9EC' }} />
      </div>
      {empty ? (
        <div className="h-[220px] flex items-center justify-center">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>Belum ada data untuk tahun ini</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.65)' }}
              axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.65)' }}
              axisLine={false} tickLine={false} tickFormatter={fmtCompact} />
            <Tooltip content={<ChartTooltip />} />
            <Legend iconType="circle" iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 4, color: 'rgba(255,255,255,0.85)' }} />
            <Line type="monotone" dataKey="omset" name="Omset"
              stroke="#93C5FD" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }}
              isAnimationActive={false} />
            <Line type="monotone" dataKey="laba" name="Laba Bersih"
              stroke="#6EE7B7" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }}
              isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </GradientPanel>
  );
}

function TabLaporanBulanan({ user, activeCabangs, data, loading, year, setYear, cabangId, setCabangId, reload }) {
  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return [now, now - 1, now - 2, now - 3];
  }, []);

  const cabangLabel = cabangId
    ? (activeCabangs.find(s => s.cabang?._id === cabangId)?.cabang?.nama || 'Cabang terpilih')
    : 'Semua Cabang';

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

  const monthly = data?.months ?? [];

  return (
    <div className="owner-report-root">
      {/* Print-only header */}
      <div className="print-only" style={{ display: 'none' }}>
        <h1>Laporan Bulanan {year}</h1>
        <p>Cabang: {cabangLabel} · Dicetak: {new Date().toLocaleString('id-ID')}</p>
      </div>

      {/* Header: pilih tahun + cabang + refresh + cetak */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap report-hide-print">
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Ringkasan omset, laba, dan trend bulanan
        </p>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ ...controlBase, cursor: 'pointer' }}>
            {years.map(y => (
              <option key={y} value={y} style={{ color: '#1e293b' }}>{y}</option>
            ))}
          </select>
          <CabangDropdown value={cabangId} onChange={setCabangId} cabangs={activeCabangs} />
          <RefreshBtn onClick={reload} disabled={loading} />
          <button type="button" onClick={handlePrintLaporan} title="Cetak Laporan"
            style={{
              padding: '7px 12px', borderRadius: 10,
              background: '#7F77DD',
              border: '0.5px solid rgba(255,255,255,0.15)',
              color: '#fff', display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
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
      ) : (
        <div className="space-y-4">
          <TrendChart monthly={monthly} />
          <LabaRugiCard data={data} />
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// TAB 4 — RITEL vs GROSIR (breakdownMode dari monthly report)
// ══════════════════════════════════════════════════════════════

function ModeCard({ label, color, omset, laba, jumlahTx, share }) {
  return (
    <GradientPanel>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div style={{
            width: 10, height: 10, borderRadius: '50%', background: color,
            boxShadow: `0 0 12px ${color}`,
          }} />
          <h4 className="font-bold text-sm" style={{ color: '#fff' }}>{label}</h4>
        </div>
        <span style={{
          padding: '2px 8px', borderRadius: 999,
          fontSize: 11, fontWeight: 700, color,
          background: `${color}22`, border: `0.5px solid ${color}55`,
        }}>{share.toFixed(1)}%</span>
      </div>
      <div className="space-y-3">
        <div>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', color, margin: 0, textTransform: 'uppercase' }}>Omset</p>
          <p className="break-all" style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: '2px 0 0', lineHeight: 1.15 }}>
            {fmtRp(omset)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] uppercase font-semibold" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.05em' }}>Laba</p>
            <p className="text-sm font-bold" style={{ color: '#fff' }}>{fmtRp(laba)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-semibold" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.05em' }}>Transaksi</p>
            <p className="text-sm font-bold" style={{ color: '#fff' }}>{jumlahTx} tx</p>
          </div>
        </div>
      </div>
    </GradientPanel>
  );
}

function ProportionBar({ ritelShare, grosirShare }) {
  return (
    <GradientPanel>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-sm" style={{ color: '#fff' }}>Proporsi Omset</h4>
        <PieChart size={14} style={{ color: '#AFA9EC' }} />
      </div>
      <div className="h-4 rounded-full overflow-hidden flex" style={{
        background: 'rgba(255,255,255,0.06)',
        border: '0.5px solid rgba(255,255,255,0.10)',
      }}>
        {ritelShare > 0 && (
          <div style={{
            width: `${ritelShare}%`, background: '#93C5FD',
            transition: 'width 0.3s',
          }} title={`Ritel ${ritelShare.toFixed(1)}%`} />
        )}
        {grosirShare > 0 && (
          <div style={{
            width: `${grosirShare}%`, background: '#FCD34D',
            transition: 'width 0.3s',
          }} title={`Grosir ${grosirShare.toFixed(1)}%`} />
        )}
      </div>
      <div className="flex items-center justify-between mt-2 text-xs">
        <div className="flex items-center gap-1.5">
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#93C5FD' }} />
          <span style={{ color: 'rgba(255,255,255,0.75)' }}>Ritel {ritelShare.toFixed(1)}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ color: 'rgba(255,255,255,0.75)' }}>Grosir {grosirShare.toFixed(1)}%</span>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FCD34D' }} />
        </div>
      </div>
    </GradientPanel>
  );
}

function TabRitelGrosir({ data, loading, year, month, setMonth, reload }) {
  // Extract dari breakdownMode (defensif — bisa object atau array)
  const bm = data?.breakdownMode ?? {};
  let ritel  = bm.ritel  ?? bm.retail ?? null;
  let grosir = bm.grosir ?? bm.wholesale ?? null;
  if (!ritel && Array.isArray(bm)) {
    ritel  = bm.find(x => /ritel|retail/i.test(x.mode || x.name || ''));
    grosir = bm.find(x => /grosir|wholesale/i.test(x.mode || x.name || ''));
  }
  ritel  = ritel  || { omset: 0, laba: 0, jumlahTx: 0 };
  grosir = grosir || { omset: 0, laba: 0, jumlahTx: 0 };

  const ritelOmset  = ritel.omset  ?? ritel.total  ?? 0;
  const grosirOmset = grosir.omset ?? grosir.total ?? 0;
  const totalOmset  = ritelOmset + grosirOmset;
  const ritelShare  = totalOmset > 0 ? (ritelOmset / totalOmset) * 100 : 0;
  const grosirShare = totalOmset > 0 ? (grosirOmset / totalOmset) * 100 : 0;

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Perbandingan penjualan ritel vs grosir · {MONTH_FULL[month - 1]} {year}
        </p>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            style={{ ...controlBase, cursor: 'pointer' }} title="Pilih bulan">
            {MONTH_FULL.map((n, i) => (
              <option key={i + 1} value={i + 1} style={{ color: '#1e293b' }}>{n}</option>
            ))}
          </select>
          <RefreshBtn onClick={reload} disabled={loading} />
        </div>
      </div>

      {loading ? (
        <GradientPanel style={{ padding: 40 }}>
          <div className="flex justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-white/40 border-t-transparent rounded-full" />
          </div>
        </GradientPanel>
      ) : totalOmset === 0 ? (
        <GradientPanel style={{ padding: 40 }}>
          <div className="text-center">
            <PieChart size={28} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.25)' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Belum ada data ritel/grosir untuk periode ini
            </p>
          </div>
        </GradientPanel>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ModeCard label="Ritel" color="#93C5FD"
              omset={ritelOmset} laba={ritel.laba ?? 0}
              jumlahTx={ritel.jumlahTx ?? ritel.count ?? 0}
              share={ritelShare} />
            <ModeCard label="Grosir" color="#FCD34D"
              omset={grosirOmset} laba={grosir.laba ?? 0}
              jumlahTx={grosir.jumlahTx ?? grosir.count ?? 0}
              share={grosirShare} />
          </div>
          <ProportionBar ritelShare={ritelShare} grosirShare={grosirShare} />
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════

export default function OwnerLaporanPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('closing');
  const [activeCabangs, setActiveCabangs] = useState([]);

  // Shared: year & cabang (dipakai kedua tab).
  // Bulanan: tahunan (tanpa month). RitelGrosir: per-bulan.
  const now = new Date();
  const [reportYear, setReportYear]     = useState(now.getFullYear());
  const [reportCabang, setReportCabang] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const [monthlyData, setMonthlyData]   = useState(null);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const [ritelGrosirData, setRitelGrosirData]       = useState(null);
  const [ritelGrosirLoading, setRitelGrosirLoading] = useState(false);

  const loadCabangs = useCallback(async () => {
    try {
      const { data: res } = await api.get('/owner/dashboard');
      const cabs = res.data?.subscriptions?.filter(s => ['aktif','gratis'].includes(s.status)) || [];
      setActiveCabangs(cabs);
    } catch { /* silent */ }
  }, []);

  const loadMonthly = useCallback(async () => {
    setMonthlyLoading(true);
    try {
      const params = { year: reportYear };
      if (reportCabang) params.cabang = reportCabang;
      const r = await ownerAPI.getMonthlyReport(params);
      setMonthlyData(r.data?.data ?? r.data ?? null);
    } catch {
      toast.error('Gagal memuat laporan bulanan');
      setMonthlyData(null);
    } finally { setMonthlyLoading(false); }
  }, [reportYear, reportCabang]);

  const loadRitelGrosir = useCallback(async () => {
    setRitelGrosirLoading(true);
    try {
      const params = { year: reportYear, month: selectedMonth };
      if (reportCabang) params.cabang = reportCabang;
      const r = await ownerAPI.getMonthlyReport(params);
      setRitelGrosirData(r.data?.data ?? r.data ?? null);
    } catch {
      toast.error('Gagal memuat data ritel vs grosir');
      setRitelGrosirData(null);
    } finally { setRitelGrosirLoading(false); }
  }, [reportYear, reportCabang, selectedMonth]);

  useEffect(() => { if (user) loadCabangs(); }, [user, loadCabangs]);

  // Fetch hanya saat tab-nya aktif → hemat call & hindari fetch di tab Closing/Pembelian.
  useEffect(() => {
    if (!user) return;
    if (activeTab === 'bulanan')          loadMonthly();
    else if (activeTab === 'ritelGrosir') loadRitelGrosir();
  }, [user, activeTab, loadMonthly, loadRitelGrosir]);

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto pb-24 lg:pb-6">
      <TabBar activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'closing'   && <TabRiwayatClosing   user={user} activeCabangs={activeCabangs} />}
      {activeTab === 'pembelian' && <TabRiwayatPembelian user={user} activeCabangs={activeCabangs} />}
      {activeTab === 'bulanan'   && (
        <TabLaporanBulanan
          user={user} activeCabangs={activeCabangs}
          data={monthlyData} loading={monthlyLoading}
          year={reportYear} setYear={setReportYear}
          cabangId={reportCabang} setCabangId={setReportCabang}
          reload={loadMonthly}
        />
      )}
      {activeTab === 'ritelGrosir' && (
        <TabRitelGrosir
          data={ritelGrosirData} loading={ritelGrosirLoading}
          year={reportYear}
          month={selectedMonth} setMonth={setSelectedMonth}
          reload={loadRitelGrosir}
        />
      )}
    </div>
  );
}

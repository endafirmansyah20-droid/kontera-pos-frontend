import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { dashboardAPI, cabangAPI, transactionAPI } from '../services/api';
import { formatRupiah, formatNumber } from '../utils/helpers';
import { Loader, EmptyState } from '../components/UI';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp, TrendingDown, ShoppingCart,
  AlertTriangle, DollarSign, RefreshCw, Building2,
  BarChart2, Users, BarChart3,
  Target, Edit2, Sparkles, ArrowUpRight,
  Calendar, Clock, Star, CreditCard
} from 'lucide-react';
import api from '../services/api';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';
import toast from 'react-hot-toast';

const R = (v) => formatRupiah(v || 0);
const PALETTE = ['#6366f1','#22c55e','#f59e0b','#ec4899','#14b8a6','#f97316','#8b5cf6'];

// ── Soft Tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur border border-slate-100 rounded-2xl shadow-xl p-3.5 text-xs min-w-[150px]">
      <p className="font-bold text-slate-500 mb-2 pb-1.5 border-b border-slate-50">{label}</p>
      {payload.map((p,i) => (
        <div key={i} className="flex justify-between gap-4 mt-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{background: p.color}} />
            <span className="text-slate-500">{p.name}</span>
          </div>
          <span className="font-bold text-slate-700">
            {['Tx','Transaksi'].includes(p.name) ? p.value : R(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Soft StatCard ─────────────────────────────────────────────────────────
function SoftStatCard({ title, value, subtitle, icon: Icon, gradient, iconBg, iconColor }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 ${gradient}`}>
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 bg-white" />
      <div className="absolute -bottom-6 -left-3 w-16 h-16 rounded-full opacity-10 bg-white" />
      <div className="relative">
        <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${iconBg} mb-3`}>
          <Icon size={17} className={iconColor} />
        </div>
        <p className="text-xs font-medium opacity-70 mb-1 text-white">{title}</p>
        <p className="text-lg sm:text-xl font-black text-white leading-tight break-all">{value}</p>
        {subtitle && <p className="text-xs opacity-60 mt-1 text-white truncate">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, icon: Icon, iconColor = 'text-slate-500', action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
            <Icon size={15} className={iconColor} />
          </div>
        )}
        <div>
          <h3 className="font-bold text-slate-700 text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ── SuperAdmin Dashboard (Platform) ───────────────────────────────────────
function SuperAdminDashboard({ subscriptions, cabangList, loading, onRefresh }) {
  const navigate = useNavigate();
  const now      = new Date();
  const inSeven  = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

  const subByCabang = React.useMemo(() => {
    const m = new Map();
    subscriptions.forEach(s => { if (s.cabang?._id) m.set(String(s.cabang._id), s); });
    return m;
  }, [subscriptions]);

  const totalClientAktif = subscriptions.filter(s => s.status === 'aktif' || s.status === 'gratis').length;
  const revenuePlatform  = subscriptions
    .filter(s => s.status === 'aktif')
    .reduce((t, s) => t + (s.harga || 30000), 0);
  const expiringSoon = subscriptions
    .filter(s => s.status === 'aktif' && s.expiredAt &&
      new Date(s.expiredAt) >= now && new Date(s.expiredAt) <= inSeven)
    .sort((a, b) => new Date(a.expiredAt) - new Date(b.expiredAt));
  const totalCabang = cabangList.length;

  const growthData = React.useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString('id-ID', { month: 'short' }) + (i === 5 || d.getMonth() === 0 ? ` ${String(d.getFullYear()).slice(-2)}` : ''),
        baru: 0,
      });
    }
    cabangList.forEach(c => {
      if (!c.createdAt) return;
      const d = new Date(c.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const item = months.find(m => m.key === key);
      if (item) item.baru++;
    });
    return months;
  }, [cabangList]);

  const latestClients = React.useMemo(() =>
    [...cabangList]
      .filter(c => c.createdAt)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5),
    [cabangList]
  );

  const fmtDate = d => d
    ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    : '-';

  return (
    <div className="animate-fade-in-up pb-24 lg:pb-0">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-amber-500 font-bold mb-0.5">⭐ DASHBOARD PLATFORM</p>
          <h1 className="text-xl font-black text-slate-800">Ringkasan SuperAdmin</h1>
          <p className="text-sm text-slate-400 mt-0.5">Monitor pertumbuhan & subscription seluruh client</p>
        </div>
        <button onClick={onRefresh} disabled={loading}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-200 px-3 py-2 rounded-xl transition-all">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <SoftStatCard title="Client Aktif" value={`${totalClientAktif}`} subtitle="Aktif + Gratis"
          icon={Users} gradient="bg-gradient-to-br from-blue-400 to-blue-600"
          iconBg="bg-white/20" iconColor="text-white" />
        <SoftStatCard title="Revenue Aktif" value={R(revenuePlatform)} subtitle="MRR bulan ini"
          icon={CreditCard} gradient="bg-gradient-to-br from-emerald-400 to-emerald-600"
          iconBg="bg-white/20" iconColor="text-white" />
        <SoftStatCard title="Akan Expired" value={`${expiringSoon.length}`} subtitle="≤ 7 hari ke depan"
          icon={Clock}
          gradient={`bg-gradient-to-br ${expiringSoon.length > 0 ? 'from-orange-400 to-red-500' : 'from-slate-400 to-slate-500'}`}
          iconBg="bg-white/20" iconColor="text-white" />
        <SoftStatCard title="Total Cabang" value={`${totalCabang}`} subtitle="Cabang terdaftar"
          icon={Building2} gradient="bg-gradient-to-br from-violet-400 to-purple-600"
          iconBg="bg-white/20" iconColor="text-white" />
      </div>

      {/* Grid: Growth (2/3) + Expiring (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        {/* Growth Chart */}
        <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl border border-slate-100 p-5 lg:col-span-2">
          <SectionHeader title="Pertumbuhan Client" subtitle="6 bulan terakhir"
            icon={ArrowUpRight} iconColor="text-blue-500" />
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={growthData} margin={{top:5,right:10,left:0,bottom:0}}>
              <defs>
                <linearGradient id="gGrowth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="baru" name="Cabang Baru"
                stroke="#3b82f6" strokeWidth={2.5} fill="url(#gGrowth)"
                dot={{r:4, fill:'#3b82f6'}} activeDot={{r:5}} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Expiring Soon */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <SectionHeader title="Akan Expired" subtitle="≤ 7 hari ke depan"
            icon={Clock} iconColor="text-orange-500"
            action={expiringSoon.length > 0 && (
              <span className="text-xs font-bold bg-orange-100 text-orange-600 px-2.5 py-1 rounded-lg">
                {expiringSoon.length}
              </span>
            )} />
          {expiringSoon.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-2xl mb-1">✅</p>
              <p className="text-sm text-slate-400">Tidak ada yang segera expired</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {expiringSoon.map(sub => {
                const days = Math.max(0, Math.ceil((new Date(sub.expiredAt) - now) / (1000 * 3600 * 24)));
                const urgency = days <= 1 ? 'bg-red-100 text-red-600'
                  : days <= 3 ? 'bg-orange-100 text-orange-600'
                  : 'bg-amber-100 text-amber-700';
                return (
                  <div key={sub._id} className="flex items-center justify-between gap-2 p-3 bg-gradient-to-r from-orange-50/60 to-amber-50/30 rounded-xl">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-700 truncate">{sub.cabang?.nama || '-'}</p>
                      <p className="text-xs text-slate-400 truncate">
                        @{sub.owner?.username || '-'} · {fmtDate(sub.expiredAt)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${urgency}`}>
                        {days === 0 ? 'Hari ini' : `${days}h lagi`}
                      </span>
                      <button onClick={() => navigate('/subscriptions')}
                        className="text-xs font-bold text-white bg-primary-600 hover:bg-primary-500 px-2.5 py-1 rounded-lg transition">
                        Konfirmasi
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 5 Client Terbaru */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50">
          <SectionHeader title="Client Terbaru" subtitle="5 pendaftaran terakhir"
            icon={Sparkles} iconColor="text-amber-500"
            action={
              <button onClick={() => navigate('/client')}
                className="text-xs font-semibold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition">
                Lihat Semua →
              </button>
            } />
        </div>
        {latestClients.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">Belum ada client terdaftar</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {latestClients.map(c => {
              const sub = subByCabang.get(String(c._id));
              const badgeClass = !sub ? 'bg-slate-100 text-slate-500'
                : sub.status === 'aktif'    ? 'bg-blue-100 text-blue-600'
                : sub.status === 'gratis'   ? 'bg-green-100 text-green-600'
                : sub.status === 'nonaktif' ? 'bg-red-100 text-red-600'
                : 'bg-amber-100 text-amber-700';
              const badgeLabel = !sub ? '—'
                : sub.status === 'nonaktif' ? 'Belum Bayar'
                : sub.status?.toUpperCase();
              return (
                <div key={c._id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-700 text-sm truncate">{c.nama}</p>
                    <p className="text-xs text-slate-400">
                      <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 mr-1.5">{c.kode}</code>
                      Daftar {fmtDate(c.createdAt)}
                    </p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 ${badgeClass}`}>
                    {badgeLabel}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Target Omset Widget ───────────────────────────────────────────────────
function TargetOmsetWidget() {
  const { isAdmin } = useAuth();
  const [target, setTarget]     = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    try { const r = await api.get('/dashboard/target-omset'); setTarget(r.data.data); }
    catch { /* silent */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const val = parseInt(inputVal.replace(/\D/g, '')) || 0;
    if (!val) return toast.error('Masukkan nominal target terlebih dahulu');
    setSaving(true);
    try {
      await api.post('/dashboard/target-omset', { targetOmset: val });
      toast.success('Target omset disimpan!');
      setShowEdit(false); setInputVal('');
      setTarget(null); await load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menyimpan target'); }
    finally { setSaving(false); }
  };

  if (!target) return <div className="bg-white rounded-2xl border border-slate-100 h-24 animate-pulse mb-5" />;

  const { targetOmset, omsetBulanIni, persentase, sisaHari, bulan } = target;
  const pct = persentase || 0;
  const barColor = pct>=100?'#22c55e':pct>=70?'#3b82f6':pct>=40?'#f59e0b':'#ef4444';
  const barGradient = pct>=100?'from-emerald-400 to-emerald-500':pct>=70?'from-blue-400 to-blue-500':pct>=40?'from-amber-400 to-amber-500':'from-red-400 to-red-500';

  return (
    <>
      <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
              <Target size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-slate-700 text-sm">Target Omset</p>
              <p className="text-xs text-slate-400">{bulan} · {sisaHari} hari lagi</p>
            </div>
          </div>
          {isAdmin && (
            <button onClick={() => { setInputVal(targetOmset?.toString()||''); setShowEdit(true); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-xl transition-all">
              <Edit2 size={12} /> {targetOmset>0?'Ubah':'Set Target'}
            </button>
          )}
        </div>

        {targetOmset > 0 ? (
          <>
            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="text-2xl font-black text-slate-800">{R(omsetBulanIni)}</p>
                <p className="text-xs text-slate-400 mt-0.5">dari target {R(targetOmset)}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black" style={{color:barColor}}>{pct}%</p>
                <p className="text-xs text-slate-400">tercapai</p>
              </div>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full bg-gradient-to-r ${barGradient} transition-all duration-1000`}
                style={{width:`${Math.min(pct,100)}%`}} />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {pct>=100 ? '🎉 Target bulan ini tercapai!' : `Kurang ${R(targetOmset-omsetBulanIni)} lagi`}
            </p>
          </>
        ) : (
          <div className="text-center py-3">
            <p className="text-sm text-slate-400 mb-2">Belum ada target omset yang ditetapkan</p>
            {isAdmin && (
              <button onClick={()=>setShowEdit(true)} className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-xl transition-all">
                <Target size={12} /> Set Target Sekarang
              </button>
            )}
          </div>
        )}
      </div>

      {showEdit && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="font-bold text-slate-800 mb-1">Set Target Omset</h3>
            <p className="text-xs text-slate-400 mb-4">Target omset untuk {bulan}</p>
            <div className="mb-4">
              <label className="label">Nominal Target (Rp)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">Rp</span>
                <input className="input pl-10" inputMode="numeric" placeholder="0"
                  value={inputVal ? new Intl.NumberFormat('id-ID').format(parseInt(inputVal.replace(/\D/g,'')||'0')) : ''}
                  onChange={e => setInputVal(e.target.value.replace(/\D/g,''))} autoFocus />
              </div>
              <p className="text-xs text-slate-400 mt-1">Contoh: 10.000.000 untuk target Rp 10 juta</p>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-outline flex-1" onClick={()=>setShowEdit(false)}>Batal</button>
              <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── Normal Dashboard ──────────────────────────────────────────────────────
function NormalDashboard({ data, onRefresh, loading }) {
  const now = new Date();
  const [chartRange, setChartRange] = React.useState(7);
  const [chartData, setChartData] = React.useState(null);
  const [chartLoading, setChartLoading] = React.useState(false);
  const [kategoriStats, setKategoriStats]     = React.useState(null);
  const [periodeKategori, setPeriodeKategori] = React.useState('hari');
  const [loadingKategori, setLoadingKategori] = React.useState(false);

  React.useEffect(() => {
    setLoadingKategori(true);
    // FIXED: pakai api instance (axios) bukan native fetch, supaya baseURL & token otomatis
    api.get(`/dashboard/kategori-stats?periode=${periodeKategori}`)
      .then(r => setKategoriStats(r.data?.data || null))
      .catch(() => setKategoriStats(null))
      .finally(() => setLoadingKategori(false));
  }, [periodeKategori]);

  React.useEffect(() => {
    setChartLoading(true);
    // FIXED: pakai api instance (axios) bukan native fetch
    api.get(`/dashboard/chart-data?range=${chartRange}`)
      .then(r => setChartData(r.data?.data || null))
      .catch(() => {})
      .finally(() => setChartLoading(false));
  }, [chartRange]);

  const displayChartData = chartData || data?.chartData || [];

  const navigate = useNavigate();
  const { isAdmin, isOwner } = useAuth();
  const [anomaly, setAnomaly] = useState(null);
  useEffect(() => {
    if (!isAdmin && !isOwner) return;
    transactionAPI.getAnomalyCount().then(r => setAnomaly(r.data)).catch(() => {});
  }, [isAdmin, isOwner]);
  const jam = now.getHours();
  const greeting = jam < 11 ? '☀️ Selamat Pagi' : jam < 15 ? '🌤 Selamat Siang' : jam < 18 ? '🌅 Selamat Sore' : '🌙 Selamat Malam';

  return (
    <div className="animate-fade-in-up pb-24 lg:pb-0">
      {/* Widget Anomali Transaksi */}
      {anomaly?.count > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle size={16} className="text-red-500" />
              </div>
              <div>
                <p className="font-bold text-red-700 text-sm">⚠️ {anomaly.count} Transaksi Profit Minus Hari Ini</p>
                <p className="text-xs text-red-500">Perlu diperiksa oleh admin</p>
              </div>
            </div>
            <button onClick={() => navigate('/transaksi', { state: { tab: 'riwayat', profitMinus: true } })}
              className="btn btn-danger py-1.5 px-3 text-xs">
              Lihat Semua
            </button>
          </div>
          <div className="space-y-1.5">
            {anomaly.data?.slice(0,3).map(tx => (
              <div key={tx._id} className="flex items-center justify-between bg-white rounded-xl px-3 py-2 text-xs">
                <div>
                  <span className="font-bold text-slate-700">{tx.invoiceNumber}</span>
                  <span className="text-slate-400 ml-2">{tx.items?.[0]?.name || '-'}</span>
                </div>
                <span className="font-bold text-red-600">{formatRupiah(tx.totalProfit)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs text-slate-400 font-medium mb-0.5">{greeting}</p>
          <h1 className="text-xl font-black text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {now.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </p>
        </div>
        <button onClick={onRefresh} disabled={loading}
          className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-200 px-3 py-2 rounded-xl transition-all">
          <RefreshCw size={13} className={loading?'animate-spin':''} /> Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        <SoftStatCard title="Omset Hari Ini"  value={R(data?.today?.revenue)}
          subtitle={`${data?.today?.transactions||0} transaksi`}
          icon={DollarSign} gradient="bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600"
          iconBg="bg-white/20" iconColor="text-white" />
        <SoftStatCard title="Laba Hari Ini"   value={R(data?.today?.profit)}
          subtitle="Setelah modal"
          icon={TrendingUp} gradient="bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600"
          iconBg="bg-white/20" iconColor="text-white" />
        <SoftStatCard title="Pengeluaran"     value={R(data?.today?.expense)}
          subtitle="Kas keluar hari ini"
          icon={TrendingDown} gradient="bg-gradient-to-br from-rose-400 via-rose-500 to-red-600"
          iconBg="bg-white/20" iconColor="text-white" />
        <SoftStatCard title="Omset Bulan Ini" value={R(data?.month?.revenue)}
          subtitle={`${data?.month?.transactions||0} transaksi`}
          icon={ShoppingCart} gradient="bg-gradient-to-br from-violet-400 via-violet-500 to-purple-600"
          iconBg="bg-white/20" iconColor="text-white" />
      </div>

      {/* Target */}
      <TargetOmsetWidget />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-2xl border border-slate-100 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <SectionHeader title={`Grafik Penjualan ${chartRange === 7 ? "7 Hari" : "1 Bulan"}`} subtitle="Pemasukan & Laba harian" icon={BarChart2} iconColor="text-blue-500" />
            <div className="flex gap-1">
              {[7, 30].map(r => (
                <button key={r} onClick={() => setChartRange(r)}
                  className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all ${
                    chartRange === r ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                  {r === 7 ? "7 Hari" : "1 Bulan"}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={displayChartData} margin={{top:5,right:10,left:0,bottom:0}}>
              <defs>
                <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{fontSize:11}} />
              <Area type="monotone" dataKey="revenue" name="Pemasukan" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gR)" dot={false} activeDot={{r:4}} />
              <Area type="monotone" dataKey="profit"  name="Laba"      stroke="#22c55e" strokeWidth={2.5} fill="url(#gP)" dot={false} activeDot={{r:4}} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-gradient-to-br from-slate-50 to-violet-50/30 rounded-2xl border border-slate-100 p-5">
          <SectionHeader title="Jumlah Transaksi" subtitle={`${chartRange} hari terakhir`} icon={BarChart3} iconColor="text-violet-500" />
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={displayChartData} margin={{top:5,right:5,left:0,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="date" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Transaksi" fill="#8b5cf6" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Produk Terlaris */}
      {data?.topProductsToday?.length > 0 && (() => {
        const MEDALS = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣'];
        const fisikList   = data.topProductsToday.filter(p => p.type === 'fisik');
        const digitalList = data.topProductsToday.filter(p => p.type === 'digital' || p.type === 'jasa');

        const renderList = (list, barColor, barFrom, barTo) => {
          if (!list.length) return (
            <div className="text-center py-4 text-slate-400 text-xs">Tidak ada transaksi</div>
          );
          const maxQty = list[0]?.totalQty || 1;
          return (
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1 -mr-1">
              {list.map((p, i) => {
                const barW = Math.round((p.totalQty / maxQty) * 100);
                return (
                  <div key={p._id} className="flex items-center gap-3">
                    <span className="text-lg w-7 text-center shrink-0">{MEDALS[i]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-semibold text-slate-700 truncate">{p.productName}</p>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${barColor}`}>{p.totalQty}x</span>
                          <span className="text-xs text-slate-500 hidden sm:inline">{R(p.totalOmset)}</span>
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-lg">+{R(p.totalLaba)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full bg-gradient-to-r ${barFrom} ${barTo} transition-all duration-700`}
                          style={{width:`${barW}%`}} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        };

        return (
          <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/30 rounded-2xl border border-amber-100/60 p-5 mb-5">
            <SectionHeader title="Produk Terlaris Bulan Ini" subtitle="Berdasarkan jumlah terjual" icon={Sparkles} iconColor="text-amber-500" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-1">
              {/* Produk Fisik */}
              <div className="bg-white/70 rounded-xl p-4 border border-blue-100/60">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">📦</span>
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">Produk Fisik</p>
                  <span className="ml-auto text-xs font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-lg">{fisikList.length} produk</span>
                </div>
                {renderList(fisikList, 'text-blue-600 bg-blue-100', 'from-blue-400', 'to-blue-500')}
              </div>
              {/* Produk Digital */}
              <div className="bg-white/70 rounded-xl p-4 border border-purple-100/60">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">⚡</span>
                  <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">Produk Digital</p>
                  <span className="ml-auto text-xs font-bold bg-purple-100 text-purple-600 px-2 py-0.5 rounded-lg">{digitalList.length} produk</span>
                </div>
                {renderList(digitalList, 'text-purple-600 bg-purple-100', 'from-purple-400', 'to-purple-500')}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Widget Performa per Kategori */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-700 flex items-center gap-2"><span>📊</span> Performa per Kategori</h3>
            <p className="text-xs text-slate-400 mt-0.5">Omset, laba & transaksi per jenis produk</p>
          </div>
          <div className="flex gap-1">
            {[['hari','Hari Ini'],['minggu','Minggu Ini'],['bulan','Bulan Ini']].map(([val,label]) => (
              <button key={val}
                onClick={() => setPeriodeKategori(val)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  periodeKategori === val
                    ? 'bg-fuchsia-600 text-white'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}>{label}</button>
            ))}
          </div>
        </div>
        {loadingKategori ? (
          <div className="flex items-center justify-center h-48"><div className="animate-spin w-6 h-6 border-2 border-fuchsia-500 border-t-transparent rounded-full"/></div>
        ) : kategoriStats ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { key:'fisik',   label:'Fisik',   icon:'📦', gradient:'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600' },
              { key:'digital', label:'Digital', icon:'⚡', gradient:'bg-gradient-to-br from-violet-400 via-purple-500 to-purple-600' },
              { key:'jasa',    label:'Jasa',    icon:'🛠️', gradient:'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600' },
            ].map(k => {
              const s = kategoriStats[k.key] || { omset:0, laba:0, transaksi:0 };
              return (
                <div key={k.key} className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 ${k.gradient}`}>
                  <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 bg-white" />
                  <div className="absolute -bottom-6 -left-3 w-16 h-16 rounded-full opacity-10 bg-white" />
                  <div className="relative">
                    <div className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white/20 mb-3 text-lg">
                      {k.icon}
                    </div>
                    <p className="text-xs font-medium opacity-70 mb-2 text-white">{k.label}</p>
                    <div className="space-y-1.5">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-white/60 font-semibold">Omset</p>
                        <p className="text-base sm:text-lg font-black text-white leading-tight break-all">{R(s.omset)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-white/60 font-semibold">Laba</p>
                        <p className="text-sm sm:text-base font-bold text-white leading-tight break-all">{R(s.laba)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-white/60 font-semibold">Transaksi</p>
                        <p className="text-sm sm:text-base font-bold text-white leading-tight">{formatNumber(s.transaksi)} tx</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <div className="text-center text-slate-400 text-sm py-12">Tidak ada data</div>}
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {/* Stok Menipis */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <SectionHeader title="Stok Menipis" icon={AlertTriangle} iconColor="text-orange-500"
            action={data?.products?.lowStock>0 && (
              <span className="text-xs font-bold bg-red-100 text-red-600 px-2.5 py-1 rounded-lg">{data.products.lowStock} produk</span>
            )} />
          {data?.lowStockProducts?.length>0
            ? <div className="space-y-2">
                {data.lowStockProducts.map(p=>(
                  <div key={p._id} className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50/60 to-amber-50/30 rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.code}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${p.stock===0?'bg-red-100 text-red-600':'bg-amber-100 text-amber-700'}`}>
                        {p.stock===0?'Habis':p.stock+' pcs'}
                      </span>
                      <p className="text-xs text-slate-400 mt-0.5">min. {p.minStock}</p>
                    </div>
                  </div>
                ))}
              </div>
            : <div className="text-center py-6">
                <p className="text-2xl mb-1">✅</p>
                <p className="text-sm text-slate-400">Semua stok aman</p>
              </div>
          }
        </div>

        {/* Ringkasan Bulan */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <SectionHeader title="Ringkasan Bulan Ini" icon={Calendar} iconColor="text-blue-500" />
          <div className="space-y-2.5">
            {[
              {label:'Total Penjualan',  value:R(data?.month?.revenue),                         gradient:'from-blue-50 to-indigo-50', color:'text-blue-600'},
              {label:'Total Laba',       value:R(data?.month?.profit),                           gradient:'from-emerald-50 to-teal-50', color:'text-emerald-600'},
              {label:'Jumlah Transaksi', value:`${formatNumber(data?.month?.transactions)} tx`,  gradient:'from-violet-50 to-purple-50', color:'text-violet-600'},
              {label:'Total Produk',     value:`${formatNumber(data?.products?.total)} produk`,  gradient:'from-amber-50 to-orange-50', color:'text-amber-600'},
            ].map(item=>(
              <div key={item.label} className={`flex items-center justify-between p-3 bg-gradient-to-r ${item.gradient} rounded-xl`}>
                <p className="text-sm text-slate-600">{item.label}</p>
                <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Karyawan */}
      {data?.employeeStats?.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <SectionHeader title="Kinerja Hari Ini" icon={Clock} iconColor="text-blue-500" />
            {data?.employeeToday?.length>0
              ? <div className="space-y-3">
                  {data.employeeToday.map((e,i)=>(
                    <div key={e._id} className="flex items-center gap-3">
                      <span className="text-lg">{['🥇','🥈','🥉'][i]||`${i+1}`}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-slate-700 text-sm truncate">{e._id||'Unknown'}</p>
                          <div className="text-right shrink-0 ml-2">
                            <span className="font-bold text-blue-600 text-sm">{e.totalTx} tx</span>
                            <span className="text-xs text-slate-400 ml-1.5">{R(e.totalOmset)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all"
                            style={{width:`${data.employeeToday[0].totalOmset>0?(e.totalOmset/data.employeeToday[0].totalOmset)*100:0}%`}} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              : <div className="text-center py-6"><p className="text-sm text-slate-400">Belum ada transaksi hari ini</p></div>
            }
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <SectionHeader title="Ranking Bulan Ini" icon={Star} iconColor="text-amber-400" />
            <div className="space-y-3">
              {data.employeeStats.map((e,i)=>{
                const maxOmset = data.employeeStats[0]?.totalOmset||1;
                return (
                  <div key={e._id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                          i===0?'bg-amber-400 text-white':i===1?'bg-slate-300 text-slate-700':i===2?'bg-amber-700 text-white':'bg-slate-100 text-slate-500'
                        }`}>{i+1}</span>
                        <span className="font-semibold text-slate-700 text-sm">{e._id||'Unknown'}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-700 text-sm">{e.totalTx} tx</span>
                        <span className="text-xs text-slate-400 ml-1.5">{R(e.totalOmset)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-purple-500 transition-all"
                        style={{width:`${(e.totalOmset/maxOmset)*100}%`}} />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                      <span>Laba: {R(e.totalLaba)}</span>
                      <span>{e.totalItems} item</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { isSuperAdmin } = useAuth();
  const [data, setData]                 = useState(null);
  const [cabangList, setCabangList]     = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading]           = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (isSuperAdmin) {
        const [cab, subs] = await Promise.all([
          cabangAPI.getAll(),
          api.get('/owner/subscriptions'),
        ]);
        setCabangList(cab.data.data || []);
        setSubscriptions(subs.data.data || []);
      } else {
        const r = await dashboardAPI.get();
        setData(r.data.data);
      }
    } catch {}
    finally { setLoading(false); }
  }, [isSuperAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <Loader />;
  if (isSuperAdmin) return (
    <SuperAdminDashboard
      subscriptions={subscriptions}
      cabangList={cabangList}
      loading={loading}
      onRefresh={loadData}
    />
  );
  return <NormalDashboard data={data} onRefresh={loadData} loading={loading} />;
}

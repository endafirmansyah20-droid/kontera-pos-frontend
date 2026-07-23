import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Building2, Users, CheckCircle,
  DollarSign, TrendingUp, ShoppingCart,
  BarChart3, Package, Globe,
  Banknote, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { formatRupiah } from '../utils/helpers';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';

const fmtRp   = v => formatRupiah(v || 0);
const PALETTE = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316'];
const PERIODS = [['harian','Hari Ini'],['mingguan','7 Hari'],['bulanan','Bulan Ini']];

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
function MetricCard({ label, value, sub, icon: Icon, accent = 'violet', sparkline }) {
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

const ACTIVITY_TYPE_META = {
  penjualan:   { icon: ShoppingCart, bg: '#EEEDFE', color: '#7C3AED' },
  pembelian:   { icon: Package,      bg: '#FDF6EA', color: '#D97706' },
  tarik_tunai: { icon: Banknote,     bg: '#D1FAE5', color: '#059669' },
};
const getActivityMeta = (type) =>
  ACTIVITY_TYPE_META[type] || { icon: Activity, bg: '#F1F5F9', color: '#64748B' };

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
        <p className="text-sm font-semibold text-slate-700 truncate">
          {item.invoiceNumber || item.cabang?.nama || '—'}
        </p>
        <p className="text-xs text-slate-400 truncate mt-0.5">
          {item.cashierName || '—'} · {item.cabang?.nama || '—'}
        </p>
      </div>
      <div className="text-right shrink-0 ml-2">
        <div className="flex items-center gap-1.5 justify-end">
          <p className={`text-sm font-bold ${item.isVoid ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
            {fmtRp(item.total)}
          </p>
          {item.isVoid && (
            <span className="badge badge-red text-[10px] px-1.5 py-0.5">VOID</span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{formatRelativeTime(item.transactionDate)}</p>
      </div>
    </div>
  );
}

function RecentActivity({ items, loading }) {
  const list = Array.isArray(items) ? items.slice(0, 10) : [];
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
        <h4 className="font-bold text-slate-700 text-sm tracking-tight">Aktivitas Terbaru</h4>
        <a href="#" onClick={(e) => e.preventDefault()}
          className="text-xs font-semibold text-violet-600 hover:text-violet-700">
          Lihat semua
        </a>
      </div>
      {loading ? (
        <div className="p-8 flex justify-center">
          <div className="animate-spin w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full" />
        </div>
      ) : list.length === 0 ? (
        <div className="p-8 text-center">
          <Activity size={28} className="text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Belum ada aktivitas</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-50">
          {list.map(item => <ActivityRow key={item._id} item={item} />)}
        </div>
      )}
    </div>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────────
function DashToko({ cabangList, period, recentActivity, loadingActivity }) {
  const totalOmset = cabangList.reduce((t,c)=>t+(c[period]?.omset||0),0);
  const totalTx    = cabangList.reduce((t,c)=>t+(c[period]?.count||0),0);
  const totalLaba  = cabangList.reduce((t,c)=>t+(c[period]?.laba||0),0);
  const totalAset  = cabangList.reduce((t,c)=>t+(c.kasTunai||0)+(c.brankas||0)+(c.saldoDigital||0),0);

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
            icon={DollarSign}  accent="violet"
            sparkline={sparklineGabungan.map(d => d.omset)} />
          <MetricCard label="Total Laba"  value={fmtRp(totalLaba)}  sub="Semua cabang"
            icon={TrendingUp}  accent="amber"
            sparkline={sparklineGabungan.map(d => d.laba)} />
          <MetricCard label="Transaksi"   value={`${totalTx} tx`}   sub="Semua cabang"
            icon={ShoppingCart} accent="violet"
            sparkline={sparklineGabungan.map(d => d.jumlahTx)} />
          <MetricCard label="Total Aset"  value={fmtRp(totalAset)}  sub="Kas + brankas"
            icon={Package}     accent="amber" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {[
          {title:'Omset per Cabang', key:'omset', cardBg:'linear-gradient(135deg, #F7F6FE 0%, #EEEDFE 100%)', ic:'#7F77DD'},
          {title:'Laba per Cabang',  key:'laba',  cardBg:'linear-gradient(135deg, #FDF6EA 0%, #FAEEDA 100%)', ic:'#EFA027'},
        ].map(({title,key,cardBg,ic})=>(
          <div key={key} className="rounded-2xl p-5" style={{background: cardBg}}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-700 text-sm tracking-tight">{title}</h4>
              <BarChart3 size={14} style={{color: ic}} />
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={cabangList.map(c=>({nama:c.kode||c.nama,[key]:c[period]?.[key]||0}))} margin={{top:4,right:4,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="nama" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}
                  tickFormatter={v=>v>=1e6?`${(v/1e6).toFixed(1)}jt`:v>=1e3?`${(v/1e3).toFixed(0)}k`:v} />
                <Tooltip content={<CustomTooltip />} cursor={{fill:'rgba(100,116,139,0.05)',radius:8}} />
                <Bar dataKey={key} name={key==='omset'?'Omset':'Laba'} radius={[8,8,0,0]} maxBarSize={56}>
                  {cabangList.map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      <RecentActivity items={recentActivity} loading={loadingActivity} />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-700 text-sm">Ringkasan per Cabang</h4>
            <p className="text-xs text-slate-400">{cabangList.length} cabang</p>
          </div>
          <Globe size={14} className="text-slate-300" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50/80">
              {['Cabang','Transaksi','Omset','Laba','Aset'].map(h=>(
                <th key={h} className={`py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide ${h==='Cabang'?'text-left px-5':'text-right px-4'}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-slate-50">
              {cabangList.map((c,i)=>(
                <tr key={c._id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{background:PALETTE[i%PALETTE.length]}} />
                      <span className="font-semibold text-slate-700 text-sm">{c.nama}</span>
                      <code className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">{c.kode}</code>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                      style={{color:PALETTE[i%PALETTE.length],background:PALETTE[i%PALETTE.length]+'18'}}>
                      {c[period]?.count||0} tx
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-700 text-sm">{fmtRp(c[period]?.omset)}</td>
                  <td className="py-3.5 px-4 text-right font-semibold text-emerald-600 text-sm">{fmtRp(c[period]?.laba)}</td>
                  <td className="py-3.5 px-4 text-right text-slate-400 text-sm">{fmtRp((c.kasTunai||0)+(c.brankas||0)+(c.saldoDigital||0))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="bg-slate-50/80 border-t-2 border-slate-100">
              <td className="py-3.5 px-5 font-black text-slate-600 text-sm">TOTAL</td>
              <td className="py-3.5 px-4 text-right font-black text-slate-700 text-sm">{totalTx} tx</td>
              <td className="py-3.5 px-4 text-right font-black text-slate-800 text-sm">{fmtRp(totalOmset)}</td>
              <td className="py-3.5 px-4 text-right font-black text-emerald-700 text-sm">{fmtRp(totalLaba)}</td>
              <td className="py-3.5 px-4 text-right font-black text-slate-700 text-sm">{fmtRp(totalAset)}</td>
            </tr></tfoot>
          </table>
        </div>
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
        boxShadow: '0 10px 28px -8px rgba(38,33,92,0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
      }}>
        <p style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.15em',
          color: 'rgba(255,255,255,0.7)', margin: 0,
        }}>SELAMAT DATANG</p>
        <p style={{
          fontSize: 20, fontWeight: 500, lineHeight: 1.2,
          color: '#fff', margin: '4px 0 0',
        }}>{data?.owner?.name || '—'}</p>

        <div style={{ display: 'flex', alignItems: 'stretch', marginTop: 20 }}>
          {[
            { label: 'TOTAL CABANG', value: data?.totalCabang ?? 0 },
            { label: 'CABANG AKTIF', value: activeCabangs.length },
            { label: 'TOTAL USER',   value: users.length },
          ].map((s, i) => (
            <div key={s.label} style={{
              flex: 1, textAlign: 'center', padding: '0 8px',
              borderLeft: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.2)',
            }}>
              <p style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
                color: 'rgba(255,255,255,0.65)', margin: 0,
              }}>{s.label}</p>
              <p style={{
                fontSize: 20, fontWeight: 700, lineHeight: 1.2,
                color: '#fff', margin: '4px 0 0',
              }}>{s.value}</p>
            </div>
          ))}
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

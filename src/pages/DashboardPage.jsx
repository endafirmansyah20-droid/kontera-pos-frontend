import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { dashboardAPI, cabangAPI, transactionAPI } from '../services/api';
import { formatRupiah, formatNumber } from '../utils/helpers';
import { Loader, EmptyState } from '../components/UI';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  TrendingUp, TrendingDown, ShoppingCart, Package,
  AlertTriangle, DollarSign, RefreshCw, Building2,
  Wallet, BarChart2, Store, Wrench, Users, BarChart3,
  Target, Edit2, CheckCircle2, Sparkles, ArrowUpRight,
  Calendar, Clock, Star
} from 'lucide-react';
import api from '../services/api';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell
} from 'recharts';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

const R = (v) => formatRupiah(v || 0);
const PALETTE = ['#6366f1','#22c55e','#f59e0b','#ec4899','#14b8a6','#f97316','#8b5cf6'];
const PERIODS = [['harian','Hari Ini'],['mingguan','7 Hari'],['bulanan','Bulan Ini']];

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

// ── Period Selector ───────────────────────────────────────────────────────
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

// ── Dashboard Toko ────────────────────────────────────────────────────────
function DashToko({ cabangList, period }) {
  const totalOmset = cabangList.reduce((t,c)=>t+(c[period]?.omset||0),0);
  const totalTx    = cabangList.reduce((t,c)=>t+(c[period]?.count||0),0);
  const totalLaba  = cabangList.reduce((t,c)=>t+(c[period]?.laba||0),0);
  const totalAset  = cabangList.reduce((t,c)=>t+(c.kasTunai||0)+(c.brankas||0)+(c.saldoDigital||0),0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SoftStatCard label="Total Omset" title="Total Omset" value={R(totalOmset)} subtitle="Semua cabang"
          icon={DollarSign} gradient="bg-gradient-to-br from-blue-400 to-blue-600"
          iconBg="bg-white/20" iconColor="text-white" />
        <SoftStatCard title="Total Laba" value={R(totalLaba)} subtitle="Semua cabang"
          icon={TrendingUp} gradient="bg-gradient-to-br from-emerald-400 to-emerald-600"
          iconBg="bg-white/20" iconColor="text-white" />
        <SoftStatCard title="Transaksi" value={`${totalTx} tx`} subtitle="Semua cabang"
          icon={ShoppingCart} gradient="bg-gradient-to-br from-violet-400 to-violet-600"
          iconBg="bg-white/20" iconColor="text-white" />
        <SoftStatCard title="Total Aset" value={R(totalAset)} subtitle="Kas + brankas"
          icon={Wallet} gradient="bg-gradient-to-br from-amber-400 to-orange-500"
          iconBg="bg-white/20" iconColor="text-white" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {[
          { title: 'Omset per Cabang', key: 'omset', color: 'from-blue-50 to-indigo-50', palette: PALETTE },
          { title: 'Laba per Cabang',  key: 'laba',  color: 'from-emerald-50 to-teal-50', palette: [...PALETTE].reverse() },
        ].map(({ title, key, color, palette }) => (
          <div key={key} className={`bg-gradient-to-br ${color} rounded-2xl p-5 border border-white`}>
            <SectionHeader title={title} icon={BarChart3} iconColor="text-slate-400" />
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={cabangList.map(c=>({nama:c.kode||c.nama, [key]:c[period]?.[key]||0}))} margin={{top:4,right:4,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="nama" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}
                  tickFormatter={v=>v>=1e6?`${(v/1e6).toFixed(1)}jt`:v>=1e3?`${(v/1e3).toFixed(0)}k`:v} />
                <Tooltip content={<CustomTooltip />} cursor={{fill:'rgba(100,116,139,0.06)',radius:8}} />
                <Bar dataKey={key} name={key === 'omset' ? 'Omset' : 'Laba'} radius={[8,8,0,0]} maxBarSize={56}>
                  {cabangList.map((_,i)=><Cell key={i} fill={palette[i%palette.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50">
          <SectionHeader title="Ringkasan per Cabang" subtitle={`${cabangList.length} cabang`} icon={Building2} iconColor="text-slate-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gradient-to-r from-slate-50 to-white">
              {['Cabang','Transaksi','Omset','Laba','Aset'].map(h=>(
                <th key={h} className={`py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide ${h==='Cabang'?'text-left px-5':'text-right px-4'}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-slate-50/80">
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
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{color:PALETTE[i%PALETTE.length], background:PALETTE[i%PALETTE.length]+'18'}}>{c[period]?.count||0} tx</span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-700 text-sm">{R(c[period]?.omset)}</td>
                  <td className="py-3.5 px-4 text-right font-semibold text-emerald-600 text-sm">{R(c[period]?.laba)}</td>
                  <td className="py-3.5 px-4 text-right text-slate-400 text-sm">{R((c.kasTunai||0)+(c.brankas||0)+(c.saldoDigital||0))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="bg-gradient-to-r from-slate-50 to-white border-t-2 border-slate-100">
              <td className="py-3.5 px-5 font-black text-slate-600 text-sm">TOTAL</td>
              <td className="py-3.5 px-4 text-right font-black text-slate-700 text-sm">{totalTx} tx</td>
              <td className="py-3.5 px-4 text-right font-black text-slate-800 text-sm">{R(totalOmset)}</td>
              <td className="py-3.5 px-4 text-right font-black text-emerald-700 text-sm">{R(totalLaba)}</td>
              <td className="py-3.5 px-4 text-right font-black text-slate-700 text-sm">{R(totalAset)}</td>
            </tr></tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard Penjualan ───────────────────────────────────────────────────
function DashPenjualan({ cabangList, period }) {
  const rows = cabangList.map(c => ({
    nama: c.nama, kode: c.kode,
    tx: c[period]?.count||0, omset: c[period]?.omset||0, laba: c[period]?.laba||0,
    margin: c[period]?.omset ? Math.round((c[period]?.laba/c[period]?.omset)*100) : 0,
  })).sort((a,b) => b.omset - a.omset);
  const maxOmset = Math.max(...rows.map(r=>r.omset), 1);
  const stats = [
    {label:'Total Omset', value:R(rows.reduce((t,r)=>t+r.omset,0)), gradient:'from-blue-400 to-blue-600', icon:DollarSign},
    {label:'Total Laba',  value:R(rows.reduce((t,r)=>t+r.laba,0)),  gradient:'from-emerald-400 to-emerald-600', icon:TrendingUp},
    {label:'Total Tx',    value:`${rows.reduce((t,r)=>t+r.tx,0)} tx`, gradient:'from-violet-400 to-violet-600', icon:ShoppingCart},
    {label:'Avg Margin',  value:`${rows.length?Math.round(rows.reduce((t,r)=>t+r.margin,0)/rows.length):0}%`, gradient:'from-amber-400 to-orange-500', icon:BarChart2},
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <SoftStatCard key={s.label} title={s.label} value={s.value}
            icon={s.icon} gradient={`bg-gradient-to-br ${s.gradient}`}
            iconBg="bg-white/20" iconColor="text-white" />
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50">
          <SectionHeader title="Ranking Penjualan" subtitle="Diurutkan dari omset tertinggi" icon={Star} iconColor="text-amber-400" />
        </div>
        <div className="divide-y divide-slate-50 p-5 space-y-5">
          {rows.map((r,i)=>(
            <div key={r.kode}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
                    style={{background:PALETTE[i%PALETTE.length]}}>
                    {i+1}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 text-sm">{r.nama}</span>
                    <span className="text-xs text-slate-400 ml-2">{r.tx} transaksi</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800 text-sm">{R(r.omset)}</p>
                  <p className="text-xs text-slate-400">Laba {R(r.laba)}</p>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{width:`${(r.omset/maxOmset)*100}%`, background:PALETTE[i%PALETTE.length]}} />
              </div>
              <div className="flex justify-end mt-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md"
                  style={{color:PALETTE[i%PALETTE.length], background:PALETTE[i%PALETTE.length]+'15'}}>
                  Margin {r.margin}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard Service HP ──────────────────────────────────────────────────
function DashService({ cabangList }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <SectionHeader title="Ringkasan Service per Cabang" icon={Wrench} iconColor="text-blue-500" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {cabangList.map((c,i)=>(
          <div key={c._id} className="bg-gradient-to-br from-slate-50 to-white border border-slate-100 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{background:PALETTE[i%PALETTE.length]}} />
              <p className="font-bold text-slate-700 text-sm">{c.nama}</p>
              <code className="text-xs text-slate-400 ml-auto">{c.kode}</code>
            </div>
            <p className="text-xs text-slate-400 text-center py-3">Data service cabang ini</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-4 text-center">
        💡 Detail service tersedia di halaman Service HP per cabang
      </p>
    </div>
  );
}

// ── Dashboard Karyawan ────────────────────────────────────────────────────
function DashKaryawan({ cabangList }) {
  const [empData, setEmpData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState('bulan');
  const MEDALS = ['🥇','🥈','🥉'];
  const COLORS = ['#6366f1','#22c55e','#f59e0b','#ec4899','#14b8a6'];

  useEffect(() => {
    cabangAPI.getEmployeeStats()
      .then(r => setEmpData(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {label:'Total Cabang',  val:cabangList.filter(c=>c.isActive).length,  gradient:'from-blue-400 to-blue-600',     icon:Building2,  suffix:'aktif'},
          {label:'Total Produk',  val:cabangList.reduce((t,c)=>t+(c.jumlahProduk||0),0), gradient:'from-emerald-400 to-emerald-600', icon:Package, suffix:'item'},
          {label:'Kas Tunai',     val:R(cabangList.reduce((t,c)=>t+(c.kasTunai||0),0)),  gradient:'from-amber-400 to-orange-500', icon:Wallet,  suffix:''},
          {label:'Total Brankas', val:R(cabangList.reduce((t,c)=>t+(c.brankas||0),0)),   gradient:'from-violet-400 to-violet-600', icon:BarChart2, suffix:''},
        ].map(s=>(
          <SoftStatCard key={s.label} title={s.label} value={s.val} subtitle={s.suffix}
            icon={s.icon} gradient={`bg-gradient-to-br ${s.gradient}`}
            iconBg="bg-white/20" iconColor="text-white" />
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
          <SectionHeader title="Kinerja Karyawan" subtitle="Per cabang" icon={Users} iconColor="text-blue-500" />
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {[['bulan','Bulan'],['hari','Hari']].map(([k,l])=>(
              <button key={k} onClick={()=>setPeriod(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${period===k?'bg-white text-slate-800 shadow-sm':'text-slate-500'}`}>{l}</button>
            ))}
          </div>
        </div>
        {loading
          ? <div className="p-12 flex justify-center"><div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"/></div>
          : <div className="grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-slate-50">
              {empData.map((cabang,ci)=>{
                const employees = period==='bulan' ? cabang.bulanIni : cabang.hariIni;
                const maxOmset  = employees[0]?.totalOmset || 1;
                return (
                  <div key={cabang._id} className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                        style={{background:COLORS[ci%COLORS.length]}}>{cabang.kode}</div>
                      <span className="font-bold text-slate-700 text-sm">{cabang.nama}</span>
                      <span className="text-xs text-slate-400 ml-auto">{employees.length} karyawan</span>
                    </div>
                    {employees.length===0
                      ? <p className="text-xs text-slate-400 text-center py-4">Belum ada transaksi {period==='hari'?'hari ini':'bulan ini'}</p>
                      : <div className="space-y-3">
                          {employees.map((e,i)=>(
                            <div key={e._id||i}>
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{MEDALS[i]||`${i+1}`}</span>
                                  <span className="font-semibold text-slate-700 text-sm">{e._id||'Unknown'}</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-sm" style={{color:COLORS[ci%COLORS.length]}}>{e.totalTx} tx</span>
                                  <span className="text-xs text-slate-400 ml-1.5">{R(e.totalOmset)}</span>
                                </div>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all"
                                  style={{width:`${(e.totalOmset/maxOmset)*100}%`, background:COLORS[ci%COLORS.length]}} />
                              </div>
                            </div>
                          ))}
                        </div>
                    }
                  </div>
                );
              })}
            </div>
        }
      </div>
    </div>
  );
}

// ── SuperAdmin Dashboard ──────────────────────────────────────────────────
function SuperAdminDashboard({ cabangList, loading, onRefresh }) {
  const [activeTab, setActiveTab] = useState('toko');
  const [period,    setPeriod]    = useState('harian');
  const TABS = [
    { key:'toko',      label:'Dashboard Toko',      icon:Store,    active:'bg-blue-500', inactive:'hover:bg-blue-50 text-blue-600' },
    { key:'penjualan', label:'Penjualan',            icon:BarChart3, active:'bg-emerald-500', inactive:'hover:bg-emerald-50 text-emerald-600' },
    { key:'service',   label:'Service HP',           icon:Wrench,   active:'bg-violet-500', inactive:'hover:bg-violet-50 text-violet-600' },
    { key:'karyawan',  label:'Karyawan',             icon:Users,    active:'bg-amber-500', inactive:'hover:bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">Monitor seluruh cabang secara real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSel value={period} onChange={setPeriod} />
          <button className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition" onClick={onRefresh} disabled={loading}>
            <RefreshCw size={14} className={`text-slate-500 ${loading?'animate-spin':''}`} />
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t.key} onClick={()=>setActiveTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab===t.key ? `${t.active} text-white shadow-md` : `bg-white border border-slate-200 ${t.inactive}`
            }`}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {activeTab==='toko'      && <DashToko      cabangList={cabangList} period={period} />}
      {activeTab==='penjualan' && <DashPenjualan cabangList={cabangList} period={period} />}
      {activeTab==='service'   && <DashService   cabangList={cabangList} />}
      {activeTab==='karyawan'  && <DashKaryawan  cabangList={cabangList} />}
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
    <div className="animate-fade-in-up">
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
        const MEDALS = ['🥇','🥈','🥉','4️⃣','5️⃣'];
        const fisikList   = data.topProductsToday.filter(p => p.type === 'fisik');
        const digitalList = data.topProductsToday.filter(p => p.type === 'digital' || p.type === 'jasa');

        const renderList = (list, barColor, barFrom, barTo) => {
          if (!list.length) return (
            <div className="text-center py-4 text-slate-400 text-xs">Tidak ada transaksi</div>
          );
          const maxQty = list[0]?.totalQty || 1;
          return (
            <div className="space-y-3">
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
            <SectionHeader title="Produk Terlaris Hari Ini" subtitle="Berdasarkan jumlah terjual" icon={Sparkles} iconColor="text-amber-500" />
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
        ) : kategoriStats ? (() => {
          const fmt = (n) => n >= 1000000 ? `${(n/1000000).toFixed(1)}jt` : n >= 1000 ? `${(n/1000).toFixed(0)}rb` : String(n);
          const chartData = [
            { name: 'Omset', Fisik: kategoriStats.fisik.omset, Digital: kategoriStats.digital.omset, Jasa: kategoriStats.jasa.omset },
            { name: 'Laba',  Fisik: kategoriStats.fisik.laba,  Digital: kategoriStats.digital.laba,  Jasa: kategoriStats.jasa.laba },
            { name: 'Transaksi', Fisik: kategoriStats.fisik.transaksi, Digital: kategoriStats.digital.transaksi, Jasa: kategoriStats.jasa.transaksi },
          ];
          const CustomLabel = ({ x, y, width, value }) => value > 0 ? (
            <text x={x + width/2} y={y - 4} fill='#374151' textAnchor='middle' fontSize={10} fontWeight={600}>
              {fmt(value)}
            </text>
          ) : null;
          return (
            <ResponsiveContainer width='100%' height={260}>
              <BarChart data={chartData} margin={{ top: 18, right: 10, left: 0, bottom: 0 }} barGap={3} barCategoryGap='25%'>
                <CartesianGrid strokeDasharray='3 3' stroke='#F3F4F6' />
                <XAxis dataKey='name' tick={{ fontSize: 12, fontWeight: 600, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmt} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} width={36} />
                <Tooltip formatter={(v, name) => [v >= 1000 ? R(v) : v, name]} labelStyle={{ fontWeight: 700 }} />
                <Legend iconType='circle' iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey='Fisik'   fill='#3B82F6' radius={[4,4,0,0]}><CustomLabel /></Bar>
                <Bar dataKey='Digital' fill='#A855F7' radius={[4,4,0,0]}><CustomLabel /></Bar>
                <Bar dataKey='Jasa'    fill='#10B981' radius={[4,4,0,0]}><CustomLabel /></Bar>
              </BarChart>
            </ResponsiveContainer>
          );
        })() : <div className="text-center text-slate-400 text-sm py-12">Tidak ada data</div>}
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
  const [data, setData]             = useState(null);
  const [cabangList, setCabangList] = useState([]);
  const [loading, setLoading]       = useState(true);
  const location = useLocation();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (isSuperAdmin) {
        const r = await cabangAPI.getSummary();
        setCabangList(r.data.data || []);
      } else {
        const r = await dashboardAPI.get();
        setData(r.data.data);
      }
    } catch {}
    finally { setLoading(false); }
  }, [isSuperAdmin]);

  useEffect(() => { loadData(); }, [loadData, location.key]);

  if (loading) return <Loader />;
  if (isSuperAdmin) return <SuperAdminDashboard cabangList={cabangList} loading={loading} onRefresh={loadData} />;
  return <NormalDashboard data={data} onRefresh={loadData} loading={loading} />;
}

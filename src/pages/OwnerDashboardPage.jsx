import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Building2, Users, CheckCircle, RefreshCw,
  DollarSign, TrendingUp, ShoppingCart,
  BarChart3, Package, Globe
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

// ── Metric Card ───────────────────────────────────────────────────
function MetricCard({ label, value, sub, icon: Icon, gradient }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-4 text-white ${gradient}`}>
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 bg-white" />
      <div className="absolute -bottom-5 -left-3 w-16 h-16 rounded-full opacity-10 bg-white" />
      <div className="relative z-10">
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mb-3">
          <Icon size={16} />
        </div>
        <p className="text-lg font-black leading-tight break-all">{value}</p>
        <p className="text-white/70 text-xs mt-0.5">{label}</p>
        {sub && <p className="text-white/50 text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────────
function DashToko({ cabangList, period }) {
  const totalOmset = cabangList.reduce((t,c)=>t+(c[period]?.omset||0),0);
  const totalTx    = cabangList.reduce((t,c)=>t+(c[period]?.count||0),0);
  const totalLaba  = cabangList.reduce((t,c)=>t+(c[period]?.laba||0),0);
  const totalAset  = cabangList.reduce((t,c)=>t+(c.kasTunai||0)+(c.brankas||0)+(c.saldoDigital||0),0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Total Omset" value={fmtRp(totalOmset)} sub="Semua cabang"
          icon={DollarSign} gradient="bg-gradient-to-br from-blue-400 to-blue-600" />
        <MetricCard label="Total Laba"  value={fmtRp(totalLaba)}  sub="Semua cabang"
          icon={TrendingUp} gradient="bg-gradient-to-br from-emerald-400 to-emerald-600" />
        <MetricCard label="Transaksi"   value={`${totalTx} tx`}   sub="Semua cabang"
          icon={ShoppingCart} gradient="bg-gradient-to-br from-violet-400 to-violet-600" />
        <MetricCard label="Total Aset"  value={fmtRp(totalAset)}  sub="Kas + brankas"
          icon={Package} gradient="bg-gradient-to-br from-amber-400 to-orange-500" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {[
          {title:'Omset per Cabang', key:'omset', bg:'from-blue-50/60 to-indigo-50/30', ic:'text-blue-400'},
          {title:'Laba per Cabang',  key:'laba',  bg:'from-emerald-50/60 to-teal-50/30', ic:'text-emerald-400'},
        ].map(({title,key,bg,ic})=>(
          <div key={key} className={`bg-gradient-to-br ${bg} rounded-2xl border border-slate-100 p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-700 text-sm">{title}</h4>
              <BarChart3 size={14} className={ic} />
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

  useEffect(() => {
    if (!user) return; // Tunggu user siap
    const t = setTimeout(() => { load(); loadUsers(); loadCabangSummary(); }, 300);
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

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-black text-slate-800">Dashboard Owner</h1>
          <p className="text-sm text-slate-400 mt-0.5">Halo, {data?.owner?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-400 hidden sm:block">
            {new Date().toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}
          </p>
          <button onClick={() => { load(); loadCabangSummary(); }}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition">
            <RefreshCw size={14} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* ── Mini Stats Strip ── */}
      <div className="flex gap-3 mb-5 overflow-x-auto pb-1">
        <MiniStat icon={Building2} label="Total Cabang" value={data?.totalCabang??0}   color="blue" />
        <MiniStat icon={CheckCircle} label="Cabang Aktif" value={activeCabangs.length} color="emerald" />
        <MiniStat icon={Users}    label="Total User"   value={users.length}             color="violet" />
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
        <DashToko cabangList={cabangList} period={period} />
      )}

    </div>
  );
}

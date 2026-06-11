import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Building2, Plus, CreditCard, Copy, Wrench, Users, CheckCircle,
  UserPlus, Eye, EyeOff, ToggleLeft, ToggleRight, RefreshCw,
  LayoutDashboard, BarChart2, DollarSign, TrendingUp, ShoppingCart,
  Store, BarChart3, AlertTriangle, Package, ChevronRight, ArrowUpRight,
  Activity, Globe, Settings, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { formatRupiah } from '../utils/helpers';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';

const REKENING = [
  { bank: 'BCA',     no: '1093049059',    nama: 'Enda Firmansyah' },
  { bank: 'Mandiri', no: '1250013988837', nama: 'Enda Firmansyah' },
  { bank: 'BRI',     no: '372701030137531', nama: 'Enda Firmansyah' },
];

// Tab operasional & manajemen dipisah
const TABS_OPERASIONAL = [
  { id: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { id: 'penjualan', label: 'Penjualan',  icon: BarChart3        },
  { id: 'karyawan',  label: 'Karyawan',   icon: BarChart2        },
  { id: 'service',   label: 'Service HP', icon: Wrench           },
];
const TABS_MANAJEMEN = [
  { id: 'cabang',   label: 'Cabang',   icon: Building2 },
  { id: 'pengguna', label: 'Pengguna', icon: Users     },
];

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

// ── Penjualan Tab ─────────────────────────────────────────────────
function DashPenjualan({ cabangList, period }) {
  const rows = cabangList.map(c => ({
    nama:c.nama, kode:c.kode,
    tx:c[period]?.count||0, omset:c[period]?.omset||0, laba:c[period]?.laba||0,
    margin:c[period]?.omset?Math.round((c[period]?.laba/c[period]?.omset)*100):0,
  })).sort((a,b)=>b.omset-a.omset);
  const maxOmset = Math.max(...rows.map(r=>r.omset),1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {label:'Total Omset', value:fmtRp(rows.reduce((t,r)=>t+r.omset,0)), gradient:'from-blue-400 to-blue-600', icon:DollarSign},
          {label:'Total Laba',  value:fmtRp(rows.reduce((t,r)=>t+r.laba,0)),  gradient:'from-emerald-400 to-emerald-600', icon:TrendingUp},
          {label:'Total Tx',    value:`${rows.reduce((t,r)=>t+r.tx,0)} tx`,   gradient:'from-violet-400 to-violet-600', icon:ShoppingCart},
          {label:'Rata Margin', value:`${rows.length?Math.round(rows.reduce((t,r)=>t+r.margin,0)/rows.length):0}%`, gradient:'from-amber-400 to-orange-500', icon:Activity},
        ].map(s=>(
          <MetricCard key={s.label} label={s.label} value={s.value}
            icon={s.icon} gradient={`bg-gradient-to-br ${s.gradient}`} />
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50">
          <h4 className="font-bold text-slate-700 text-sm">Ranking Penjualan</h4>
          <p className="text-xs text-slate-400">Diurutkan omset tertinggi</p>
        </div>
        <div className="p-5 space-y-5">
          {rows.map((r,i)=>(
            <div key={r.kode}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
                    style={{background:PALETTE[i%PALETTE.length]}}>{i+1}</div>
                  <div>
                    <span className="font-semibold text-slate-700 text-sm">{r.nama}</span>
                    <span className="text-xs text-slate-400 ml-2">{r.tx} tx</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-700 text-sm">{fmtRp(r.omset)}</p>
                  <p className="text-xs text-slate-400">Laba {fmtRp(r.laba)}</p>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{width:`${(r.omset/maxOmset)*100}%`,background:PALETTE[i%PALETTE.length]}} />
              </div>
              <div className="flex justify-end mt-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md"
                  style={{color:PALETTE[i%PALETTE.length],background:PALETTE[i%PALETTE.length]+'15'}}>
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

// ── Karyawan Tab ──────────────────────────────────────────────────
function TabKaryawan({ activeCabangs }) {
  const [stats, setStats]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [cabangId, setCabangId] = useState('');
  const MEDAL = ['🥇','🥈','🥉'];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/owner/employee-stats', { params: cabangId ? { cabang: cabangId } : {} });
      setStats(r.data.data || []);
    } catch { toast.error('Gagal memuat data karyawan'); }
    finally { setLoading(false); }
  }, [cabangId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <div>
          <h2 className="font-bold text-slate-800 text-sm">Performa Karyawan</h2>
          <p className="text-xs text-slate-400 mt-0.5">Bulan ini</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white text-slate-600"
            value={cabangId} onChange={e => setCabangId(e.target.value)}>
            <option value="">Semua Cabang</option>
            {activeCabangs.map(sub => (
              <option key={sub.cabang?._id} value={sub.cabang?._id}>{sub.cabang?.nama}</option>
            ))}
          </select>
          <button onClick={load} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
            <RefreshCw size={13} className="text-slate-500" />
          </button>
        </div>
      </div>
      {loading ? (
        <div className="p-12 flex justify-center"><div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"/></div>
      ) : stats.length === 0 ? (
        <div className="p-12 text-center"><Users size={32} className="text-slate-200 mx-auto mb-3"/><p className="text-slate-400 text-sm">Belum ada data bulan ini</p></div>
      ) : (
        <div className="divide-y divide-slate-50">
          {stats.map((emp,i) => (
            <div key={emp._id||i} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/60 transition">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${i<3?'text-xl':'text-white text-sm'}`}
                  style={i>=3?{background:PALETTE[i%PALETTE.length]}:{}}>
                  {i<3?MEDAL[i]:(emp._id?.[0]?.toUpperCase()||'?')}
                </div>
                <div>
                  <p className="font-semibold text-slate-700 text-sm">{emp._id||'Tidak diketahui'}</p>
                  <p className="text-xs text-slate-400">{emp.totalTx} tx · {emp.totalItems} item</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-emerald-600 text-sm">{fmtRp(emp.totalOmset)}</p>
                <p className="text-xs text-slate-400">Laba: {fmtRp(emp.totalLaba)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Service Tab ───────────────────────────────────────────────────
function TabService({ activeCabangs }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cabangId, setCabangId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/service/summary', { params: cabangId ? { cabang: cabangId } : {} });
      const d = r.data.data || null;
      if (d) {
        setSummary({
          totalUnit: d.jumlahTx||0,
          omsetBulanIni: d.omsetMurni||d.omset||0,
          labaBulanIni: d.labaBersih||0,
          antrian: (d.statusCount?.antrian||0)+(d.statusCount?.proses||0),
          byStatus: d.statusCount ? Object.entries(d.statusCount).map(([k,v])=>({_id:k,count:v})).filter(s=>s.count>0) : [],
        });
      } else { setSummary(null); }
    } catch { toast.error('Gagal memuat data service'); }
    finally { setLoading(false); }
  }, [cabangId]);

  useEffect(() => { load(); }, [load]);

  const STATUS_COLOR = { antrian:'bg-amber-100 text-amber-700', proses:'bg-blue-100 text-blue-700', selesai:'bg-emerald-100 text-emerald-700', batal:'bg-red-100 text-red-700', diambil:'bg-violet-100 text-violet-700' };
  const STATUS_LABEL = { antrian:'Antrian', proses:'Dikerjakan', selesai:'Selesai', batal:'Batal', diambil:'Diambil' };

  return (
    <div>
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <div>
          <h2 className="font-bold text-slate-800 text-sm">Dashboard Service HP</h2>
          <p className="text-xs text-slate-400 mt-0.5">Rekap service masuk</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white text-slate-600"
            value={cabangId} onChange={e => setCabangId(e.target.value)}>
            <option value="">Semua Cabang</option>
            {activeCabangs.map(sub=>(
              <option key={sub.cabang?._id} value={sub.cabang?._id}>{sub.cabang?.nama}</option>
            ))}
          </select>
          <button onClick={load} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
            <RefreshCw size={13} className="text-slate-500" />
          </button>
        </div>
      </div>
      {loading ? (
        <div className="p-12 flex justify-center"><div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"/></div>
      ) : !summary ? (
        <div className="p-12 text-center"><Wrench size={32} className="text-slate-200 mx-auto mb-3"/><p className="text-slate-400 text-sm">Belum ada data service</p></div>
      ) : (
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {label:'Total Unit',  val:summary.totalUnit,     gradient:'from-blue-400 to-blue-600',     icon:Package,       fmt:'num'},
              {label:'Omset',       val:summary.omsetBulanIni, gradient:'from-emerald-400 to-emerald-600', icon:DollarSign,   fmt:'rp'},
              {label:'Laba',        val:summary.labaBulanIni,  gradient:'from-violet-400 to-violet-600', icon:TrendingUp,    fmt:'rp'},
              {label:'Belum Selesai',val:summary.antrian,      gradient:'from-amber-400 to-orange-500',  icon:AlertTriangle, fmt:'num'},
            ].map(s=>(
              <MetricCard key={s.label} label={s.label}
                value={s.fmt==='rp'?fmtRp(s.val):s.val}
                icon={s.icon} gradient={`bg-gradient-to-br ${s.gradient}`} />
            ))}
          </div>
          {summary.byStatus?.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {summary.byStatus.map(s=>(
                <div key={s._id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${STATUS_COLOR[s._id]||'bg-slate-100 text-slate-600'}`}>
                    {STATUS_LABEL[s._id]||s._id}
                  </span>
                  <span className="font-black text-slate-700 text-lg">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export default function OwnerDashboardPage() {
  const { user } = useAuth();
  const [tab, setTab]               = useState('dashboard');
  const [data, setData]             = useState(null);
  const [cabangList, setCabangList] = useState([]);
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [period, setPeriod]         = useState('harian');
  const [showAdd, setShowAdd]       = useState(false);
  const [showPay, setShowPay]       = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showPw, setShowPw]         = useState(false);
  const [form, setForm]             = useState({ namaCabang:'', alamat:'', telepon:'' });
  const [userForm, setUserForm]     = useState({ name:'', username:'', password:'', role:'karyawan', cabangId:'' });
  const [saving, setSaving]         = useState(false);

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

  const handleTambahCabang = async () => {
    if (!form.namaCabang) return toast.error('Nama cabang wajib diisi');
    setSaving(true);
    try {
      const { data: res } = await api.post('/owner/tambah-cabang', form);
      toast.success('Cabang dibuat! Transfer untuk mengaktifkan.');
      setShowAdd(false); setForm({ namaCabang:'', alamat:'', telepon:'' });
      setShowPay(res.data); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  const handleTambahUser = async () => {
    if (!userForm.name || !userForm.username || !userForm.password || !userForm.cabangId)
      return toast.error('Semua field wajib diisi');
    setSaving(true);
    try {
      await api.post('/owner/users', userForm);
      toast.success('User berhasil ditambahkan!');
      setShowAddUser(false); setUserForm({ name:'', username:'', password:'', role:'karyawan', cabangId:'' });
      loadUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  const handleToggleUser = async (userId) => {
    try { const { data: res } = await api.patch('/owner/users/'+userId+'/toggle'); toast.success(res.message); loadUsers(); }
    catch { toast.error('Gagal'); }
  };

  const copyNo = (no) => { navigator.clipboard.writeText(no); toast.success('Disalin!'); };

  const statusBadge = (s) => {
    if (s==='gratis') return <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold">GRATIS</span>;
    if (s==='aktif')  return <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold">AKTIF</span>;
    return <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-bold">NONAKTIF</span>;
  };

  const activeCabangs = data?.subscriptions?.filter(s=>['aktif','gratis'].includes(s.status)) || [];
  const inputCls = "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition";

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">

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

      {/* ── Tab Navigation — 2 grup ── */}
      <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1">
        {/* Grup Operasional */}
        {TABS_OPERASIONAL.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              tab===id ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-200 hover:text-blue-600'
            }`}>
            <Icon size={13} />{label}
          </button>
        ))}

        {/* Divider visual */}
        <div className="w-px h-6 bg-slate-200 mx-1 shrink-0" />

        {/* Grup Manajemen */}
        {TABS_MANAJEMEN.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              tab===id ? 'bg-slate-700 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-400 hover:text-slate-700'
            }`}>
            <Icon size={13} />{label}
          </button>
        ))}
      </div>

      {/* ── Tab Dashboard ── */}
      {tab==='dashboard' && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-xs font-semibold text-slate-500">Data berdasarkan periode:</p>
            <div className="flex items-center gap-2">
              <PeriodSel value={period} onChange={setPeriod} />
            </div>
          </div>
          {cabangList.length===0
            ? <div className="bg-white rounded-2xl border border-slate-100 text-center py-16">
                <Building2 size={36} className="text-slate-200 mx-auto mb-3"/>
                <p className="text-slate-400">Belum ada data cabang</p>
              </div>
            : <DashToko cabangList={cabangList} period={period} />
          }
        </div>
      )}

      {/* ── Tab Penjualan ── */}
      {tab==='penjualan' && (
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-xs font-semibold text-slate-500">Data berdasarkan periode:</p>
            <PeriodSel value={period} onChange={setPeriod} />
          </div>
          <DashPenjualan cabangList={cabangList} period={period} />
        </div>
      )}

      {/* ── Tab Karyawan ── */}
      {tab==='karyawan' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <TabKaryawan activeCabangs={activeCabangs} />
        </div>
      )}

      {/* ── Tab Service HP ── */}
      {tab==='service' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <TabService activeCabangs={activeCabangs} />
        </div>
      )}

      {/* ── Tab Cabang ── */}
      {tab==='cabang' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Cabang Saya</h2>
              <p className="text-xs text-slate-400 mt-0.5">{data?.totalCabang}/{data?.maxCabang} slot digunakan</p>
            </div>
            {data?.sisaSlot>0 && (
              <button onClick={()=>setShowAdd(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition">
                <Plus size={13} /> Tambah Cabang
              </button>
            )}
          </div>
          <div className="divide-y divide-slate-50">
            {data?.subscriptions?.map(sub=>(
              <div key={sub._id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <Building2 size={18} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 text-sm">{sub.cabang?.nama}</p>
                    <p className="text-xs text-slate-400">Kode: {sub.cabang?.kode}</p>
                    {sub.expiredAt && <p className="text-xs text-slate-300">s/d: {new Date(sub.expiredAt).toLocaleDateString('id-ID')}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {statusBadge(sub.status)}
                  {sub.status==='nonaktif' && (
                    <button onClick={()=>setShowPay({cabang:sub.cabang})} className="text-xs text-blue-600 font-bold hover:underline">Bayar</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 bg-blue-50/60 border-t border-blue-100">
            <p className="text-xs text-blue-600 font-medium">✨ Cabang pertama GRATIS · Cabang ke-2 dst Rp 30.000/bulan</p>
          </div>
        </div>
      )}

      {/* ── Tab Pengguna ── */}
      {tab==='pengguna' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Pengguna</h2>
              <p className="text-xs text-slate-400 mt-0.5">{users.length} terdaftar</p>
            </div>
            <button onClick={()=>setShowAddUser(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition">
              <UserPlus size={13} /> Tambah User
            </button>
          </div>
          {users.length===0
            ? <div className="p-12 text-center"><Users size={32} className="text-slate-200 mx-auto mb-3"/><p className="text-slate-400 text-sm">Belum ada pengguna</p></div>
            : <div className="divide-y divide-slate-50">
                {users.map(u=>(
                  <div key={u._id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center font-black text-white text-sm">
                        {u.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700 text-sm">{u.name}</p>
                        <p className="text-xs text-slate-400">@{u.username} · {u.cabang?.nama}</p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md mt-0.5 inline-block ${u.role==='admin'?'bg-blue-100 text-blue-700':'bg-slate-100 text-slate-600'}`}>{u.role}</span>
                      </div>
                    </div>
                    <button onClick={()=>handleToggleUser(u._id)}
                      className={`p-2 rounded-xl transition ${u.isActive?'bg-emerald-100 text-emerald-600 hover:bg-emerald-200':'bg-red-100 text-red-500 hover:bg-red-200'}`}>
                      {u.isActive?<ToggleRight size={20}/>:<ToggleLeft size={20}/>}
                    </button>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* ── Modal Tambah Cabang ── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end lg:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-slate-800 mb-1">Tambah Cabang Baru</h3>
            <p className="text-xs text-slate-400 mb-4">Isi detail cabang yang akan ditambahkan</p>
            <div className="space-y-3">
              <input className={inputCls} placeholder="Nama Cabang *" value={form.namaCabang} onChange={e=>setForm(f=>({...f,namaCabang:e.target.value}))} />
              <input className={inputCls} placeholder="Alamat (opsional)" value={form.alamat} onChange={e=>setForm(f=>({...f,alamat:e.target.value}))} />
              <input className={inputCls} placeholder="Telepon (opsional)" value={form.telepon} onChange={e=>setForm(f=>({...f,telepon:e.target.value}))} />
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                <p className="text-amber-700 text-xs font-semibold">⚡ Biaya Rp 30.000/bulan — aktif setelah konfirmasi pembayaran</p>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={()=>setShowAdd(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
                <button onClick={handleTambahCabang} disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-70">
                  {saving?'Proses...':'Buat Cabang'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Tambah User ── */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end lg:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-slate-800 mb-1">Tambah Pengguna</h3>
            <p className="text-xs text-slate-400 mb-4">Buat akun baru untuk karyawan atau admin</p>
            <div className="space-y-3">
              <input className={inputCls} placeholder="Nama Lengkap *" value={userForm.name} onChange={e=>setUserForm(f=>({...f,name:e.target.value}))} />
              <input className={inputCls} placeholder="Username *" value={userForm.username} onChange={e=>setUserForm(f=>({...f,username:e.target.value.toLowerCase().replace(/\s/g,'')}))} />
              <div className="relative">
                <input type={showPw?'text':'password'} className={inputCls+' pr-10'} placeholder="Password *"
                  value={userForm.password} onChange={e=>setUserForm(f=>({...f,password:e.target.value}))} />
                <button type="button" onClick={()=>setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPw?<EyeOff size={16}/>:<Eye size={16}/>}
                </button>
              </div>
              <select className={inputCls+' bg-white'} value={userForm.role} onChange={e=>setUserForm(f=>({...f,role:e.target.value}))}>
                <option value="karyawan">Karyawan</option>
                <option value="admin">Admin</option>
              </select>
              <select className={inputCls+' bg-white'} value={userForm.cabangId} onChange={e=>setUserForm(f=>({...f,cabangId:e.target.value}))}>
                <option value="">Pilih Cabang *</option>
                {activeCabangs.map(sub=>(
                  <option key={sub.cabang?._id} value={sub.cabang?._id}>{sub.cabang?.nama}</option>
                ))}
              </select>
              <div className="flex gap-2 pt-1">
                <button onClick={()=>setShowAddUser(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
                <button onClick={handleTambahUser} disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-70">
                  {saving?'Proses...':'Tambah User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Pembayaran ── */}
      {showPay && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end lg:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CreditCard size={28} className="text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-800">Instruksi Pembayaran</h3>
              {showPay?.cabang?.nama && <p className="text-xs text-slate-400 mt-1">Untuk cabang: <strong>{showPay.cabang.nama}</strong></p>}
            </div>
            <div className="bg-gradient-to-r from-blue-500 to-blue-700 rounded-2xl p-4 text-center text-white mb-4">
              <p className="text-3xl font-black">Rp 30.000</p>
              <p className="text-blue-200 text-xs mt-0.5">untuk 1 bulan aktif</p>
            </div>
            <div className="space-y-2.5 mb-4">
              {REKENING.map(r=>(
                <div key={r.bank} className="flex items-center justify-between border border-slate-200 rounded-xl p-3.5">
                  <div>
                    <p className="font-bold text-slate-700 text-sm">{r.bank}</p>
                    <p className="text-lg font-mono font-black text-blue-600 tracking-wide">{r.no}</p>
                    <p className="text-xs text-slate-400">a.n. {r.nama}</p>
                  </div>
                  <button onClick={()=>copyNo(r.no)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
                    <Copy size={15} className="text-slate-500" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 text-center mb-4">Konfirmasi via WhatsApp. Aktif dalam 1x24 jam.</p>
            <button onClick={()=>setShowPay(null)} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition">
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

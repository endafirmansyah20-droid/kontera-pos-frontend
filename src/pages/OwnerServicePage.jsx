import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, Wrench, Package, DollarSign, TrendingUp, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatRupiah } from '../utils/helpers';

const fmtRp = v => formatRupiah(v || 0);

const STATUS_COLOR = {
  antrian: 'bg-amber-100 text-amber-700',
  proses:  'bg-blue-100 text-blue-700',
  selesai: 'bg-emerald-100 text-emerald-700',
  batal:   'bg-red-100 text-red-700',
  diambil: 'bg-violet-100 text-violet-700',
};
const STATUS_LABEL = {
  antrian: 'Antrian',
  proses:  'Dikerjakan',
  selesai: 'Selesai',
  batal:   'Batal',
  diambil: 'Diambil',
};

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

export default function OwnerServicePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeCabangs, setActiveCabangs] = useState([]);
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [cabangId, setCabangId] = useState('');

  const loadCabangs = useCallback(async () => {
    try {
      const { data: res } = await api.get('/owner/dashboard');
      const list = res.data?.subscriptions?.filter(s => ['aktif','gratis'].includes(s.status)) || [];
      setActiveCabangs(list);
    } catch {}
  }, []);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/service/summary', { params: cabangId ? { cabang: cabangId } : {} });
      const d = r.data.data || null;
      if (d) {
        setSummary({
          totalUnit: d.jumlahTx || 0,
          omsetBulanIni: d.omsetMurni || d.omset || 0,
          labaBulanIni: d.labaBersih || 0,
          antrian: (d.statusCount?.antrian || 0) + (d.statusCount?.proses || 0),
          byStatus: d.statusCount
            ? Object.entries(d.statusCount).map(([k, v]) => ({ _id: k, count: v })).filter(s => s.count > 0)
            : [],
        });
      } else { setSummary(null); }
    } catch { toast.error('Gagal memuat data service'); }
    finally { setLoading(false); }
  }, [cabangId]);

  useEffect(() => {
    if (!user) return;
    loadCabangs();
  }, [user, loadCabangs]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto pb-24 lg:pb-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/owner')}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shrink-0">
            <ArrowLeft size={16} className="text-slate-500" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-slate-800">Service HP</h1>
            <p className="text-sm text-slate-400 mt-0.5">Rekap service masuk</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs bg-white text-slate-600"
            value={cabangId} onChange={e => setCabangId(e.target.value)}>
            <option value="">Semua Cabang</option>
            {activeCabangs.map(sub => (
              <option key={sub.cabang?._id} value={sub.cabang?._id}>{sub.cabang?.nama}</option>
            ))}
          </select>
          <button onClick={loadSummary} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
            <RefreshCw size={13} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : !summary ? (
          <div className="p-12 text-center">
            <Wrench size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Belum ada data service</p>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Unit',    val: summary.totalUnit,     gradient: 'from-blue-400 to-blue-600',       icon: Package,        fmt: 'num' },
                { label: 'Omset',         val: summary.omsetBulanIni, gradient: 'from-emerald-400 to-emerald-600', icon: DollarSign,     fmt: 'rp'  },
                { label: 'Laba',          val: summary.labaBulanIni,  gradient: 'from-violet-400 to-violet-600',   icon: TrendingUp,     fmt: 'rp'  },
                { label: 'Belum Selesai', val: summary.antrian,       gradient: 'from-amber-400 to-orange-500',    icon: AlertTriangle,  fmt: 'num' },
              ].map(s => (
                <MetricCard key={s.label} label={s.label}
                  value={s.fmt === 'rp' ? fmtRp(s.val) : s.val}
                  icon={s.icon} gradient={`bg-gradient-to-br ${s.gradient}`} />
              ))}
            </div>
            {summary.byStatus?.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {summary.byStatus.map(s => (
                  <div key={s._id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${STATUS_COLOR[s._id] || 'bg-slate-100 text-slate-600'}`}>
                      {STATUS_LABEL[s._id] || s._id}
                    </span>
                    <span className="font-black text-slate-700 text-lg">{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

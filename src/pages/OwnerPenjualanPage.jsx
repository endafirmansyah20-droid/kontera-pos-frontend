import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, DollarSign, TrendingUp, ShoppingCart, Activity, BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatRupiah } from '../utils/helpers';

const PALETTE = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316'];
const PERIODS = [['harian','Hari Ini'],['mingguan','7 Hari'],['bulanan','Bulan Ini']];
const fmtRp   = v => formatRupiah(v || 0);

function PeriodSel({ value, onChange }) {
  return (
    <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
      {PERIODS.map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            value === k ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}>{l}</button>
      ))}
    </div>
  );
}

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

export default function OwnerPenjualanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cabangList, setCabangList] = useState([]);
  const [period, setPeriod]         = useState('harian');
  const [loading, setLoading]       = useState(true);

  const loadCabangSummary = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/owner/cabang-summary');
      setCabangList(r.data.data || []);
    } catch { toast.error('Gagal memuat data penjualan'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadCabangSummary();
  }, [user, loadCabangSummary]);

  const rows = cabangList.map(c => ({
    nama: c.nama, kode: c.kode,
    tx: c[period]?.count || 0,
    omset: c[period]?.omset || 0,
    laba: c[period]?.laba || 0,
    margin: c[period]?.omset ? Math.round((c[period]?.laba / c[period]?.omset) * 100) : 0,
  })).sort((a, b) => b.omset - a.omset);
  const maxOmset = Math.max(...rows.map(r => r.omset), 1);

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto pb-24 lg:pb-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/owner')}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shrink-0">
            <ArrowLeft size={16} className="text-slate-500" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-slate-800">Penjualan</h1>
            <p className="text-sm text-slate-400 mt-0.5">Ranking omset per cabang</p>
          </div>
        </div>
        <PeriodSel value={period} onChange={setPeriod} />
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 flex justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : cabangList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 text-center py-16">
          <BarChart3 size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">Belum ada data penjualan</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Omset', value: fmtRp(rows.reduce((t, r) => t + r.omset, 0)), gradient: 'from-blue-400 to-blue-600', icon: DollarSign },
              { label: 'Total Laba',  value: fmtRp(rows.reduce((t, r) => t + r.laba, 0)),  gradient: 'from-emerald-400 to-emerald-600', icon: TrendingUp },
              { label: 'Total Tx',    value: `${rows.reduce((t, r) => t + r.tx, 0)} tx`,   gradient: 'from-violet-400 to-violet-600', icon: ShoppingCart },
              { label: 'Rata Margin', value: `${rows.length ? Math.round(rows.reduce((t, r) => t + r.margin, 0) / rows.length) : 0}%`, gradient: 'from-amber-400 to-orange-500', icon: Activity },
            ].map(s => (
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
              {rows.map((r, i) => (
                <div key={r.kode}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
                        style={{ background: PALETTE[i % PALETTE.length] }}>{i + 1}</div>
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
                      style={{ width: `${(r.omset / maxOmset) * 100}%`, background: PALETTE[i % PALETTE.length] }} />
                  </div>
                  <div className="flex justify-end mt-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md"
                      style={{ color: PALETTE[i % PALETTE.length], background: PALETTE[i % PALETTE.length] + '15' }}>
                      Margin {r.margin}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

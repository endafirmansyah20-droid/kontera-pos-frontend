import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatRupiah } from '../utils/helpers';

const PALETTE = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316'];
const MEDAL   = ['🥇','🥈','🥉'];
const fmtRp   = v => formatRupiah(v || 0);

export default function OwnerKaryawanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeCabangs, setActiveCabangs] = useState([]);
  const [stats, setStats]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [cabangId, setCabangId] = useState('');

  const loadCabangs = useCallback(async () => {
    try {
      const { data: res } = await api.get('/owner/dashboard');
      const list = res.data?.subscriptions?.filter(s => ['aktif','gratis'].includes(s.status)) || [];
      setActiveCabangs(list);
    } catch {}
  }, []);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/owner/employee-stats', { params: cabangId ? { cabang: cabangId } : {} });
      setStats(r.data.data || []);
    } catch { toast.error('Gagal memuat data karyawan'); }
    finally { setLoading(false); }
  }, [cabangId]);

  useEffect(() => {
    if (!user) return;
    loadCabangs();
  }, [user, loadCabangs]);

  useEffect(() => { loadStats(); }, [loadStats]);

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
            <h1 className="text-xl font-black text-slate-800">Performa Karyawan</h1>
            <p className="text-sm text-slate-400 mt-0.5">Bulan ini</p>
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
          <button onClick={loadStats} className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
            <RefreshCw size={13} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* ── List ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center"><div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"/></div>
        ) : stats.length === 0 ? (
          <div className="p-12 text-center"><Users size={32} className="text-slate-200 mx-auto mb-3"/><p className="text-slate-400 text-sm">Belum ada data bulan ini</p></div>
        ) : (
          <div className="divide-y divide-slate-50">
            {stats.map((emp, i) => (
              <div key={emp._id || i} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/60 transition">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black ${i<3?'text-xl':'text-white text-sm'}`}
                    style={i>=3?{background:PALETTE[i%PALETTE.length]}:{}}>
                    {i<3 ? MEDAL[i] : (emp._id?.[0]?.toUpperCase() || '?')}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 text-sm">{emp._id || 'Tidak diketahui'}</p>
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
    </div>
  );
}

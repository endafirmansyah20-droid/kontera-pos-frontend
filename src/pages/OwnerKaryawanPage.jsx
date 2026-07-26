import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Users, Search, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatRupiah } from '../utils/helpers';

const HERO_GRADIENT = 'linear-gradient(120deg, #26215C 0%, #3C3489 50%, #7F77DD 100%)';

const AVATAR_COLORS = [
  { bg: 'rgba(127,119,221,0.25)', color: '#AFA9EC' }, // ungu
  { bg: 'rgba(251,146,60,0.22)',  color: '#FDBA74' }, // oranye
  { bg: 'rgba(59,130,246,0.22)',  color: '#93C5FD' }, // biru
  { bg: 'rgba(16,185,129,0.22)',  color: '#6EE7B7' }, // hijau
];

const PERIODS = [
  ['today', 'Hari Ini'],
  ['7',     '7 Hari'],
  ['30',    'Bulan Ini'],
];

const fmtRp = v => formatRupiah(v || 0);

const initialsOf = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

// Hash sederhana → index warna avatar (stabil per karyawan)
const hashIdx = (s = '', len = 1) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % len;
};

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

export default function OwnerKaryawanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeCabangs, setActiveCabangs] = useState([]);
  const [stats, setStats]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [cabangId, setCabangId] = useState('');
  const [range, setRange]     = useState('30');
  const [search, setSearch]   = useState('');

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
      const params = { range };
      if (cabangId) params.cabang = cabangId;
      const r = await api.get('/owner/employee-stats', { params });
      setStats(r.data.data || []);
    } catch { toast.error('Gagal memuat data karyawan'); }
    finally { setLoading(false); }
  }, [cabangId, range]);

  useEffect(() => {
    if (!user) return;
    loadCabangs();
  }, [user, loadCabangs]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const topId = stats[0]?.cashierId; // ranking dari data mentah, bukan hasil filter

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return stats;
    return stats.filter(e => (e.cashierName || '').toLowerCase().includes(q));
  }, [stats, search]);

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto pb-24 lg:pb-6">

      {/* ── Header: period + cabang + refresh ── */}
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
          <button type="button" onClick={loadStats} title="Muat ulang"
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

      {/* ── Search ── */}
      <div className="mb-4" style={{ position: 'relative' }}>
        <Search size={14} style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: 'rgba(255,255,255,0.5)', pointerEvents: 'none',
        }} />
        <input type="text" placeholder="Cari nama karyawan..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.08)',
            border: '0.5px solid rgba(255,255,255,0.15)',
            color: '#fff', borderRadius: 10,
            padding: '9px 12px 9px 34px', fontSize: 13,
            outline: 'none',
          }} />
      </div>

      {/* ── List (gradient wrapper) ── */}
      <div style={{
        background: HERO_GRADIENT, borderRadius: 12, padding: 16,
        boxShadow: '0 10px 28px -8px rgba(38,33,92,0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
      }}>
        {loading ? (
          <div className="p-10 flex justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-white/40 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Users size={32} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.25)' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {search ? 'Tidak ada karyawan cocok' : 'Belum ada data'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((emp) => {
              const isTop = emp.cashierId && emp.cashierId === topId;
              const av = AVATAR_COLORS[hashIdx(emp.cashierId || emp.cashierName || '', AVATAR_COLORS.length)];
              return (
                <div key={emp.cashierId}
                  onClick={() => navigate(`/owner/karyawan/${emp.cashierId}`, { state: { nama: emp.cashierName } })}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: isTop
                      ? '0.5px solid rgba(251,191,36,0.55)'
                      : '0.5px solid rgba(255,255,255,0.1)',
                    boxShadow: isTop
                      ? '0 0 0 1px rgba(251,191,36,0.25), 0 6px 18px -6px rgba(251,191,36,0.35)'
                      : undefined,
                    borderRadius: 12, padding: 14,
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: av.bg, color: av.color, fontWeight: 700, fontSize: 13 }}>
                        {initialsOf(emp.cashierName)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate"
                            title={emp.cashierName} style={{ color: '#fff' }}>
                            {emp.cashierName || 'Tidak diketahui'}
                          </p>
                          {isTop && (
                            <span className="shrink-0 flex items-center gap-1"
                              style={{
                                padding: '2px 7px', borderRadius: 6,
                                background: 'rgba(251,191,36,0.2)', color: '#FCD34D',
                                fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap',
                              }}>
                              <Trophy size={9} /> TOP
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                          {emp.totalTx || 0} tx · {emp.totalItems || 0} item · Rata {fmtRp(emp.avgTx)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{ color: '#6EE7B7' }}>
                        {fmtRp(emp.totalOmset)}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Laba: {fmtRp(emp.totalLaba)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

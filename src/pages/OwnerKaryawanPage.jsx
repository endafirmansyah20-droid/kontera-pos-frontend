import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Users, Search, Shield, UserCheck, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const HERO_GRADIENT = 'linear-gradient(120deg, #26215C 0%, #3C3489 50%, #7F77DD 100%)';

const AVATAR_COLORS = [
  { bg: 'rgba(127,119,221,0.25)', color: '#AFA9EC' },
  { bg: 'rgba(251,146,60,0.22)',  color: '#FDBA74' },
  { bg: 'rgba(59,130,246,0.22)',  color: '#93C5FD' },
  { bg: 'rgba(16,185,129,0.22)',  color: '#6EE7B7' },
];

const initialsOf = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const hashIdx = (s = '', len = 1) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % len;
};

const roleLabel = (r) => (r === 'admin' ? 'Admin' : 'Karyawan');
const roleStyleOf = (r) => r === 'admin'
  ? { bg: 'rgba(127,119,221,0.25)', color: '#AFA9EC', ring: 'rgba(127,119,221,0.45)' }
  : { bg: 'rgba(59,130,246,0.22)',  color: '#93C5FD', ring: 'rgba(59,130,246,0.45)' };

function RoleBadge({ role }) {
  const s = roleStyleOf(role);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 8px', borderRadius: 999,
      background: s.bg, color: s.color, border: `0.5px solid ${s.ring}`,
      fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      <Shield size={9} /> {roleLabel(role)}
    </span>
  );
}

function ActiveBadge({ active }) {
  return active ? (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 8px', borderRadius: 999,
      background: 'rgba(110,231,183,0.15)', color: '#6EE7B7',
      border: '0.5px solid rgba(110,231,183,0.35)',
      fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
    }}><UserCheck size={9} /> Aktif</span>
  ) : (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 8px', borderRadius: 999,
      background: 'rgba(248,113,113,0.15)', color: '#F87171',
      border: '0.5px solid rgba(248,113,113,0.35)',
      fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
    }}><UserX size={9} /> Nonaktif</span>
  );
}

export default function OwnerKaryawanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [cabangList, setCabangList] = useState([]);
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [cabangId, setCabangId]     = useState('');
  const [search, setSearch]         = useState('');

  const loadCabangs = useCallback(async () => {
    try {
      const { data: res } = await api.get('/owner/cabang-summary');
      const list = res.data ?? res ?? [];
      setCabangList(Array.isArray(list) ? list : []);
    } catch { /* dropdown silently kosong */ }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = cabangId ? { cabang: cabangId } : {};
      const { data: res } = await api.get('/owner/users', { params });
      const list = res.data ?? [];
      // Client-side filter juga — backup kalau endpoint tidak filter server-side
      const arr = cabangId
        ? list.filter(u => String(u.cabang?._id || u.cabang || '') === String(cabangId))
        : list;
      setUsers(Array.isArray(arr) ? arr : []);
    } catch {
      toast.error('Gagal memuat daftar karyawan');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [cabangId]);

  useEffect(() => { if (user) loadCabangs(); }, [user, loadCabangs]);
  useEffect(() => { if (user) loadUsers(); }, [user, loadUsers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto pb-24 lg:pb-6">
      {/* Header controls */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <Search size={14} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.5)', pointerEvents: 'none',
          }} />
          <input
            type="text"
            placeholder="Cari nama / username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.08)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              color: '#fff', borderRadius: 10,
              padding: '9px 12px 9px 34px', fontSize: 13, outline: 'none',
            }}
          />
        </div>
        <select
          value={cabangId}
          onChange={e => setCabangId(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '0.5px solid rgba(255,255,255,0.15)',
            color: '#fff', borderRadius: 10,
            padding: '9px 10px', fontSize: 12, cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="" style={{ color: '#1e293b' }}>Semua Cabang</option>
          {cabangList.map(c => (
            <option key={c._id} value={c._id} style={{ color: '#1e293b' }}>
              {c.nama}
            </option>
          ))}
        </select>
        <button
          type="button" onClick={loadUsers} disabled={loading} title="Muat ulang"
          style={{
            padding: 9, borderRadius: 10,
            background: 'rgba(255,255,255,0.08)',
            border: '0.5px solid rgba(255,255,255,0.15)',
            color: '#fff', display: 'flex', alignItems: 'center',
            cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1,
          }}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* List */}
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
              {search ? 'Tidak ada karyawan cocok' : 'Belum ada karyawan'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => {
              const av = AVATAR_COLORS[hashIdx(u._id || u.username || u.name || '', AVATAR_COLORS.length)];
              const isActive = u.isActive !== false;
              return (
                <div
                  key={u._id}
                  onClick={() => navigate(`/owner/karyawan/${u._id}`, {
                    state: { nama: u.name, role: u.role, cabang: u.cabang?.nama },
                  })}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '0.5px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, padding: 14,
                    cursor: 'pointer', transition: 'background 0.15s',
                    opacity: isActive ? 1 : 0.65,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: av.bg, color: av.color, fontWeight: 700, fontSize: 13 }}>
                      {initialsOf(u.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: '#fff' }} title={u.name}>
                        {u.name || 'Tanpa nama'}
                      </p>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.55)' }}>
                        @{u.username || '—'} · {u.cabang?.nama || '—'}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 items-end shrink-0">
                      <RoleBadge role={u.role} />
                      <ActiveBadge active={isActive} />
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

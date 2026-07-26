import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Plus, CreditCard, Copy,
  Power, Search, MapPin, Phone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatRupiah } from '../utils/helpers';

const fmtRp = v => formatRupiah(v || 0);

const REKENING = [
  { bank: 'BCA',     no: '1093049059',      nama: 'Enda Firmansyah' },
  { bank: 'Mandiri', no: '1250013988837',   nama: 'Enda Firmansyah' },
  { bank: 'BRI',     no: '372701030137531', nama: 'Enda Firmansyah' },
];

const HERO_GRADIENT = 'linear-gradient(120deg, #26215C 0%, #3C3489 50%, #7F77DD 100%)';

// Class untuk input di modal (light) — biarkan konsisten dengan modal existing.
const inputCls = "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition";

// ── Helpers ──────────────────────────────────────────────────────
const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const then = new Date(dateStr);
  if (isNaN(then.getTime())) return null;
  return Math.ceil((then.getTime() - Date.now()) / 86400000);
};

const StatusBadge = ({ status }) => {
  const map = {
    gratis:   { bg: 'rgba(16,185,129,0.2)',  color: '#6EE7B7', label: 'GRATIS' },
    aktif:    { bg: 'rgba(127,119,221,0.25)', color: '#AFA9EC', label: 'AKTIF' },
    nonaktif: { bg: 'rgba(248,113,113,0.2)', color: '#F87171', label: 'NONAKTIF' },
  };
  const conf = map[status] || map.nonaktif;
  return (
    <span style={{
      padding: '3px 8px', borderRadius: 8,
      background: conf.bg, color: conf.color,
      fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
    }}>{conf.label}</span>
  );
};

const CountdownBadge = ({ days }) => {
  let bg, color, text;
  if (days <= 0)      { bg = 'rgba(248,113,113,0.2)'; color = '#F87171'; text = 'Expired'; }
  else if (days < 7)  { bg = 'rgba(251,146,60,0.2)';  color = '#FDBA74'; text = `${days} hari lagi`; }
  else                { bg = 'rgba(16,185,129,0.15)'; color = '#6EE7B7'; text = `${days} hari lagi`; }
  return (
    <span style={{
      padding: '3px 8px', borderRadius: 8,
      background: bg, color: color,
      fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap',
    }}>{text}</span>
  );
};

// ── Card Cabang ──────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: 'rgba(127,119,221,0.25)', color: '#AFA9EC' }, // ungu
  { bg: 'rgba(251,146,60,0.22)',  color: '#FDBA74' }, // oranye
  { bg: 'rgba(59,130,246,0.22)',  color: '#93C5FD' }, // biru
  { bg: 'rgba(16,185,129,0.22)',  color: '#6EE7B7' }, // hijau
];

const ID_MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];

const getInitials = (nama) => {
  if (!nama) return '?';
  const words = nama.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

const formatMemberSince = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return `${String(d.getDate()).padStart(2,'0')} ${ID_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const progressColor = (days) => {
  if (days < 3) return '#F87171';   // merah
  if (days <= 7) return '#FDBA74';  // kuning
  return '#6EE7B7';                 // hijau
};

function CabangCard({ c, idx, onOpen, onToggle, onPerpanjang }) {
  const subStatus = c.subscription?.status;
  const active = c.isActive
    ?? (c.subscription ? ['aktif','gratis'].includes(subStatus) : true);
  const hariTersisa = c.hariTersisa;
  const showPerpanjang = (hariTersisa != null && hariTersisa < 7) || subStatus === 'nonaktif';
  const karyawanN = c.karyawanCount ?? c.jumlahKaryawan ?? c.users?.length ?? 0;
  const memberSince = formatMemberSince(c.createdAt);
  const avatar = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  const initials = getInitials(c.nama);
  const progressPct = hariTersisa != null
    ? Math.min(100, Math.max(0, (hariTersisa / 30) * 100))
    : null;

  return (
    <div onClick={onOpen}
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '0.5px solid rgba(255,255,255,0.1)',
        borderRadius: 12, padding: 14,
        cursor: 'pointer', transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}>

      {/* Row 1: avatar inisial + nama/kode/member  |  badges + toggle */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: avatar.bg, color: avatar.color, fontWeight: 700, fontSize: 13 }}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" title={c.nama} style={{ color: '#fff' }}>
              {c.nama}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Kode: {c.kode || '—'}
            </p>
            {memberSince && (
              <p className="mt-0.5" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10.5 }}>
                Bergabung {memberSince}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {subStatus && <StatusBadge status={subStatus} />}
          {hariTersisa != null && <CountdownBadge days={hariTersisa} />}
          <button type="button"
            onClick={e => { e.stopPropagation(); onToggle(c, active); }}
            title={active ? 'Nonaktifkan cabang' : 'Aktifkan cabang'}
            style={{
              padding: 6, borderRadius: 8,
              background: active ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.1)',
              color: active ? '#6EE7B7' : 'rgba(255,255,255,0.6)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <Power size={14} />
          </button>
        </div>
      </div>

      {/* Row 2: quick stats */}
      <div className="flex items-center gap-2 mt-3 text-xs flex-wrap">
        <span>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Omset: </span>
          <span style={{ color: '#fff', fontWeight: 600 }}>{fmtRp(c.harian?.omset)}</span>
        </span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>
          <span style={{ color: '#fff', fontWeight: 600 }}>{c.harian?.count || 0}</span> tx
        </span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
        <span style={{ color: 'rgba(255,255,255,0.7)' }}>
          <span style={{ color: '#fff', fontWeight: 600 }}>{karyawanN}</span> karyawan
        </span>
      </div>

      {/* Row 3: alamat & telepon (conditional) */}
      {(c.alamat || c.telepon) && (
        <div className="mt-2.5 space-y-1">
          {c.alamat && (
            <div className="flex items-center gap-1.5 text-xs min-w-0"
              style={{ color: 'rgba(255,255,255,0.65)' }}>
              <MapPin size={11} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
              <span className="truncate" title={c.alamat}>{c.alamat}</span>
            </div>
          )}
          {c.telepon && (
            <div className="flex items-center gap-1.5 text-xs"
              style={{ color: 'rgba(255,255,255,0.65)' }}>
              <Phone size={11} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
              <a href={`tel:${c.telepon}`}
                onClick={e => e.stopPropagation()}
                style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                {c.telepon}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Row 4 (conditional): Perpanjang */}
      {showPerpanjang && (
        <div className="mt-3">
          <button type="button"
            onClick={e => { e.stopPropagation(); onPerpanjang(c); }}
            style={{
              padding: '7px 14px', borderRadius: 10,
              background: '#F59E0B', color: '#fff',
              fontSize: 12, fontWeight: 700,
              border: 'none', cursor: 'pointer',
            }}>
            Perpanjang
          </button>
        </div>
      )}

      {/* Row 5 (conditional): Progress bar countdown */}
      {progressPct != null && (
        <div style={{
          marginTop: 12, height: 2,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            width: `${progressPct}%`, height: '100%',
            background: progressColor(hariTersisa),
            transition: 'width 0.3s',
          }} />
        </div>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────
export default function OwnerCabangPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData]         = useState(null);   // /owner/dashboard
  const [summary, setSummary]   = useState([]);     // /owner/cabang-summary
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [showPay, setShowPay]   = useState(null);
  const [form, setForm]         = useState({ namaCabang: '', alamat: '', telepon: '' });
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState('');
  const [sortBy, setSortBy]     = useState('nama');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        api.get('/owner/dashboard'),
        api.get('/owner/cabang-summary'),
      ]);
      setData(r1.data.data ?? r1.data ?? null);
      setSummary(r2.data?.data ?? r2.data ?? []);
    } catch { toast.error('Gagal memuat data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!user) return;
    refresh();
  }, [user, refresh]);

  // Merge cabang-summary + subscriptions by cabang._id.
  const cabangList = useMemo(() => {
    const subs = data?.subscriptions || [];
    const list = Array.isArray(summary) ? summary : [];
    if (list.length === 0) {
      // Fallback: kalau summary belum ready, pakai subscriptions saja
      return subs.map(s => ({
        _id: s.cabang?._id, nama: s.cabang?.nama, kode: s.cabang?.kode,
        subscription: s,
        hariTersisa: s.hariTersisa ?? daysUntil(s.expiredAt),
      }));
    }
    return list.map(c => {
      const sub = subs.find(s => s.cabang?._id === c._id) || null;
      return {
        ...c,
        subscription: sub,
        hariTersisa: c.hariTersisa ?? sub?.hariTersisa ?? daysUntil(sub?.expiredAt),
      };
    });
  }, [summary, data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? cabangList.filter(c =>
          (c.nama || '').toLowerCase().includes(q) ||
          (c.kode || '').toLowerCase().includes(q))
      : cabangList;
    const sorted = [...list].sort((a, b) => {
      if (sortBy === 'omset') return (b.harian?.omset ?? 0) - (a.harian?.omset ?? 0);
      if (sortBy === 'karyawan') {
        const kA = a.karyawanCount ?? a.jumlahKaryawan ?? a.users?.length ?? 0;
        const kB = b.karyawanCount ?? b.jumlahKaryawan ?? b.users?.length ?? 0;
        return kB - kA;
      }
      return (a.nama || '').localeCompare(b.nama || '');
    });
    return sorted;
  }, [cabangList, search, sortBy]);

  const handleTambahCabang = async () => {
    if (!form.namaCabang) return toast.error('Nama cabang wajib diisi');
    setSaving(true);
    try {
      const { data: res } = await api.post('/owner/tambah-cabang', form);
      toast.success('Cabang dibuat! Transfer untuk mengaktifkan.');
      setShowAdd(false);
      setForm({ namaCabang: '', alamat: '', telepon: '' });
      setShowPay(res.data);
      refresh();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (c, currentlyActive) => {
    if (currentlyActive && !window.confirm(`Nonaktifkan cabang "${c.nama}"?`)) return;
    try {
      await api.patch(`/owner/cabang/${c._id}/toggle`);
      toast.success(currentlyActive ? 'Cabang dinonaktifkan' : 'Cabang diaktifkan');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal ubah status');
    }
  };

  const copyNo = (no) => { navigator.clipboard.writeText(no); toast.success('Disalin!'); };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-white/40 border-t-transparent rounded-full" />
    </div>
  );

  const totalCabang = data?.totalCabang ?? 0;
  const maxCabang   = data?.maxCabang ?? 0;
  const sisaSlot    = data?.sisaSlot ?? 0;

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto pb-24 lg:pb-6">

      {/* ── Header: slot info + tambah ── */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-sm min-w-0" style={{ color: 'rgba(255,255,255,0.7)' }}>
          <span style={{ color: '#fff', fontWeight: 700 }}>{totalCabang}</span>
          <span> / {maxCabang} slot digunakan</span>
        </p>
        {sisaSlot > 0 && (
          <button type="button" onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5"
            style={{
              padding: '8px 14px', borderRadius: 10,
              background: '#7F77DD', color: '#fff',
              fontWeight: 700, fontSize: 12,
              border: 'none', cursor: 'pointer',
            }}>
            <Plus size={13} /> Tambah Cabang
          </button>
        )}
      </div>

      {/* ── Search + Sort ── */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search size={14} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.5)', pointerEvents: 'none',
          }} />
          <input type="text" placeholder="Cari nama atau kode cabang..."
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
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '0.5px solid rgba(255,255,255,0.15)',
            color: '#fff', borderRadius: 10,
            padding: '9px 12px', fontSize: 13,
            cursor: 'pointer', outline: 'none',
          }}>
          <option value="nama"     style={{ color: '#1e293b' }}>Nama (A-Z)</option>
          <option value="omset"    style={{ color: '#1e293b' }}>Omset Tertinggi</option>
          <option value="karyawan" style={{ color: '#1e293b' }}>Karyawan Terbanyak</option>
        </select>
      </div>

      {/* ── Cards wrapper (dark gradient) ── */}
      <div style={{
        background: HERO_GRADIENT, borderRadius: 12, padding: 16,
        boxShadow: '0 10px 28px -8px rgba(38,33,92,0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
      }}>
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <Building2 size={32} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.25)' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {search ? 'Tidak ada cabang cocok' : 'Belum ada cabang'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c, i) => (
              <CabangCard key={c._id}
                c={c}
                idx={i}
                onOpen={() => navigate(`/owner/cabang/${c._id}`)}
                onToggle={handleToggle}
                onPerpanjang={(cab) => setShowPay({ cabang: cab })} />
            ))}
          </div>
        )}

        <div className="mt-4 rounded-xl px-4 py-3"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '0.5px solid rgba(255,255,255,0.1)',
          }}>
          <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
            ✨ Cabang pertama GRATIS · Cabang ke-2 dst Rp 30.000/bulan
          </p>
        </div>
      </div>

      {/* ── Modal Tambah Cabang (light, reuse) ── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end lg:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-slate-800 mb-1">Tambah Cabang Baru</h3>
            <p className="text-xs text-slate-400 mb-4">Isi detail cabang yang akan ditambahkan</p>
            <div className="space-y-3">
              <input className={inputCls} placeholder="Nama Cabang *" value={form.namaCabang} onChange={e => setForm(f => ({ ...f, namaCabang: e.target.value }))} />
              <input className={inputCls} placeholder="Alamat (opsional)" value={form.alamat} onChange={e => setForm(f => ({ ...f, alamat: e.target.value }))} />
              <input className={inputCls} placeholder="Telepon (opsional)" value={form.telepon} onChange={e => setForm(f => ({ ...f, telepon: e.target.value }))} />
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                <p className="text-amber-700 text-xs font-semibold">⚡ Biaya Rp 30.000/bulan — aktif setelah konfirmasi pembayaran</p>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
                <button onClick={handleTambahCabang} disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-70">
                  {saving ? 'Proses...' : 'Buat Cabang'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Pembayaran (light, reuse) ── */}
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
              {REKENING.map(r => (
                <div key={r.bank} className="flex items-center justify-between border border-slate-200 rounded-xl p-3.5">
                  <div>
                    <p className="font-bold text-slate-700 text-sm">{r.bank}</p>
                    <p className="text-lg font-mono font-black text-blue-600 tracking-wide">{r.no}</p>
                    <p className="text-xs text-slate-400">a.n. {r.nama}</p>
                  </div>
                  <button onClick={() => copyNo(r.no)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
                    <Copy size={15} className="text-slate-500" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 text-center mb-4">Konfirmasi via WhatsApp. Aktif dalam 1x24 jam.</p>
            <button onClick={() => setShowPay(null)} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition">
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

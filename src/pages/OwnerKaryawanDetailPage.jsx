import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ShoppingCart, DollarSign, TrendingUp, Receipt,
  CheckCircle2, XCircle, Clock, Loader2, FileText, AlertCircle,
  CalendarDays, User as UserIcon, Fingerprint, Activity,
  Shield, UserCheck, UserX, Store, AtSign, Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { ownerAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatRupiah, formatDate, formatDateTime } from '../utils/helpers';

const HERO_GRADIENT = 'linear-gradient(120deg, #26215C 0%, #3C3489 50%, #7F77DD 100%)';
const PAGE_SIZE = 20;
const fmtRp = v => formatRupiah(v || 0);

// ── Utils ────────────────────────────────────────────────────────
const initialsOf = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const bulanIniStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatJamFlex = (v) => {
  if (!v) return '-';
  if (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (isNaN(d.getTime())) return '-';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const hitungDurasiMenit = (jamMulai, jamSelesai) => {
  if (!jamMulai || !jamSelesai) return 0;
  const parse = (v) => {
    if (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)) {
      const [h, m] = v.split(':').map(Number);
      return h * 60 + m;
    }
    const d = new Date(v);
    if (isNaN(d.getTime())) return null;
    return d.getHours() * 60 + d.getMinutes();
  };
  const s = parse(jamMulai);
  const e = parse(jamSelesai);
  if (s == null || e == null) return 0;
  return e - s;
};

const formatDurasiKompak = (menit) => {
  const m = Number(menit) || 0;
  const j = Math.floor(m / 60);
  const sisa = m % 60;
  return j > 0 ? `${j}j ${sisa}m` : `${sisa}m`;
};

const roleLabel = (r) => (r === 'admin' ? 'Admin' : 'Karyawan');
const roleStyleOf = (r) => r === 'admin'
  ? { bg: 'rgba(127,119,221,0.25)', color: '#AFA9EC', ring: 'rgba(127,119,221,0.45)' }
  : { bg: 'rgba(59,130,246,0.22)',  color: '#93C5FD', ring: 'rgba(59,130,246,0.45)' };

// ── Badges ────────────────────────────────────────────────────────
const APPROVAL_META = {
  pending:   { label: 'Pending',   bg: 'rgba(252,211,77,0.15)',  color: '#FCD34D', ring: 'rgba(252,211,77,0.35)' },
  disetujui: { label: 'Disetujui', bg: 'rgba(110,231,183,0.15)', color: '#6EE7B7', ring: 'rgba(110,231,183,0.35)' },
  ditolak:   { label: 'Ditolak',   bg: 'rgba(248,113,113,0.15)', color: '#F87171', ring: 'rgba(248,113,113,0.35)' },
};

const STATUS_META = {
  hadir: { label: 'Hadir', bg: 'rgba(110,231,183,0.15)', color: '#6EE7B7', ring: 'rgba(110,231,183,0.35)' },
  izin:  { label: 'Izin',  bg: 'rgba(147,197,253,0.15)', color: '#93C5FD', ring: 'rgba(147,197,253,0.35)' },
  sakit: { label: 'Sakit', bg: 'rgba(216,180,254,0.15)', color: '#D8B4FE', ring: 'rgba(216,180,254,0.35)' },
  cuti:  { label: 'Cuti',  bg: 'rgba(175,169,236,0.15)', color: '#AFA9EC', ring: 'rgba(175,169,236,0.35)' },
};

function Pill({ meta, icon: Icon }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '2px 8px', borderRadius: 999,
      background: meta.bg, color: meta.color,
      border: `0.5px solid ${meta.ring}`,
      fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
    }}>
      {Icon ? <Icon size={9} /> : null}
      {meta.label}
    </span>
  );
}

function ApprovalBadge({ approval }) {
  return <Pill meta={APPROVAL_META[approval] || APPROVAL_META.pending} />;
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status || '-', bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', ring: 'rgba(255,255,255,0.1)' };
  return <Pill meta={m} />;
}

function RoleBadge({ role }) {
  const s = roleStyleOf(role);
  return <Pill meta={{ label: roleLabel(role), ...s }} icon={Shield} />;
}

function ActiveBadge({ active }) {
  return active
    ? <Pill meta={{ label: 'Aktif',    bg: 'rgba(110,231,183,0.15)', color: '#6EE7B7', ring: 'rgba(110,231,183,0.35)' }} icon={UserCheck} />
    : <Pill meta={{ label: 'Nonaktif', bg: 'rgba(248,113,113,0.15)', color: '#F87171', ring: 'rgba(248,113,113,0.35)' }} icon={UserX} />;
}

// ── UI primitives ────────────────────────────────────────────────
function MetricPill({ label, value, icon: Icon }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      border: '0.5px solid rgba(255,255,255,0.1)',
      borderRadius: 12, padding: 14,
      flex: '1 1 0', minWidth: 0,
    }}>
      <div className="flex items-center gap-2 mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
        <Icon size={12} />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-base font-bold truncate" style={{ color: '#fff' }}>{value}</p>
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value, color = '#AFA9EC' }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      border: '0.5px solid rgba(255,255,255,0.1)',
      borderRadius: 10, padding: 10,
    }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          background: `${color}22`,
          border: `0.5px solid ${color}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={11} style={{ color }} />
        </div>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', margin: 0 }}>
          {label}
        </p>
      </div>
      <p style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: 0, lineHeight: 1.2, wordBreak: 'break-word' }}>
        {value}
      </p>
    </div>
  );
}

function GradientPanel({ children, style = {}, className = '' }) {
  return (
    <div className={className} style={{
      background: HERO_GRADIENT, borderRadius: 12, padding: 16,
      boxShadow: '0 10px 28px -8px rgba(38,33,92,0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
      ...style,
    }}>{children}</div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3" style={{ padding: '10px 0' }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        background: 'rgba(255,255,255,0.06)',
        border: '0.5px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={13} style={{ color: 'rgba(255,255,255,0.7)' }} />
      </div>
      <div className="min-w-0 flex-1">
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
          {label}
        </p>
        <p style={{ color: '#fff', fontSize: 13, margin: '3px 0 0', wordBreak: 'break-word' }}>
          {value || '—'}
        </p>
      </div>
    </div>
  );
}

// ── Period switcher (Performa tab) ───────────────────────────────
const PERIODS = [
  ['today', 'Hari Ini'],
  ['7',     '7 Hari'],
  ['30',    'Bulan Ini'],
];

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

// ── Tab bar ──────────────────────────────────────────────────────
const TABS = [
  { id: 'info',      label: 'Info',      icon: UserIcon },
  { id: 'absensi',   label: 'Absensi',   icon: Fingerprint },
  { id: 'performa',  label: 'Performa',  icon: Activity },
  { id: 'transaksi', label: 'Transaksi', icon: Receipt },
];

function TabBar({ active, onChange }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl mb-4 overflow-x-auto"
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '0.5px solid rgba(255,255,255,0.1)',
      }}>
      {TABS.map(t => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button
            key={t.id} type="button"
            onClick={() => onChange(t.id)}
            style={{
              flex: '1 1 auto', minWidth: 0,
              padding: '8px 12px', borderRadius: 8,
              background: isActive ? '#7F77DD' : 'transparent',
              color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
              fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'background 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            <Icon size={13} /> {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
export default function OwnerKaryawanDetailPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { cashierId } = useParams(); // route param — treat as generic userId

  // ── User data (from /owner/users/:userId) ──
  const [userData, setUserData] = useState(null);
  const [userLoading, setUserLoading] = useState(true);

  // Fallback dari location.state (dipakai sampai fetch selesai)
  const fbNama   = location.state?.nama;
  const fbRole   = location.state?.role;
  const fbCabang = location.state?.cabang;

  const [activeTab, setActiveTab] = useState('info');

  // ── Absensi tab state ──
  const [absensiBulan, setAbsensiBulan] = useState(bulanIniStr());
  const [absensiSummary, setAbsensiSummary] = useState({
    hadir: 0, izin: 0, sakit: 0, cuti: 0, totalJamLembur: 0,
  });
  const [absensiList, setAbsensiList] = useState([]);
  const [absensiLoading, setAbsensiLoading] = useState(false);
  const [approvingLemburId, setApprovingLemburId] = useState(null);

  // ── Performa tab state ──
  const [perfRange, setPerfRange] = useState('30');
  const [perfStats, setPerfStats] = useState(null);
  const [perfLoading, setPerfLoading] = useState(false);

  // ── Transaksi tab state ──
  const [txs, setTxs]           = useState([]);
  const [txPage, setTxPage]     = useState(1);
  const [txPages, setTxPages]   = useState(1);
  const [txTotal, setTxTotal]   = useState(0);
  const [txLoading, setTxLoading]         = useState(false);
  const [txLoadingMore, setTxLoadingMore] = useState(false);
  const [txLoaded, setTxLoaded] = useState(false);

  // ── Load user data ──
  const loadUser = useCallback(async () => {
    setUserLoading(true);
    try {
      const r = await api.get(`/owner/users/${cashierId}`);
      const u = r.data?.data ?? r.data ?? null;
      setUserData(u);
    } catch {
      // Endpoint mungkin belum ada — biarkan userData null, fallback ke
      // location.state di UI header. Tidak toast supaya tidak berisik.
      setUserData(null);
    } finally {
      setUserLoading(false);
    }
  }, [cashierId]);

  // ── Load absensi ──
  // Tile ringkasan (Hadir/Izin/Sakit/Cuti/Lembur) di-derive dari `absensiList`,
  // BUKAN dari /owner/absensi/summary. Alasan:
  //   1) Endpoint summary meng-aggregate per-cabang (bukan per-user); ketika
  //      difilter ?user=<id>, hasilnya tidak reliable & sering nol.
  //   2) Per-cabang summary tidak memuat totalJamLembur — hanya count status.
  // Deriving dari list menjamin tile konsisten dengan Riwayat di bawahnya.
  const loadAbsensiData = useCallback(async () => {
    setAbsensiLoading(true);
    try {
      // limit tinggi supaya cukup untuk 1 bulan penuh + lembur padat.
      const listRes = await ownerAPI.getAbsensiList({
        user: cashierId, bulan: absensiBulan, limit: 100,
      });

      const listBody = listRes.data || {};
      const listData = listBody?.data?.items ?? listBody?.data ?? listBody ?? [];
      const records  = Array.isArray(listData) ? listData : [];
      records.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
      setAbsensiList(records);

      const agg = records.reduce((acc, r) => {
        if (r.status === 'hadir') acc.hadir++;
        else if (r.status === 'izin') acc.izin++;
        else if (r.status === 'sakit') acc.sakit++;
        else if (r.status === 'cuti') acc.cuti++;
        const lemburArr = Array.isArray(r.lembur) ? r.lembur : [];
        for (const l of lemburArr) {
          // Skip lembur yang ditolak; pending & disetujui tetap dihitung agar
          // angka Lembur tidak melompat setiap approve.
          if ((l.approvalStatus || 'pending') === 'ditolak') continue;
          const d = l.durasi != null
            ? Number(l.durasi)
            : hitungDurasiMenit(l.jamMulai, l.jamSelesai);
          acc.totalJamLembur += d || 0;
        }
        return acc;
      }, { hadir: 0, izin: 0, sakit: 0, cuti: 0, totalJamLembur: 0 });
      setAbsensiSummary(agg);
    } catch {
      setAbsensiSummary({ hadir: 0, izin: 0, sakit: 0, cuti: 0, totalJamLembur: 0 });
      setAbsensiList([]);
    } finally {
      setAbsensiLoading(false);
    }
  }, [cashierId, absensiBulan]);

  // ── Load performa ──
  const loadPerf = useCallback(async () => {
    setPerfLoading(true);
    try {
      // Kirim `cashier` param (kalau backend support server-side filter) +
      // filter client-side lewat .find() sebagai fallback yang selalu jalan.
      const r = await api.get('/owner/employee-stats', {
        params: { cashier: cashierId, range: perfRange },
      });
      const list = r.data?.data || [];
      const found = list.find(e => e.cashierId === cashierId);
      setPerfStats(found || null);
    } catch {
      setPerfStats(null);
    } finally {
      setPerfLoading(false);
    }
  }, [cashierId, perfRange]);

  // ── Load transaksi ──
  const loadTransactions = useCallback(async (p, append) => {
    if (append) setTxLoadingMore(true); else setTxLoading(true);
    try {
      const r = await api.get('/owner/employee-transactions', {
        params: { cashier: cashierId, page: p, limit: PAGE_SIZE },
      });
      const body = r.data || {};
      const d    = body.data ?? body;
      const list = Array.isArray(d) ? d : (d.transactions || d.items || d.data || []);
      const pag  = d.pagination || body.pagination || d;
      setTxs(prev => append ? [...prev, ...list] : list);
      setTxPage(pag.page  || p);
      setTxPages(pag.pages || pag.totalPages || 1);
      setTxTotal(pag.total || pag.totalCount || list.length);
    } catch (err) {
      // Backend kadang balikin 404 kalau karyawan belum punya transaksi —
      // itu bukan error, cukup treat sebagai empty. Toast hanya kalau
      // request beneran gagal (network, 4xx/5xx lain, 5xx).
      const status = err?.response?.status;
      if (status === 404) {
        if (!append) {
          setTxs([]);
          setTxPage(1);
          setTxPages(1);
          setTxTotal(0);
        }
      } else if (!append) {
        toast.error('Gagal memuat riwayat transaksi');
      }
    } finally {
      if (append) setTxLoadingMore(false); else setTxLoading(false);
      setTxLoaded(true);
    }
  }, [cashierId]);

  // ── Bootstrap ──
  useEffect(() => { if (user) loadUser(); }, [user, loadUser]);

  // Absensi: fetch tiap tab aktif atau bulan berubah. `loadAbsensiData`
  // sudah tergantung `absensiBulan`, jadi identity-change memicu re-run.
  useEffect(() => {
    if (!user || activeTab !== 'absensi') return;
    loadAbsensiData();
  }, [user, activeTab, loadAbsensiData]);

  // Performa: sama, `loadPerf` tergantung `perfRange`.
  useEffect(() => {
    if (!user || activeTab !== 'performa') return;
    loadPerf();
  }, [user, activeTab, loadPerf]);

  // Transaksi: fetch sekali saat tab pertama diaktifkan. Pagination
  // di-preserve saat pindah tab bolak-balik.
  useEffect(() => {
    if (!user || activeTab !== 'transaksi' || txLoaded) return;
    loadTransactions(1, false);
  }, [user, activeTab, txLoaded, loadTransactions]);

  // ── Approve/reject lembur ──
  const handleApproveLembur = async (lemburId, approve) => {
    let alasanTolak;
    if (!approve) {
      const alasan = window.prompt('Alasan penolakan lembur:');
      if (alasan == null) return;
      if (!alasan.trim()) {
        toast.error('Alasan penolakan wajib diisi');
        return;
      }
      alasanTolak = alasan.trim();
    }
    setApprovingLemburId(lemburId);
    try {
      await ownerAPI.approveLembur(lemburId, {
        approve,
        ...(alasanTolak && { alasanTolak }),
      });
      toast.success(approve ? 'Lembur disetujui' : 'Lembur ditolak');
      loadAbsensiData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memproses lembur');
    } finally {
      setApprovingLemburId(null);
    }
  };

  // ── Derived header values ──
  const nama    = userData?.name    || fbNama    || 'Karyawan';
  const role    = userData?.role    || fbRole    || 'karyawan';
  const cabang  = userData?.cabang?.nama || fbCabang || '—';
  const isActive = userData ? userData.isActive !== false : true;
  const username = userData?.username;
  const email    = userData?.email;
  const createdAt = userData?.createdAt;

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto pb-24 lg:pb-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-4">
        <button type="button" onClick={() => navigate('/owner/karyawan')}
          style={{
            padding: 8, borderRadius: 10,
            background: 'rgba(255,255,255,0.08)',
            border: '0.5px solid rgba(255,255,255,0.15)',
            color: '#fff', display: 'flex', alignItems: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}>
          <ArrowLeft size={16} />
        </button>
        <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: 'rgba(127,119,221,0.25)', color: '#AFA9EC',
            fontWeight: 700, fontSize: 14,
          }}>
          {initialsOf(nama)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold truncate" style={{ color: '#fff' }} title={nama}>
            {nama}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <RoleBadge role={role} />
            <ActiveBadge active={isActive} />
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* ── INFO TAB ── */}
      {activeTab === 'info' && (
        <GradientPanel>
          {userLoading ? (
            <div className="py-8 flex justify-center">
              <div className="animate-spin w-5 h-5 border-2 border-white/40 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="divide-y" style={{ ['--tw-divide-opacity']: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
              <InfoRow icon={UserIcon} label="Nama" value={nama} />
              <InfoRow icon={AtSign} label="Username" value={username ? `@${username}` : '—'} />
              {email && <InfoRow icon={AtSign} label="Email" value={email} />}
              <InfoRow icon={Shield} label="Role" value={roleLabel(role)} />
              <InfoRow icon={Store} label="Cabang" value={cabang} />
              <InfoRow
                icon={isActive ? UserCheck : UserX}
                label="Status"
                value={isActive ? 'Aktif' : 'Nonaktif'}
              />
              {createdAt && (
                <InfoRow icon={Calendar} label="Bergabung sejak" value={formatDate(createdAt)} />
              )}
            </div>
          )}
        </GradientPanel>
      )}

      {/* ── ABSENSI TAB ── */}
      {activeTab === 'absensi' && (
        <GradientPanel>
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <CalendarDays size={14} style={{ color: 'rgba(255,255,255,0.7)' }} />
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
                Rekap Absensi
              </p>
            </div>
            <input
              type="month"
              value={absensiBulan}
              onChange={(e) => setAbsensiBulan(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '0.5px solid rgba(255,255,255,0.15)',
                color: '#fff', borderRadius: 8,
                padding: '5px 8px', fontSize: 11,
                outline: 'none', colorScheme: 'dark', cursor: 'pointer',
              }}
            />
          </div>

          {/* 5 summary tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
            <SummaryTile icon={CheckCircle2} label="Hadir"  value={absensiLoading ? '…' : absensiSummary.hadir}  color="#6EE7B7" />
            <SummaryTile icon={FileText}     label="Izin"   value={absensiLoading ? '…' : absensiSummary.izin}   color="#93C5FD" />
            <SummaryTile icon={AlertCircle}  label="Sakit"  value={absensiLoading ? '…' : absensiSummary.sakit}  color="#D8B4FE" />
            <SummaryTile icon={CalendarDays} label="Cuti"   value={absensiLoading ? '…' : absensiSummary.cuti}   color="#AFA9EC" />
            <SummaryTile icon={Clock}        label="Lembur" value={absensiLoading ? '…' : formatDurasiKompak(absensiSummary.totalJamLembur)} color="#FCD34D" />
          </div>

          <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            Riwayat Absensi
          </p>

          {absensiLoading ? (
            <div className="p-6 flex justify-center">
              <div className="animate-spin w-5 h-5 border-2 border-white/40 border-t-transparent rounded-full" />
            </div>
          ) : absensiList.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.12)',
              borderRadius: 10, padding: '24px 16px',
              textAlign: 'center',
            }}>
              <Fingerprint size={22} style={{ color: 'rgba(255,255,255,0.3)', margin: '0 auto 6px' }} />
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: 0 }}>
                Belum ada absensi bulan ini
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {absensiList.map((r) => {
                const rKey = r._id || r.id || r.tanggal;
                const status = r.status;
                const approval = r.approvalStatus;
                const jamIn = r.checkIn?.waktu;
                const jamOut = r.checkOut?.waktu;
                const lemburArr = Array.isArray(r.lembur) ? r.lembur : [];
                const hasLemburPending = lemburArr.some(l => (l.approvalStatus || 'pending') === 'pending');
                const isRowHighlight = (approval === 'pending' && status !== 'hadir') || hasLemburPending;
                return (
                  <div key={rKey} style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: isRowHighlight
                      ? '0.5px solid rgba(252,211,77,0.45)'
                      : '0.5px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, padding: 12,
                  }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold" style={{ color: '#fff' }}>
                            {formatDate(r.tanggal, { weekday: 'short' })}
                          </p>
                          <StatusBadge status={status} />
                          {approval && <ApprovalBadge approval={approval} />}
                        </div>
                        {r.keterangan && (
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', margin: '6px 0 0' }}>
                            {r.keterangan}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0" style={{ minWidth: 90 }}>
                        {(jamIn || jamOut) ? (
                          <>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontFamily: 'monospace', margin: 0 }}>
                              <span style={{ color: '#6EE7B7' }}>IN</span> {formatJamFlex(jamIn)}
                            </p>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontFamily: 'monospace', margin: '2px 0 0' }}>
                              <span style={{ color: '#FDBA74' }}>OUT</span> {formatJamFlex(jamOut)}
                            </p>
                          </>
                        ) : (
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', margin: 0 }}>—</p>
                        )}
                      </div>
                    </div>

                    {/* Lembur embedded */}
                    {lemburArr.length > 0 && (
                      <div className="mt-3 pt-3" style={{ borderTop: '0.5px solid rgba(255,255,255,0.1)' }}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Clock size={12} style={{ color: '#FCD34D' }} />
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                            Lembur ({lemburArr.length})
                          </span>
                        </div>
                        <div className="space-y-2">
                          {lemburArr.map((l) => {
                            const lId       = l._id || l.id;
                            const lApproval = l.approvalStatus || 'pending';
                            const lPending  = lApproval === 'pending';
                            const lLoading  = approvingLemburId === lId;
                            const durasi    = l.durasi != null
                              ? Number(l.durasi)
                              : hitungDurasiMenit(l.jamMulai, l.jamSelesai);
                            return (
                              <div key={lId || `${l.jamMulai}-${l.jamSelesai}`} style={{
                                background: 'rgba(0,0,0,0.15)',
                                border: '0.5px solid rgba(255,255,255,0.08)',
                                borderRadius: 8, padding: 10,
                              }}>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span style={{ fontSize: 11, color: '#fff', fontFamily: 'monospace', fontWeight: 600 }}>
                                    {formatJamFlex(l.jamMulai)} – {formatJamFlex(l.jamSelesai)}
                                  </span>
                                  <span style={{ fontSize: 11, color: '#FCD34D', fontWeight: 700 }}>
                                    {formatDurasiKompak(durasi)}
                                  </span>
                                  <ApprovalBadge approval={lApproval} />
                                </div>
                                {l.alasan && (
                                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', margin: '6px 0 0' }}>
                                    {l.alasan}
                                  </p>
                                )}
                                {l.alasanTolak && (
                                  <p style={{ fontSize: 11, color: '#F87171', margin: '6px 0 0' }}>
                                    Ditolak: {l.alasanTolak}
                                  </p>
                                )}
                                {lPending && lId && (
                                  <div className="mt-2 pt-2 flex gap-2 justify-end" style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleApproveLembur(lId, false)}
                                      disabled={lLoading}
                                      style={{
                                        padding: '5px 12px', borderRadius: 7,
                                        background: 'rgba(248,113,113,0.15)',
                                        border: '0.5px solid rgba(248,113,113,0.35)',
                                        color: '#F87171', fontSize: 11, fontWeight: 600,
                                        cursor: lLoading ? 'wait' : 'pointer',
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        opacity: lLoading ? 0.6 : 1,
                                      }}
                                    >
                                      <XCircle size={12} /> Tolak Lembur
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleApproveLembur(lId, true)}
                                      disabled={lLoading}
                                      style={{
                                        padding: '5px 12px', borderRadius: 7,
                                        background: 'rgba(110,231,183,0.15)',
                                        border: '0.5px solid rgba(110,231,183,0.4)',
                                        color: '#6EE7B7', fontSize: 11, fontWeight: 600,
                                        cursor: lLoading ? 'wait' : 'pointer',
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        opacity: lLoading ? 0.6 : 1,
                                      }}
                                    >
                                      {lLoading
                                        ? <Loader2 size={12} className="animate-spin" />
                                        : <CheckCircle2 size={12} />}
                                      Setuju Lembur
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </GradientPanel>
      )}

      {/* ── PERFORMA TAB ── */}
      {activeTab === 'performa' && (
        <GradientPanel>
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Activity size={14} style={{ color: 'rgba(255,255,255,0.7)' }} />
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
                Performa Penjualan
              </p>
            </div>
            <PeriodSel value={perfRange} onChange={setPerfRange} />
          </div>

          {perfLoading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin w-5 h-5 border-2 border-white/40 border-t-transparent rounded-full" />
            </div>
          ) : !perfStats || (perfStats.totalTx || 0) === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.12)',
              borderRadius: 10, padding: '28px 16px',
              textAlign: 'center',
            }}>
              <Receipt size={26} style={{ color: 'rgba(255,255,255,0.3)', margin: '0 auto 8px' }} />
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, margin: 0 }}>
                Tidak ada data transaksi
              </p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '4px 0 0' }}>
                {role === 'admin' ? 'Admin ini belum melakukan transaksi kasir' : 'Belum ada transaksi di periode ini'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <SummaryTile icon={ShoppingCart} label="Total Tx"    value={`${perfStats.totalTx || 0}`}        color="#93C5FD" />
              <SummaryTile icon={DollarSign}   label="Total Omset" value={fmtRp(perfStats.totalOmset)}        color="#6EE7B7" />
              <SummaryTile icon={TrendingUp}   label="Total Laba"  value={fmtRp(perfStats.totalLaba)}         color="#FCD34D" />
              <SummaryTile icon={Activity}     label="Rata / Tx"   value={fmtRp(perfStats.avgTx)}             color="#AFA9EC" />
            </div>
          )}
        </GradientPanel>
      )}

      {/* ── TRANSAKSI TAB ── */}
      {activeTab === 'transaksi' && (
        <GradientPanel>
          <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
            Riwayat Transaksi
            {txTotal > 0 && (
              <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
                {' '}· {txs.length} / {txTotal}
              </span>
            )}
          </p>

          {txLoading ? (
            <div className="p-10 flex justify-center">
              <div className="animate-spin w-6 h-6 border-2 border-white/40 border-t-transparent rounded-full" />
            </div>
          ) : txs.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed rgba(255,255,255,0.12)',
              borderRadius: 10, padding: '28px 16px',
              textAlign: 'center',
            }}>
              <Receipt size={26} style={{ color: 'rgba(255,255,255,0.3)', margin: '0 auto 8px' }} />
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, margin: 0 }}>
                Belum ada riwayat transaksi
              </p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '4px 0 0' }}>
                Karyawan ini belum pernah memproses transaksi kasir
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {txs.map(tx => (
                  <div key={tx._id || tx.invoiceNumber}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '0.5px solid rgba(255,255,255,0.1)',
                      borderRadius: 10, padding: 12,
                    }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-semibold" style={{ color: '#fff' }}>
                            {tx.invoiceNumber || '—'}
                          </span>
                          {tx.isVoid && (
                            <span style={{
                              padding: '2px 7px', borderRadius: 6,
                              background: 'rgba(248,113,113,0.2)',
                              color: '#F87171', fontSize: 9, fontWeight: 700,
                            }}>VOID</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs flex-wrap"
                          style={{ color: 'rgba(255,255,255,0.55)' }}>
                          <span>{formatDateTime(tx.transactionDate ?? tx.createdAt)}</span>
                          {tx.cabang?.nama && (
                            <>
                              <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
                              <span>{tx.cabang.nama}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold" style={{
                          color: tx.isVoid ? 'rgba(255,255,255,0.4)' : '#fff',
                          textDecoration: tx.isVoid ? 'line-through' : 'none',
                        }}>
                          {fmtRp(tx.total)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {txPage < txPages && (
                <div className="mt-4 flex justify-center">
                  <button type="button"
                    onClick={() => loadTransactions(txPage + 1, true)}
                    disabled={txLoadingMore}
                    style={{
                      padding: '9px 18px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.08)',
                      border: '0.5px solid rgba(255,255,255,0.15)',
                      color: '#fff', fontSize: 12, fontWeight: 600,
                      cursor: txLoadingMore ? 'default' : 'pointer',
                      opacity: txLoadingMore ? 0.6 : 1,
                    }}>
                    {txLoadingMore
                      ? 'Memuat...'
                      : `Muat lebih banyak (hal ${txPage + 1} / ${txPages})`}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Quick metric strip */}
          {!txLoading && txs.length > 0 && (
            <div className="flex gap-2 mt-4 flex-wrap">
              <MetricPill label="Total Tx" value={`${txTotal || txs.length} tx`} icon={ShoppingCart} />
            </div>
          )}
        </GradientPanel>
      )}
    </div>
  );
}

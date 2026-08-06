import React, { useState, useEffect, useCallback } from 'react';
import {
  Fingerprint, RefreshCw, Filter, CheckCircle2, XCircle, Clock,
  MapPin, FileText, Image as ImageIcon, AlertCircle, Loader2,
  CalendarDays, ExternalLink, Users, LogIn, LogOut,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { ownerAPI, mediaUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/UI';
import { formatDate, formatDateTime } from '../utils/helpers';

// ── Theme ────────────────────────────────────────────────────────
const HERO_GRADIENT = 'linear-gradient(120deg, #26215C 0%, #3C3489 50%, #7F77DD 100%)';
const PAGE_SIZE = 20;

const STATUS_META = {
  hadir: { label: 'Hadir', bg: 'rgba(110,231,183,0.15)', color: '#6EE7B7', ring: 'rgba(110,231,183,0.35)' },
  izin:  { label: 'Izin',  bg: 'rgba(147,197,253,0.15)', color: '#93C5FD', ring: 'rgba(147,197,253,0.35)' },
  sakit: { label: 'Sakit', bg: 'rgba(216,180,254,0.15)', color: '#D8B4FE', ring: 'rgba(216,180,254,0.35)' },
  cuti:  { label: 'Cuti',  bg: 'rgba(175,169,236,0.15)', color: '#AFA9EC', ring: 'rgba(175,169,236,0.35)' },
};

const APPROVAL_META = {
  pending:   { label: 'Menunggu',  bg: 'rgba(252,211,77,0.15)',  color: '#FCD34D', ring: 'rgba(252,211,77,0.35)' },
  disetujui: { label: 'Disetujui', bg: 'rgba(110,231,183,0.15)', color: '#6EE7B7', ring: 'rgba(110,231,183,0.35)' },
  ditolak:   { label: 'Ditolak',   bg: 'rgba(248,113,113,0.15)', color: '#F87171', ring: 'rgba(248,113,113,0.35)' },
};

const STATUS_FILTERS = [
  ['',      'Semua'],
  ['hadir', 'Hadir'],
  ['izin',  'Izin'],
  ['sakit', 'Sakit'],
  ['cuti',  'Cuti'],
];

const APPROVAL_FILTERS = [
  ['',          'Semua'],
  ['pending',   'Pending'],
  ['disetujui', 'Disetujui'],
  ['ditolak',   'Ditolak'],
];

const AVATAR_COLORS = [
  { bg: 'rgba(127,119,221,0.25)', color: '#AFA9EC' },
  { bg: 'rgba(251,146,60,0.22)',  color: '#FDBA74' },
  { bg: 'rgba(59,130,246,0.22)',  color: '#93C5FD' },
  { bg: 'rgba(16,185,129,0.22)',  color: '#6EE7B7' },
];

const controlBase = {
  background: 'rgba(255,255,255,0.08)',
  border: '0.5px solid rgba(255,255,255,0.15)',
  color: '#fff', borderRadius: 10,
  padding: '7px 10px', fontSize: 12,
  outline: 'none',
};

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

const bulanIniStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatJam = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Accept "HH:MM" atau ISO datetime — backend embed lembur[] bisa balikin
// dua-duanya tergantung skema. Robust parser biar UI tidak pecah.
const formatJamFlex = (v) => {
  if (!v) return '-';
  if (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)) return v;
  return formatJam(v);
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

// ── UI primitives ────────────────────────────────────────────────
function GradientPanel({ children, style = {}, className = '' }) {
  return (
    <div className={className} style={{
      background: HERO_GRADIENT, borderRadius: 12, padding: 16,
      boxShadow: '0 10px 28px -8px rgba(38,33,92,0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
      ...style,
    }}>{children}</div>
  );
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status || '-', bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', ring: 'rgba(255,255,255,0.1)' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 999,
      background: m.bg, color: m.color,
      border: `0.5px solid ${m.ring}`,
      fontSize: 10, fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>{m.label}</span>
  );
}

function ApprovalBadge({ approval }) {
  if (!approval) return null;
  const m = APPROVAL_META[approval];
  if (!m) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 999,
      background: m.bg, color: m.color,
      border: `0.5px solid ${m.ring}`,
      fontSize: 10, fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>{m.label}</span>
  );
}

function SummaryCard({ icon: Icon, label, value, color = '#AFA9EC' }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      border: '0.5px solid rgba(255,255,255,0.1)',
      borderRadius: 12, padding: 14,
      backdropFilter: 'blur(8px)',
    }}>
      <div className="flex items-center gap-2 mb-2">
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: `${color}22`,
          border: `0.5px solid ${color}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={14} style={{ color }} />
        </div>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
          {label}
        </p>
      </div>
      <p style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0, lineHeight: 1.1 }}>
        {value}
      </p>
    </div>
  );
}

// ── Modal Tolak (alasan) ─────────────────────────────────────────
function TolakModal({ open, onClose, onConfirm, loading }) {
  const [alasan, setAlasan] = useState('');
  useEffect(() => { if (!open) setAlasan(''); }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Tolak Pengajuan" size="sm">
      <p className="text-sm text-slate-600 mb-3">
        Berikan alasan penolakan (akan dikirim ke karyawan).
      </p>
      <textarea
        className="input min-h-[100px]"
        placeholder="Contoh: Kuota cuti bulan ini sudah habis..."
        value={alasan}
        onChange={(e) => setAlasan(e.target.value)}
      />
      <div className="flex gap-3 mt-4 justify-end">
        <button className="btn btn-outline" onClick={onClose} disabled={loading}>Batal</button>
        <button
          className="btn btn-danger"
          onClick={() => onConfirm(alasan.trim())}
          disabled={loading || !alasan.trim()}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : null}
          Tolak Pengajuan
        </button>
      </div>
    </Modal>
  );
}

// ── Modal Detail ─────────────────────────────────────────────────
// `data` = raw Absensi doc dengan populated user/cabang/approvedBy.
function DetailModal({ open, onClose, data }) {
  if (!data) return null;

  const userNama       = data.user?.name;
  const cabangNama     = data.cabang?.nama;
  const tanggal        = data.tanggal;
  const status         = data.status;
  const approval       = data.approvalStatus;
  const jamCheckin     = data.checkIn?.waktu;
  const jamCheckout    = data.checkOut?.waktu;
  const lemburArr      = Array.isArray(data.lembur) ? data.lembur : [];
  // Foto/lampiran di-serve dari backend (path relatif /uploads/...) — di APK
  // Capacitor native, path relatif resolve ke capacitor://localhost dan gagal.
  // mediaUrl() prefix ke domain backend kalau native, biarkan relative di web.
  const fotoCheckin    = mediaUrl(data.checkIn?.fotoUrl);
  const fotoCheckout   = mediaUrl(data.checkOut?.fotoUrl);
  const lokasiCheckin  = data.checkIn?.lokasi;
  const lokasiCheckout = data.checkOut?.lokasi;
  const keterangan     = data.keterangan;
  const lampiran       = mediaUrl(data.lampiranUrl);
  const alasanTolak    = data.alasanTolak;
  const approvedByNama = data.approvedBy?.name;
  const approvedAt     = data.approvedAt;

  const gmapsUrl = (loc) => {
    if (!loc?.lat || !loc?.lng) return null;
    return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
  };

  const KV = ({ label, value }) => (
    <div>
      <p style={{ color: 'rgba(100,116,139,0.9)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
        {label}
      </p>
      <p style={{ color: '#1e293b', fontSize: 13, fontWeight: 500, margin: '2px 0 0' }}>
        {value || '-'}
      </p>
    </div>
  );

  const FotoCard = ({ title, url, jam, lokasi, badgeColor }) => {
    if (!url && !jam) return null;
    return (
      <div style={{
        border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, background: '#f8fafc',
      }}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span style={{ fontSize: 11, fontWeight: 700, color: badgeColor }}>{title}</span>
          {jam && <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{formatJam(jam)}</span>}
        </div>
        {url ? (
          <img
            src={url}
            alt={title}
            style={{
              width: '100%', borderRadius: 8, objectFit: 'cover',
              maxHeight: 240, background: '#e2e8f0',
            }}
          />
        ) : (
          <div style={{
            width: '100%', height: 120, borderRadius: 8,
            background: '#e2e8f0', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: '#94a3b8', fontSize: 11,
          }}>
            <ImageIcon size={20} />
          </div>
        )}
        {gmapsUrl(lokasi) && (
          <a
            href={gmapsUrl(lokasi)}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginTop: 8, fontSize: 11, color: '#3b82f6', fontWeight: 600,
            }}
          >
            <MapPin size={11} />
            {lokasi.lat.toFixed(5)}, {lokasi.lng.toFixed(5)}
            <ExternalLink size={10} />
          </a>
        )}
      </div>
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Detail Absensi" size="lg">
      <div className="space-y-4">
        {/* Header info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KV label="Karyawan" value={userNama} />
          <KV label="Cabang"   value={cabangNama} />
          <KV label="Tanggal"  value={formatDate(tanggal, { weekday: 'short' })} />
          <div>
            <p style={{ color: 'rgba(100,116,139,0.9)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              Status
            </p>
            <div className="flex gap-1 mt-1 flex-wrap">
              <StatusBadge status={status} />
              <ApprovalBadge approval={approval} />
            </div>
          </div>
        </div>

        {/* Keterangan izin */}
        {keterangan && (
          <div style={{
            padding: 12, borderRadius: 10,
            background: '#eff6ff', border: '1px solid #bfdbfe',
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', margin: 0 }}>
              Keterangan
            </p>
            <p style={{ fontSize: 13, color: '#1e293b', margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>
              {keterangan}
            </p>
          </div>
        )}

        {/* Alasan tolak */}
        {alasanTolak && (
          <div style={{
            padding: 12, borderRadius: 10,
            background: '#fef2f2', border: '1px solid #fecaca',
          }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', margin: 0 }}>
              Alasan Ditolak {approvedByNama ? `oleh ${approvedByNama}` : ''}
            </p>
            <p style={{ fontSize: 13, color: '#1e293b', margin: '4px 0 0' }}>{alasanTolak}</p>
          </div>
        )}

        {/* Riwayat Lembur (read-only — aksi ada di row list) */}
        {lemburArr.length > 0 && (
          <div>
            <p style={{ color: 'rgba(100,116,139,0.9)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
              Riwayat Lembur ({lemburArr.length})
            </p>
            <div className="space-y-2">
              {lemburArr.map((l) => {
                const lId       = l._id || l.id || `${l.jamMulai}-${l.jamSelesai}`;
                const lApproval = l.approvalStatus || 'pending';
                const durasi    = l.durasi != null
                  ? Number(l.durasi)
                  : hitungDurasiMenit(l.jamMulai, l.jamSelesai);
                return (
                  <div key={lId} style={{
                    background: '#f8fafc', border: '1px solid #e2e8f0',
                    borderRadius: 8, padding: 10,
                  }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Clock size={12} style={{ color: '#d97706' }} />
                      <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: '#1e293b' }}>
                        {formatJamFlex(l.jamMulai)} – {formatJamFlex(l.jamSelesai)}
                      </span>
                      <span style={{ fontSize: 12, color: '#d97706', fontWeight: 700 }}>
                        {formatDurasiKompak(durasi)}
                      </span>
                      <ApprovalBadge approval={lApproval} />
                    </div>
                    {l.alasan && (
                      <p style={{ fontSize: 12, color: '#334155', margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>
                        {l.alasan}
                      </p>
                    )}
                    {l.alasanTolak && (
                      <p style={{ fontSize: 12, color: '#b91c1c', margin: '6px 0 0' }}>
                        Ditolak: {l.alasanTolak}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Foto & lokasi */}
        {(fotoCheckin || fotoCheckout || jamCheckin || jamCheckout) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FotoCard title="CHECK-IN" url={fotoCheckin} jam={jamCheckin} lokasi={lokasiCheckin} badgeColor="#059669" />
            <FotoCard title="CHECK-OUT" url={fotoCheckout} jam={jamCheckout} lokasi={lokasiCheckout} badgeColor="#ea580c" />
          </div>
        )}

        {/* Lampiran */}
        {lampiran && (
          <div>
            <p style={{ color: 'rgba(100,116,139,0.9)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>
              Lampiran
            </p>
            <a
              href={lampiran}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 12px', borderRadius: 8,
                background: '#f1f5f9', border: '1px solid #e2e8f0',
                color: '#3b82f6', fontSize: 12, fontWeight: 600,
              }}
            >
              <FileText size={13} /> Lihat Lampiran <ExternalLink size={11} />
            </a>
          </div>
        )}

        {approval === 'disetujui' && approvedByNama && (
          <p className="text-xs text-slate-500">
            Disetujui oleh <b>{approvedByNama}</b>
            {approvedAt && <> · {formatDateTime(approvedAt)}</>}
          </p>
        )}
      </div>
    </Modal>
  );
}

// ── Page ─────────────────────────────────────────────────────────
export default function OwnerAbsensiPage() {
  const { user } = useAuth();
  const [activeCabangs, setActiveCabangs] = useState([]);

  const [bulan, setBulan]           = useState(bulanIniStr());
  const [cabangId, setCabangId]     = useState('');
  const [statusFilter, setStatusFilter]     = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');

  // Aggregate totals dari backend summary array per cabang (default 0 semua)
  const [totals, setTotals] = useState({ hadir: 0, izin: 0, sakit: 0, cuti: 0 });
  const [pendingCount, setPendingCount] = useState(0);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage]       = useState(1);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);

  const [tolakOpen, setTolakOpen] = useState(false);
  const [tolakTarget, setTolakTarget] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [approvingLemburId, setApprovingLemburId] = useState(null);

  // Load cabang list
  const loadCabangs = useCallback(async () => {
    try {
      const { data: res } = await api.get('/owner/dashboard');
      const list = res.data?.subscriptions?.filter(s => ['aktif','gratis'].includes(s.status)) || [];
      setActiveCabangs(list);
    } catch { /* silent */ }
  }, []);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const params = { bulan };
      if (cabangId) params.cabang = cabangId;
      const r = await ownerAPI.getAbsensiSummary(params);
      // Backend: { success, startDate, endDate, summary: [...perCabang], pendingCount }
      // Setiap item: { cabangId, cabangNama, hadir, izin, sakit, cuti, total }
      const perCabang = Array.isArray(r.data?.summary) ? r.data.summary : [];
      const agg = perCabang.reduce((acc, s) => ({
        hadir: acc.hadir + (s.hadir || 0),
        izin:  acc.izin  + (s.izin  || 0),
        sakit: acc.sakit + (s.sakit || 0),
        cuti:  acc.cuti  + (s.cuti  || 0),
      }), { hadir: 0, izin: 0, sakit: 0, cuti: 0 });
      setTotals(agg);
      setPendingCount(r.data?.pendingCount || 0);
    } catch {
      setTotals({ hadir: 0, izin: 0, sakit: 0, cuti: 0 });
      setPendingCount(0);
    } finally { setSummaryLoading(false); }
  }, [bulan, cabangId]);

  const loadList = useCallback(async (targetPage = 1, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const params = { page: targetPage, limit: PAGE_SIZE, bulan };
      if (cabangId)       params.cabang   = cabangId;
      if (statusFilter)   params.status   = statusFilter;
      if (approvalFilter) params.approval = approvalFilter;
      const r = await ownerAPI.getAbsensiList(params);
      const list = r.data?.data?.items ?? r.data?.data ?? r.data ?? [];
      const arr  = Array.isArray(list) ? list : [];
      setHasMore(arr.length >= PAGE_SIZE);
      if (append) {
        setItems(prev => {
          const seen = new Set(prev.map(x => x._id || x.id));
          return [...prev, ...arr.filter(x => !seen.has(x._id || x.id))];
        });
      } else {
        setItems(arr);
      }
    } catch {
      toast.error('Gagal memuat data absensi');
      if (!append) setItems([]);
      setHasMore(false);
    } finally {
      if (append) setLoadingMore(false); else setLoading(false);
    }
  }, [bulan, cabangId, statusFilter, approvalFilter]);

  useEffect(() => { if (user) loadCabangs(); }, [user, loadCabangs]);
  useEffect(() => { if (user) loadSummary(); }, [user, loadSummary]);
  useEffect(() => {
    if (!user) return;
    setPage(1);
    loadList(1, false);
  }, [user, loadList]);

  const handleMuatLebih = () => {
    const next = page + 1;
    setPage(next);
    loadList(next, true);
  };

  const handleRefresh = () => {
    setPage(1);
    loadList(1, false);
    loadSummary();
  };

  const openDetail = (item) => {
    setDetailData(item);
    setDetailOpen(true);
  };

  // Approve/reject
  const doApprove = async (item) => {
    const id = item._id || item.id;
    setApprovingId(id);
    try {
      await ownerAPI.approveAbsensi(id, { approve: true });
      toast.success('Pengajuan disetujui');
      handleRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyetujui');
    } finally {
      setApprovingId(null);
    }
  };

  const openTolak = (item) => {
    setTolakTarget(item);
    setTolakOpen(true);
  };

  const doReject = async (alasan) => {
    if (!tolakTarget) return;
    const id = tolakTarget._id || tolakTarget.id;
    setApprovingId(id);
    try {
      await ownerAPI.approveAbsensi(id, { approve: false, alasanTolak: alasan });
      toast.success('Pengajuan ditolak');
      setTolakOpen(false);
      setTolakTarget(null);
      handleRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menolak');
    } finally {
      setApprovingId(null);
    }
  };

  // Approve/reject lembur — reject pakai window.prompt (konsisten dgn
  // OwnerKaryawanDetailPage) supaya tidak menambah TolakModal target-type.
  const handleApproveLembur = async (lemburId, approve) => {
    let alasanTolak;
    if (!approve) {
      const alasan = window.prompt('Alasan penolakan lembur:');
      if (alasan == null) return; // user cancel
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
      handleRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memproses lembur');
    } finally {
      setApprovingLemburId(null);
    }
  };

  // pendingCount datang dari backend summary (global lintas semua absensi
  // yang ter-scope owner), bukan hasil filter items paginated — supaya angka
  // badge tetap akurat walau list sedang di-paging/di-filter.

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto pb-24 lg:pb-6">
      {/* Header filter */}
      <GradientPanel style={{ marginBottom: 16 }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Fingerprint size={16} style={{ color: '#fff' }} />
            </div>
            <div className="min-w-0">
              <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>
                Absensi Karyawan
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, margin: '2px 0 0' }}>
                Pantau kehadiran & setujui pengajuan izin
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <input
              type="month"
              value={bulan}
              onChange={(e) => setBulan(e.target.value)}
              style={{ ...controlBase, cursor: 'pointer', colorScheme: 'dark' }}
            />
            <select
              value={cabangId}
              onChange={(e) => setCabangId(e.target.value)}
              style={{ ...controlBase, cursor: 'pointer' }}
            >
              <option value="" style={{ color: '#1e293b' }}>Semua Cabang</option>
              {activeCabangs.map(sub => (
                <option key={sub.cabang?._id} value={sub.cabang?._id} style={{ color: '#1e293b' }}>
                  {sub.cabang?.nama}
                </option>
              ))}
            </select>
            <button
              type="button" onClick={handleRefresh} disabled={loading}
              title="Muat ulang"
              style={{
                padding: 8, borderRadius: 10,
                background: 'rgba(255,255,255,0.08)',
                border: '0.5px solid rgba(255,255,255,0.15)',
                color: '#fff', display: 'flex', alignItems: 'center',
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filter status + approval */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter size={13} style={{ color: 'rgba(255,255,255,0.65)' }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>Status:</span>
            <div className="flex gap-1 p-1 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.10)' }}>
              {STATUS_FILTERS.map(([k, l]) => (
                <button key={k || 'all-s'} type="button" onClick={() => setStatusFilter(k)}
                  style={{
                    padding: '4px 10px', borderRadius: 6,
                    fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: statusFilter === k ? '#7F77DD' : 'transparent',
                    color: statusFilter === k ? '#fff' : 'rgba(255,255,255,0.65)',
                    transition: 'background 0.15s',
                  }}>{l}</button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>Approval:</span>
            <div className="flex gap-1 p-1 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.10)' }}>
              {APPROVAL_FILTERS.map(([k, l]) => (
                <button key={k || 'all-a'} type="button" onClick={() => setApprovalFilter(k)}
                  style={{
                    padding: '4px 10px', borderRadius: 6,
                    fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                    background: approvalFilter === k ? '#7F77DD' : 'transparent',
                    color: approvalFilter === k ? '#fff' : 'rgba(255,255,255,0.65)',
                    transition: 'background 0.15s',
                  }}>{l}</button>
              ))}
            </div>
          </div>
        </div>
      </GradientPanel>

      {/* Summary cards — aggregate lintas cabang untuk periode bulan terpilih */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <SummaryCard icon={CheckCircle2} label="Hadir"  value={summaryLoading ? '…' : totals.hadir}  color="#6EE7B7" />
        <SummaryCard icon={FileText}     label="Izin"   value={summaryLoading ? '…' : totals.izin}   color="#93C5FD" />
        <SummaryCard icon={AlertCircle}  label="Sakit"  value={summaryLoading ? '…' : totals.sakit}  color="#D8B4FE" />
        <SummaryCard icon={CalendarDays} label="Cuti"   value={summaryLoading ? '…' : totals.cuti}   color="#AFA9EC" />
      </div>

      {/* Pending badge */}
      {pendingCount > 0 && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(252,211,77,0.18) 0%, rgba(251,146,60,0.15) 100%)',
          border: '0.5px solid rgba(252,211,77,0.45)',
          borderRadius: 12, padding: '10px 14px',
          marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'rgba(252,211,77,0.25)',
            border: '1px solid rgba(252,211,77,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertCircle size={16} style={{ color: '#FCD34D' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 0 }}>
              {pendingCount} Pengajuan Pending
            </p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, margin: '2px 0 0' }}>
              Menunggu persetujuan Owner
            </p>
          </div>
          <span style={{
            background: '#FCD34D', color: '#78350F',
            padding: '4px 10px', borderRadius: 999,
            fontSize: 12, fontWeight: 800,
          }}>{pendingCount}</span>
        </div>
      )}

      {/* List */}
      <GradientPanel>
        {loading ? (
          <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center' }}>
            <div className="animate-spin" style={{
              width: 24, height: 24, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.2)',
              borderTopColor: '#fff',
            }} />
          </div>
        ) : items.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.12)',
            borderRadius: 12, padding: '40px 20px',
            textAlign: 'center',
          }}>
            <Users size={28} style={{ color: 'rgba(255,255,255,0.35)', margin: '0 auto 10px' }} />
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 0 }}>
              Tidak ada data absensi
            </p>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: '4px 0 0' }}>
              Coba ubah filter atau pilih bulan lain.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((r) => {
              const key         = r._id || r.id;
              // Backend populate: user = { _id, name, username, role }, cabang = { _id, nama, kode }
              const userName    = r.user?.name;
              const userIdSeed  = r.user?._id || userName || '';
              const cabangName  = r.cabang?.nama;
              const approval    = r.approvalStatus;
              const jamIn       = r.checkIn?.waktu;
              const jamOut      = r.checkOut?.waktu;
              const av          = AVATAR_COLORS[hashIdx(String(userIdSeed), AVATAR_COLORS.length)];
              // Yang perlu approval owner: hanya status non-hadir & masih pending
              const isPending   = approval === 'pending' && r.status !== 'hadir';
              // Lembur embed — bisa ada di record apapun (termasuk 'hadir').
              const lemburArr        = Array.isArray(r.lembur) ? r.lembur : [];
              const lemburPending    = lemburArr.filter(l => (l.approvalStatus || 'pending') === 'pending');
              const hasLemburPending = lemburPending.length > 0;
              return (
                <div
                  key={key}
                  onClick={() => openDetail(r)}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: (isPending || hasLemburPending)
                      ? '0.5px solid rgba(252,211,77,0.45)'
                      : '0.5px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, padding: 14,
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Kiri: avatar + info */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: av.bg, color: av.color, fontWeight: 700, fontSize: 13 }}>
                        {initialsOf(userName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate" style={{ color: '#fff' }}>
                            {userName || '—'}
                          </p>
                          <StatusBadge status={r.status} />
                          <ApprovalBadge approval={approval} />
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                          {cabangName || '—'} · {formatDate(r.tanggal, { weekday: 'short' })}
                        </p>
                        {r.keterangan && (
                          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.7)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {r.keterangan}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Kanan: jam / aksi */}
                    <div className="text-right shrink-0" style={{ minWidth: 90 }}>
                      {(jamIn || jamOut) ? (
                        <>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontFamily: 'monospace', margin: 0 }}>
                            <LogIn size={10} style={{ display: 'inline', color: '#6EE7B7', verticalAlign: 'middle' }} /> {formatJam(jamIn)}
                          </p>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontFamily: 'monospace', margin: '2px 0 0' }}>
                            <LogOut size={10} style={{ display: 'inline', color: '#FDBA74', verticalAlign: 'middle' }} /> {formatJam(jamOut)}
                          </p>
                        </>
                      ) : (
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', margin: 0 }}>—</p>
                      )}
                    </div>
                  </div>

                  {/* Approve/reject buttons */}
                  {isPending && (
                    <div className="mt-3 pt-3 flex gap-2 justify-end" style={{ borderTop: '0.5px solid rgba(255,255,255,0.1)' }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openTolak(r); }}
                        disabled={approvingId === key}
                        style={{
                          padding: '6px 14px', borderRadius: 8,
                          background: 'rgba(248,113,113,0.15)',
                          border: '0.5px solid rgba(248,113,113,0.35)',
                          color: '#F87171', fontSize: 12, fontWeight: 600,
                          cursor: approvingId === key ? 'wait' : 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          opacity: approvingId === key ? 0.6 : 1,
                        }}
                      >
                        <XCircle size={13} /> Tolak
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); doApprove(r); }}
                        disabled={approvingId === key}
                        style={{
                          padding: '6px 14px', borderRadius: 8,
                          background: 'rgba(110,231,183,0.15)',
                          border: '0.5px solid rgba(110,231,183,0.4)',
                          color: '#6EE7B7', fontSize: 12, fontWeight: 600,
                          cursor: approvingId === key ? 'wait' : 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          opacity: approvingId === key ? 0.6 : 1,
                        }}
                      >
                        {approvingId === key
                          ? <Loader2 size={13} className="animate-spin" />
                          : <CheckCircle2 size={13} />}
                        Setuju
                      </button>
                    </div>
                  )}

                  {/* Lembur section — tampil kalau record punya embed lembur.
                      Tombol aksi hanya untuk item pending. */}
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
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
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
                                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', margin: '4px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                      {l.alasan}
                                    </p>
                                  )}
                                  {l.alasanTolak && (
                                    <p style={{ fontSize: 11, color: '#F87171', margin: '4px 0 0' }}>
                                      Ditolak: {l.alasanTolak}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {lPending && lId && (
                                <div className="mt-2 pt-2 flex gap-2 justify-end" style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleApproveLembur(lId, false); }}
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
                                    onClick={(e) => { e.stopPropagation(); handleApproveLembur(lId, true); }}
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

            {hasMore && (
              <div className="pt-3 flex justify-center">
                <button
                  type="button" onClick={handleMuatLebih} disabled={loadingMore}
                  style={{
                    padding: '8px 20px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.08)',
                    border: '0.5px solid rgba(255,255,255,0.2)',
                    color: '#fff', fontSize: 12, fontWeight: 600,
                    cursor: loadingMore ? 'wait' : 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    opacity: loadingMore ? 0.6 : 1,
                  }}
                >
                  {loadingMore ? <Loader2 size={13} className="animate-spin" /> : null}
                  {loadingMore ? 'Memuat...' : 'Muat lebih banyak'}
                </button>
              </div>
            )}
          </div>
        )}
      </GradientPanel>

      <DetailModal open={detailOpen} onClose={() => setDetailOpen(false)} data={detailData} />
      <TolakModal
        open={tolakOpen}
        onClose={() => { setTolakOpen(false); setTolakTarget(null); }}
        onConfirm={doReject}
        loading={approvingId != null}
      />
    </div>
  );
}

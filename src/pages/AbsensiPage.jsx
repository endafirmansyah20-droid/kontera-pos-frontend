import React, { useState, useEffect, useRef } from 'react';
import { absensiAPI } from '../services/api';
import { formatDate } from '../utils/helpers';
import { isIOS, isStandalonePWA } from '../utils/device';
import { PageHeader, Modal, Loader, EmptyState } from '../components/UI';
import {
  Clock, MapPin, Camera, LogIn, LogOut, FileText, CalendarDays,
  CheckCircle2, XCircle, AlertCircle, Loader2, Upload, ImagePlus,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_IZIN_LABEL = {
  izin:  'Izin',
  sakit: 'Sakit',
  cuti:  'Cuti',
};

const APPROVAL_BADGE = {
  pending:   { label: 'Menunggu',  cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  disetujui: { label: 'Disetujui', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  ditolak:   { label: 'Ditolak',   cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

const STATUS_ABSENSI_BADGE = {
  hadir: { label: 'Hadir', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  izin:  { label: 'Izin',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  sakit: { label: 'Sakit', cls: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
  cuti:  { label: 'Cuti',  cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
};

// Kompres file gambar ke max width 1280px + JPEG quality 0.7 via canvas.
// Return: Promise<Blob>
function compressImage(file, maxWidth = 1280, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Kompresi gagal')),
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('File bukan gambar valid'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}

// Bungkus getCurrentPosition jadi promise dengan hard timeout 20s.
// Why: di iOS PWA standalone (Home Screen), WebKit punya bug di mana permission
// dialog gagal muncul dan callback tidak pernah dipanggil — opsi `timeout` di
// options ikut diabaikan → promise hang selamanya, UI stuck di "Memproses".
// Guard manual pakai setTimeout memastikan flow selalu resolve/reject.
function getGPS() {
  const iosPwa = isIOS() && isStandalonePWA();
  const iosDeniedMsg =
    'Izin lokasi ditolak. Buka Settings iPhone → Privacy & Security → Location Services, aktifkan untuk aplikasi ini.';
  const iosTimeoutMsg =
    'Timeout mengambil lokasi. Buka Settings iPhone → Privacy & Security → Location Services, pastikan aktif untuk aplikasi ini, lalu coba lagi.';

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Browser tidak mendukung GPS'));

    let settled = false;
    const HARD_TIMEOUT_MS = 20000;
    const hardTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(iosPwa ? iosTimeoutMsg : 'Timeout mengambil lokasi. Coba lagi atau cek izin lokasi.'));
    }, HARD_TIMEOUT_MS);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return;
        settled = true;
        clearTimeout(hardTimer);
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          akurasi: pos.coords.accuracy,
        });
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(hardTimer);
        const map = {
          1: iosPwa ? iosDeniedMsg : 'Izin lokasi ditolak. Aktifkan di pengaturan browser.',
          2: 'Lokasi tidak tersedia. Cek koneksi GPS.',
          3: iosPwa ? iosTimeoutMsg : 'Timeout mengambil lokasi. Coba lagi.',
        };
        reject(new Error(map[err.code] || 'Gagal mengambil lokasi'));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

// Format jam HH:MM dari ISO string / null
function formatJam(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "HH:MM" atau ISO string → "HH:MM"
function formatJamFlex(v) {
  if (!v) return '-';
  if (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)) return v;
  return formatJam(v);
}

// Menit → "Xj Ym" (kompak)
function formatDurasiMenit(menit) {
  const m = Number(menit) || 0;
  const j = Math.floor(m / 60);
  const sisa = m % 60;
  if (j === 0) return `${sisa}m`;
  if (sisa === 0) return `${j}j`;
  return `${j}j ${sisa}m`;
}

// Hitung menit antara dua nilai jam. Terima "HH:MM" (input form) maupun
// ISO datetime (bentuk yang di-return backend untuk riwayat lembur).
function hitungDurasiMenit(jamMulai, jamSelesai) {
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
}

// Rakit ISO datetime lokal dari YYYY-MM-DD + HH + MM.
// Format "YYYY-MM-DDTHH:MM:00" (tanpa Z) → per ES spec di-parse sebagai
// LOCAL time, jadi `.toISOString()` menghasilkan UTC yang sesuai. Ini yang
// diharapkan backend supaya bisa dibaca sebagai Date valid.
function jamToISO(tanggalYMD, hh, mm) {
  const h = String(hh).padStart(2, '0');
  const m = String(mm).padStart(2, '0');
  return new Date(`${tanggalYMD}T${h}:${m}:00`).toISOString();
}

// YYYY-MM-DD hari ini (lokal)
function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// YYYY-MM-DD N hari lalu
function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// YYYY-MM string dari Date (default sekarang)
function bulanIni() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Konversi input <select> "2026-08" jadi label bulan
function labelBulan(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(d);
}

// ─── Card Status Hari Ini ─────────────────────────────────────────
// Baca langsung dari raw dokumen Absensi (skema Mongoose):
//   { status, checkIn: { waktu, ... }, checkOut: { waktu, ... },
//     approvalStatus, keterangan, ... }
// atau `status === null` kalau belum ada catatan hari ini.
function StatusHariIniCard({ status, loading }) {
  if (loading) {
    return (
      <div className="card p-4">
        <Loader size="sm" />
      </div>
    );
  }

  const sudahCheckin  = !!status?.checkIn?.waktu;
  const sudahCheckout = !!status?.checkOut?.waktu;
  const jamCheckin    = status?.checkIn?.waktu;
  const jamCheckout   = status?.checkOut?.waktu;
  const isIzin        = status && status.status !== 'hadir';

  // Prioritas render: izin → sudah checkout → sudah checkin → belum apa-apa
  if (isIzin) {
    const approval = APPROVAL_BADGE[status.approvalStatus] || APPROVAL_BADGE.pending;
    return (
      <div className="card p-4 border-l-4 border-blue-500">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40">
            <FileText className="text-blue-600 dark:text-blue-300" size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">
              Status Hari Ini
            </p>
            <p className="text-base font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              Pengajuan {STATUS_IZIN_LABEL[status.status] || status.status}
            </p>
            <span className={`inline-block mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full ${approval.cls}`}>
              {approval.label}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (sudahCheckout) {
    return (
      <div className="card p-4 border-l-4 border-green-500">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-green-100 dark:bg-green-900/40">
            <CheckCircle2 className="text-green-600 dark:text-green-300" size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">
              Status Hari Ini
            </p>
            <p className="text-base font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              Sudah Check-Out
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Check-in <span className="font-semibold text-slate-700 dark:text-slate-200">{formatJam(jamCheckin)}</span>
              {' · '}Check-out <span className="font-semibold text-slate-700 dark:text-slate-200">{formatJam(jamCheckout)}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (sudahCheckin) {
    return (
      <div className="card p-4 border-l-4 border-blue-500">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40">
            <Clock className="text-blue-600 dark:text-blue-300" size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">
              Status Hari Ini
            </p>
            <p className="text-base font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              Sudah Check-In
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Jam <span className="font-semibold text-slate-700 dark:text-slate-200">{formatJam(jamCheckin)}</span>
              {' · '}Belum check-out
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4 border-l-4 border-slate-300">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700">
          <AlertCircle className="text-slate-500 dark:text-slate-300" size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">
            Status Hari Ini
          </p>
          <p className="text-base font-bold text-slate-800 dark:text-slate-100 mt-0.5">
            Belum Check-In
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Silakan lakukan check-in untuk memulai jam kerja
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Ajukan Izin/Sakit/Cuti ─────────────────────────────────
function IzinModal({ open, onClose, onSuccess }) {
  const [statusPilih, setStatusPilih] = useState('izin');
  const [keterangan, setKeterangan]   = useState('');
  const [lampiran, setLampiran]       = useState(null); // File
  const [saving, setSaving]           = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setStatusPilih('izin');
      setKeterangan('');
      setLampiran(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!keterangan.trim()) return toast.error('Keterangan wajib diisi');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('status', statusPilih);
      fd.append('keterangan', keterangan.trim());
      if (lampiran) {
        // Kompres jika file gambar; kalau bukan gambar (misal PDF surat sakit),
        // kirim as-is
        if (lampiran.type.startsWith('image/')) {
          const blob = await compressImage(lampiran);
          fd.append('lampiran', blob, 'lampiran.jpg');
        } else {
          fd.append('lampiran', lampiran);
        }
      }
      await absensiAPI.izin(fd);
      toast.success('Pengajuan berhasil dikirim');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengirim pengajuan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Ajukan Izin / Sakit / Cuti" size="md">
      <div className="space-y-4">
        <div>
          <label className="label">Status *</label>
          <div className="grid grid-cols-3 gap-2">
            {['izin', 'sakit', 'cuti'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusPilih(s)}
                className={`px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition ${
                  statusPilih === s
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {STATUS_IZIN_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Keterangan *</label>
          <textarea
            className="input min-h-[100px]"
            placeholder="Jelaskan alasan pengajuan..."
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Lampiran (opsional)</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => setLampiran(e.target.files?.[0] || null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm"
          >
            <Upload size={16} />
            <span className="truncate flex-1 text-left">
              {lampiran ? lampiran.name : 'Pilih file (foto surat sakit, dsb)'}
            </span>
          </button>
          {lampiran && (
            <button
              type="button"
              onClick={() => { setLampiran(null); if (fileRef.current) fileRef.current.value = ''; }}
              className="mt-2 text-xs font-semibold text-red-500 hover:text-red-600"
            >
              Hapus lampiran
            </button>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button className="btn btn-outline flex-1" onClick={onClose} disabled={saving}>
            Batal
          </button>
          <button className="btn btn-primary flex-1" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {saving ? 'Mengirim...' : 'Kirim Pengajuan'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Konstanta untuk 2-select 24-jam. Pakai select alih-alih <input type="time">
// karena iOS Safari mengikut region 12-jam (AM/PM) walau lokal id-ID diset di
// browser — user request format 24-jam konsisten lintas platform.
const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

// 2-select JamPicker: state H & M dipegang terpisah oleh parent.
function JamPicker({ hVal, mVal, onH, onM, disabled }) {
  return (
    <div className="flex gap-2">
      <select
        aria-label="Jam"
        className="input flex-1"
        value={hVal}
        onChange={(e) => onH(e.target.value)}
        disabled={disabled}
      >
        <option value="">HH</option>
        {HOURS.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
      <select
        aria-label="Menit"
        className="input flex-1"
        value={mVal}
        onChange={(e) => onM(e.target.value)}
        disabled={disabled}
      >
        <option value="">MM</option>
        {MINUTES.map((x) => <option key={x} value={x}>{x}</option>)}
      </select>
    </div>
  );
}

// ─── Modal Ajukan Lembur ──────────────────────────────────────────
function LemburModal({ open, onClose, onSuccess }) {
  const MAX_DATE = todayStr();
  const MIN_DATE = daysAgoStr(30);

  const [tanggal, setTanggal]     = useState(MAX_DATE);
  const [mulaiH, setMulaiH]       = useState('');
  const [mulaiM, setMulaiM]       = useState('');
  const [selesaiH, setSelesaiH]   = useState('');
  const [selesaiM, setSelesaiM]   = useState('');
  const [alasan, setAlasan]       = useState('');
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (!open) {
      setTanggal(todayStr());
      setMulaiH(''); setMulaiM('');
      setSelesaiH(''); setSelesaiM('');
      setAlasan('');
    }
  }, [open]);

  // Compose "HH:MM" hanya jika kedua bagian terisi.
  const jamMulai   = mulaiH   && mulaiM   ? `${mulaiH}:${mulaiM}`     : '';
  const jamSelesai = selesaiH && selesaiM ? `${selesaiH}:${selesaiM}` : '';

  const durasiPreview = hitungDurasiMenit(jamMulai, jamSelesai);

  const handleSubmit = async () => {
    if (!tanggal) return toast.error('Tanggal wajib diisi');
    if (tanggal > MAX_DATE) return toast.error('Tanggal tidak boleh di masa depan');
    if (tanggal < MIN_DATE) return toast.error('Tanggal max 30 hari ke belakang');
    if (!jamMulai || !jamSelesai) return toast.error('Jam mulai & selesai wajib diisi');
    if (durasiPreview <= 0) return toast.error('Jam selesai harus lebih besar dari jam mulai');
    if (durasiPreview > 12 * 60) return toast.error('Durasi lembur maksimal 12 jam');
    if (!alasan.trim()) return toast.error('Alasan wajib diisi');

    setSaving(true);
    try {
      await absensiAPI.lembur({
        tanggal,
        jamMulai:   jamToISO(tanggal, mulaiH, mulaiM),
        jamSelesai: jamToISO(tanggal, selesaiH, selesaiM),
        alasan: alasan.trim(),
      });
      toast.success('Pengajuan lembur berhasil dikirim');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengirim pengajuan lembur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Ajukan Lembur" size="md">
      <div className="space-y-4">
        <div>
          <label className="label">Tanggal *</label>
          <input
            type="date"
            className="input"
            value={tanggal}
            min={MIN_DATE}
            max={MAX_DATE}
            onChange={(e) => setTanggal(e.target.value)}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Boleh pilih hari ini atau maksimal 30 hari ke belakang
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Jam Mulai *</label>
            <JamPicker
              hVal={mulaiH} mVal={mulaiM}
              onH={setMulaiH} onM={setMulaiM}
              disabled={saving}
            />
          </div>
          <div>
            <label className="label">Jam Selesai *</label>
            <JamPicker
              hVal={selesaiH} mVal={selesaiM}
              onH={setSelesaiH} onM={setSelesaiM}
              disabled={saving}
            />
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
          Format 24 jam (00 – 23)
        </p>

        {jamMulai && jamSelesai && durasiPreview > 0 && (
          <div className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg px-3 py-2">
            Durasi: <span className="font-semibold">{formatDurasiMenit(durasiPreview)}</span>
          </div>
        )}

        <div>
          <label className="label">Alasan *</label>
          <textarea
            className="input min-h-[100px]"
            placeholder="Jelaskan alasan lembur..."
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button className="btn btn-outline flex-1" onClick={onClose} disabled={saving}>
            Batal
          </button>
          <button className="btn btn-primary flex-1" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            {saving ? 'Mengirim...' : 'Kirim Pengajuan'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Halaman utama ────────────────────────────────────────────────
export default function AbsensiPage() {
  const [status, setStatus]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [processing, setProcessing] = useState(null); // 'checkin' | 'checkout' | null
  const [showIzin, setShowIzin]     = useState(false);
  const [showLembur, setShowLembur] = useState(false);
  const [riwayat, setRiwayat]       = useState([]);
  const [riwayatLoading, setRiwayatLoading] = useState(false);
  const [bulan, setBulan]           = useState(bulanIni());
  const [tabRiwayat, setTabRiwayat] = useState('absensi'); // 'absensi' | 'lembur'
  const [riwayatLembur, setRiwayatLembur] = useState([]);
  const [riwayatLemburLoading, setRiwayatLemburLoading] = useState(false);

  const checkinFileRef  = useRef(null);
  const checkoutFileRef = useRef(null);

  // Flag apakah handleFileChange sudah mulai jalan (user pilih foto).
  // Dipakai oleh window.focus listener di startCapture untuk mendeteksi
  // user cancel action sheet — kalau focus kembali ke window tapi flag ini
  // masih false, artinya picker ditutup tanpa pilih file → reset processing.
  const photoStartedRef = useRef(false);

  // Timer id safety-net (20s) untuk skenario di iOS PWA di mana focus /
  // visibilitychange TIDAK fire sama sekali saat picker capture=user close
  // (karena picker jadi in-app modal → WebKit tidak lose focus / hide page).
  // Di-clear waktu handleFileChange mulai jalan.
  const safetyNetTimerRef = useRef(null);

  // Deteksi platform sekali per-render; dipakai untuk atur behavior file input
  // (drop `capture` di iOS) dan menampilkan hint permission khusus iOS-PWA.
  const iosDevice = isIOS();
  const iosPwaMode = iosDevice && isStandalonePWA();

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    loadRiwayat();
    loadRiwayatLembur();
  }, [bulan]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const { data } = await absensiAPI.getHariIni();
      // Backend: { success, data: <Absensi doc | null>, cabang, maxJarakMeter }
      // Explicit ?? null — kalau doc null (belum absen), jangan fallback ke
      // wrapper (yang tidak punya field checkIn/checkOut/status).
      setStatus(data?.data ?? null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memuat status absensi');
    } finally {
      setLoading(false);
    }
  };

  const loadRiwayat = async () => {
    setRiwayatLoading(true);
    try {
      const { data } = await absensiAPI.getRiwayat(bulan);
      const list = data.data || data || [];
      setRiwayat(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memuat riwayat');
    } finally {
      setRiwayatLoading(false);
    }
  };

  const loadRiwayatLembur = async () => {
    setRiwayatLemburLoading(true);
    try {
      const { data } = await absensiAPI.getRiwayatLembur(bulan);
      const list = data.data || data || [];
      setRiwayatLembur(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memuat riwayat lembur');
    } finally {
      setRiwayatLemburLoading(false);
    }
  };

  // Tahap 1: klik tombol check-in/out → langsung buka kamera (SYNCHRONOUS).
  // PENTING: .click() pada <input type=file> HARUS dipanggil synchronous di
  // dalam user gesture asli. Kalau ada `await` sebelum .click() (mis. await
  // getGPS()), Safari/WebKit — terutama di PWA standalone — akan silently
  // reject membuka picker/kamera: tidak error, tidak popup, stuck selamanya.
  // Chrome/Android lebih longgar tapi kita samakan flow buat konsistensi.
  // GPS dipindah ke handleFileChange (setelah user selesai motret).
  const startCapture = (mode) => {
    setProcessing(mode);
    photoStartedRef.current = false;
    const ref = mode === 'checkin' ? checkinFileRef : checkoutFileRef;

    // Deteksi user cancel picker: `<input type=file>` TIDAK fire `onChange`
    // kalau user tap Cancel. Register 2 event, yang duluan fire menang:
    //   • `focus` — reliable di desktop/Android
    //   • `visibilitychange` — di iOS PWA sering fire lebih dulu dari focus
    //     saat kamera app close & PWA jadi visible lagi
    // Setelah trigger, tunggu 250ms untuk kasih handleFileChange kesempatan
    // set photoStartedRef (normalnya fire dalam beberapa ms setelah user
    // pilih file). Kalau flag masih false → user cancel, reset processing.
    let armed = true;
    const onFire = () => {
      if (!armed) return;
      armed = false;
      window.removeEventListener('focus', onFire);
      document.removeEventListener('visibilitychange', onVisibility);
      setTimeout(() => {
        if (!photoStartedRef.current) setProcessing(null);
      }, 250);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') onFire();
    };
    window.addEventListener('focus', onFire);
    document.addEventListener('visibilitychange', onVisibility);

    // Safety-net: kalau dalam 20 detik handleFileChange belum jalan (event
    // fast-path gagal fire, misal di iOS PWA capture=user), paksa reset.
    // 20s pilih sebagai kompromi: cukup pendek supaya stuck-user tidak
    // sampai reload, cukup panjang supaya tidak interrupt normal camera
    // flow (framing → snap → confirm biasanya <15s). Non-fatal kalau
    // fire di tengah alur normal: handleFileChange tetap complete.
    safetyNetTimerRef.current = setTimeout(() => {
      safetyNetTimerRef.current = null;
      if (!photoStartedRef.current) {
        armed = false;
        window.removeEventListener('focus', onFire);
        document.removeEventListener('visibilitychange', onVisibility);
        setProcessing(null);
      }
    }, 20000);

    ref.current?.click();
  };

  // Tahap 2: user pilih/ambil foto → ambil GPS → kompres → submit
  const handleFileChange = async (mode, e) => {
    photoStartedRef.current = true; // signal ke cancel-detector: jangan reset
    if (safetyNetTimerRef.current) {
      clearTimeout(safetyNetTimerRef.current);
      safetyNetTimerRef.current = null;
    }
    const file = e.target.files?.[0];
    // Reset value biar bisa pilih file sama lagi nanti
    e.target.value = '';
    if (!file) {
      setProcessing(null);
      return;
    }

    try {
      const gps = await getGPS();
      const blob = await compressImage(file);
      const fd = new FormData();
      fd.append('foto', blob, 'absensi.jpg');
      fd.append('lat', String(gps.lat));
      fd.append('lng', String(gps.lng));
      fd.append('akurasi', String(gps.akurasi));

      const apiCall = mode === 'checkin' ? absensiAPI.checkin : absensiAPI.checkout;
      await apiCall(fd);
      toast.success(mode === 'checkin' ? 'Check-in berhasil' : 'Check-out berhasil');
      await loadStatus();
      await loadRiwayat();
    } catch (err) {
      // Bedakan error GPS/kompresi (Error murni) vs error API (punya err.response)
      if (err.response) {
        const meta = err.response.data?.meta;
        const msg  = err.response.data?.message || 'Gagal memproses absensi';
        if (err.response.status === 400 && meta?.jarak != null) {
          toast.error(`${msg} (jarak ${Math.round(meta.jarak)}m dari lokasi cabang)`, { duration: 6000 });
        } else {
          toast.error(msg);
        }
      } else {
        toast.error(err.message || 'Gagal memproses absensi');
      }
    } finally {
      setProcessing(null);
    }
  };

  // Kondisi tombol — derive dari skema Mongoose asli.
  // Kalau `status` null = belum ada catatan sama sekali → belum check-in.
  // Kalau `status.status !== 'hadir'` = sudah ajukan izin/sakit/cuti hari ini.
  const isIzinHariIni = !!status && status.status !== 'hadir';
  const belumCheckin  = !status?.checkIn?.waktu && !isIzinHariIni;
  const bisaCheckout  = !!status?.checkIn?.waktu && !status?.checkOut?.waktu && !isIzinHariIni;

  return (
    // Pakai .mobile-pb (index.css @layer components) di root AbsensiPage —
    // di Layout wrapper class ini kalah cascade sama `p-4` utility di
    // className yang sama, jadi tidak efektif untuk halaman lain. Di sini
    // tidak ada utility padding yang bersaing, jadi .mobile-pb apply penuh
    // (5rem + safe-bottom). `lg:pb-0` (utility) override di desktop.
    <div className="mobile-pb lg:pb-0">
      <PageHeader
        title="Absensi"
        subtitle="Check-in, check-out, dan pengajuan izin"
      />

      {loading && !status ? (
        <div className="card p-4"><Loader /></div>
      ) : (
        <div className="space-y-4">
          <StatusHariIniCard status={status} loading={loading} />

          {/* Aksi utama */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">
              Aksi
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={() => startCapture('checkin')}
                disabled={!belumCheckin || processing !== null}
                className="btn bg-green-600 text-white hover:bg-green-700 justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing === 'checkin'
                  ? <Loader2 size={18} className="animate-spin" />
                  : <LogIn size={18} />}
                <span>{processing === 'checkin' ? 'Memproses...' : 'Check-In'}</span>
              </button>

              <button
                onClick={() => startCapture('checkout')}
                disabled={!bisaCheckout || processing !== null}
                className="btn bg-orange-600 text-white hover:bg-orange-700 justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing === 'checkout'
                  ? <Loader2 size={18} className="animate-spin" />
                  : <LogOut size={18} />}
                <span>{processing === 'checkout' ? 'Memproses...' : 'Check-Out'}</span>
              </button>

              <button
                onClick={() => setShowIzin(true)}
                disabled={processing !== null}
                className="btn bg-blue-600 text-white hover:bg-blue-700 justify-center py-3 disabled:opacity-50"
              >
                <FileText size={18} />
                <span>Ajukan Izin</span>
              </button>

              <button
                onClick={() => setShowLembur(true)}
                disabled={processing !== null}
                className="btn bg-purple-600 text-white hover:bg-purple-700 justify-center py-3 disabled:opacity-50"
              >
                <Clock size={18} />
                <span>Ajukan Lembur</span>
              </button>
            </div>

            {/* Hidden file inputs — `capture="user"` skip action sheet dan
                langsung buka kamera depan (selfie) di mobile. Aman dipakai di
                iOS PWA sekarang karena root cause bug lama (await sebelum
                .click() → picker tidak pernah buka) sudah difix. */}
            <input
              ref={checkinFileRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => handleFileChange('checkin', e)}
            />
            <input
              ref={checkoutFileRef}
              type="file"
              accept="image/*"
              capture="user"
              className="hidden"
              onChange={(e) => handleFileChange('checkout', e)}
            />

            <div className="mt-3 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
              <MapPin size={12} className="mt-0.5 flex-shrink-0" />
              <p>
                Check-in/out memerlukan akses lokasi (GPS) dan kamera untuk foto selfie.
                Pastikan izin lokasi & kamera aktif di browser.
              </p>
            </div>
            {iosPwaMode && (
              <div className="mt-2 flex items-start gap-2 text-xs text-blue-600 dark:text-blue-300">
                <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                <p>
                  Di iPhone: pastikan izin Lokasi & Kamera aktif di
                  {' '}<span className="font-semibold">Settings → nama app</span>.
                </p>
              </div>
            )}
          </div>

          {/* Riwayat bulan ini */}
          <div className="card p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-slate-500 dark:text-slate-400" />
                <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                  Riwayat {labelBulan(bulan)}
                </p>
              </div>
              <input
                type="month"
                value={bulan}
                onChange={(e) => setBulan(e.target.value)}
                className="input py-1.5 max-w-[180px]"
              />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-700 mb-3">
              <button
                type="button"
                onClick={() => setTabRiwayat('absensi')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition ${
                  tabRiwayat === 'absensi'
                    ? 'bg-white text-slate-800 dark:bg-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Riwayat Absensi
              </button>
              <button
                type="button"
                onClick={() => setTabRiwayat('lembur')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition ${
                  tabRiwayat === 'lembur'
                    ? 'bg-white text-slate-800 dark:bg-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Riwayat Lembur
              </button>
            </div>

            {tabRiwayat === 'absensi' ? (
              riwayatLoading ? (
                <Loader />
              ) : riwayat.length === 0 ? (
                <EmptyState message="Belum ada riwayat absensi bulan ini" icon={CalendarDays} />
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {riwayat.map((r) => {
                    const sBadge = STATUS_ABSENSI_BADGE[r.status] || { label: r.status, cls: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300' };
                    const aBadge = r.approvalStatus ? APPROVAL_BADGE[r.approvalStatus] : null;
                    const jamIn  = r.checkIn?.waktu;
                    const jamOut = r.checkOut?.waktu;
                    const key = r._id || r.id || r.tanggal;
                    return (
                      <div key={key} className="py-3 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {formatDate(r.tanggal, { weekday: 'short' })}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sBadge.cls}`}>
                              {sBadge.label}
                            </span>
                            {aBadge && (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${aBadge.cls}`}>
                                {aBadge.label}
                              </span>
                            )}
                          </div>
                          {r.keterangan && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                              {r.keterangan}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          {(jamIn || jamOut) ? (
                            <>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                <span className="text-green-600 dark:text-green-400">IN</span> {formatJam(jamIn)}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                                <span className="text-orange-600 dark:text-orange-400">OUT</span> {formatJam(jamOut)}
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-slate-400 italic">—</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              riwayatLemburLoading ? (
                <Loader />
              ) : riwayatLembur.length === 0 ? (
                <EmptyState message="Belum ada pengajuan lembur bulan ini" icon={Clock} />
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {riwayatLembur.map((l) => {
                    const aBadge  = l.approvalStatus ? APPROVAL_BADGE[l.approvalStatus] : APPROVAL_BADGE.pending;
                    const key     = l._id || l.id || `${l.tanggal}-${l.jamMulai}`;
                    const durasi  = l.durasi != null
                      ? Number(l.durasi)
                      : hitungDurasiMenit(l.jamMulai, l.jamSelesai);
                    return (
                      <div key={key} className="py-3 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {formatDate(l.tanggal, { weekday: 'short' })}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                            {formatJamFlex(l.jamMulai)} – {formatJamFlex(l.jamSelesai)}
                            {' · '}
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {formatDurasiMenit(durasi)}
                            </span>
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${aBadge.cls}`}>
                              {aBadge.label}
                            </span>
                          </div>
                          {l.alasan && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                              {l.alasan}
                            </p>
                          )}
                          {l.alasanTolak && (
                            <p className="text-xs text-red-500 dark:text-red-400 mt-1 line-clamp-2">
                              Ditolak: {l.alasanTolak}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      )}

      <IzinModal
        open={showIzin}
        onClose={() => setShowIzin(false)}
        onSuccess={() => { loadStatus(); loadRiwayat(); }}
      />

      <LemburModal
        open={showLembur}
        onClose={() => setShowLembur(false)}
        onSuccess={() => { loadRiwayatLembur(); }}
      />
    </div>
  );
}

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

// ─── Halaman utama ────────────────────────────────────────────────
export default function AbsensiPage() {
  const [status, setStatus]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [processing, setProcessing] = useState(null); // 'checkin' | 'checkout' | null
  const [showIzin, setShowIzin]     = useState(false);
  const [riwayat, setRiwayat]       = useState([]);
  const [riwayatLoading, setRiwayatLoading] = useState(false);
  const [bulan, setBulan]           = useState(bulanIni());

  const checkinFileRef  = useRef(null);
  const checkoutFileRef = useRef(null);

  // Foto sementara + koordinat sementara antar step (pilih foto → submit).
  // Alur: klik tombol → minta GPS → buka kamera → onChange file → kompres → upload.
  const pendingGpsRef = useRef(null); // { lat, lng, akurasi }

  // Deteksi platform sekali per-render; dipakai untuk atur behavior file input
  // (drop `capture` di iOS) dan menampilkan hint permission khusus iOS-PWA.
  const iosDevice = isIOS();
  const iosPwaMode = iosDevice && isStandalonePWA();

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    loadRiwayat();
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

  // Tahap 1: klik tombol check-in/out → ambil GPS → buka kamera
  const startCapture = async (mode) => {
    setProcessing(mode);
    try {
      const gps = await getGPS();
      pendingGpsRef.current = gps;
      const ref = mode === 'checkin' ? checkinFileRef : checkoutFileRef;

      // Deteksi user cancel picker: `<input type=file>` TIDAK fire `onChange`
      // kalau user tap Cancel di action sheet iOS/Android, jadi processing
      // bisa stuck. Window regain focus ketika picker close (baik pilih file
      // maupun cancel). Kalau setelah 500ms handleFileChange belum reset
      // pendingGpsRef → anggap cancel dan reset manual.
      const onFocus = () => {
        window.removeEventListener('focus', onFocus);
        setTimeout(() => {
          if (pendingGpsRef.current) {
            pendingGpsRef.current = null;
            setProcessing(null);
          }
        }, 500);
      };
      window.addEventListener('focus', onFocus);

      ref.current?.click();
    } catch (err) {
      toast.error(err.message || 'Gagal mengambil lokasi');
      setProcessing(null);
    }
  };

  // Tahap 2: user pilih/ambil foto → kompres → submit
  const handleFileChange = async (mode, e) => {
    const file = e.target.files?.[0];
    // Reset value biar bisa pilih file sama lagi nanti
    e.target.value = '';
    if (!file) {
      setProcessing(null);
      pendingGpsRef.current = null;
      return;
    }
    const gps = pendingGpsRef.current;
    if (!gps) {
      toast.error('Data lokasi hilang, coba lagi');
      setProcessing(null);
      return;
    }

    try {
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
      const meta = err.response?.data?.meta;
      const msg  = err.response?.data?.message || 'Gagal memproses absensi';
      if (err.response?.status === 400 && meta?.jarak != null) {
        toast.error(`${msg} (jarak ${Math.round(meta.jarak)}m dari lokasi cabang)`, { duration: 6000 });
      } else {
        toast.error(msg);
      }
    } finally {
      setProcessing(null);
      pendingGpsRef.current = null;
    }
  };

  // Kondisi tombol — derive dari skema Mongoose asli.
  // Kalau `status` null = belum ada catatan sama sekali → belum check-in.
  // Kalau `status.status !== 'hadir'` = sudah ajukan izin/sakit/cuti hari ini.
  const isIzinHariIni = !!status && status.status !== 'hadir';
  const belumCheckin  = !status?.checkIn?.waktu && !isIzinHariIni;
  const bisaCheckout  = !!status?.checkIn?.waktu && !status?.checkOut?.waktu && !isIzinHariIni;

  return (
    <div>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
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
            </div>

            {/* Hidden file inputs — accept camera on mobile.
                iOS PWA standalone punya bug WebKit: attribute `capture` kadang
                bikin native picker tidak muncul / onChange tidak fire setelah
                shutter. Untuk iOS drop `capture` → biarkan iOS action sheet
                muncul dengan pilihan "Take Photo / Photo Library". */}
            <input
              ref={checkinFileRef}
              type="file"
              accept="image/*"
              capture={iosDevice ? undefined : 'user'}
              className="hidden"
              onChange={(e) => handleFileChange('checkin', e)}
            />
            <input
              ref={checkoutFileRef}
              type="file"
              accept="image/*"
              capture={iosDevice ? undefined : 'user'}
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

            {riwayatLoading ? (
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
            )}
          </div>
        </div>
      )}

      <IzinModal
        open={showIzin}
        onClose={() => setShowIzin(false)}
        onSuccess={() => { loadStatus(); loadRiwayat(); }}
      />
    </div>
  );
}

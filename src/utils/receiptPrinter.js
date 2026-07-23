import { Capacitor, registerPlugin } from '@capacitor/core';
import { BluetoothPrinter } from '@kduma-autoid/capacitor-bluetooth-printer';
import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder';

// Custom plugin di android/app/src/main/java/.../BluetoothPermissionsPlugin.java.
// Diperlukan karena @kduma-autoid/capacitor-bluetooth-printer tidak declare permissions
// di @CapacitorPlugin annotation, jadi runtime permission Android 12+ tidak diminta ke user.
const BluetoothPermissions = registerPlugin('BluetoothPermissions');

// Plugin Android-side pakai `data.getBytes()` (UTF-8 default). Byte ESC/POS >= 0x80
// akan double-encoded jadi 2 byte UTF-8. Semua command ESC/POS (0x1B, 0x1D, 0x0A, dst.)
// ada di range 0x00-0x7F jadi aman lewat UTF-8. Konsekuensi: tidak boleh cetak gambar
// dan teks harus ASCII saja. Karakter non-ASCII di-strip jadi '?' sebelum masuk encoder.

const STORAGE_KEY_ADDRESS = 'printerAddress';
const STORAGE_KEY_NAME = 'printerName';
const RECEIPT_COLUMNS = 32; // kertas 58mm dengan font 12x24 = ~32 karakter/baris

// Chunking untuk kirim data ke printer via Bluetooth SPP. Plugin Android `print()`
// pakai single stream.write(data.getBytes()) tanpa chunking, jadi payload besar
// overflow RX buffer printer generic (~1KB) → byte drop (symptom: teks geser
// makin ke bawah, print terhenti di tengah). Split ke chunk + delay biar printer
// sempat proses sebelum menerima batch berikutnya.
const PRINT_CHUNK_SIZE = 256;
const PRINT_CHUNK_DELAY_MS = 50;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const isNative = () => Capacitor.isNativePlatform();

// Normalize semua whitespace Unicode (U+00A0 non-breaking space, en/em spaces, dll)
// ke spasi biasa (U+0020) DULU, baru strip sisa karakter non-ASCII jadi '?'.
// Tanpa langkah normalize, hasil Intl.NumberFormat('id-ID', {style:'currency'})
// yang sisipkan U+00A0 antara "Rp" dan angka (contoh: "Rp 950.000") jadi
// muncul sebagai "Rp?950.000" di struk — kena strip karena 0xA0 > 0x7F.
const toAscii = (str) => {
  if (str == null) return '';
  return String(str)
    .replace(/[   -   　﻿]/g, ' ')
    .replace(/[^\x00-\x7F]/g, '?');
};

// Convert Uint8Array → JS string 1-byte-per-char (Latin1), aman untuk byte < 0x80
const bytesToBinaryString = (bytes) => {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
};

const formatRupiahAscii = (n) => {
  const num = Number(n) || 0;
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(num);
};

const formatDateAscii = (d) => {
  const dt = d ? new Date(d) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};

const rowLeftRight = (left, right, width = RECEIPT_COLUMNS) => {
  const l = toAscii(left);
  const r = toAscii(right);
  const space = Math.max(1, width - l.length - r.length);
  const trimmedLeft = l.length + r.length + 1 > width
    ? l.slice(0, Math.max(0, width - r.length - 1))
    : l;
  return trimmedLeft + ' '.repeat(width - trimmedLeft.length - r.length) + r;
};

// Center manual pakai padding spasi — dipakai karena printer ZJiang generik
// tidak mengimplementasi ESC/POS align command (ESC a / GS a) di firmware-nya.
//
// CATATAN: leading spaces TIDAK bisa lewat encoder.line()/text() karena
// receipt-printer-encoder v3 di TextWrap.wrap (line 1618-1620) skip chunk
// whitespace kalau posisi awal line (length == 0). Solusinya kirim leading
// spaces sebagai raw bytes 0x20 via encoder.raw() supaya bypass TextWrap.
// Kalau teks >= width, kirim apa adanya (tidak dipotong, biarkan wrap alami).
const emitCenterLine = (encoder, text, width = RECEIPT_COLUMNS) => {
  const t = toAscii(text);
  if (t.length >= width) {
    encoder.line(t);
    return;
  }
  const leftPad = Math.floor((width - t.length) / 2);
  if (leftPad > 0) {
    encoder.raw(new Array(leftPad).fill(0x20));
  }
  encoder.line(t);
};

const PAYMENT_LABEL = {
  cash: 'TUNAI', qris: 'QRIS', transfer: 'TRANSFER', hutang: 'HUTANG',
};

export const getSavedPrinter = () => {
  try {
    const address = localStorage.getItem(STORAGE_KEY_ADDRESS);
    const name = localStorage.getItem(STORAGE_KEY_NAME);
    return address ? { address, name: name || address } : null;
  } catch {
    return null;
  }
};

// Deteksi jenis printer dari Bluetooth device name. Dipakai untuk kompensasi
// perbedaan default firmware — misal VSC MP-58C punya line spacing lebih rapat
// dari ZJiang dan ignore ESC 3 n, jadi butuh newline() manual antar item.
// Return 'unknown' → tidak ada kompensasi (aman default: layout sama seperti ZJiang).
export const getPrinterType = (name) => {
  const n = String(name || '').toLowerCase();
  if (n.includes('vsc') || n.includes('mp-58c') || n.includes('mp58c') || n.includes('rpp02n')) return 'vsc';
  if (n.includes('zjiang')) return 'zjiang';
  return 'unknown';
};

// Filter device Bluetooth berbasis substring nama — plugin tidak expose Class of
// Device (COD), jadi harus tebak dari nama. Keyword mencakup label brand/model umum
// printer thermal 58mm (RPP02N, ZJiang, Goojprt, XPrinter, dll). Device yang tidak
// match disembunyikan dari picker; user tetap bisa buka semua via toggle "Tampilkan
// semua device" kalau printer punya nama tidak standar.
const PRINTER_NAME_KEYWORDS = [
  'printer', 'print', 'pos', 'rpp', 'mtp', 'zjiang', 'vsc',
  'goojprt', 'bt-', 'thermal', 'xprinter', 'gprinter',
];
export const isLikelyPrinter = (device) => {
  const n = String(device?.name || '').toLowerCase();
  if (!n) return false;
  return PRINTER_NAME_KEYWORDS.some((k) => n.includes(k));
};

export const clearSavedPrinter = () => {
  try {
    localStorage.removeItem(STORAGE_KEY_ADDRESS);
    localStorage.removeItem(STORAGE_KEY_NAME);
  } catch {}
};

const PERMISSION_DENIED_MESSAGE =
  'Izin Bluetooth ditolak. Buka Pengaturan HP → Aplikasi → KonterA POS → Izin → "Perangkat di sekitar", lalu izinkan.';

// Request izin Bluetooth (BLUETOOTH_SCAN + BLUETOOTH_CONNECT di Android 12+).
// Idempotent: kalau sudah granted tidak buka dialog lagi. Untuk Android < 12 selalu granted.
export const requestPrinterPermissions = async () => {
  if (!isNative()) {
    return { ok: false, state: 'unsupported', message: 'Print Bluetooth hanya bisa di aplikasi Android (bukan browser).' };
  }
  try {
    const current = await BluetoothPermissions.checkPermissions();
    if (current?.bluetooth === 'granted') {
      return { ok: true, state: 'granted', message: '' };
    }
    const result = await BluetoothPermissions.requestPermissions();
    if (result?.bluetooth === 'granted') {
      return { ok: true, state: 'granted', message: '' };
    }
    return { ok: false, state: result?.bluetooth || 'denied', message: PERMISSION_DENIED_MESSAGE };
  } catch (e) {
    return { ok: false, state: 'error', message: `Gagal minta izin Bluetooth: ${e?.message || e}` };
  }
};

// Alias — dipertahankan supaya kompatibel dengan importer lama.
export const initPrinter = requestPrinterPermissions;

// Scan: `list()` mengembalikan device yang SUDAH ter-pair via System Settings.
// Plugin ini tidak melakukan discovery live — user harus pair printer di Bluetooth Settings HP dulu.
export const scanPrinters = async () => {
  if (!isNative()) {
    return { ok: false, devices: [], message: 'Print Bluetooth hanya bisa di aplikasi Android.' };
  }
  const perm = await requestPrinterPermissions();
  if (!perm.ok) return { ok: false, devices: [], message: perm.message };
  try {
    const { devices } = await BluetoothPrinter.list();
    return { ok: true, devices: devices || [], message: '' };
  } catch (e) {
    const raw = e?.message || String(e);
    const message = /permission|denied|BLUETOOTH_CONNECT|BLUETOOTH_SCAN/i.test(raw)
      ? PERMISSION_DENIED_MESSAGE
      : /adapter|off|disabled|null/i.test(raw)
        ? 'Bluetooth mati. Nyalakan Bluetooth di HP lalu coba lagi.'
        : `Gagal ambil daftar printer: ${raw}`;
    return { ok: false, devices: [], message };
  }
};

export const connectPrinter = async (device) => {
  if (!isNative()) {
    return { ok: false, message: 'Print Bluetooth hanya bisa di aplikasi Android.' };
  }
  const address = typeof device === 'string' ? device : device?.address;
  const name = typeof device === 'string' ? device : (device?.name || device?.address);
  if (!address) {
    return { ok: false, message: 'Alamat printer tidak valid.' };
  }
  const perm = await requestPrinterPermissions();
  if (!perm.ok) return { ok: false, message: perm.message };
  try {
    await BluetoothPrinter.connect({ address });
    try {
      localStorage.setItem(STORAGE_KEY_ADDRESS, address);
      localStorage.setItem(STORAGE_KEY_NAME, name);
    } catch {}
    return { ok: true, message: `Terhubung ke ${name}` };
  } catch (e) {
    const raw = e?.message || String(e);
    const message = /permission|denied/i.test(raw)
      ? 'Izin Bluetooth ditolak. Aktifkan izin Bluetooth di Pengaturan HP.'
      : /adapter|off|disabled/i.test(raw)
        ? 'Bluetooth mati. Nyalakan Bluetooth lalu coba lagi.'
        : /timeout|connect|socket/i.test(raw)
          ? `Gagal konek ke ${name}. Pastikan printer menyala dan dalam jangkauan.`
          : `Gagal konek printer: ${raw}`;
    return { ok: false, message };
  }
};

const buildStrukData = (transaksi, settings, printerType = 'unknown') => {
  const encoder = new ReceiptPrinterEncoder({ language: 'esc-pos', columns: RECEIPT_COLUMNS });
  const items = Array.isArray(transaksi?.items) ? transaksi.items : [];
  const isGrosir = transaksi?.isGrosir || items.some((i) => i?.isGrosir);
  // VSC MP-58C ignore ESC 3 n (line spacing command), jadi kompensasi pakai
  // newline() manual antar item supaya visual match ZJiang yang default-nya lebih longgar.
  const needsExtraSpacing = printerType === 'vsc';

  encoder.initialize();
  encoder.align('left');

  // Header: center manual via emitCenterLine (raw spaces bypass TextWrap yang
  // auto-trim leading whitespace). Bold-nya bungkus bold(true) → line → bold(false)
  // manual karena chain rusak setelah dipisah jadi raw + line.
  encoder.bold(true);
  emitCenterLine(encoder, toAscii(settings?.storeName || 'KONTER PULSA').toUpperCase());
  encoder.bold(false);
  if (settings?.storeAddress) {
    emitCenterLine(encoder, settings.storeAddress);
  }
  if (settings?.storePhone) {
    emitCenterLine(encoder, `Telp: ${settings.storePhone}`);
  }

  if (isGrosir) {
    encoder.newline();
    encoder.bold(true);
    emitCenterLine(encoder, '*** TRANSAKSI GROSIR ***');
    encoder.bold(false);
  }

  encoder.line('-'.repeat(RECEIPT_COLUMNS));
  encoder.line(rowLeftRight('No', transaksi?.invoiceNumber || '-'));
  encoder.line(rowLeftRight('Tgl', formatDateAscii(transaksi?.transactionDate)));
  encoder.line(rowLeftRight('Kasir', transaksi?.cashierName || '-'));
  if (transaksi?.customerName && transaksi.customerName !== 'Umum') {
    encoder.line(rowLeftRight('Pelanggan', transaksi.customerName));
  }
  encoder.line('-'.repeat(RECEIPT_COLUMNS));

  items.forEach((item, idx) => {
    const name = toAscii(item?.productName || '-');
    // wrap nama produk kalau > kolom
    for (let i = 0; i < name.length; i += RECEIPT_COLUMNS) {
      encoder.line(name.slice(i, i + RECEIPT_COLUMNS));
    }
    if (item?.targetNumber) {
      encoder.line(toAscii(`  No: ${item.targetNumber}`));
    }
    const qtyLine = `  ${item?.quantity || 0} X ${formatRupiahAscii(item?.sellPrice || 0)}`;
    const subtotal = formatRupiahAscii(item?.subtotal || 0);
    encoder.line(rowLeftRight(qtyLine, subtotal));
    if (item?.isGrosir) encoder.line('  (Harga Grosir)');
    if (needsExtraSpacing && idx < items.length - 1) encoder.newline();
  });

  encoder.line('-'.repeat(RECEIPT_COLUMNS));

  if ((transaksi?.discount || 0) > 0) {
    encoder.line(rowLeftRight('Diskon', `-${new Intl.NumberFormat('id-ID').format(transaksi.discount)}`));
  }
  encoder.bold(true).line(rowLeftRight('TOTAL', formatRupiahAscii(transaksi?.total))).bold(false);
  if (needsExtraSpacing) encoder.newline();

  const payLabel = PAYMENT_LABEL[transaksi?.paymentMethod] || (transaksi?.paymentMethod || '-').toUpperCase();
  encoder.line(rowLeftRight(`Bayar(${payLabel})`, formatRupiahAscii(transaksi?.amountPaid ?? transaksi?.total)));
  if ((transaksi?.change || 0) > 0) {
    encoder.line(rowLeftRight('Kembali', formatRupiahAscii(transaksi.change)));
  }

  encoder.line('-'.repeat(RECEIPT_COLUMNS));
  emitCenterLine(encoder, settings?.receiptFooter || 'Terima kasih sudah berbelanja!');
  if (transaksi?.cashierName) emitCenterLine(encoder, `Kasir: ${transaksi.cashierName}`);

  encoder.newline(3); // ruang potong

  return bytesToBinaryString(encoder.encode());
};

export const printStruk = async (transaksi, settings) => {
  if (!isNative()) {
    return { ok: false, message: 'Print Bluetooth hanya bisa di aplikasi Android.' };
  }
  if (!transaksi) {
    return { ok: false, message: 'Data transaksi kosong.' };
  }
  const saved = getSavedPrinter();
  if (!saved) {
    return { ok: false, message: 'Belum ada printer tersimpan. Pilih printer dulu.', needsPicker: true };
  }

  const perm = await requestPrinterPermissions();
  if (!perm.ok) return { ok: false, message: perm.message };

  let data;
  try {
    data = buildStrukData(transaksi, settings, getPrinterType(saved.name));
  } catch (e) {
    return { ok: false, message: `Gagal susun data struk: ${e?.message || e}` };
  }

  try {
    // Chunked write: kirim data per PRINT_CHUNK_SIZE byte dengan jeda pendek antar chunk.
    // Diperlukan karena printer generic (VSC MP-58C / RPP02N) punya RX buffer kecil
    // dan drop byte kalau di-flood dalam satu write. connectAndPrint tidak dipakai lagi
    // karena internalnya cuma single stream.write(all bytes).
    await BluetoothPrinter.connect({ address: saved.address });
    try {
      for (let i = 0; i < data.length; i += PRINT_CHUNK_SIZE) {
        await BluetoothPrinter.print({ data: data.slice(i, i + PRINT_CHUNK_SIZE) });
        if (i + PRINT_CHUNK_SIZE < data.length) {
          await sleep(PRINT_CHUNK_DELAY_MS);
        }
      }
    } finally {
      try { await BluetoothPrinter.disconnect(); } catch {}
    }
    return { ok: true, message: 'Struk terkirim ke printer' };
  } catch (e) {
    const raw = e?.message || String(e);
    const message = /permission|denied/i.test(raw)
      ? 'Izin Bluetooth ditolak. Aktifkan izin Bluetooth di Pengaturan HP.'
      : /adapter|off|disabled/i.test(raw)
        ? 'Bluetooth mati. Nyalakan Bluetooth lalu coba lagi.'
        : /timeout|connect|socket|remote/i.test(raw)
          ? `Gagal konek ke printer ${saved.name}. Pastikan printer menyala dan dalam jangkauan.`
          : `Gagal print: ${raw}`;
    return { ok: false, message };
  }
};

export const disconnectPrinter = async () => {
  if (!isNative()) return { ok: true, message: '' };
  try {
    await BluetoothPrinter.disconnect();
    return { ok: true, message: 'Printer diputus' };
  } catch (e) {
    return { ok: false, message: e?.message || 'Gagal memutus printer' };
  }
};

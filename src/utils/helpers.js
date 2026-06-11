// Format rupiah
export const formatRupiah = (amount) => {
  if (amount === null || amount === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

// Format angka
export const formatNumber = (n) => new Intl.NumberFormat('id-ID').format(n || 0);

// Format tanggal
export const formatDate = (date, opts = {}) => {
  if (!date) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', ...opts
  }).format(new Date(date));
};

export const formatDateTime = (date) => {
  if (!date) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(date));
};

// Category labels
export const CATEGORY_LABELS = {
  pulsa: 'Pulsa', kartu_perdana: 'Kartu Perdana', aksesoris: 'Aksesoris',
  paket_data: 'Paket Data', token_listrik: 'Token Listrik',
  ewallet: 'E-Wallet', game: 'Game', lainnya: 'Lainnya', jasa_pasang: 'Pasang Anti Gores',
jasa_transfer: 'Jasa Transfer',
jasa_lainnya: 'Jasa Lainnya'
};

export const PAYMENT_LABELS = {
  cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer Bank', hutang: 'Hutang'
};

export const FINANCE_TYPE_LABELS = {
  pemasukan: 'Pemasukan', pengeluaran: 'Pengeluaran',
  hutang: 'Hutang', piutang: 'Piutang'
};

// Category colors for badges
export const CATEGORY_COLORS = {
  pulsa: 'badge-blue', kartu_perdana: 'badge-green', aksesoris: 'badge-purple',
  paket_data: 'badge-blue', token_listrik: 'badge-yellow', ewallet: 'badge-green',
  game: 'badge-purple', lainnya: 'badge-gray'
};

// Payment badge colors
export const PAYMENT_COLORS = {
  cash: 'badge-green', qris: 'badge-blue', transfer: 'badge-purple', hutang: 'badge-red'
};

// Truncate string
export const truncate = (str, n = 30) => str?.length > n ? str.slice(0, n) + '...' : (str || '');

// Today date range
export const todayRange = () => {
  const s = new Date(); s.setHours(0, 0, 0, 0);
  const e = new Date(); e.setHours(23, 59, 59, 999);
  return { startDate: s.toISOString().slice(0,10), endDate: e.toISOString().slice(0,10) };
};

// This month range
export const thisMonthRange = () => {
  const now = new Date();
  const s = new Date(now.getFullYear(), now.getMonth(), 1);
  const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate: s.toISOString().slice(0,10), endDate: e.toISOString().slice(0,10) };
};

// Format angka input jadi tampilan rupiah saat mengetik
export const formatInputRupiah = (value) => {
  if (!value) return '';
  const angka = value.toString().replace(/\D/g, '');
  if (!angka) return '';
  return new Intl.NumberFormat('id-ID').format(parseInt(angka));
};

// Parse formatted rupiah kembali ke angka
export const parseInputRupiah = (formatted) => {
  if (!formatted) return '';
  return formatted.toString().replace(/\./g, '').replace(/,/g, '');
};
import axios from 'axios';
import { Capacitor } from '@capacitor/core';

// Di dev browser (npm start): baseURL '/api' → CRA proxy ke localhost:5000.
// Di web production: tetap '/api' → same-origin ke backend (Nginx proxy /api).
// Di APK Android: WebView tidak punya proxy, harus absolute URL ke domain production.
const API_ORIGIN = Capacitor.isNativePlatform() ? 'https://kontera.id' : '';

const api = axios.create({ baseURL: `${API_ORIGIN}/api`, timeout: 15000 });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ─── Auth ────────────────────────────────
export const authAPI = {
  login: (d) => api.post('/auth/login', d),
  google: (d) => api.post('/auth/google', d),
  register: (d) => api.post('/auth/register', d),
  getMe: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
  updateUser: (id, d) => api.put(`/auth/users/${id}`, d),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
};

// ─── Products ────────────────────────────
export const productAPI = {
  getAll:          (p)     => api.get('/products', { params: p }),
  getByCode:       (code)  => api.get(`/products/by-code/${code}`),
  getLowStock:     ()      => api.get('/products/low-stock'),
  create:          (d)     => api.post('/products', d),
  update:          (id, d) => api.put(`/products/${id}`, d),
  delete:          (id)    => api.delete(`/products/${id}`),
  addStock:        (id, d) => api.post(`/products/${id}/add-stock`, d),
  getStockLogs:    (id)    => api.get(`/products/${id}/stock-logs`),
  toggleEarnPoints:(id)    => api.patch(`/products/${id}/earn-points`),
  bulkSetPoints:   (poin)  => api.post('/products/bulk-set-points', { pointValue: poin }),
};

// ─── Transactions ─────────────────────────
export const transactionAPI = {
  getAll: (p, config) => api.get('/transactions', { params: p, ...config }),
  getById: (id) => api.get(`/transactions/${id}`),
  create: (d) => api.post('/transactions', d),
  void: (id, d) => api.put(`/transactions/${id}/void`, d),
  getTodaySummary: () => api.get('/transactions/today-summary'),
  getPerSumber: (akunId, p) => api.get(`/transactions/per-sumber/${akunId}`, { params: p }),
  editItem: (transactionId, itemId, d) => api.put(`/transactions/${transactionId}/item/${itemId}`, d),
  getHutang: (p) => api.get('/transactions/hutang/list', { params: p }),
  bayarHutang: (id, data) => api.post(`/transactions/${id}/bayar-hutang`, data),
  getVoided: (p) => api.get('/transactions/voided/list', { params: p }),
  getAnomalyCount: () => api.get('/transactions/anomaly/count'),
};

// ─── Dashboard ───────────────────────────
export const dashboardAPI = {
  get: () => api.get('/dashboard'),
  getChartData:     (range)   => api.get('/dashboard/chart-data', { params: { range } }),
  getKategoriStats: (periode) => api.get('/dashboard/kategori-stats', { params: { periode } }),
};

// ─── Finance ─────────────────────────────
export const financeAPI = {
  getAll: (p) => api.get('/finance', { params: p }),
  getSummary: (p) => api.get('/finance/summary', { params: p }),
  getAllCabang: () => api.get('/finance/all-cabang'),
  create: (d) => api.post('/finance', d),
  update: (id, d) => api.put(`/finance/${id}`, d),
  delete: (id) => api.delete(`/finance/${id}`),
};

// ─── Customers ───────────────────────────
export const customerAPI = {
  getAll: (p) => api.get('/customers', { params: p }),
  create: (d) => api.post('/customers', d),
  update: (id, d) => api.put(`/customers/${id}`, d),
  delete: (id) => api.delete(`/customers/${id}`),
  getTransactions: (id) => api.get(`/customers/${id}/transactions`),
};

// ─── Reports ─────────────────────────────
export const reportAPI = {
  getSales:           (p) => api.get('/reports/sales',                { params: p }),
  getMonthly:         (p) => api.get('/reports/monthly',              { params: p }),
  getMonthlyDetail:   (p) => api.get('/reports/monthly-detail',       { params: p }),
  exportExcel:        (p) => api.get('/reports/export/excel',         { params: p, responseType: 'blob' }),
  exportPDF:          (p) => api.get('/reports/export/pdf',           { params: p, responseType: 'blob' }),
  getModalSummary:    ()  => api.get('/reports/modal-summary'),
  exportModalExcel:   ()  => api.get('/reports/export/modal/excel',   { responseType: 'blob' }),
  exportModalPDF:     ()  => api.get('/reports/export/modal/pdf',     { responseType: 'blob' }),
  exportServiceExcel: (p) => api.get('/reports/export/service/excel', { params: p, responseType: 'blob' }),
  exportServicePDF:   (p) => api.get('/reports/export/service/pdf',   { params: p, responseType: 'blob' }),
};

// ─── Backup ──────────────────────────────
export const backupAPI = {
  getInfo: () => api.get('/backup/info'),
  download: () => api.get('/backup/download', { responseType: 'blob' }),
};
export const brankasAPI = {
  get:      (config)      => api.get('/settings/brankas', config),
  update:   (d, config)   => api.put('/settings/brankas', d, config),
  transfer: (d, config)   => api.post('/settings/brankas/transfer', d, config),
};

// ─── Points / Member ──────────────────────
export const rewardAPI = {
  get:    ()       => api.get('/rewards'),
  getAll: ()       => api.get('/rewards/all'),
  create: (d)      => api.post('/rewards', d),
  update: (id, d)  => api.put(`/rewards/${id}`, d),
  delete: (id)     => api.delete(`/rewards/${id}`),
  redeem: (d)      => api.post('/rewards/redeem', d),
};

export const pointAPI = {
  getCustomer:    (id)    => api.get(`/points/${id}`),
  activate:       (id)    => api.post(`/points/${id}/activate`),
  addManual:      (id, d) => api.post(`/points/${id}/add`, d),
  redeem:         (d)     => api.post('/points/redeem', d),
  preview:        (p)     => api.get('/points/preview', { params: p }),
};

// ─── Cabang ───────────────────────────────
export const cabangAPI = {
  getAll:          ()      => api.get('/cabang'),
  getSummary:      ()      => api.get('/cabang/summary'),
  getEmployeeStats:()      => api.get('/cabang/employee-stats'),
  getOne:          (id)    => api.get(`/cabang/${id}`),
  create:          (d)     => api.post('/cabang', d),
  update:          (id, d) => api.put(`/cabang/${id}`, d),
  deactivate:      (id)    => api.delete(`/cabang/${id}`),
  getUsers:        (id)    => api.get(`/cabang/${id}/users`),
};

// ─── Settings ────────────────────────────
export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (d) => api.put('/settings', d),
};

// ─── Saldo ───────────────────────────────────────
export const saldoAPI = {
  getAll: () => api.get('/saldo', { params: { _t: Date.now() } }),
  getAllAdmin: () => api.get('/saldo/admin/all'),
  getMutasi: (akunId) => api.get(`/saldo/${akunId}/mutasi`),
  topUp: (d) => api.post('/saldo/topup', d),
  transfer: (d) => api.post('/saldo/transfer', d),
  koreksi: (d) => api.post('/saldo/koreksi', d),
  tambahAkun: (d) => api.post('/saldo/akun', d),
  updateAkun: (akunId, d) => api.put(`/saldo/akun/${akunId}`, d),
  deleteAkun: (akunId) => api.delete(`/saldo/akun/${akunId}`),
};

// ─── Closing Kas ─────────────────────────────────
export const closingKasAPI = {
  getSummary: (tanggal) => api.get('/closing-kas/summary', { params: { tanggal, _t: Date.now() } }),
  getKasSummary: () => api.get('/closing-kas/kas-summary'),
  create: (d) => api.post('/closing-kas', d),
  getRiwayat: (p) => api.get('/closing-kas/riwayat', { params: p }),
  getDetail: (id) => api.get(`/closing-kas/${id}`),
  resetCashMinus: () => api.post('/closing-kas/reset-cash-minus'),
};

export const pembelianAPI = {
  getAll: (p) => api.get('/pembelian', { params: p }),
  create: (d) => api.post('/pembelian', d),
  getDetail: (id) => api.get(`/pembelian/${id}`),
  updateHargaJual: (d) => api.post('/pembelian/update-harga', d),
  batalkan: (id, d) => api.post(`/pembelian/${id}/batalkan`, d),
  edit: (id, d) => api.put(`/pembelian/${id}`, d),
};

// ─── Service HP ──────────────────────────────────
export const serviceAPI = {
  // Transaksi servis
  getAll:    (p)     => api.get('/service',      { params: p }),
  getOne:    (id)    => api.get(`/service/${id}`),
  create:    (d)     => api.post('/service',     d),
  update:    (id, d) => api.put(`/service/${id}`, d),
  void:      (id)    => api.delete(`/service/${id}`),
  getSummary:(p)     => api.get('/service/summary', { params: p }),
  // Keuangan servis
  getFinance:    (p) => api.get('/service/finance',      { params: p }),
  createFinance: (d) => api.post('/service/finance',     d),
  deleteFinance: (id)=> api.delete(`/service/finance/${id}`),
  updateFinance: (id, d) => api.put(`/service/finance/${id}`, d),
  // Arsip servis
  getArsipList:   ()        => api.get('/service/arsip'),
  getArsipDetail: (b, t)    => api.get(`/service/arsip/${b}/${t}`),
};
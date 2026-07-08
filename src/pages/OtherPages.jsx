// ============================================================
// LaporanPage.jsx — Rekap Laba Rugi Bulanan
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { reportAPI, customerAPI, financeAPI, settingsAPI, authAPI, transactionAPI, serviceAPI, brankasAPI, pointAPI, cabangAPI, backupAPI, rewardAPI, productAPI } from '../services/api';
import { formatRupiah, formatDate, PAYMENT_LABELS, PAYMENT_COLORS, FINANCE_TYPE_LABELS } from '../utils/helpers';
import { PageHeader, EmptyState, Loader, Modal, StatCard, SearchInput, ConfirmDialog, RupiahInput } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit2, Eye, TrendingUp, ShoppingCart, DollarSign, ArrowUpCircle, ArrowDownCircle, ChevronRight, RefreshCw, FileSpreadsheet, FileText, Wrench } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line
} from 'recharts';

// ─── Nama bulan ───────────────────────────────────────────────
const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const LABEL_BULAN = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

// ─── Warna tipe produk ────────────────────────────────────────
const TYPE_COLORS = { fisik: '#3b82f6', digital: '#a855f7', jasa: '#f59e0b' };
const TYPE_LABELS = { fisik: 'Fisik', digital: 'Digital', jasa: 'Jasa' };
const PAYMENT_COLOR_HEX = { cash: '#22c55e', qris: '#3b82f6', transfer: '#a855f7', hutang: '#ef4444' };

// ─── Formatter tooltip rupiah ─────────────────────────────────
const fmtTooltip = (v) => formatRupiah(v);

// ─── Helper warna laba ────────────────────────────────────────
function profitColor(val) {
  if (val > 0) return 'text-green-600';
  if (val < 0) return 'text-red-500';
  return 'text-slate-400';
}

// ─── Modal Detail Bulanan ─────────────────────────────────────
function DetailBulanModal({ open, onClose, year, month }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !year || !month) return;
    setLoading(true);
    reportAPI.getMonthlyDetail({ year, month })
      .then(r => setDetail(r.data.data))
      .catch(() => toast.error('Gagal memuat detail'))
      .finally(() => setLoading(false));
  }, [open, year, month]);

  const r = detail?.ringkasan || {};

  return (
    <Modal open={open} onClose={onClose} title={`Detail: ${NAMA_BULAN[(month||1)-1]} ${year}`} size="xl">
      {loading ? <Loader /> : !detail ? null : (
        <div className="space-y-5">
          {/* Ringkasan */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
              <p className="text-xs text-blue-500 font-semibold mb-1">Omset</p>
              <p className="text-base font-bold text-blue-700">{formatRupiah(r.omset)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
              <p className="text-xs text-emerald-500 font-semibold mb-1">Laba Kotor</p>
              <p className="text-base font-bold text-emerald-700">{formatRupiah(r.labaKotor)}</p>
            </div>
            <div className="rounded-xl bg-orange-50 border border-orange-100 p-3">
              <p className="text-xs text-orange-500 font-semibold mb-1">Pengeluaran Operasional</p>
              <p className="text-base font-bold text-orange-700">{formatRupiah(r.pengeluaran)}</p>
            </div>
            <div className="rounded-xl bg-purple-50 border border-purple-100 p-3">
              <p className="text-xs text-purple-500 font-semibold mb-1">Pemasukan Lain</p>
              <p className="text-base font-bold text-purple-700">{formatRupiah(r.pemasukan)}</p>
            </div>
            <div className={`rounded-xl p-3 border col-span-2 sm:col-span-2 ${r.labaBersih >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
              <p className={`text-xs font-semibold mb-1 ${r.labaBersih >= 0 ? 'text-green-500' : 'text-red-500'}`}>Laba Bersih</p>
              <p className={`text-lg font-bold ${r.labaBersih >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatRupiah(r.labaBersih)}</p>
            </div>
          </div>

          {/* Grafik harian */}
          <div>
            <p className="text-sm font-bold text-slate-700 mb-3">Omset & Laba Harian</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={detail.harian}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="hari" tick={{ fontSize: 10 }} tickFormatter={v => `${v}`} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={fmtTooltip} labelFormatter={v => `Tgl ${v}`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="omset" name="Omset" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="laba"  name="Laba"  stroke="#22c55e" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Breakdown tipe produk */}
            <div>
              <p className="text-sm font-bold text-slate-700 mb-3">Per Jenis Produk</p>
              <div className="space-y-2">
                {(detail.byKategoriProduk || []).map(k => (
                  <div key={k._id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: TYPE_COLORS[k._id] || '#94a3b8' }}>
                      {TYPE_LABELS[k._id] || k._id}
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-700">{formatRupiah(k.omset)}</p>
                      <p className="text-xs text-slate-400">Laba: {formatRupiah(k.laba || 0)}</p>
                    </div>
                    <p className="text-xs text-slate-400">{k.qty} pcs</p>
                  </div>
                ))}
                {!detail.byKategoriProduk?.length && <EmptyState message="Tidak ada data" />}
              </div>
            </div>

            {/* Metode bayar */}
            <div>
              <p className="text-sm font-bold text-slate-700 mb-3">Per Metode Bayar</p>
              <div className="space-y-2">
                {(detail.byPayment || []).map(p => (
                  <div key={p._id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className={`badge ${PAYMENT_COLORS[p._id] || 'badge-gray'}`}>{PAYMENT_LABELS[p._id] || p._id}</span>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-700">{formatRupiah(p.total)}</p>
                    </div>
                    <p className="text-xs text-slate-400">{p.jumlahTx} tx</p>
                  </div>
                ))}
                {!detail.byPayment?.length && <EmptyState message="Tidak ada data" />}
              </div>
            </div>
          </div>

          {/* Top produk */}
          <div>
            <p className="text-sm font-bold text-slate-700 mb-3">Top 10 Produk Terlaris</p>
            <div className="space-y-1.5">
              {(detail.topProduk || []).map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-300 w-5 text-right">{i+1}</span>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-700">{p._id}</p>
                    <div className="h-1.5 bg-slate-100 rounded-full mt-0.5">
                      <div className="h-full bg-primary-400 rounded-full" style={{ width: `${Math.min(100,(p.omset/(detail.topProduk[0]?.omset||1))*100)}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-primary-600">{formatRupiah(p.omset)}</p>
                    <p className="text-xs text-slate-400">{p.qty} pcs</p>
                  </div>
                </div>
              ))}
              {!detail.topProduk?.length && <EmptyState message="Belum ada data" />}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Laporan Utama (renamed) ──────────────────────────────────
function LaporanUtama() {
  const currentYear = new Date().getFullYear();
  const [year, setYear]           = useState(currentYear);
  const [filterBulan, setFilterBulan] = useState(0);
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailMonth, setDetailMonth] = useState(null);
  const [exporting, setExporting] = useState('');
  const [modalSummary, setModalSummary] = useState(null);
  const [modalLoading, setModalLoading] = useState(false); // 'excel' | 'pdf' | ''
  const [txList, setTxList] = useState([]);
  const [txListLoading, setTxListLoading] = useState(false);

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportAPI.getMonthly({ year });
      setData(res.data.data);
    } catch {
      toast.error('Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  }, [year]);

  const loadModalSummary = useCallback(async () => {
    setModalLoading(true);
    try {
      const res = await reportAPI.getModalSummary();
      setModalSummary(res.data.data);
    } catch {
      toast.error('Gagal memuat ringkasan modal');
    } finally {
      setModalLoading(false);
    }
  }, []);

  const loadTxList = useCallback(async () => {
    setTxListLoading(true);
    try {
      const res = await transactionAPI.getAll({ limit: 9999 });
      const all = res.data.data || [];
      const filtered = all.filter(t => {
        if (t.isVoid) return false;
        const d = new Date(t.transactionDate);
        if (d.getFullYear() !== year) return false;
        if (filterBulan > 0 && d.getMonth() + 1 !== filterBulan) return false;
        return true;
      });
      setTxList(filtered);
    } catch {
      toast.error('Gagal memuat daftar transaksi grosir/retail');
    } finally {
      setTxListLoading(false);
    }
  }, [year, filterBulan]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadModalSummary(); }, [loadModalSummary]);
  useEffect(() => { loadTxList(); }, [loadTxList]);

  // ── Handler download file dari blob ──
  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href    = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExportExcel = async () => {
    setExporting('excel');
    try {
      const res = await reportAPI.exportExcel({ year });
      downloadBlob(res.data, `Laporan-LabaRugi-${year}.xlsx`);
      toast.success('File Excel berhasil diunduh!');
    } catch {
      toast.error('Gagal mengunduh Excel');
    } finally {
      setExporting('');
    }
  };

  const handleExportPDF = async () => {
    setExporting('pdf');
    try {
      const res = await reportAPI.exportPDF({ year });
      downloadBlob(res.data, `Laporan-LabaRugi-${year}.pdf`);
      toast.success('File PDF berhasil diunduh!');
    } catch {
      toast.error('Gagal mengunduh PDF');
    } finally {
      setExporting('');
    }
  };

  const openDetail = (bulan) => { setDetailMonth(bulan); setDetailOpen(true); };

  // Ringkasan: kalau filterBulan > 0, ambil data bulan itu. Kalau 0, pakai ringkasan tahunan
  const ringkasanDisplay = (() => {
    if (!data) return {};
    if (filterBulan === 0) return data.ringkasan || {};
    const m = (data.months || []).find(m => m.bulan === filterBulan);
    return m ? {
      omset: m.omset, labaKotor: m.labaKotor,
      pemasukan: m.pemasukan, pengeluaran: m.pengeluaran,
      labaBersih: m.labaBersih, jumlahTx: m.jumlahTx,
      jumlahItem: m.jumlahItem || 0,
    } : {};
  })();
  const r = ringkasanDisplay;

  const grosirRetail = (() => {
    const agg = {
      retail: { count: 0, omset: 0, laba: 0 },
      grosir: { count: 0, omset: 0, laba: 0 },
    };
    txList.forEach(t => {
      const isGrosir = t.isGrosir || (t.items || []).some(i => i.isGrosir);
      const bucket = isGrosir ? agg.grosir : agg.retail;
      const laba = t.totalProfit ?? (t.items || []).reduce(
        (s, i) => s + (i.profit ?? (i.subtotal - (i.purchasePrice || i.modalAmount || 0) * (i.quantity || 1))),
        0
      );
      bucket.count += 1;
      bucket.omset += t.total || 0;
      bucket.laba  += laba;
    });
    return agg;
  })();

  return (
    <div>
      {/* Filter tahun + bulan + export */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        <select className="input py-2 pr-8" value={year} onChange={e => setYear(Number(e.target.value))}>
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="input py-2 pr-8" value={filterBulan} onChange={e => setFilterBulan(Number(e.target.value))}>
          <option value={0}>Semua Bulan</option>
          {['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'].map((b,i) => (
            <option key={i+1} value={i+1}>{b}</option>
          ))}
        </select>
        <button className="btn btn-outline py-2 px-3" onClick={load} title="Refresh" disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={handleExportExcel}
          disabled={exporting === 'excel' || loading || !data}
          className="btn py-2 px-3 flex items-center gap-1.5 text-sm font-semibold"
          style={{ background: '#16a34a', color: '#fff', borderRadius: 10 }}
        >
          <FileSpreadsheet size={15} />
          {exporting === 'excel' ? 'Mengunduh...' : 'Excel'}
        </button>
        <button
          onClick={handleExportPDF}
          disabled={exporting === 'pdf' || loading || !data}
          className="btn py-2 px-3 flex items-center gap-1.5 text-sm font-semibold"
          style={{ background: '#dc2626', color: '#fff', borderRadius: 10 }}
        >
          <FileText size={15} />
          {exporting === 'pdf' ? 'Mengunduh...' : 'PDF'}
        </button>
      </div>

      {/* Ringkasan — Tahunan atau per Bulan */}
      {filterBulan > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-600">
            📅 Menampilkan ringkasan: {['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][filterBulan]} {year}
          </span>
          <button className="text-xs text-slate-400 hover:text-red-500" onClick={() => setFilterBulan(0)}>✕ Reset</button>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        {[
          { label: 'Total Omset',      val: r.omset,       color: 'blue' },
          { label: 'Laba Kotor',       val: r.labaKotor,   color: 'green' },
          { label: 'Pemasukan Lain',   val: r.pemasukan,   color: 'purple' },
          { label: 'Pengeluaran Operasional', val: r.pengeluaran, color: 'orange' },
          { label: 'Laba Bersih',      val: r.labaBersih,  color: r.labaBersih >= 0 ? 'green' : 'red' },
          { label: 'Total Transaksi',  val: null, color: 'blue', suffix: `${r.jumlahTx || 0} tx` },
          { label: 'Total Item Terjual', val: null, color: 'blue', suffix: `${r.jumlahItem || 0} item` },
        ].map(({ label, val, color, suffix }) => {
          const colorMap = {
            blue:   { bg: 'bg-blue-50',   border: 'border-blue-100',   text: 'text-blue-700' },
            green:  { bg: 'bg-green-50',  border: 'border-green-100',  text: 'text-green-700' },
            purple: { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700' },
            orange: { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-700' },
            red:    { bg: 'bg-red-50',    border: 'border-red-100',    text: 'text-red-600' },
          };
          const c = colorMap[color] || colorMap.blue;
          return (
            <div key={label} className={`rounded-xl border p-3 ${c.bg} ${c.border}`}>
              <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
              <p className={`text-sm font-bold ${c.text}`}>{suffix || formatRupiah(val || 0)}</p>
            </div>
          );
        })}
      </div>

      {loading ? <Loader /> : (
        <>
          {/* Grafik batang 12 bulan */}
          <div className="card mb-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Grafik Omset vs Laba Bersih — {year}</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data?.months || []} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} width={55} />
                <Tooltip formatter={fmtTooltip} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="omset"      name="Omset"       fill="#3b82f6" radius={[3,3,0,0]} />
                <Bar dataKey="labaKotor"  name="Laba Kotor"  fill="#22c55e" radius={[3,3,0,0]} />
                <Bar dataKey="labaBersih" name="Laba Bersih" fill="#f59e0b" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabel rekap 12 bulan */}
          <div className="card">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Rekap Per Bulan — {year}</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Bulan</th>
                    <th className="text-right">Omset</th>
                    <th className="text-right">Laba Kotor</th>
                    <th className="text-right">Pemasukan</th>
                    <th className="text-right">Pengeluaran Operasional</th>
                    <th className="text-right">Laba Bersih</th>
                    <th className="text-right">Tx</th>
                    <th className="text-right">Item</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {(data?.months || []).map((m) => (
                    <tr key={m.bulan} className={m.jumlahTx === 0 ? 'opacity-40' : ''}>
                      <td className="font-semibold text-slate-700">{NAMA_BULAN[m.bulan - 1]}</td>
                      <td className="text-right text-sm">{formatRupiah(m.omset)}</td>
                      <td className="text-right text-sm text-green-600">{formatRupiah(m.labaKotor)}</td>
                      <td className="text-right text-sm text-purple-600">{formatRupiah(m.pemasukan)}</td>
                      <td className="text-right text-sm text-orange-600">{formatRupiah(m.pengeluaran)}</td>
                      <td className={`text-right text-sm font-bold ${profitColor(m.labaBersih)}`}>
                        {formatRupiah(m.labaBersih)}
                      </td>
                      <td className="text-right text-xs text-slate-400">{m.jumlahTx}</td>
                      <td className="text-right text-xs text-slate-400">{m.jumlahItem}</td>
                      <td className="text-right">
                        {m.jumlahTx > 0 && (
                          <button
                            onClick={() => openDetail(m.bulan)}
                            className="btn btn-outline py-1 px-2 text-xs flex items-center gap-1 ml-auto"
                          >
                            Detail <ChevronRight size={12} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* Baris total */}
                  <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                    <td className="text-slate-700">TOTAL {year}</td>
                    <td className="text-right text-blue-700">{formatRupiah(r.omset)}</td>
                    <td className="text-right text-green-700">{formatRupiah(r.labaKotor)}</td>
                    <td className="text-right text-purple-700">{formatRupiah(r.pemasukan)}</td>
                    <td className="text-right text-orange-700">{formatRupiah(r.pengeluaran)}</td>
                    <td className={`text-right ${profitColor(r.labaBersih)}`}>{formatRupiah(r.labaBersih)}</td>
                    <td className="text-right text-slate-500">{r.jumlahTx}</td>
                    <td className="text-right text-slate-500">{r.jumlahItem}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Ringkasan Penjualan: Grosir vs Retail ── */}
      <div className="card mt-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700">🛒 Ringkasan Penjualan (Grosir vs Retail)</h3>
          <button className="btn btn-outline py-1.5 px-3 text-xs" onClick={loadTxList} disabled={txListLoading}>
            <RefreshCw size={13} className={txListLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-black text-indigo-700">🛍️ RETAIL</p>
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">{grosirRetail.retail.count} tx</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Omset</span>
                <span className="font-bold text-indigo-700">{formatRupiah(grosirRetail.retail.omset)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Laba</span>
                <span className={`font-bold ${profitColor(grosirRetail.retail.laba)}`}>{formatRupiah(grosirRetail.retail.laba)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-black text-green-700">🛒 GROSIR</p>
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">{grosirRetail.grosir.count} tx</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Omset</span>
                <span className="font-bold text-green-700">{formatRupiah(grosirRetail.grosir.omset)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Laba</span>
                <span className={`font-bold ${profitColor(grosirRetail.grosir.laba)}`}>{formatRupiah(grosirRetail.grosir.laba)}</span>
              </div>
            </div>
          </div>
        </div>

        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Daftar Transaksi</h4>
        {txListLoading ? <Loader /> : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>No. Faktur</th>
                  <th>Tanggal</th>
                  <th>Pelanggan</th>
                  <th>Tipe</th>
                  <th>Bayar</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {txList.length === 0
                  ? <tr><td colSpan={6}><EmptyState message="Tidak ada transaksi pada periode ini" /></td></tr>
                  : txList.slice(0, 50).map(tx => {
                      const isGrosir = tx.isGrosir || (tx.items || []).some(i => i.isGrosir);
                      return (
                        <tr key={tx._id}>
                          <td><code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">{tx.invoiceNumber}</code></td>
                          <td className="text-xs text-slate-400">{formatDate(tx.transactionDate)}</td>
                          <td className="text-sm font-medium">{tx.customerName || '-'}</td>
                          <td>
                            {isGrosir
                              ? <span className="badge bg-green-100 text-green-700 font-bold">🛒 GROSIR</span>
                              : <span className="badge bg-slate-100 text-slate-500">Retail</span>}
                          </td>
                          <td><span className={`badge ${PAYMENT_COLORS[tx.paymentMethod] || 'badge-gray'}`}>{PAYMENT_LABELS[tx.paymentMethod] || tx.paymentMethod}</span></td>
                          <td className="text-right text-sm font-bold text-blue-600">{formatRupiah(tx.total)}</td>
                        </tr>
                      );
                    })
                }
              </tbody>
            </table>
            {txList.length > 50 && (
              <p className="text-xs text-slate-400 text-center mt-2">Menampilkan 50 dari {txList.length} transaksi. Ringkasan kartu di atas menghitung semua.</p>
            )}
          </div>
        )}
      </div>

      {/* Modal detail bulan */}
      {/* ── Ringkasan Modal ── */}
      <div className="card mt-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700">💰 Ringkasan Modal Keseluruhan</h3>
          <div className="flex items-center gap-2">
            <button className="btn btn-outline py-1.5 px-3 text-xs" onClick={loadModalSummary}>
              <RefreshCw size={13} className={modalLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={async () => { try { const r = await reportAPI.exportModalExcel(); downloadBlob(r.data, `Ringkasan-Modal-${new Date().toISOString().slice(0,10)}.xlsx`); toast.success('Excel diunduh!'); } catch { toast.error('Gagal'); } }}
              className="btn py-1.5 px-3 text-xs font-semibold flex items-center gap-1"
              style={{ background:'#16a34a', color:'#fff', borderRadius:8 }}
            >
              <FileSpreadsheet size={13} /> Excel
            </button>
            <button
              onClick={async () => { try { const r = await reportAPI.exportModalPDF(); downloadBlob(r.data, `Ringkasan-Modal-${new Date().toISOString().slice(0,10)}.pdf`); toast.success('PDF diunduh!'); } catch { toast.error('Gagal'); } }}
              className="btn py-1.5 px-3 text-xs font-semibold flex items-center gap-1"
              style={{ background:'#dc2626', color:'#fff', borderRadius:8 }}
            >
              <FileText size={13} /> PDF
            </button>
          </div>
        </div>
        {modalLoading ? <Loader /> : modalSummary ? (
          <div className="space-y-4">
            {/* Kartu utama */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
              {[
                { label: 'Kas Tunai',           val: modalSummary.kasTunai,          color: 'green',  icon: '💵' },
                { label: 'Uang Brankas',         val: modalSummary.brankas,           color: 'amber',  icon: '🏦' },
                { label: 'Modal Produk Fisik',   val: modalSummary.modalProduk,       color: 'blue',   icon: '📦' },
                { label: 'Total Saldo Digital',  val: modalSummary.totalSaldoDigital, color: 'violet', icon: '💳' },
                { label: 'Total Keseluruhan',    val: modalSummary.totalKeseluruhan,  color: 'purple', icon: '💎' },
              ].map(({ label, val, color, icon }) => {
                const colorMap = {
                  green:  'bg-green-50 border-green-100 text-green-700',
                  amber:  'bg-amber-50 border-amber-100 text-amber-700',
                  blue:   'bg-blue-50 border-blue-100 text-blue-700',
                  violet: 'bg-violet-50 border-violet-100 text-violet-700',
                  purple: 'bg-purple-50 border-purple-100 text-purple-700',
                };
                return (
                  <div key={label} className={`rounded-xl border p-3 ${colorMap[color]}`}>
                    <p className="text-xs font-semibold text-slate-500 mb-1">{icon} {label}</p>
                    <p className="text-sm font-bold">{formatRupiah(val)}</p>
                  </div>
                );
              })}
            </div>

            {/* Saldo per group dengan warna */}
            {Object.keys(modalSummary.saldoGroups || {}).length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 mb-2">Rincian Saldo Digital per Kelompok</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(modalSummary.saldoGroups).map(([group, total]) => {
                    const groupStyle = {
                      'Server Pulsa': 'bg-blue-50 border-blue-100 text-blue-700',
                      'Bank':         'bg-emerald-50 border-emerald-100 text-emerald-700',
                      'E-Wallet':     'bg-purple-50 border-purple-100 text-purple-700',
                    }[group] || 'bg-slate-50 border-slate-100 text-slate-700';
                    const groupIcon = { 'Server Pulsa':'📡', 'Bank':'🏛️', 'E-Wallet':'📱' }[group] || '💰';
                    return (
                      <div key={group} className={`rounded-xl border p-3 ${groupStyle}`}>
                        <p className="text-xs font-semibold text-slate-500 mb-1">{groupIcon} {group}</p>
                        <p className="text-sm font-bold">{formatRupiah(total)}</p>
                      </div>
                    );
                  })}
                  {/* Total saldo digital di akhir */}
                  <div className="rounded-xl border p-3 bg-violet-50 border-violet-100">
                    <p className="text-xs font-semibold text-slate-500 mb-1">💳 Total Digital</p>
                    <p className="text-sm font-bold text-violet-700">{formatRupiah(modalSummary.totalSaldoDigital)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Top 10 produk berdasar nilai modal */}
            {modalSummary.produkDetail?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-500 mb-2">Top Produk Berdasar Nilai Modal</p>
                <div className="space-y-1.5">
                  {modalSummary.produkDetail.slice(0, 8).map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-300 w-4 text-right">{i+1}</span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-700">{p.name}</p>
                        <div className="h-1.5 bg-slate-100 rounded-full mt-0.5">
                          <div className="h-full bg-blue-400 rounded-full"
                            style={{ width: `${Math.min(100, (p.totalModal / (modalSummary.produkDetail[0]?.totalModal || 1)) * 100)}%` }} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-blue-600">{formatRupiah(p.totalModal)}</p>
                        <p className="text-xs text-slate-400">{p.stock} pcs</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <DetailBulanModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        year={year}
        month={detailMonth}
      />
    </div>
  );
}

// ─── Laporan Service HP ───────────────────────────────────────
function LaporanServiceHP() {
  const currentYear = new Date().getFullYear();
  const [year, setYear]       = useState(currentYear);
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    window.URL.revokeObjectURL(url);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Ambil semua transaksi servis lunas per bulan
      const NAMA = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      const NAMA_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

      // Ambil summary + semua transaksi servis tahun ini
      const [sumRes, txRes, finRes] = await Promise.all([
        serviceAPI.getSummary(),
        serviceAPI.getAll({ limit: 9999 }),
        serviceAPI.getFinance(),
      ]);

      const allTx  = (txRes.data.data || []).filter(t =>
        !t.isVoid && t.isPaid &&
        new Date(t.paidAt || t.receivedAt).getFullYear() === year
      );
      const allFin = (finRes.data.data || []).filter(f =>
        new Date(f.date).getFullYear() === year
      );

      // Group per bulan
      const months = Array.from({ length: 12 }, (_, i) => {
        const txBulan  = allTx.filter(t => new Date(t.paidAt || t.receivedAt).getMonth() === i);
        const finBulan = allFin.filter(f => new Date(f.date).getMonth() === i);
        const omset       = txBulan.reduce((s, t) => s + (t.totalCost || 0), 0);
        const labaKotor   = txBulan.reduce((s, t) => s + (t.profit || 0), 0);
        const pengeluaran = finBulan.filter(f => f.type === 'pengeluaran').reduce((s, f) => s + f.amount, 0);
        const pengeluaranLaba = finBulan.filter(f => f.type === 'pengeluaran' && f.category !== 'Pembelian Stok').reduce((s, f) => s + f.amount, 0);
        const pemasukan   = finBulan.filter(f => f.type === 'pemasukan').reduce((s, f) => s + f.amount, 0);
        // Cashback/Fee dihitung sebagai tambahan laba bersih
        const cashbackFee = finBulan.filter(f => f.type === 'pemasukan' && f.category === 'Cashback / Fee').reduce((s, f) => s + f.amount, 0);
        const labaBersih  = labaKotor - pengeluaranLaba + cashbackFee;
        return {
          bulan: i + 1, label: NAMA[i], nama: NAMA_FULL[i],
          omset, labaKotor, pengeluaran, pemasukan, labaBersih,
          jumlahTx: txBulan.length,
        };
      });

      const ringkasan = months.reduce((acc, m) => ({
        omset:       acc.omset       + m.omset,
        labaKotor:   acc.labaKotor   + m.labaKotor,
        pengeluaran: acc.pengeluaran + m.pengeluaran,
        pemasukan:   acc.pemasukan   + m.pemasukan,
        labaBersih:  acc.labaBersih  + m.labaBersih,
        jumlahTx:    acc.jumlahTx    + m.jumlahTx,
      }), { omset: 0, labaKotor: 0, pengeluaran: 0, pemasukan: 0, labaBersih: 0, jumlahTx: 0 });

      setData({ months, ringkasan });
    } catch {
      toast.error('Gagal memuat laporan service');
    } finally { setLoading(false); }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const r = data?.ringkasan || {};

  return (
    <div>
      {/* Filter tahun */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <select className="input py-2 pr-8" value={year} onChange={e => setYear(Number(e.target.value))}>
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn btn-outline py-2 px-3" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => { try { const r = await reportAPI.exportServiceExcel({ year }); downloadBlob(r.data, `Laporan-Service-${year}.xlsx`); toast.success('Excel diunduh!'); } catch { toast.error('Gagal'); } }}
            disabled={loading || !data}
            className="btn py-2 px-3 text-sm font-semibold flex items-center gap-1.5"
            style={{ background:'#16a34a', color:'#fff', borderRadius:10 }}
          >
            <FileSpreadsheet size={15} /> Excel
          </button>
          <button
            onClick={async () => { try { const r = await reportAPI.exportServicePDF({ year }); downloadBlob(r.data, `Laporan-Service-${year}.pdf`); toast.success('PDF diunduh!'); } catch { toast.error('Gagal'); } }}
            disabled={loading || !data}
            className="btn py-2 px-3 text-sm font-semibold flex items-center gap-1.5"
            style={{ background:'#dc2626', color:'#fff', borderRadius:10 }}
          >
            <FileText size={15} /> PDF
          </button>
        </div>
      </div>

      {/* Ringkasan tahunan */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Total Omset Servis', val: r.omset,       color: 'blue'   },
          { label: 'Laba Kotor',         val: r.labaKotor,   color: 'green'  },
          { label: 'Pengeluaran Operasional', val: r.pengeluaran, color: 'orange' },
          { label: 'Laba Bersih',        val: r.labaBersih,  color: r.labaBersih >= 0 ? 'green' : 'red' },
          { label: 'Total Unit Servis',  val: null, color: 'blue', suffix: `${r.jumlahTx || 0} unit` },
        ].map(({ label, val, color, suffix }) => {
          const colorMap = {
            blue:   { bg: 'bg-blue-50',   border: 'border-blue-100',   text: 'text-blue-700' },
            green:  { bg: 'bg-green-50',  border: 'border-green-100',  text: 'text-green-700' },
            orange: { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-700' },
            red:    { bg: 'bg-red-50',    border: 'border-red-100',    text: 'text-red-600' },
          };
          const c = colorMap[color] || colorMap.blue;
          return (
            <div key={label} className={`rounded-xl border p-3 ${c.bg} ${c.border}`}>
              <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
              <p className={`text-sm font-bold ${c.text}`}>{suffix || formatRupiah(val || 0)}</p>
            </div>
          );
        })}
      </div>

      {loading ? <Loader /> : (
        <>
          {/* Grafik */}
          <div className="card mb-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Grafik Omset vs Laba Bersih Service — {year}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.months || []} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} width={55} />
                <Tooltip formatter={fmtTooltip} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="omset"      name="Omset"       fill="#3b82f6" radius={[3,3,0,0]} />
                <Bar dataKey="labaBersih" name="Laba Bersih" fill="#22c55e" radius={[3,3,0,0]} />
                <Bar dataKey="pengeluaran" name="Pengeluaran Operasional" fill="#f97316" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabel */}
          <div className="card">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Rekap Per Bulan Service — {year}</h3>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Bulan</th>
                    <th className="text-right">Omset</th>
                    <th className="text-right">Laba Kotor</th>
                    <th className="text-right">Pengeluaran Operasional</th>
                    <th className="text-right">Laba Bersih</th>
                    <th className="text-right">Unit</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {(data?.months || []).map(m => (
                    <tr key={m.bulan} className={m.jumlahTx === 0 ? 'opacity-40' : ''}>
                      <td className="font-semibold text-slate-700">{m.nama}</td>
                      <td className="text-right text-sm">{formatRupiah(m.omset)}</td>
                      <td className="text-right text-sm text-green-600">{formatRupiah(m.labaKotor)}</td>
                      <td className="text-right text-sm text-orange-600">{formatRupiah(m.pengeluaran)}</td>
                      <td className={`text-right text-sm font-bold ${profitColor(m.labaBersih)}`}>
                        {formatRupiah(m.labaBersih)}
                      </td>
                      <td className="text-right text-xs text-slate-400">{m.jumlahTx}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                    <td className="text-slate-700">TOTAL {year}</td>
                    <td className="text-right text-blue-700">{formatRupiah(r.omset)}</td>
                    <td className="text-right text-green-700">{formatRupiah(r.labaKotor)}</td>
                    <td className="text-right text-orange-700">{formatRupiah(r.pengeluaran)}</td>
                    <td className={`text-right ${profitColor(r.labaBersih)}`}>{formatRupiah(r.labaBersih)}</td>
                    <td className="text-right text-slate-500">{r.jumlahTx}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── LaporanPage — wrapper dengan 2 tab ──────────────────────
export function LaporanPage() {
  const [tab, setTab] = useState('utama');
  return (
    <div className="animate-fade-in-up pb-24 lg:pb-0">
      <PageHeader
        title="Laporan"
        subtitle="Rekap laba rugi per bulan"
      />
      {/* Tab bar */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          { key: 'utama',   label: 'Laporan Utama',     icon: TrendingUp },
          { key: 'service', label: 'Laporan Service HP', icon: Wrench },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>
      {tab === 'utama'   && <LaporanUtama />}
      {tab === 'service' && <LaporanServiceHP />}
    </div>
  );
}

// ============================================================
// ============================================================
// PelangganPage.jsx — dengan sistem poin member
// ============================================================

function MemberBadge({ isMember }) {
  return isMember
    ? <span className="badge bg-yellow-100 text-yellow-700 font-bold">⭐ Member</span>
    : <span className="badge badge-gray">Umum</span>;
}

function PointDetailModal({ open, onClose, customer, isAdmin, onRefresh }) {
  const [detail, setDetail]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [addPoinModal, setAddPoinModal] = useState(false);
  const [addForm, setAddForm]   = useState({ points: '', description: '' });
  const [saving, setSaving]     = useState(false);
  const [rewards, setRewards]   = useState([]);
  const [showRewards, setShowRewards] = useState(false);
  const [redeemingReward, setRedeemingReward] = useState(null);

  useEffect(() => {
    if (!open || !customer) return;
    setLoading(true);
    pointAPI.getCustomer(customer._id)
      .then(r => setDetail(r.data.data))
      .catch(() => toast.error('Gagal memuat data poin'))
      .finally(() => setLoading(false));
    // Load rewards
    rewardAPI.get().then(r => setRewards(r.data.data || [])).catch(() => {});
  }, [open, customer]);

  const handleActivate = async () => {
    try {
      await pointAPI.activate(customer._id);
      toast.success('Pelanggan diaktifkan sebagai member!');
      onRefresh(); onClose();
    } catch { toast.error('Gagal aktivasi'); }
  };

  const handleAddPoin = async () => {
    if (!addForm.points || Number(addForm.points) <= 0) return toast.error('Isi jumlah poin');
    setSaving(true);
    try {
      await pointAPI.addManual(customer._id, { points: Number(addForm.points), description: addForm.description });
      toast.success('Poin ditambahkan!');
      setAddPoinModal(false);
      setAddForm({ points: '', description: '' });
      // Reload detail
      const r = await pointAPI.getCustomer(customer._id);
      setDetail(r.data.data);
      onRefresh();
    } catch { toast.error('Gagal tambah poin'); }
    finally { setSaving(false); }
  };

  const ps = detail?.pointSettings || {};
  const c  = detail?.customer || {};
  const logs = detail?.logs || [];

  return (
    <Modal open={open} onClose={onClose} title={`Poin Member: ${customer?.name}`} size="md">
      {loading ? <Loader /> : (
        <div className="space-y-4">
          {/* Status member */}
          <div className={`rounded-xl p-4 flex items-center justify-between ${c.isMember ? 'bg-yellow-50 border border-yellow-100' : 'bg-slate-50 border border-slate-100'}`}>
            <div>
              <p className="text-xs text-slate-400 mb-1">{c.isMember ? 'Member sejak ' + new Date(c.memberSince).toLocaleDateString('id-ID') : 'Bukan Member'}</p>
              <p className="text-2xl font-black text-yellow-600">{c.points?.toLocaleString('id-ID') || 0} poin</p>
              <p className="text-xs text-slate-400 mt-0.5">Total didapat: {c.totalPoints?.toLocaleString('id-ID') || 0} poin</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Nilai poin saat ini</p>
              <p className="text-lg font-bold text-green-600">{formatRupiah((c.points || 0) * (ps.rupiahPerPoint || 1))}</p>
              <p className="text-xs text-slate-400 mt-1">Min redeem: {ps.minRedeemPoints || 1000} poin</p>
            </div>
          </div>

          {/* Info konversi */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-blue-50 rounded-lg p-2.5 text-center">
              <p className="text-blue-400">Dapat poin tiap</p>
              <p className="font-bold text-blue-700">Rp {ps.pointPerRupiah || 100} belanja = 1 poin</p>
            </div>
            <div className="bg-green-50 rounded-lg p-2.5 text-center">
              <p className="text-green-400">Nilai tukar</p>
              <p className="font-bold text-green-700">{ps.minRedeemPoints || 1000} poin = {formatRupiah((ps.minRedeemPoints || 1000) * (ps.rupiahPerPoint || 1))}</p>
            </div>
          </div>

          {/* Tombol admin */}
          {isAdmin && (
            <div className="flex gap-2">
              {!c.isMember && (
                <button onClick={handleActivate} className="btn btn-primary flex-1 text-sm py-2">
                  ⭐ Aktifkan Member
                </button>
              )}
              <button onClick={() => setAddPoinModal(true)} className="btn btn-outline flex-1 text-sm py-2">
                + Tambah Poin Manual
              </button>
              {rewards.length > 0 && (
                <button onClick={() => setShowRewards(r => !r)} className="btn btn-outline flex-1 text-sm py-2 text-yellow-600 border-yellow-300">
                  🎁 Tukar Hadiah
                </button>
              )}
            </div>
          )}

          {/* Daftar Hadiah yang bisa ditukar */}
          {showRewards && rewards.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mt-2">
              <p className="text-xs font-bold text-yellow-700 mb-2">🎁 Pilih Hadiah untuk Ditukar</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {rewards.map(r => (
                  <div key={r._id} className={`flex items-center justify-between p-2 rounded-xl border bg-white ${
                    c.points >= r.pointsRequired ? 'border-yellow-200' : 'border-slate-100 opacity-50'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{r.image ? <img src={r.image} alt={r.name} className="w-8 h-8 object-cover rounded-lg" /> : '🎁'}</span>
                      <div>
                        <p className="text-xs font-bold text-slate-700">{r.name}</p>
                        <p className="text-xs text-yellow-600 font-bold">⭐ {r.pointsRequired?.toLocaleString('id-ID')} poin</p>
                        <p className="text-xs text-slate-400">Stok: {r.stock}</p>
                      </div>
                    </div>
                    <button
                      disabled={c.points < r.pointsRequired || r.stock <= 0 || redeemingReward === r._id}
                      onClick={async () => {
                        if (!window.confirm(`Tukar ${r.pointsRequired} poin dengan "${r.name}"?`)) return;
                        setRedeemingReward(r._id);
                        try {
                          const { data } = await rewardAPI.redeem({ customerId: customer._id, rewardId: r._id });
                          toast.success(`✅ ${r.name} berhasil ditukar! Sisa poin: ${data.data.sisaPoin}`);
                          const rd = await pointAPI.getCustomer(customer._id);
                          setDetail(rd.data.data);
                          rewardAPI.get().then(res => setRewards(res.data.data || []));
                          if (onRefresh) onRefresh();
                        } catch (err) {
                          toast.error(err.response?.data?.message || 'Gagal menukar hadiah');
                        } finally { setRedeemingReward(null); }
                      }}
                      className="btn btn-primary py-1 px-2.5 text-xs disabled:opacity-40">
                      {redeemingReward === r._id ? '...' : 'Tukar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Riwayat poin */}
          <div>
            <p className="text-xs font-bold text-slate-500 mb-2">Riwayat Poin Terakhir</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {logs.length === 0
                ? <EmptyState message="Belum ada riwayat poin" />
                : logs.map((l, i) => (
                  <div key={l._id || i} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 text-xs">
                    <span className={`font-bold text-sm ${l.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {l.points > 0 ? '+' : ''}{l.points}
                    </span>
                    <div className="flex-1">
                      <p className="text-slate-600">{l.description}</p>
                      <p className="text-slate-400">{new Date(l.createdAt).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                    </div>
                    <span className={`badge text-xs ${l.type === 'earn' ? 'badge-green' : l.type === 'redeem' ? 'badge-blue' : 'badge-gray'}`}>
                      {l.type === 'earn' ? 'Dapat' : l.type === 'redeem' ? 'Pakai' : 'Manual'}
                    </span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>
      )}

      {/* Modal tambah poin */}
      <Modal open={addPoinModal} onClose={() => setAddPoinModal(false)} title="Tambah Poin Manual" size="sm">
        <div className="space-y-3">
          <div>
            <label className="label">Jumlah Poin *</label>
            <input className="input" type="number" min="1" placeholder="100" value={addForm.points} onChange={e => setAddForm(f => ({ ...f, points: e.target.value }))} />
          </div>
          <div>
            <label className="label">Keterangan</label>
            <input className="input" placeholder="Bonus poin, kompensasi, dll..." value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-1">
            <button className="btn btn-outline flex-1" onClick={() => setAddPoinModal(false)}>Batal</button>
            <button className="btn btn-primary flex-1" onClick={handleAddPoin} disabled={saving}>{saving ? 'Menyimpan...' : 'Tambah Poin'}</button>
          </div>
        </div>
      </Modal>
    </Modal>
  );
}

export function PelangganPage() {
  const { isAdmin } = useAuth();
  const [customers, setCustomers]   = useState([]);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [showTxModal, setShowTxModal]       = useState(false);
  const [showPointModal, setShowPointModal] = useState(false);
  const [editCust, setEditCust]     = useState(null);
  const [selectedCust, setSelectedCust]     = useState(null);
  const [custTx, setCustTx]         = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [form, setForm]   = useState({ name: '', phone: '', address: '', notes: '' });
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [filterMember, setFilterMember] = useState(''); // '' | 'member' | 'umum'
  const [sortBy, setSortBy] = useState('terbaru'); // terbaru | nama_asc | nama_desc | poin | belanja | transaksi

  const load = async (q = search) => {
    setLoading(true);
    try { const { data } = await customerAPI.getAll(q ? { search: q } : {}); setCustomers(data.data || []); }
    catch { toast.error('Gagal memuat pelanggan'); }
    finally { setLoading(false); }
  };

  useEffect(() => { const t = setTimeout(() => load(), 300); return () => clearTimeout(t); }, [search]);

  const openAdd  = () => { setEditCust(null); setForm({ name:'', phone:'', address:'', notes:'' }); setShowModal(true); };
  const openEdit = (c) => { setEditCust(c); setForm({ name: c.name, phone: c.phone||'', address: c.address||'', notes: c.notes||'' }); setShowModal(true); };
  const openPoint = (c) => { setSelectedCust(c); setShowPointModal(true); };

  const handleSave = async () => {
    if (!form.name) return toast.error('Nama pelanggan wajib diisi');
    setSaving(true);
    try {
      if (editCust) await customerAPI.update(editCust._id, form);
      else await customerAPI.create(form);
      toast.success(editCust ? 'Data diperbarui' : 'Pelanggan ditambahkan');
      setShowModal(false); load();
    } catch { toast.error('Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await customerAPI.delete(selectedCust._id); toast.success('Pelanggan dihapus'); setShowDeleteConfirm(false); load(); }
    catch { toast.error('Gagal menghapus'); }
    finally { setDeleting(false); }
  };

  const viewTx = async (c) => {
    setSelectedCust(c);
    const { data } = await customerAPI.getTransactions(c._id);
    setCustTx(data.data || []);
    setShowTxModal(true);
  };

  const displayed = customers
    .filter(c =>
      filterMember === 'member' ? c.isMember :
      filterMember === 'umum'   ? !c.isMember : true
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'nama_asc':  return (a.name || '').localeCompare(b.name || '', 'id');
        case 'nama_desc': return (b.name || '').localeCompare(a.name || '', 'id');
        case 'poin':      return (b.points || 0) - (a.points || 0);
        case 'belanja':   return (b.totalSpent || 0) - (a.totalSpent || 0);
        case 'transaksi': return (b.totalTransactions || 0) - (a.totalTransactions || 0);
        case 'terbaru':
        default:          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
    });

  const totalMember = customers.filter(c => c.isMember).length;
  const totalPoin   = customers.reduce((s, c) => s + (c.points || 0), 0);

  return (
    <div className="animate-fade-in-up pb-24 lg:pb-0">
      <PageHeader title="Pelanggan" subtitle="Data pelanggan & sistem poin member"
        actions={<button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Tambah Pelanggan</button>}
      />

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="card py-3 text-center">
          <p className="text-xs text-slate-400">Total Pelanggan</p>
          <p className="text-xl font-bold text-slate-700">{customers.length}</p>
        </div>
        <div className="card py-3 text-center border-yellow-100 bg-yellow-50">
          <p className="text-xs text-yellow-500">Total Member</p>
          <p className="text-xl font-bold text-yellow-700">{totalMember} ⭐</p>
        </div>
        <div className="card py-3 text-center border-green-100 bg-green-50">
          <p className="text-xs text-green-500">Total Poin Aktif</p>
          <p className="text-xl font-bold text-green-700">{totalPoin.toLocaleString('id-ID')}</p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="card mb-4 flex gap-2 items-center flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Cari nama atau nomor HP..." />
        </div>
        <div className="flex gap-1">
          {[{ v:'', l:'Semua' }, { v:'member', l:'⭐ Member' }, { v:'umum', l:'Umum' }].map(f => (
            <button key={f.v} onClick={() => setFilterMember(f.v)}
              className={`btn py-1.5 px-3 text-xs ${filterMember === f.v ? 'btn-primary' : 'btn-outline'}`}>
              {f.l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 font-semibold whitespace-nowrap hidden sm:inline">Urutkan:</span>
          <select className="input py-1.5 w-auto text-sm" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="terbaru">Terbaru</option>
            <option value="nama_asc">Nama A-Z</option>
            <option value="nama_desc">Nama Z-A</option>
            <option value="poin">Poin Terbanyak</option>
            <option value="belanja">Belanja Terbanyak</option>
            <option value="transaksi">Transaksi Terbanyak</option>
          </select>
        </div>
      </div>

      {loading ? <Loader /> : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Nama</th><th>No. HP</th><th>Status</th><th>Poin</th><th>Total Tx</th><th>Total Belanja</th><th>Aksi</th></tr>
            </thead>
            <tbody className="bg-white">
              {displayed.length === 0
                ? <tr><td colSpan={7}><EmptyState message="Belum ada data pelanggan" /></td></tr>
                : displayed.map(c => (
                  <tr key={c._id}>
                    <td className="font-semibold text-slate-700">{c.name}</td>
                    <td className="text-slate-500">{c.phone || '-'}</td>
                    <td><MemberBadge isMember={c.isMember} /></td>
                    <td>
                      {c.isMember
                        ? <span className="font-bold text-yellow-600">{(c.points||0).toLocaleString('id-ID')} poin</span>
                        : <span className="text-slate-300 text-xs">—</span>
                      }
                    </td>
                    <td><span className="badge badge-blue">{c.totalTransactions} tx</span></td>
                    <td className="font-semibold text-primary-600">{formatRupiah(c.totalSpent)}</td>
                    <td>
                      <div className="flex gap-1.5">
                        <button onClick={() => openPoint(c)} className="btn btn-outline py-1.5 px-2.5 text-xs" title="Poin Member">⭐</button>
                        <button onClick={() => viewTx(c)} className="btn btn-outline py-1.5 px-2.5 text-xs" title="Riwayat Transaksi"><Eye size={13} /></button>
                        <button onClick={() => openEdit(c)} className="btn btn-outline py-1.5 px-2.5 text-xs"><Edit2 size={13} /></button>
                        {isAdmin && <button onClick={() => { setSelectedCust(c); setShowDeleteConfirm(true); }} className="btn btn-danger py-1.5 px-2.5 text-xs"><Trash2 size={13} /></button>}
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* Modal form pelanggan */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editCust ? 'Edit Pelanggan' : 'Tambah Pelanggan'} size="sm">
        <div className="space-y-3">
          <div><label className="label">Nama *</label><input className="input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} /></div>
          <div><label className="label">No. HP</label><input className="input" value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} /></div>
          <div><label className="label">Alamat</label><input className="input" value={form.address} onChange={e => setForm(f=>({...f,address:e.target.value}))} /></div>
          <div><label className="label">Catatan</label><input className="input" value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} /></div>
        </div>
        <div className="flex gap-3 mt-4">
          <button className="btn btn-outline flex-1" onClick={() => setShowModal(false)}>Batal</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
        </div>
      </Modal>

      {/* Modal riwayat transaksi */}
      <Modal open={showTxModal} onClose={() => setShowTxModal(false)} title={`Riwayat: ${selectedCust?.name}`} size="lg">
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {custTx.length === 0 ? <EmptyState message="Belum ada transaksi" /> : custTx.map(tx => (
            <div key={tx._id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex-1"><p className="text-sm font-bold text-slate-700">{tx.invoiceNumber}</p><p className="text-xs text-slate-400">{formatDate(tx.transactionDate)} • {tx.items?.length} item</p></div>
              <div className="text-right"><p className="text-sm font-bold text-primary-600">{formatRupiah(tx.total)}</p><span className={`badge ${PAYMENT_COLORS[tx.paymentMethod]}`}>{PAYMENT_LABELS[tx.paymentMethod]}</span></div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Modal poin member */}
      <PointDetailModal
        open={showPointModal}
        onClose={() => setShowPointModal(false)}
        customer={selectedCust}
        isAdmin={isAdmin}
        onRefresh={load}
      />

      <ConfirmDialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={handleDelete}
        title="Hapus Pelanggan" message={`Hapus pelanggan "${selectedCust?.name}"?`} loading={deleting} />
    </div>
  );
}

// ============================================================
// PengaturanPage.jsx
// ============================================================

export function PengaturanPage() {
  const { user: currentUser, isAdmin, isSuperAdmin } = useAuth();
  const [settings, setSettings]   = useState(null);
  const [users, setUsers]         = useState([]);
  const [cabangs, setCabangs]     = useState([]);
  const [saving, setSaving]       = useState(false);

  // Bulk set poin fisik
  const [bulkPoint, setBulkPoint]     = useState('');
  const [settingBulk, setSettingBulk] = useState(false);

  // Reward Catalog
  const [rewards, setRewards]         = useState([]);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [editReward, setEditReward]   = useState(null);
  const [rewardForm, setRewardForm]   = useState({ name: '', description: '', pointsRequired: '', stock: '', image: '' });
  const [savingReward, setSavingReward] = useState(false);

  const loadRewards = useCallback(async () => {
    try {
      const { data } = await rewardAPI.getAll();
      setRewards(data.data || []);
    } catch {}
  }, []);

  // Reset password karyawan (admin)
  const [resetTarget, setResetTarget]   = useState(null); // user yang akan direset
  const [resetPw, setResetPw]           = useState('');
  const [resetting, setResetting]       = useState(false);

  // Ganti password sendiri (semua role)
  const [showChangePw, setShowChangePw] = useState(false);
  const [changePwForm, setChangePwForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPw, setChangingPw]     = useState(false);

  // Backup
  const [backupInfo, setBackupInfo]     = useState(null);
  const [downloading, setDownloading]   = useState(false);
  const [lastBackup, setLastBackup]     = useState(
    localStorage.getItem('lastBackupDate') || null
  );

  const loadBackupInfo = async () => {
    if (!isSuperAdmin) return;
    try {
      const r = await backupAPI.getInfo();
      setBackupInfo(r.data.data);
    } catch {}
  };

  const handleBackup = async () => {
    setDownloading(true);
    try {
      const r = await backupAPI.download();
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a');
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      a.href = url;
      a.download = `backup-konterpos-${dateStr}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      const now2 = new Date().toLocaleString('id-ID');
      setLastBackup(now2);
      localStorage.setItem('lastBackupDate', now2);
      toast.success('Backup berhasil didownload!');
    } catch { toast.error('Gagal backup database'); }
    finally { setDownloading(false); }
  };

  // ── SuperAdmin: Paket Subscription (localStorage) ─────────────────────
  const [paketConfig, setPaketConfig] = useState(() => {
    try {
      const stored = localStorage.getItem('paketSubscription');
      return stored ? JSON.parse(stored) : { hargaPerBulan: 30000, durasi: [1, 2, 3, 6] };
    } catch { return { hargaPerBulan: 30000, durasi: [1, 2, 3, 6] }; }
  });
  const [savingPaket, setSavingPaket] = useState(false);
  const [durasiInput, setDurasiInput] = useState((paketConfig.durasi || []).join(','));

  const handleSavePaket = () => {
    const hargaNum = Number(String(paketConfig.hargaPerBulan).replace(/\D/g,'')) || 0;
    if (hargaNum < 1000) return toast.error('Harga per bulan minimal Rp 1.000');
    const durasiArr = durasiInput.split(',').map(s => parseInt(s.trim())).filter(n => n > 0);
    if (!durasiArr.length) return toast.error('Minimal 1 durasi paket');
    setSavingPaket(true);
    try {
      const next = { hargaPerBulan: hargaNum, durasi: durasiArr };
      localStorage.setItem('paketSubscription', JSON.stringify(next));
      setPaketConfig(next);
      toast.success('Paket subscription disimpan!');
    } catch { toast.error('Gagal menyimpan paket'); }
    finally { setSavingPaket(false); }
  };

  // ── SuperAdmin: Pengumuman Platform (localStorage) ────────────────────
  const [pengumumanList, setPengumumanList] = useState(() => {
    try { return JSON.parse(localStorage.getItem('platformAnnouncements') || '[]'); }
    catch { return []; }
  });
  const [pengumumanForm, setPengumumanForm] = useState({ title: '', message: '' });

  const handleKirimPengumuman = () => {
    if (!pengumumanForm.title.trim() || !pengumumanForm.message.trim())
      return toast.error('Judul dan pesan wajib diisi');
    const next = [{
      id: Date.now(),
      title: pengumumanForm.title.trim(),
      message: pengumumanForm.message.trim(),
      sentAt: new Date().toISOString(),
    }, ...pengumumanList];
    setPengumumanList(next);
    localStorage.setItem('platformAnnouncements', JSON.stringify(next));
    setPengumumanForm({ title: '', message: '' });
    toast.success('Pengumuman tersimpan & akan dikirim ke semua owner');
  };

  const handleDeletePengumuman = (id) => {
    if (!window.confirm('Hapus pengumuman ini?')) return;
    const next = pengumumanList.filter(p => p.id !== id);
    setPengumumanList(next);
    localStorage.setItem('platformAnnouncements', JSON.stringify(next));
  };

  // Modal tambah user
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', username: '', password: '', role: 'karyawan', cabang: '' });
  const [addingUser, setAddingUser] = useState(false);

  // Modal edit user
  const [editUser, setEditUser]       = useState(null);
  const [editForm, setEditForm]       = useState({ name: '', role: 'karyawan', cabang: '', password: '' });
  const [savingEdit, setSavingEdit]   = useState(false);

  const loadUsers = async () => {
    const { data } = await authAPI.getUsers();
    setUsers(data.data || []);
  };

  useEffect(() => {
    settingsAPI.get().then(r => setSettings(r.data.data)).catch(() => {});
    loadUsers();
    loadBackupInfo();
    loadRewards();
    // Load cabang untuk superadmin
    if (isSuperAdmin) {
      cabangAPI.getAll().then(r => setCabangs(r.data.data || [])).catch(() => {});
    }
  }, [isSuperAdmin, loadRewards]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try { await settingsAPI.update(settings); toast.success('Pengaturan disimpan!'); }
    catch { toast.error('Gagal menyimpan pengaturan'); }
    finally { setSaving(false); }
  };

  const handleAddUser = async () => {
    if (!userForm.name || !userForm.username || !userForm.password) return toast.error('Semua field wajib diisi');
    if (isSuperAdmin && !userForm.cabang) return toast.error('Pilih cabang untuk user ini');
    setAddingUser(true);
    try {
      await authAPI.register({
        ...userForm,
        cabang: userForm.cabang || null,
      });
      toast.success('User ditambahkan');
      setShowUserModal(false);
      setUserForm({ name: '', username: '', password: '', role: 'karyawan', cabang: '' });
      loadUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menambah user'); }
    finally { setAddingUser(false); }
  };

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({
      name:     u.name,
      role:     u.role,
      cabang:   u.cabang?._id || u.cabang || '',
      password: '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editForm.name) return toast.error('Nama wajib diisi');
    setSavingEdit(true);
    try {
      const payload = { name: editForm.name, role: editForm.role, cabang: editForm.cabang || null };
      if (editForm.password) payload.password = editForm.password;
      await authAPI.updateUser(editUser._id, payload);
      toast.success('User diperbarui');
      setEditUser(null);
      loadUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal memperbarui user'); }
    finally { setSavingEdit(false); }
  };

  const handleResetPassword = async () => {
    if (!resetPw || resetPw.length < 6) return toast.error('Password minimal 6 karakter');
    setResetting(true);
    try {
      await authAPI.resetPassword(resetTarget._id, resetPw);
      toast.success(`Password ${resetTarget.name} berhasil direset!`);
      setResetTarget(null);
      setResetPw('');
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal reset password'); }
    finally { setResetting(false); }
  };

  const handleChangeMyPassword = async () => {
    if (!changePwForm.oldPassword || !changePwForm.newPassword) return toast.error('Semua field wajib diisi');
    if (changePwForm.newPassword.length < 6) return toast.error('Password baru minimal 6 karakter');
    if (changePwForm.newPassword !== changePwForm.confirmPassword) return toast.error('Konfirmasi password tidak cocok');
    setChangingPw(true);
    try {
      await authAPI.changeMyPassword(changePwForm.oldPassword, changePwForm.newPassword);
      toast.success('Password berhasil diubah!');
      setShowChangePw(false);
      setChangePwForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal mengubah password'); }
    finally { setChangingPw(false); }
  };

  const toggleUserActive = async (user) => {
    try {
      await authAPI.updateUser(user._id, { isActive: !user.isActive });
      loadUsers();
      toast.success(user.isActive ? 'User dinonaktifkan' : 'User diaktifkan');
    } catch { toast.error('Gagal mengubah status user'); }
  };

  const getCabangNama = (user) => {
    if (user.cabang?.nama) return user.cabang.nama;
    if (user.cabang) {
      const c = cabangs.find(c => c._id === user.cabang || c._id === user.cabang?._id);
      return c?.nama || '—';
    }
    return '—';
  };

  if (!settings) return <Loader />;

  return (
    <div className="animate-fade-in-up max-w-3xl pb-24 lg:pb-0">
      <PageHeader
        title="Pengaturan"
        subtitle={isSuperAdmin ? 'Manajemen platform & konfigurasi sistem' : 'Konfigurasi toko & manajemen pengguna'}
      />

      {/* Backup Database - SuperAdmin Only */}
      {isSuperAdmin && (
        <div className="card mb-6 border-2 border-primary-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-xl">💾</div>
            <div>
              <h3 className="font-bold text-slate-700">Backup Database</h3>
              <p className="text-xs text-slate-400">Download semua data sebagai file ZIP</p>
            </div>
          </div>

          {backupInfo && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-blue-700">{backupInfo.totalDocuments}</p>
                <p className="text-xs text-blue-400">Total Dokumen</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-green-700">{backupInfo.collections_count}</p>
                <p className="text-xs text-green-400">Collection</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-sm font-bold text-slate-700">{lastBackup || 'Belum pernah'}</p>
                <p className="text-xs text-slate-400">Backup Terakhir</p>
              </div>
            </div>
          )}

          {backupInfo && (
            <div className="bg-slate-50 rounded-xl p-3 mb-4">
              <p className="text-xs font-semibold text-slate-500 mb-2">Detail per Collection:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {Object.entries(backupInfo.collections).map(([col, count]) => (
                  <div key={col} className="flex justify-between text-xs px-2 py-1 bg-white rounded-lg">
                    <span className="text-slate-500">{col}</span>
                    <span className="font-bold text-slate-700">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              ⚠️ Simpan file backup di tempat aman
            </p>
            <button
              className="btn btn-primary"
              onClick={handleBackup}
              disabled={downloading}
            >
              {downloading ? (
                <>⏳ Memproses...</>
              ) : (
                <>💾 Backup Sekarang</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Paket Subscription - SuperAdmin Only */}
      {isSuperAdmin && (
        <div className="card mb-6 border-2 border-amber-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl">💳</div>
            <div>
              <h3 className="font-bold text-slate-700">Paket Subscription</h3>
              <p className="text-xs text-slate-400">Atur harga & durasi paket berlangganan untuk client</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Harga per Bulan (Rp)</label>
              <input className="input" inputMode="numeric"
                value={paketConfig.hargaPerBulan ? new Intl.NumberFormat('id-ID').format(paketConfig.hargaPerBulan) : ''}
                onChange={e => setPaketConfig(p => ({ ...p, hargaPerBulan: Number(e.target.value.replace(/\D/g,'')) || 0 }))} />
              <p className="text-xs text-slate-400 mt-1">Contoh: 30.000 = Rp 30 ribu / bulan</p>
            </div>
            <div>
              <label className="label">Durasi Paket Tersedia (bulan)</label>
              <input className="input"
                placeholder="1,2,3,6"
                value={durasiInput}
                onChange={e => setDurasiInput(e.target.value)} />
              <p className="text-xs text-slate-400 mt-1">Pisahkan koma. Contoh: 1,2,3,6</p>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4">
            <p className="text-xs font-bold text-amber-700 mb-1">📋 Preview Paket Aktif</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {(paketConfig.durasi || []).map(b => (
                <span key={b} className="text-xs font-semibold bg-white border border-amber-300 text-amber-700 px-2.5 py-1 rounded-lg">
                  {b} bln · {formatRupiah(b * (paketConfig.hargaPerBulan || 0))}
                </span>
              ))}
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button className="btn btn-primary" onClick={handleSavePaket} disabled={savingPaket}>
              {savingPaket ? 'Menyimpan...' : 'Simpan Paket'}
            </button>
          </div>
        </div>
      )}

      {/* Pengumuman Platform - SuperAdmin Only */}
      {isSuperAdmin && (
        <div className="card mb-6 border-2 border-violet-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-xl">📢</div>
            <div>
              <h3 className="font-bold text-slate-700">Pengumuman Platform</h3>
              <p className="text-xs text-slate-400">Kirim notifikasi/pengumuman ke semua owner</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="label">Judul</label>
              <input className="input" placeholder="Contoh: Maintenance Server"
                value={pengumumanForm.title}
                onChange={e => setPengumumanForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="label">Pesan</label>
              <textarea className="input h-24 resize-none"
                placeholder="Tulis isi pengumuman..."
                value={pengumumanForm.message}
                onChange={e => setPengumumanForm(f => ({ ...f, message: e.target.value }))} />
            </div>
            <div className="flex justify-end">
              <button className="btn btn-primary" onClick={handleKirimPengumuman}>
                📤 Kirim Pengumuman
              </button>
            </div>
          </div>
          {pengumumanList.length > 0 && (
            <div className="mt-5 border-t pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Riwayat Pengumuman ({pengumumanList.length})
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pengumumanList.map(p => (
                  <div key={p.id} className="p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-bold text-sm text-slate-700">{p.title}</p>
                      <button onClick={() => handleDeletePengumuman(p.id)}
                        className="text-xs text-red-500 hover:text-red-600 shrink-0">Hapus</button>
                    </div>
                    <p className="text-xs text-slate-600 whitespace-pre-wrap">{p.message}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(p.sentAt).toLocaleString('id-ID')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-slate-400 mt-3 italic">
            ℹ️ Tersimpan lokal sementara. Integrasi notifikasi push ke owner akan tersedia di update berikutnya.
          </p>
        </div>
      )}

      {/* Info Toko */}
      {!isSuperAdmin && (
      <div className="card mb-6">
        <h3 className="font-bold text-slate-700 mb-4">Informasi Toko</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label">Nama Toko</label><input className="input" value={settings.storeName || ''} onChange={e => setSettings(s => ({...s, storeName: e.target.value}))} /></div>
          <div><label className="label">No. Telepon</label><input className="input" value={settings.storePhone || ''} onChange={e => setSettings(s => ({...s, storePhone: e.target.value}))} /></div>
          <div className="sm:col-span-2"><label className="label">Alamat Toko</label><input className="input" value={settings.storeAddress || ''} onChange={e => setSettings(s => ({...s, storeAddress: e.target.value}))} /></div>
          <div className="sm:col-span-2"><label className="label">Pesan Bawah Struk</label><textarea className="input h-20 resize-none" value={settings.receiptFooter || ''} onChange={e => setSettings(s => ({...s, receiptFooter: e.target.value}))} /></div>
          <div><label className="label">Min. Stok Alert (default)</label><input className="input" type="number" value={settings.lowStockThreshold || 5} onChange={e => setSettings(s => ({...s, lowStockThreshold: e.target.value}))} /></div>
        </div>
        <div className="mt-4">
          <label className="label">Metode Pembayaran</label>
          <div className="flex gap-3">
            {['cash', 'qris', 'transfer'].map(m => (
              <label key={m} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={settings.paymentMethods?.[m] !== false}
                  onChange={e => setSettings(s => ({...s, paymentMethods: {...s.paymentMethods, [m]: e.target.checked}}))} className="rounded" />
                <span className="text-sm font-medium text-slate-700 capitalize">{m}</span>
              </label>
            ))}
          </div>
        </div>
        {/* Pengaturan Sistem Poin Member */}
        <div className="border-t pt-5 mt-5">
          <h3 className="font-bold text-slate-700 mb-1">⭐ Pengaturan Sistem Poin Member</h3>
          <p className="text-xs text-slate-400 mb-4">Atur cara pelanggan mendapatkan dan menukar poin</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Toggle aktif */}
            <div className="sm:col-span-3 flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox"
                  checked={settings.pointSettings?.enabled !== false}
                  onChange={e => setSettings(s => ({...s, pointSettings: {...(s.pointSettings||{}), enabled: e.target.checked}}))}/>
                <span className="text-sm font-medium text-slate-600">Aktifkan sistem poin</span>
              </label>
            </div>
            {/* Poin per rupiah */}
            <div>
              <label className="label">Belanja per 1 Poin (Rp)</label>
              <input className="input" type="number" min="1"
                placeholder="50"
                value={settings.pointSettings?.pointPerRupiah || 50}
                onChange={e => setSettings(s => ({...s, pointSettings: {...(s.pointSettings||{}), pointPerRupiah: Number(e.target.value)}}))}
              />
              <p className="text-xs text-slate-400 mt-1">Contoh: 50 = setiap Rp 50 belanja dapat 1 poin</p>
            </div>
            {/* Nilai per poin */}
            <div>
              <label className="label">Nilai 1 Poin (Rp)</label>
              <input className="input" type="number" min="1"
                placeholder="10"
                value={settings.pointSettings?.rupiahPerPoint || 10}
                onChange={e => setSettings(s => ({...s, pointSettings: {...(s.pointSettings||{}), rupiahPerPoint: Number(e.target.value)}}))}
              />
              <p className="text-xs text-slate-400 mt-1">Contoh: 10 = 1 poin = Rp 10 diskon</p>
            </div>
            {/* Minimum redeem */}
            <div>
              <label className="label">Minimum Poin Redeem</label>
              <input className="input" type="number" min="1"
                placeholder="100"
                value={settings.pointSettings?.minRedeemPoints || 100}
                onChange={e => setSettings(s => ({...s, pointSettings: {...(s.pointSettings||{}), minRedeemPoints: Number(e.target.value)}}))}
              />
              <p className="text-xs text-slate-400 mt-1">Minimum poin yang bisa ditukar</p>
            </div>
          </div>
          {/* Preview kalkulasi */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mt-3">
            <p className="text-xs font-bold text-yellow-700 mb-1">📊 Preview Kalkulasi</p>
            <p className="text-xs text-yellow-600">Belanja Rp {((settings.pointSettings?.pointPerRupiah || 50) * 100).toLocaleString("id-ID")} = 100 poin = diskon Rp {((settings.pointSettings?.rupiahPerPoint || 10) * 100).toLocaleString("id-ID")}</p>
          </div>
          {/* Bulk set poin produk fisik */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mt-3">
            <p className="text-xs font-bold text-blue-700 mb-1">⚡ Set Poin Massal Produk Fisik</p>
            <p className="text-xs text-blue-500 mb-2">Set poin default untuk semua produk fisik sekaligus. Produk yang sudah punya poin custom bisa diedit manual di halaman Stok.</p>
            <div className="flex gap-2">
              <input className="input text-sm flex-1" type="number" min="0"
                placeholder="Contoh: 5 (poin per produk)"
                value={bulkPoint}
                onChange={e => setBulkPoint(e.target.value)} />
              <button className="btn btn-primary py-1.5 px-3 text-sm"
                disabled={settingBulk || bulkPoint === ""}
                onClick={async () => {
                  if (!window.confirm(`Set semua produk fisik ke ${bulkPoint} poin? Ini akan overwrite semua poin yang sudah ada.`)) return;
                  setSettingBulk(true);
                  try {
                    const { data } = await productAPI.bulkSetPoints(Number(bulkPoint));
                    toast.success(`✅ ${data.modifiedCount} produk fisik diupdate ke ${bulkPoint} poin!`);
                    setBulkPoint("");
                  } catch { toast.error("Gagal set poin massal"); }
                  finally { setSettingBulk(false); }
                }}>
                {settingBulk ? "Memproses..." : "Set Semua"}
              </button>
            </div>
          </div>
        </div>

        {/* Pengaturan Fonnte WA Notifikasi — hanya owner */}
        {currentUser?.role === 'owner' && (
          <div className="border-t pt-5 mt-5">
            <h3 className="font-bold text-slate-700 mb-1">📱 Notifikasi WhatsApp (Fonnte)</h3>
            <p className="text-xs text-slate-400 mb-4">Kirim WA otomatis ke member setelah transaksi berhasil</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox"
                    checked={settings.fonnteSettings?.enabled === true}
                    onChange={e => setSettings(s => ({...s, fonnteSettings: {...(s.fonnteSettings||{}), enabled: e.target.checked}}))}/>
                  <span className="text-sm font-medium text-slate-600">Aktifkan notifikasi WA</span>
                </label>
              </div>
              <div>
                <label className="label">Token API Fonnte</label>
                <input className="input" type="password"
                  placeholder="Masukkan token dari fonnte.com"
                  value={settings.fonnteSettings?.token || ''}
                  onChange={e => setSettings(s => ({...s, fonnteSettings: {...(s.fonnteSettings||{}), token: e.target.value}}))}
                />
                <p className="text-xs text-slate-400 mt-1">Dapatkan token di <a href="https://fonnte.com" target="_blank" rel="noreferrer" className="text-blue-500 underline">fonnte.com</a> → Settings → Token</p>
              </div>
              <div>
                <label className="label">Nomor Device (HP Fonnte)</label>
                <input className="input"
                  placeholder="Contoh: 6281234567890"
                  value={settings.fonnteSettings?.device || ''}
                  onChange={e => setSettings(s => ({...s, fonnteSettings: {...(s.fonnteSettings||{}), device: e.target.value}}))}
                />
                <p className="text-xs text-slate-400 mt-1">Format: 62xxx (tanpa + atau 0 di depan)</p>
              </div>
              <div>
                <label className="label">Template Pesan WA</label>
                <textarea className="input h-40 resize-none text-sm"
                  value={settings.fonnteSettings?.template || ''}
                  onChange={e => setSettings(s => ({...s, fonnteSettings: {...(s.fonnteSettings||{}), template: e.target.value}}))}
                  placeholder="Template pesan..."/>
                <div className="bg-slate-50 rounded-xl p-3 mt-2">
                  <p className="text-xs font-bold text-slate-500 mb-1">📝 Variabel yang tersedia:</p>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      ['{nama}', 'Nama pelanggan'],
                      ['{toko}', 'Nama toko'],
                      ['{rincian}', 'Rincian produk/transaksi'],
                      ['{total}', 'Total belanja'],
                      ['{poin}', 'Poin didapat'],
                      ['{totalPoin}', 'Total poin saat ini'],
                      ['{invoice}', 'Nomor invoice'],
                    ].map(([v, d]) => (
                      <div key={v} className="flex items-center gap-1">
                        <code className="text-xs bg-slate-200 px-1.5 py-0.5 rounded font-mono">{v}</code>
                        <span className="text-xs text-slate-400">{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pengaturan Marquee Motivasi */}
        <div className="border-t pt-5 mt-5">
          <h3 className="font-bold text-slate-700 mb-3">📢 Teks Berjalan di Kasir</h3>
          <div className="flex items-center gap-3 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={settings.marqueeSettings?.enabled !== false}
                onChange={e => setSettings(s => ({...s, marqueeSettings: {...(s.marqueeSettings||{}), enabled: e.target.checked}}))}/>
              <span className="text-sm font-medium text-slate-600">Aktifkan teks berjalan</span>
            </label>
          </div>
          <div className="mb-3">
            <label className="label">Kecepatan (detik) — semakin besar semakin lambat</label>
            <div className="flex items-center gap-3">
              <input type="range" min="10" max="100" step="2"
                value={settings.marqueeSettings?.speed || 28}
                onChange={e => setSettings(s => ({...s, marqueeSettings: {...(s.marqueeSettings||{}), speed: Number(e.target.value)}}))}
                className="flex-1"/>
              <span className="text-sm font-bold text-slate-700 w-16">{settings.marqueeSettings?.speed || 28} detik</span>
            </div>
          </div>
          <div>
            <label className="label">Pesan (satu per baris)</label>
            <textarea className="input h-36 resize-none text-sm"
              value={(settings.marqueeSettings?.messages || [
                '💪 Semangat bekerja! Kejujuran adalah aset terbaik kita',
                '🌟 Setiap transaksi yang jujur membangun kepercayaan pelanggan',
                '✅ Teliti sebelum input, cek kembali sebelum bayar',
              ]).join('\n')}
              onChange={e => setSettings(s => ({...s, marqueeSettings: {...(s.marqueeSettings||{}), messages: e.target.value.split('\n').filter(m => m.trim())}}))}
              placeholder="Satu pesan per baris..."/>
            <p className="text-xs text-slate-400 mt-1">Gunakan emoji untuk memperindah pesan 🌟</p>
          </div>
        </div>

        <button className="btn btn-primary mt-5" onClick={handleSaveSettings} disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </div>
      )}

      {/* ─── Reward Catalog ─────────────────────────────────── */}
      {(isAdmin || currentUser?.role === 'owner') && !isSuperAdmin && (
        <div className="card mt-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-700">🎁 Katalog Hadiah (Reward)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Daftar hadiah yang bisa ditukar pelanggan dengan poin</p>
            </div>
            <button onClick={() => { setEditReward(null); setRewardForm({ name: '', description: '', pointsRequired: '', stock: '', image: '' }); setShowRewardModal(true); }}
              className="btn btn-primary py-1.5 px-3 text-sm">+ Tambah Hadiah</button>
          </div>
          {rewards.length === 0
            ? <EmptyState message="Belum ada hadiah. Tambahkan hadiah untuk pelanggan!" />
            : <div className="space-y-2">
                {rewards.map(r => (
                  <div key={r._id} className={`flex items-center justify-between p-3 rounded-xl border ${r.isActive ? 'bg-slate-50 border-slate-100' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center text-xl flex-shrink-0">
                        {r.image ? <img src={r.image} alt={r.name} className="w-full h-full object-cover rounded-xl" /> : '🎁'}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-700">{r.name}</p>
                        <p className="text-xs text-slate-400">{r.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-bold text-yellow-600">⭐ {r.pointsRequired?.toLocaleString('id-ID')} poin</span>
                          <span className="text-xs text-slate-400">Stok: {r.stock}</span>
                          {!r.isActive && <span className="badge badge-gray text-xs">Nonaktif</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => { setEditReward(r); setRewardForm({ name: r.name, description: r.description || '', pointsRequired: String(r.pointsRequired), stock: String(r.stock), image: r.image || '' }); setShowRewardModal(true); }}
                        className="btn btn-outline py-1 px-2 text-xs">Edit</button>
                      <button onClick={async () => { if (window.confirm('Hapus hadiah ini?')) { await rewardAPI.delete(r._id); loadRewards(); toast.success('Hadiah dihapus!'); } }}
                        className="btn btn-outline py-1 px-2 text-xs text-red-500">Hapus</button>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {/* Modal Tambah/Edit Reward */}
      <Modal open={showRewardModal} onClose={() => setShowRewardModal(false)}
        title={editReward ? 'Edit Hadiah' : 'Tambah Hadiah'} size="sm">
        <div className="space-y-3">
          <div><label className="label">Nama Hadiah *</label>
            <input className="input" placeholder="Contoh: Jam Dinding" value={rewardForm.name}
              onChange={e => setRewardForm(f => ({...f, name: e.target.value}))} /></div>
          <div><label className="label">Deskripsi</label>
            <input className="input" placeholder="Deskripsi singkat hadiah" value={rewardForm.description}
              onChange={e => setRewardForm(f => ({...f, description: e.target.value}))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Poin Dibutuhkan *</label>
              <input className="input" type="number" min="1" placeholder="1000" value={rewardForm.pointsRequired}
                onChange={e => setRewardForm(f => ({...f, pointsRequired: e.target.value}))} /></div>
            <div><label className="label">Stok</label>
              <input className="input" type="number" min="0" placeholder="10" value={rewardForm.stock}
                onChange={e => setRewardForm(f => ({...f, stock: e.target.value}))} /></div>
          </div>
          <div><label className="label">URL Gambar (opsional)</label>
            <input className="input" placeholder="https://..." value={rewardForm.image}
              onChange={e => setRewardForm(f => ({...f, image: e.target.value}))} /></div>
          {editReward && (
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={rewardForm.isActive !== false}
                onChange={e => setRewardForm(f => ({...f, isActive: e.target.checked}))} />
              <label className="text-sm text-slate-600">Aktif (tampil di daftar hadiah)</label>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button className="btn btn-outline flex-1" onClick={() => setShowRewardModal(false)}>Batal</button>
            <button className="btn btn-primary flex-1" disabled={savingReward}
              onClick={async () => {
                if (!rewardForm.name || !rewardForm.pointsRequired) return toast.error('Nama dan poin wajib diisi!');
                setSavingReward(true);
                try {
                  const payload = { ...rewardForm, pointsRequired: Number(rewardForm.pointsRequired), stock: Number(rewardForm.stock) || 0 };
                  if (editReward) await rewardAPI.update(editReward._id, payload);
                  else await rewardAPI.create(payload);
                  toast.success(editReward ? 'Hadiah diupdate!' : 'Hadiah ditambahkan!');
                  setShowRewardModal(false); loadRewards();
                } catch (err) { toast.error(err.response?.data?.message || 'Gagal menyimpan'); }
                finally { setSavingReward(false); }
              }}>
              {savingReward ? 'Menyimpan...' : (editReward ? 'Update' : 'Tambah')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Ganti Password Sendiri — semua role bisa akses */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-700">Password Akun</h3>
            <p className="text-xs text-slate-400 mt-0.5">Ganti password login kamu sendiri</p>
          </div>
          <button className="btn btn-outline text-sm" onClick={() => setShowChangePw(true)}>
            🔑 Ganti Password
          </button>
        </div>
      </div>

      {/* Manajemen User */}
      {isAdmin && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-700">
                {isSuperAdmin ? 'Manajemen User Platform' : 'Manajemen Pengguna'}
              </h3>
              {isSuperAdmin && (
                <p className="text-xs text-slate-400 mt-0.5">Owner & karyawan dari semua client</p>
              )}
            </div>
            <button className="btn btn-primary" onClick={() => setShowUserModal(true)}>
              <Plus size={16} /> Tambah User
            </button>
          </div>
          <div className="space-y-2">
            {users.map(u => (
              <div key={u._id} className={`flex items-center gap-3 p-3 rounded-xl border ${u.isActive ? 'bg-slate-50 border-slate-100' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
                <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {u.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700">{u.name}</p>
                  <p className="text-xs text-slate-400">
                    @{u.username} • <span className="capitalize">{u.role}</span>
                    {u.role !== 'superadmin' && (
                      <span className="ml-1 text-primary-500">• {getCabangNama(u)}</span>
                    )}
                  </p>
                </div>
                <span className={`badge ${u.isActive ? 'badge-green' : 'badge-gray'} text-xs flex-shrink-0`}>
                  {u.isActive ? 'Aktif' : 'Nonaktif'}
                </span>
                <button onClick={() => openEdit(u)} className="btn btn-outline py-1.5 px-2.5 text-xs flex-shrink-0">
                  <Edit2 size={13} />
                </button>
                {(isAdmin || isSuperAdmin) && u._id !== currentUser?._id && (
                  <button onClick={() => { setResetTarget(u); setResetPw(''); }}
                    className="btn btn-outline py-1.5 px-2.5 text-xs flex-shrink-0 text-amber-600 border-amber-300 hover:bg-amber-50"
                    title="Reset Password">
                    🔑
                  </button>
                )}
                <button onClick={() => toggleUserActive(u)} className={`btn py-1.5 px-2.5 text-xs flex-shrink-0 ${u.isActive ? 'btn-outline text-red-500' : 'btn-outline text-green-600'}`}>
                  {u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Tambah User */}
      <Modal open={showUserModal} onClose={() => setShowUserModal(false)} title="Tambah Pengguna" size="sm">
        <div className="space-y-3">
          <div><label className="label">Nama Lengkap *</label>
            <input className="input" placeholder="Nama lengkap..." value={userForm.name} onChange={e => setUserForm(f=>({...f,name:e.target.value}))} />
          </div>
          <div><label className="label">Username *</label>
            <input className="input" placeholder="username..." value={userForm.username} onChange={e => setUserForm(f=>({...f,username:e.target.value}))} />
          </div>
          <div><label className="label">Password *</label>
            <input className="input" type="password" placeholder="Min. 6 karakter" value={userForm.password} onChange={e => setUserForm(f=>({...f,password:e.target.value}))} />
          </div>
          <div><label className="label">Role</label>
            <select className="input" value={userForm.role} onChange={e => setUserForm(f=>({...f,role:e.target.value}))}>
              <option value="karyawan">Karyawan</option>
              <option value="admin">Admin</option>
              {isSuperAdmin && <option value="owner">Owner</option>}
              {isSuperAdmin && <option value="superadmin">Super Admin</option>}
            </select>
          </div>
          <div>
            <label className="label">Cabang *</label>
            <select className="input" value={userForm.cabang} onChange={e => setUserForm(f=>({...f,cabang:e.target.value}))}>
              <option value="">— Pilih Cabang —</option>
              {cabangs.filter(c => c.isActive).map(c => (
                <option key={c._id} value={c._id}>{c.nama} ({c.kode})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button className="btn btn-outline flex-1" onClick={() => setShowUserModal(false)}>Batal</button>
          <button className="btn btn-primary flex-1" onClick={handleAddUser} disabled={addingUser}>
            {addingUser ? 'Menyimpan...' : 'Tambah User'}
          </button>
        </div>
      </Modal>

      {/* Modal Edit User */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`Edit: ${editUser?.name}`} size="sm">
        <div className="space-y-3">
          <div><label className="label">Nama Lengkap *</label>
            <input className="input" value={editForm.name} onChange={e => setEditForm(f=>({...f,name:e.target.value}))} />
          </div>
          <div><label className="label">Role</label>
            <select className="input" value={editForm.role} onChange={e => setEditForm(f=>({...f,role:e.target.value}))}>
              <option value="karyawan">Karyawan</option>
              <option value="admin">Admin</option>
              {isSuperAdmin && <option value="owner">Owner</option>}
              {isSuperAdmin && <option value="superadmin">Super Admin</option>}
            </select>
          </div>
          <div>
            <label className="label">Cabang</label>
            <select className="input" value={editForm.cabang} onChange={e => setEditForm(f=>({...f,cabang:e.target.value}))}>
              <option value="">— Tidak ada / Super Admin —</option>
              {cabangs.filter(c => c.isActive).map(c => (
                <option key={c._id} value={c._id}>{c.nama} ({c.kode})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label flex items-center gap-2">
              Password Baru
              <span className="text-slate-400 font-normal normal-case text-xs">(kosongkan jika tidak ingin ganti)</span>
            </label>
            <input className="input" type="password" placeholder="Password baru..." value={editForm.password}
              onChange={e => setEditForm(f=>({...f,password:e.target.value}))} />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button className="btn btn-outline flex-1" onClick={() => setEditUser(null)}>Batal</button>
          <button className="btn btn-primary flex-1" onClick={handleSaveEdit} disabled={savingEdit}>
            {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </Modal>

      {/* Modal Reset Password Karyawan (Admin) */}
      <Modal open={!!resetTarget} onClose={() => { setResetTarget(null); setResetPw(''); }}
        title={`Reset Password — ${resetTarget?.name}`} size="sm">
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-700">⚠️ Password lama akan <strong>terhapus permanen</strong>. Pastikan kamu memberitahu password baru ke karyawan.</p>
          </div>
          <div>
            <label className="label">Password Baru *</label>
            <input className="input" type="password" placeholder="Min. 6 karakter"
              value={resetPw} onChange={e => setResetPw(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button className="btn btn-outline flex-1" onClick={() => { setResetTarget(null); setResetPw(''); }}>Batal</button>
          <button className="btn flex-1 bg-amber-500 hover:bg-amber-400 text-white font-bold" onClick={handleResetPassword} disabled={resetting}>
            {resetting ? 'Mereset...' : '🔑 Reset Password'}
          </button>
        </div>
      </Modal>

      {/* Modal Ganti Password Sendiri */}
      <Modal open={showChangePw} onClose={() => { setShowChangePw(false); setChangePwForm({ oldPassword: '', newPassword: '', confirmPassword: '' }); }}
        title="Ganti Password Saya" size="sm">
        <div className="space-y-3">
          <div>
            <label className="label">Password Lama *</label>
            <input className="input" type="password" placeholder="Password yang sekarang"
              value={changePwForm.oldPassword} onChange={e => setChangePwForm(f => ({ ...f, oldPassword: e.target.value }))} />
          </div>
          <div>
            <label className="label">Password Baru *</label>
            <input className="input" type="password" placeholder="Min. 6 karakter"
              value={changePwForm.newPassword} onChange={e => setChangePwForm(f => ({ ...f, newPassword: e.target.value }))} />
          </div>
          <div>
            <label className="label">Konfirmasi Password Baru *</label>
            <input className="input" type="password" placeholder="Ulangi password baru"
              value={changePwForm.confirmPassword} onChange={e => setChangePwForm(f => ({ ...f, confirmPassword: e.target.value }))} />
          </div>
          {changePwForm.newPassword && changePwForm.confirmPassword && changePwForm.newPassword !== changePwForm.confirmPassword && (
            <p className="text-xs text-red-500">⚠️ Password tidak cocok</p>
          )}
        </div>
        <div className="flex gap-3 mt-4">
          <button className="btn btn-outline flex-1" onClick={() => setShowChangePw(false)}>Batal</button>
          <button className="btn btn-primary flex-1" onClick={handleChangeMyPassword} disabled={changingPw}>
            {changingPw ? 'Menyimpan...' : 'Simpan Password'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

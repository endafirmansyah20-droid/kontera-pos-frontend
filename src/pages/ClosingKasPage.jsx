import React, { useState, useEffect } from 'react';
import { closingKasAPI, saldoAPI, productAPI } from '../services/api';
import { formatRupiah, formatDateTime } from '../utils/helpers';
import { PageHeader, Modal, Loader, EmptyState } from '../components/UI';
import {
  Calculator, CheckCircle2, TrendingUp, TrendingDown,
  History, Eye, Loader2, DollarSign, Package, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const PECAHAN = [
  { key: 'lembar100rb', label: 'Rp 100.000', nilai: 100000 },
  { key: 'lembar50rb',  label: 'Rp 50.000',  nilai: 50000 },
  { key: 'lembar20rb',  label: 'Rp 20.000',  nilai: 20000 },
  { key: 'lembar10rb',  label: 'Rp 10.000',  nilai: 10000 },
  { key: 'lembar5rb',   label: 'Rp 5.000',   nilai: 5000 },
  { key: 'lembar2rb',   label: 'Rp 2.000',   nilai: 2000 },
  { key: 'lembar1rb',   label: 'Rp 1.000',   nilai: 1000 },
  { key: 'koin500',     label: 'Rp 500',      nilai: 500 },
];

const defaultUang = Object.fromEntries(PECAHAN.map(p => [p.key, '']));

const TotalSelisihCard = ({ kasSummary }) => {
  const allPlus  = kasSummary?.totalCashPlus  || 0;
  const allMinus = kasSummary?.totalCashMinus || 0;

  return (
    <div className="card mb-4 p-4">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 text-xs">
        <span className="w-48 flex-shrink-0 text-slate-400 font-bold uppercase tracking-wide">Keterangan</span>
        <span className="flex-1 text-right text-green-500 font-bold">Cash Plus ⬆️</span>
        <span className="flex-1 text-right text-red-400 font-bold">Cash Minus ⬇️</span>
      </div>

      <div className="flex items-center gap-2 py-1.5 border-b border-slate-50 text-xs">
        <span className="w-48 flex-shrink-0 text-slate-500">🧾 Selisih Cash & Stok (Bulan Ini)</span>
        <span className="flex-1 text-right text-green-600 font-semibold">+{formatRupiah(allPlus)}</span>
        <span className="flex-1 text-right text-red-500 font-semibold">-{formatRupiah(allMinus)}</span>
      </div>

      <div className="flex items-center gap-2 pt-2 mt-1 border-t-2 border-slate-200 text-xs">
        <span className="w-48 flex-shrink-0 text-slate-700 font-black">🧮 Total Kumulatif</span>
        <span className="flex-1 text-right text-green-700 font-black text-sm">+{formatRupiah(allPlus)}</span>
        <span className="flex-1 text-right text-red-600 font-black text-sm">-{formatRupiah(allMinus)}</span>
      </div>

      {allPlus > 0 && (
        <div className="mt-3 p-3 bg-green-50 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-green-700">💰 Uang Plus Menunggu Setor</p>
            <p className="text-xs text-green-500">Setor saat Closing Produk berikutnya</p>
          </div>
          <p className="text-base font-black text-green-700">+{formatRupiah(allPlus)}</p>
        </div>
      )}

      {allMinus > 0 && (
        <div className="mt-2 p-3 bg-red-50 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-red-600">⚠️ Total Cash Minus Bulan Ini</p>
            <p className="text-xs text-red-400">Reset setiap akhir bulan (tutup buku)</p>
          </div>
          <p className="text-base font-black text-red-600">-{formatRupiah(allMinus)}</p>
        </div>
      )}
    </div>
  );
};

const CashPlusMinusCard = ({ cashPlus = 0, cashMinus = 0, netCash = 0, label = '' }) => (
  <div className="rounded-xl border border-slate-100 bg-white p-4">
    {label && <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">{label}</p>}
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-green-50 rounded-xl p-3 text-center">
        <p className="text-xs text-green-600 font-bold mb-0.5">Cash Plus ⬆️</p>
        <p className="text-xs text-green-400 mb-1.5">Selisih Lebih</p>
        <p className="text-sm font-black text-green-700">{formatRupiah(cashPlus)}</p>
      </div>
      <div className="bg-red-50 rounded-xl p-3 text-center">
        <p className="text-xs text-red-500 font-bold mb-0.5">Cash Minus ⬇️</p>
        <p className="text-xs text-red-300 mb-1.5">Selisih Kurang</p>
        <p className="text-sm font-black text-red-600">{formatRupiah(cashMinus)}</p>
      </div>
      <div className={`rounded-xl p-3 text-center ${netCash >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
        <p className={`text-xs font-bold mb-0.5 ${netCash >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>Net Selisih</p>
        <p className={`text-xs mb-1.5 ${netCash >= 0 ? 'text-blue-300' : 'text-orange-300'}`}>{netCash >= 0 ? 'Untung' : 'Rugi'}</p>
        <p className={`text-sm font-black ${netCash >= 0 ? 'text-blue-700' : 'text-orange-600'}`}>
          {netCash > 0 ? '+' : ''}{formatRupiah(netCash)}
        </p>
      </div>
    </div>
  </div>
);

export default function ClosingPage() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('cash');
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [shift, setShift] = useState('full');
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [uangFisik, setUangFisik] = useState(defaultUang);
  const [totalFisikInput, setTotalFisikInput] = useState('');
  const [catatan, setCatatan] = useState('');
  const [catatanSelisih, setCatatanSelisih] = useState('');
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [kasTunai, setKasTunai] = useState(0);
  const [produkFisik, setProdukFisik] = useState([]);
  // FIXED: Baca dari sessionStorage agar input tidak reset saat pindah halaman
  const [stokFisik, setStokFisik] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('closing_stokFisik') || '{}'); } catch { return {}; }
  });
  const [produkLoading, setProdukLoading] = useState(false);
  const [produkSearch, setProdukSearch] = useState('');
  const [savingProduk, setSavingProduk] = useState(false);
  const [showProdukConfirm, setShowProdukConfirm] = useState(false);
  const [catatanProduk, setCatatanProduk] = useState(() => {
    return sessionStorage.getItem('closing_catatanProduk') || '';
  });
  const [shiftProduk, setShiftProduk] = useState(() => {
    return sessionStorage.getItem('closing_shiftProduk') || 'full';
  });
  const [riwayat, setRiwayat] = useState([]);
  const [riwayatLoading, setRiwayatLoading] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedClosing, setSelectedClosing] = useState(null);
  const [filterType, setFilterType] = useState('semua');
  const [kasSummary, setKasSummary] = useState(null);
const [uangPlusSetor, setUangPlusSetor] = useState('');
const [cashPlusUsed, setCashPlusUsed] = useState(''); // cash plus yg dipakai tutup minus produk
const [showResetMinus, setShowResetMinus] = useState(false);
const [resetting, setResetting] = useState(false);

  // FIXED: Auto-save input closing produk ke sessionStorage
  useEffect(() => {
    sessionStorage.setItem('closing_stokFisik', JSON.stringify(stokFisik));
  }, [stokFisik]);
  useEffect(() => {
    sessionStorage.setItem('closing_catatanProduk', catatanProduk);
  }, [catatanProduk]);
  useEffect(() => {
    sessionStorage.setItem('closing_shiftProduk', shiftProduk);
  }, [shiftProduk]);

  useEffect(() => {
    loadSummary(); loadSaldo(); loadProduk(); loadRiwayat(); loadKasSummary();
  }, []);

  const loadSaldo = async () => {
    try {
      const { data } = await saldoAPI.getAll();
      // FIXED: Ambil kas tunai yang punya saldo matching (bukan duplikat)
      const kasList = data.data?.filter(s => s.akunId === 'tunai' || s.akunId?.startsWith('tunai-'));
      const kas = kasList?.find(s => s.akunId === 'tunai') || kasList?.[0];
      setKasTunai(kas?.saldo || 0);
    } catch {}
  };

  const loadSummary = async (tgl = tanggal) => {
    setSummaryLoading(true);
    try {
      const { data } = await closingKasAPI.getSummary(tgl);
      setSummary(data.data);
    } catch { toast.error('Gagal memuat summary'); }
    finally { setSummaryLoading(false); }
  };

  const loadProduk = async () => {
    setProdukLoading(true);
    try {
      const { data } = await productAPI.getAll({ type: 'fisik', limit: 200 });
      setProdukFisik(data.data || []);
    } catch {} finally { setProdukLoading(false); }
  };

  const loadRiwayat = async () => {
    setRiwayatLoading(true);
    try {
      const { data } = await closingKasAPI.getRiwayat({ limit: 50 });
      setRiwayat(data.data || []);
    } catch {} finally { setRiwayatLoading(false); }
  };

  const loadKasSummary = async () => {
  try {
    const { data } = await closingKasAPI.getKasSummary();
    setKasSummary(data.data);
  } catch {}
};

  const totalFisik = parseInt(totalFisikInput) || 0;
  const saldoSistem    = summary?.saldoSistem || kasTunai || 0;
  const selisih        = totalFisik - saldoSistem;
  const statusSelisih  = selisih === 0 ? 'sesuai' : selisih > 0 ? 'lebih' : 'kurang';
  const cashPlusCash   = selisih > 0 ? selisih : 0;
  const cashMinusCash  = selisih < 0 ? Math.abs(selisih) : 0;
  const netCashCash    = cashPlusCash - cashMinusCash;

  const selisihProduk = produkFisik.map(p => {
    const fisik = parseInt(stokFisik[p._id]);
    if (isNaN(fisik)) return null;
    const sel = fisik - p.stock;
    return { ...p, stokFisik: fisik, selisih: sel, nilaiSelisih: sel * p.sellPrice };
  }).filter(Boolean);

  const cashPlusProduk  = selisihProduk.filter(p => p.selisih > 0).reduce((s, p) => s + p.nilaiSelisih, 0);
  const cashMinusProduk = selisihProduk.filter(p => p.selisih < 0).reduce((s, p) => s + Math.abs(p.nilaiSelisih), 0);
  const netProduk       = cashPlusProduk - cashMinusProduk;
  const totalSelisihProduk = selisihProduk.filter(p => p.selisih !== 0).length;

  const filteredProduk = produkFisik.filter(p =>
    p.name.toLowerCase().includes(produkSearch.toLowerCase()) ||
    p.code.toLowerCase().includes(produkSearch.toLowerCase())
  );

  const handleSubmitCash = async () => {
  setSaving(true);
  try {
    await closingKasAPI.create({
      type: 'cash', tanggal, shift,
      uangFisik: { totalInput: totalFisik },
      totalFisik, saldoSistem,
      totalPemasukanCash: summary?.totalPemasukanCash || 0,
      totalPengeluaranCash: summary?.totalPengeluaranCash || 0,
      totalTransaksiCash: summary?.totalTransaksiCash || 0,
      jumlahTransaksi: summary?.jumlahTransaksiCash || 0,
      totalQris: summary?.totalQris || 0,
      totalTransfer: summary?.totalTransfer || 0,
      catatan,
      catatanSelisih: selisih !== 0 ? catatanSelisih : ''
    });
    toast.success('✅ Closing cash berhasil!');
    setShowConfirm(false);
    setTotalFisikInput('');
    setCatatan('');
    setCatatanSelisih('');
    // Refresh semua data
    await Promise.all([loadRiwayat(), loadSaldo(), loadSummary(), loadKasSummary()]);
  } catch (err) {
    toast.error(err.response?.data?.message || 'Gagal menyimpan');
  } finally {
    setSaving(false);
  }
};

  const handleSubmitProduk = async () => {
  if (selisihProduk.length === 0) return toast.error('Belum ada produk yang dihitung!');
  setSavingProduk(true);
  try {
    await closingKasAPI.create({
      type: 'produk',
      shift: shiftProduk,
      produkItems: selisihProduk.map(p => ({
        productId: p._id,
        productCode: p.code,
        productName: p.name,
        stokFisik: p.stokFisik,
      })),
      catatan: catatanProduk,
      uangPlusSetor: parseInt(uangPlusSetor) || 0,
      cashPlusUsed: parseInt(cashPlusUsed) || 0,
    });
    toast.success('✅ Closing produk berhasil! Stok diperbarui.');
    setShowProdukConfirm(false);
    setCatatanProduk('');
    setStokFisik({});
    setUangPlusSetor('');
    setCashPlusUsed('');
    // FIXED: Hapus data sementara dari sessionStorage setelah submit berhasil
    sessionStorage.removeItem('closing_stokFisik');
    sessionStorage.removeItem('closing_catatanProduk');
    sessionStorage.removeItem('closing_shiftProduk');
    // Refresh semua data
    await Promise.all([loadRiwayat(), loadProduk(), loadKasSummary()]);
  } catch (err) {
    toast.error(err.response?.data?.message || 'Gagal menyimpan');
  } finally {
    setSavingProduk(false);
  }
};

  const openDetail = async (id) => {
    try {
      const { data } = await closingKasAPI.getDetail(id);
      setSelectedClosing(data.data); setShowDetail(true);
    } catch { toast.error('Gagal memuat detail'); }
  };

  const filteredRiwayat = filterType === 'semua' ? riwayat : riwayat.filter(r => r.type === filterType || (!r.type && filterType === 'cash'));

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="Closing" subtitle="Closing kas harian, stok produk, dan riwayat" />

      <TotalSelisihCard kasSummary={kasSummary} />

      {/* Reset Cash Minus — tutup buku bulanan (admin only) */}
      {isAdmin && (
        <div className="flex justify-end mb-2">
          <button onClick={() => setShowResetMinus(true)}
            className="btn btn-outline py-1.5 text-xs text-red-500 border-red-200 hover:bg-red-50">
            🗓️ Reset Cash Minus (Tutup Buku)
          </button>
        </div>
      )}

      <div className="flex gap-0 mb-6 border-b border-slate-100">
        {[
          { id: 'cash',    label: 'Closing Cash',    icon: Calculator },
          { id: 'produk',  label: 'Closing Produk',  icon: Package },
          { id: 'riwayat', label: 'Riwayat Closing', icon: History },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition -mb-px ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'cash' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-bold text-slate-700 text-sm mb-3">Tanggal & Shift</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Tanggal</label>
                  <input className="input" type="date" value={tanggal} onChange={e => { setTanggal(e.target.value); loadSummary(e.target.value); }} />
                </div>
                <div>
                  <label className="label">Shift</label>
                  <select className="input" value={shift} onChange={e => setShift(e.target.value)}>
                    <option value="full">Full Day</option>
                    <option value="pagi">Pagi</option>
                    <option value="siang">Siang</option>
                    <option value="malam">Malam</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="card">
  <h3 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
    <Calculator size={16} className="text-blue-600" /> Hitung Uang di Kas
  </h3>
  <div>
    <label className="label">Masukkan Total Uang Fisik (Rp)</label>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold select-none pointer-events-none">Rp</span>
      <input
        className="input pl-10 text-lg font-bold"
        inputMode="numeric"
        placeholder="0"
        value={totalFisikInput ? new Intl.NumberFormat('id-ID').format(parseInt(totalFisikInput)) : ''}
        onChange={e => setTotalFisikInput(e.target.value.replace(/\D/g, ''))}
      />
    </div>
    <div className="grid grid-cols-4 gap-1.5 mt-2">
      {[100000, 500000, 1000000, 5000000].map(v => (
        <button key={v} onClick={() => setTotalFisikInput(String(v))}
          className="py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600">
          {v >= 1000000 ? `${v/1000000}jt` : `${v/1000}rb`}
        </button>
      ))}
    </div>
  </div>

  <div className="mt-4 pt-4 border-t-2 border-slate-200 flex justify-between items-center">
    <span className="text-base font-bold text-slate-700">Total Uang Fisik</span>
    <span className="text-xl font-black text-blue-600">{formatRupiah(totalFisik)}</span>
  </div>
</div>

            <div className="card">
              <label className="label">Catatan Shift</label>
              <textarea className="input h-20 resize-none" placeholder="Catatan shift hari ini..."
                value={catatan} onChange={e => setCatatan(e.target.value)} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="card">
              <h3 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                <DollarSign size={16} className="text-green-600" /> Ringkasan Sistem
              </h3>
              {summaryLoading ? <Loader size="sm" /> : summary ? (
                <div className="space-y-1.5">
                  {[
                    { label: '💵 Pemasukan Cash', value: summary.totalPemasukanCash, color: 'text-green-600' },
                    { label: '📱 QRIS', value: summary.totalQris || 0, color: 'text-blue-600' },
                    { label: '🏦 Transfer Bank', value: summary.totalTransfer || 0, color: 'text-purple-600' },
                    { label: '📤 Pengeluaran Cash', value: summary.totalPengeluaranCash, color: 'text-red-500' },
                    { label: '🧾 Transaksi Cash', value: `${summary.jumlahTransaksiCash || 0} transaksi`, isText: true },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between py-1.5 border-b border-slate-50 last:border-0">
                      <span className="text-sm text-slate-500">{item.label}</span>
                      <span className={`text-sm font-bold ${item.color || 'text-slate-700'}`}>
                        {item.isText ? item.value : formatRupiah(item.value)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 pt-3 border-t border-slate-100">
                    <span className="text-sm font-bold">Saldo Kas Sistem</span>
                    <span className="text-base font-black">{formatRupiah(saldoSistem)}</span>
                  </div>
                </div>
              ) : <p className="text-sm text-slate-400 text-center py-4">Pilih tanggal untuk memuat data</p>}
            </div>

            {totalFisik > 0 && (
              <CashPlusMinusCard label="Selisih Cash" cashPlus={cashPlusCash} cashMinus={cashMinusCash} netCash={netCashCash} />
            )}

            {totalFisik > 0 && (
              <div className={`card border-2 ${statusSelisih === 'sesuai' ? 'border-green-300 bg-green-50' : statusSelisih === 'lebih' ? 'border-blue-300 bg-blue-50' : 'border-red-300 bg-red-50'}`}>
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  {statusSelisih === 'sesuai' ? <><CheckCircle2 size={18} className="text-green-600" /><span className="text-green-700">Kas Sesuai ✅</span></>
                    : statusSelisih === 'lebih' ? <><TrendingUp size={18} className="text-blue-600" /><span className="text-blue-700">Kas Lebih ⬆️</span></>
                    : <><TrendingDown size={18} className="text-red-500" /><span className="text-red-600">Kas Kurang ⬇️</span></>}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-600">Saldo Sistem</span><span className="font-bold">{formatRupiah(saldoSistem)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-600">Uang Fisik</span><span className="font-bold">{formatRupiah(totalFisik)}</span></div>
                  <div className={`flex justify-between pt-2 border-t-2 ${statusSelisih === 'sesuai' ? 'border-green-200' : statusSelisih === 'lebih' ? 'border-blue-200' : 'border-red-200'}`}>
                    <span className="font-bold">Selisih</span>
                    <span className={`text-lg font-black ${statusSelisih === 'sesuai' ? 'text-green-600' : statusSelisih === 'lebih' ? 'text-blue-600' : 'text-red-600'}`}>
                      {selisih > 0 ? '+' : ''}{formatRupiah(selisih)}
                    </span>
                  </div>
                </div>
                {statusSelisih !== 'sesuai' && (
                  <div className="mt-4">
                    <label className="label">Alasan Selisih *</label>
                    <textarea className="input h-20 resize-none" placeholder="Jelaskan penyebab selisih..."
                      value={catatanSelisih} onChange={e => setCatatanSelisih(e.target.value)} />
                    <div className={`mt-2 p-3 rounded-xl text-xs ${statusSelisih === 'lebih' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                      Saldo kas tunai akan diupdate: {formatRupiah(saldoSistem)} → {formatRupiah(totalFisik)}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button onClick={() => {
              if (totalFisik === 0) return toast.error('Hitung uang fisik dulu!');
              if (!summary) return toast.error('Muat summary dulu!');
              if (statusSelisih !== 'sesuai' && !catatanSelisih.trim()) return toast.error('Isi alasan selisih!');
              setShowConfirm(true);
            }} className="btn btn-primary w-full py-4 text-base justify-center" disabled={totalFisik === 0 || !summary}>
              <Calculator size={20} /> Simpan Closing Cash
            </button>
          </div>
        </div>
      )}

      {activeTab === 'produk' && (
        <div>
          <div className="card mb-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-700 text-sm">Hitung Stok Fisik Produk</h3>
                <p className="text-xs text-slate-400 mt-0.5">Isi stok fisik → sistem otomatis update & hitung nilai selisih</p>
              </div>
              <div className="flex gap-2 items-center">
                <select className="input w-32" value={shiftProduk} onChange={e => setShiftProduk(e.target.value)}>
                  <option value="full">Full Day</option>
                  <option value="pagi">Pagi</option>
                  <option value="siang">Siang</option>
                  <option value="malam">Malam</option>
                </select>
                {/* Input Uang Plus Setor */}

  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl">
  <div className="flex items-center justify-between mb-2">
    <div>
      <p className="text-xs font-bold text-green-700">💰 Setor Uang Plus ke Kas Tunai</p>
      <p className="text-xs text-green-500">
        Uang Plus terkumpul: <span className="font-bold">{formatRupiah(kasSummary?.totalCashPlus || 0)}</span>
      </p>
    </div>
    {(kasSummary?.totalCashPlus || 0) > 0 && (
      <span className="badge badge-green text-xs">Ada {formatRupiah(kasSummary?.totalCashPlus || 0)}</span>
    )}
  </div>
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold select-none pointer-events-none">Rp</span>
    <input
      className="input pl-10 border-green-300 focus:ring-green-400"
      type="text"
      inputMode="numeric"
      placeholder="0 — isi jika mau setor uang plus"
      value={uangPlusSetor ? Number(uangPlusSetor).toLocaleString('id-ID') : ''}
      onChange={e => {
        const raw = e.target.value.replace(/\D/g, '');
        setUangPlusSetor(raw);
      }}
    />
  </div>
  {uangPlusSetor && parseInt(uangPlusSetor) > 0 && (
    <div className="mt-2 text-xs text-green-700 bg-green-100 rounded-lg p-2">
      ✅ <span className="font-bold">Rp {parseInt(uangPlusSetor).toLocaleString('id-ID')}</span> akan masuk ke Kas Tunai &amp; Cash Plus direset sebesar nominal yang disetor
    </div>
  )}
</div>
                <button onClick={() => {
                  if (selisihProduk.length === 0) return toast.error('Belum ada produk yang dihitung!');
                  setShowProdukConfirm(true);
                }} className="btn btn-primary whitespace-nowrap">
                  <Package size={16} /> Simpan Closing
                </button>
              </div>
            </div>

            {selisihProduk.length > 0 && (
              <CashPlusMinusCard label="Nilai Selisih Stok (Selisih × Harga Jual)" cashPlus={cashPlusProduk} cashMinus={cashMinusProduk} netCash={netProduk} />
            )}

            {selisihProduk.length > 0 && (cashPlusProduk > 0 || cashMinusProduk > 0) && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {cashPlusProduk > 0 && (
                  <div className="bg-green-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-green-600 mb-2">Stok Lebih (Cash Plus):</p>
                    {selisihProduk.filter(p => p.selisih > 0).map(p => (
                      <div key={p._id} className="text-xs text-green-700 mb-1">
                        <p className="font-semibold">{p.name}</p>
                        <p>+{p.selisih} × {formatRupiah(p.sellPrice)} = <span className="font-bold">{formatRupiah(p.nilaiSelisih)}</span></p>
                      </div>
                    ))}
                  </div>
                )}
                {cashMinusProduk > 0 && (
                  <div className="bg-red-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-red-500 mb-2">Stok Kurang (Cash Minus):</p>
                    {selisihProduk.filter(p => p.selisih < 0).map(p => (
                      <div key={p._id} className="text-xs text-red-600 mb-1">
                        <p className="font-semibold">{p.name}</p>
                        <p>{p.selisih} × {formatRupiah(p.sellPrice)} = <span className="font-bold">-{formatRupiah(Math.abs(p.nilaiSelisih))}</span></p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selisihProduk.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                <span className="badge badge-blue">{selisihProduk.length} produk dihitung</span>
                {totalSelisihProduk > 0 ? <span className="badge badge-red">⚠️ {totalSelisihProduk} selisih</span> : <span className="badge badge-green">✅ Semua sesuai</span>}
              </div>
            )}
          </div>

          <div className="card mb-4">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" placeholder="Cari nama atau kode produk..."
                value={produkSearch} onChange={e => setProdukSearch(e.target.value)} />
            </div>
          </div>

          {produkLoading ? <Loader /> : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Kode</th><th>Nama Produk</th><th>Harga Jual</th><th>Stok Sistem</th><th>Stok Fisik</th><th>Selisih</th><th>Nilai Selisih</th><th>Status</th></tr>
                </thead>
                <tbody className="bg-white">
                  {filteredProduk.length === 0
                    ? <tr><td colSpan={8}><EmptyState message="Tidak ada produk fisik" /></td></tr>
                    : filteredProduk.map(p => {
                      const fisik = parseInt(stokFisik[p._id]);
                      const sel = isNaN(fisik) ? null : fisik - p.stock;
                      const nilai = sel !== null ? sel * p.sellPrice : null;
                      const status = sel === null ? null : sel === 0 ? 'sesuai' : sel > 0 ? 'lebih' : 'kurang';
                      return (
                        <tr key={p._id} className={status === 'kurang' ? 'bg-red-50' : status === 'lebih' ? 'bg-green-50' : ''}>
                          <td><code className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">{p.code}</code></td>
                          <td className="font-medium text-slate-700">{p.name}</td>
                          <td className="text-blue-600 font-semibold text-xs">{formatRupiah(p.sellPrice)}</td>
                          <td><span className={`badge ${p.stock <= (p.minStock || 5) ? 'badge-red' : 'badge-green'}`}>{p.stock} {p.unit || 'pcs'}</span></td>
                          <td>
                            <input className={`input w-20 text-center text-sm ${status === 'kurang' ? 'border-red-300' : status === 'lebih' ? 'border-green-300' : ''}`}
                              type="text" inputMode="numeric" placeholder="—"
                              value={stokFisik[p._id] || ''}
                              onChange={e => setStokFisik(prev => ({ ...prev, [p._id]: e.target.value }))} />
                          </td>
                          <td>{sel === null ? <span className="text-slate-300 text-xs">—</span> : <span className={`font-bold text-sm ${sel === 0 ? 'text-green-600' : sel > 0 ? 'text-blue-600' : 'text-red-500'}`}>{sel > 0 ? '+' : ''}{sel}</span>}</td>
                          <td>{nilai === null ? <span className="text-slate-300 text-xs">—</span> : <span className={`font-bold text-xs ${nilai === 0 ? 'text-green-600' : nilai > 0 ? 'text-blue-600' : 'text-red-500'}`}>{nilai > 0 ? '+' : ''}{formatRupiah(nilai)}</span>}</td>
                          <td>{status === null ? <span className="text-slate-300 text-xs">Belum</span> : <span className={`badge ${status === 'sesuai' ? 'badge-green' : status === 'lebih' ? 'badge-blue' : 'badge-red'}`}>{status === 'sesuai' ? '✅ Sesuai' : status === 'lebih' ? '⬆️ Lebih' : '⬇️ Kurang'}</span>}</td>
                        </tr>
                      );
                    })
                  }
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'riwayat' && (
        <div>
          <div className="flex gap-2 mb-4 flex-wrap">
            {[{ id: 'semua', label: 'Semua' }, { id: 'cash', label: '💵 Cash' }, { id: 'produk', label: '📦 Produk' }].map(f => (
              <button key={f.id} onClick={() => setFilterType(f.id)} className={`btn ${filterType === f.id ? 'btn-primary' : 'btn-outline'} py-2`}>{f.label}</button>
            ))}
          </div>
          {riwayatLoading ? <Loader /> : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Tanggal</th><th>Tipe</th><th>Shift</th><th>Kasir</th><th>Cash Plus ⬆️</th><th>Cash Minus ⬇️</th><th>Net</th><th>Status</th><th>Aksi</th></tr>
                </thead>
                <tbody className="bg-white">
                  {filteredRiwayat.length === 0
                    ? <tr><td colSpan={9}><EmptyState message="Belum ada riwayat closing" /></td></tr>
                    : filteredRiwayat.map(c => {
                      const isCash = !c.type || c.type === 'cash';
                      const net = c.netCash || 0;
                      return (
                        <tr key={c._id}>
                          <td className="text-xs text-slate-500">{formatDateTime(c.createdAt)}</td>
                          <td><span className={`badge ${isCash ? 'badge-blue' : 'badge-purple'}`}>{isCash ? '💵 Cash' : '📦 Produk'}</span></td>
                          <td><span className="badge badge-gray capitalize">{c.shift}</span></td>
                          <td className="font-medium text-sm">{c.createdByName}</td>
                          <td className="text-green-600 font-bold text-sm">+{formatRupiah(c.cashPlus || 0)}</td>
                          <td className="text-red-500 font-bold text-sm">-{formatRupiah(c.cashMinus || 0)}</td>
                          <td><span className={`font-black text-sm ${net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{net > 0 ? '+' : ''}{formatRupiah(net)}</span></td>
                          <td>
                            {isCash
                              ? <span className={`badge ${c.statusSelisih === 'sesuai' ? 'badge-green' : c.statusSelisih === 'lebih' ? 'badge-blue' : 'badge-red'}`}>{c.statusSelisih === 'sesuai' ? '✅ Sesuai' : c.statusSelisih === 'lebih' ? '⬆️ Lebih' : '⬇️ Kurang'}</span>
                              : <span className={`badge ${!c.totalSelisihProduk ? 'badge-green' : 'badge-red'}`}>{!c.totalSelisihProduk ? '✅ Sesuai' : `⚠️ ${c.totalSelisihProduk} selisih`}</span>}
                          </td>
                          <td><button onClick={() => openDetail(c._id)} className="btn btn-outline py-1 px-2 text-xs"><Eye size={12} /> Detail</button></td>
                        </tr>
                      );
                    })
                  }
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Konfirmasi Closing Cash" size="sm">
        <div className={`rounded-xl p-4 mb-4 text-center ${statusSelisih === 'sesuai' ? 'bg-green-50' : statusSelisih === 'lebih' ? 'bg-blue-50' : 'bg-red-50'}`}>
          <p className="text-3xl mb-2">{statusSelisih === 'sesuai' ? '✅' : statusSelisih === 'lebih' ? '⬆️' : '⚠️'}</p>
          <p className="text-lg font-bold text-slate-700">{statusSelisih === 'sesuai' ? 'Kas Sesuai' : statusSelisih === 'lebih' ? `Kas Lebih ${formatRupiah(selisih)}` : `Kas Kurang ${formatRupiah(Math.abs(selisih))}`}</p>
        </div>
        <CashPlusMinusCard cashPlus={cashPlusCash} cashMinus={cashMinusCash} netCash={netCashCash} />
        <div className="space-y-2 text-sm my-4">
          <div className="flex justify-between py-1.5 border-b"><span className="text-slate-500">Saldo Sistem</span><span className="font-bold">{formatRupiah(saldoSistem)}</span></div>
          <div className="flex justify-between py-1.5 border-b"><span className="text-slate-500">Uang Fisik</span><span className="font-bold">{formatRupiah(totalFisik)}</span></div>
          <div className="flex justify-between py-1.5"><span className="text-slate-500">Saldo Kas Setelah</span><span className="font-bold text-blue-600">{formatRupiah(totalFisik)}</span></div>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-outline flex-1" onClick={() => setShowConfirm(false)}>Batal</button>
          <button className="btn btn-primary flex-1" onClick={handleSubmitCash} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </Modal>

      <Modal open={showProdukConfirm} onClose={() => setShowProdukConfirm(false)} title="Konfirmasi Closing Produk" size="sm">
        <div className={`rounded-xl p-4 mb-4 text-center ${totalSelisihProduk === 0 ? 'bg-green-50' : 'bg-orange-50'}`}>
          <p className="text-3xl mb-2">{totalSelisihProduk === 0 ? '✅' : '⚠️'}</p>
          <p className="text-lg font-bold text-slate-700">{totalSelisihProduk === 0 ? 'Semua Stok Sesuai!' : `${totalSelisihProduk} Produk Selisih`}</p>
          <p className="text-sm text-slate-500 mt-1">{selisihProduk.length} produk dihitung</p>
        </div>
        {/* FIXED: Cash Plus bisa dipakai tutup Cash Minus produk */}
        {(() => {
          const cpUsed = parseInt(cashPlusUsed) || 0;
          const netSetelah = cashPlusProduk + Math.min(cpUsed, kasSummary?.totalCashPlus || 0) - cashMinusProduk;
          return (
            <>
              <CashPlusMinusCard label="Nilai Selisih Stok" cashPlus={cashPlusProduk} cashMinus={cashMinusProduk} netCash={cashPlusProduk + Math.min(cpUsed, kasSummary?.totalCashPlus || 0) - cashMinusProduk} />
              {(kasSummary?.totalCashPlus || 0) > 0 && cashMinusProduk > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 my-3">
                  <p className="text-xs font-bold text-amber-700 mb-1">&#128176; Pakai Cash Plus untuk tutup selisih?</p>
                  <p className="text-xs text-amber-600 mb-2">Cash Plus tersedia: <span className="font-bold">{formatRupiah(kasSummary?.totalCashPlus || 0)}</span></p>
                  <input
                    type="text" inputMode="numeric"
                    className="input text-sm"
                    placeholder={`Maks ${formatRupiah(Math.min(kasSummary?.totalCashPlus || 0, cashMinusProduk))}`}
                    value={cashPlusUsed ? Number(cashPlusUsed).toLocaleString('id-ID') : ''}
                    onChange={e => {
                      const raw = e.target.value.replace(/\D/g, '');
                      const max = Math.min(kasSummary?.totalCashPlus || 0, cashMinusProduk);
                      setCashPlusUsed(raw && parseInt(raw) > max ? String(max) : raw);
                    }}
                  />
                  {cpUsed > 0 && <p className="text-xs text-green-700 font-bold mt-1">&#10003; Net selisih: {netSetelah >= 0 ? '+' : ''}{formatRupiah(netSetelah)}</p>}
                </div>
              )}
            </>
          );
        })()}
        {totalSelisihProduk > 0 && (
          <div className="my-3 max-h-36 overflow-y-auto space-y-1">
            {selisihProduk.filter(p => p.selisih !== 0).map(p => (
              <div key={p._id} className={`flex justify-between text-xs p-2 rounded-lg ${p.selisih < 0 ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                <span className="font-medium">{p.name}</span>
                <span className="font-bold">{p.selisih > 0 ? '+' : ''}{p.selisih} = {p.selisih > 0 ? '+' : ''}{formatRupiah(p.nilaiSelisih)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mb-4 mt-3">
          <label className="label">Catatan (opsional)</label>
          <textarea className="input h-16 resize-none" placeholder="Catatan closing produk..."
            value={catatanProduk} onChange={e => setCatatanProduk(e.target.value)} />
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 mb-4">
          ℹ️ Stok sistem akan otomatis berubah sesuai stok fisik setelah disimpan.
        </div>
        <div className="flex gap-3">
          <button className="btn btn-outline flex-1" onClick={() => setShowProdukConfirm(false)}>Batal</button>
          <button className="btn btn-primary flex-1" onClick={handleSubmitProduk} disabled={savingProduk}>
            {savingProduk ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {savingProduk ? 'Menyimpan...' : 'Simpan & Update Stok'}
          </button>
        </div>
      </Modal>

      <Modal open={showDetail} onClose={() => setShowDetail(false)} title="Detail Closing" size="lg">
        {selectedClosing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-slate-400">Tanggal</p><p className="font-medium">{formatDateTime(selectedClosing.createdAt)}</p></div>
              <div><p className="text-xs text-slate-400">Tipe</p><span className={`badge ${!selectedClosing.type || selectedClosing.type === 'cash' ? 'badge-blue' : 'badge-purple'}`}>{!selectedClosing.type || selectedClosing.type === 'cash' ? '💵 Cash' : '📦 Produk'}</span></div>
              <div><p className="text-xs text-slate-400">Shift</p><span className="badge badge-gray capitalize">{selectedClosing.shift}</span></div>
              <div><p className="text-xs text-slate-400">Kasir</p><p className="font-medium">{selectedClosing.createdByName}</p></div>
            </div>
            <CashPlusMinusCard label={`Selisih ${selectedClosing.type === 'produk' ? 'Stok' : 'Cash'}`} cashPlus={selectedClosing.cashPlus || 0} cashMinus={selectedClosing.cashMinus || 0} netCash={selectedClosing.netCash || 0} />
            {(!selectedClosing.type || selectedClosing.type === 'cash') && (
              <div className="card bg-slate-50 border-slate-100 p-4">
                <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wide mb-3">Ringkasan Kas</h4>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">💵 Pemasukan Cash</span><span className="text-green-600 font-semibold">{formatRupiah(selectedClosing.totalPemasukanCash)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">📱 QRIS</span><span className="text-blue-600 font-semibold">{formatRupiah(selectedClosing.totalQris || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">🏦 Transfer</span><span className="text-purple-600 font-semibold">{formatRupiah(selectedClosing.totalTransfer || 0)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">📤 Pengeluaran</span><span className="text-red-500 font-semibold">{formatRupiah(selectedClosing.totalPengeluaranCash)}</span></div>
                  <div className="flex justify-between border-t border-slate-200 pt-2"><span className="font-bold">Saldo Sistem</span><span className="font-bold">{formatRupiah(selectedClosing.saldoSistem)}</span></div>
                  <div className="flex justify-between"><span className="font-bold">Uang Fisik</span><span className="font-bold">{formatRupiah(selectedClosing.totalFisik)}</span></div>
                  <div className={`flex justify-between border-t pt-2 ${selectedClosing.selisih === 0 ? 'text-green-600' : selectedClosing.selisih > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    <span className="font-black">Selisih</span>
                    <span className="font-black text-lg">{selectedClosing.selisih > 0 ? '+' : ''}{formatRupiah(selectedClosing.selisih)}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wide mb-2">Detail Pecahan</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PECAHAN.map(p => {
                      const j = selectedClosing.uangFisik?.[p.key] || 0;
                      if (!j) return null;
                      return (
                        <div key={p.key} className="flex justify-between text-xs py-1.5 px-2 bg-white rounded-lg">
                          <span className="text-slate-500">{p.label} × {j}</span>
                          <span className="font-semibold">{formatRupiah(j * p.nilai)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            {selectedClosing.type === 'produk' && selectedClosing.produkItems?.length > 0 && (
              <div>
                <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wide mb-2">Detail Produk ({selectedClosing.produkItems.length} item)</h4>
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {selectedClosing.produkItems.map((item, i) => (
                    <div key={i} className={`flex justify-between items-center text-xs p-2.5 rounded-lg ${item.selisih < 0 ? 'bg-red-50' : item.selisih > 0 ? 'bg-green-50' : 'bg-slate-50'}`}>
                      <div>
                        <p className="font-semibold text-slate-700">{item.productName}</p>
                        <p className="text-slate-400">{item.productCode} • Harga: {formatRupiah(item.hargaJual || 0)}</p>
                        <p className="text-slate-500">Sistem: {item.stokSistem} → Fisik: {item.stokFisik}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold text-sm ${item.selisih === 0 ? 'text-green-600' : item.selisih > 0 ? 'text-blue-600' : 'text-red-500'}`}>{item.selisih > 0 ? '+' : ''}{item.selisih}</p>
                        {item.nilaiSelisih !== 0 && <p className={`font-bold text-xs ${item.nilaiSelisih > 0 ? 'text-blue-600' : 'text-red-500'}`}>{item.nilaiSelisih > 0 ? '+' : ''}{formatRupiah(item.nilaiSelisih)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedClosing.catatan && <div><p className="text-xs text-slate-400 mb-1">Catatan</p><p className="text-sm bg-slate-50 p-3 rounded-xl">{selectedClosing.catatan}</p></div>}
            {selectedClosing.catatanSelisih && <div><p className="text-xs text-red-400 mb-1">Alasan Selisih</p><p className="text-sm bg-red-50 p-3 rounded-xl text-red-700">{selectedClosing.catatanSelisih}</p></div>}
          </div>
        )}
      </Modal>
      <Modal open={showResetMinus} onClose={() => setShowResetMinus(false)} title="Reset — Tutup Buku Bulanan" size="sm">
  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
    <p className="text-sm font-bold text-orange-700 mb-2">⚠️ Tutup Buku Bulanan</p>
    <div className="space-y-1.5 text-xs text-orange-700">
      <div className="flex justify-between">
        <span>Cash Plus terkumpul</span>
        <span className="font-bold">+{formatRupiah(kasSummary?.totalCashPlus || 0)}</span>
      </div>
      <div className="flex justify-between">
        <span>Cash Minus terkumpul</span>
        <span className="font-bold">-{formatRupiah(kasSummary?.totalCashMinus || 0)}</span>
      </div>
    </div>
    <p className="text-xs text-orange-500 mt-3">Semua nilai di atas akan direset ke Rp 0 setelah tutup buku.</p>
  </div>
  <div className="flex gap-3">
    <button className="btn btn-outline flex-1" onClick={() => setShowResetMinus(false)}>Batal</button>
    <button className="btn btn-danger flex-1" disabled={resetting} onClick={async () => {
      setResetting(true);
      try {
        const { data } = await closingKasAPI.resetCashMinus();
        toast.success(data.message || '✅ Tutup buku berhasil!');
        setShowResetMinus(false);
        loadKasSummary();
      } catch (err) { toast.error(err.response?.data?.message || 'Gagal reset'); }
      finally { setResetting(false); }
    }}>
      {resetting ? <Loader2 size={16} className="animate-spin" /> : null}
      {resetting ? 'Memproses...' : '✅ Tutup Buku Sekarang'}
    </button>
  </div>
</Modal>
    </div>
  );
}
import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { financeAPI, brankasAPI, transactionAPI, saldoAPI } from '../services/api';
import api from '../services/api';
import { formatRupiah, formatDate, FINANCE_TYPE_LABELS } from '../utils/helpers';
import { Modal, PageHeader, EmptyState, Loader, StatCard, ConfirmDialog } from '../components/UI';
import { Plus, Trash2, Edit2, TrendingUp, TrendingDown, AlertCircle, DollarSign, Vault, RefreshCw, Building2, Wallet, Banknote, ArrowRightLeft, Lock, CreditCard, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';


// ── SuperAdmin: Peninjauan Keuangan Semua Cabang ───────────────────────────
const R = v => formatRupiah(v || 0);

function KeuanganSuperAdmin() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await financeAPI.getAllCabang();
      setData(r.data.data || []);
    } catch { toast.error('Gagal memuat data keuangan'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loader />;

  const totalOmset     = data.reduce((t,c) => t + c.bulanIni.omset,       0);
  const totalLaba      = data.reduce((t,c) => t + c.bulanIni.laba,        0);
  const totalPemasukan = data.reduce((t,c) => t + c.bulanIni.pemasukan,   0);
  const totalPengeluaran=data.reduce((t,c) => t + c.bulanIni.pengeluaran, 0);
  const totalAset      = data.reduce((t,c) => t + c.totalAset,            0);
  const totalHutang    = data.reduce((t,c) => t + c.hutangAktif,          0);
  const totalPiutang   = data.reduce((t,c) => t + c.piutangAktif,         0);

  return (
    <div className="animate-fade-in-up pb-24 lg:pb-0 min-w-0">
      <PageHeader
        title="Peninjauan Keuangan"
        subtitle="Ringkasan keuangan seluruh cabang bulan ini"
        actions={
          <button className="btn btn-outline py-2 px-3" onClick={load}>
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <StatCard title="Total Omset Bulan Ini"    value={R(totalOmset)}      subtitle="Semua cabang" icon={DollarSign}   color="blue"   />
        <StatCard title="Total Laba Bulan Ini"     value={R(totalLaba)}       subtitle="Semua cabang" icon={TrendingUp}   color="green"  />
        <StatCard title="Total Pengeluaran"        value={R(totalPengeluaran)} subtitle="Bulan ini"   icon={TrendingDown} color="red"    />
        <StatCard title="Total Aset"               value={R(totalAset)}       subtitle="Kas+Brankas+Digital" icon={Wallet} color="purple" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="bg-green-50 rounded-2xl p-3 sm:p-4 min-w-0">
          <p className="text-xs text-green-500 mb-1">Total Pemasukan Non-Penjualan</p>
          <p className="font-black text-lg sm:text-xl text-green-700 truncate">{R(totalPemasukan)}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-3 sm:p-4 min-w-0">
          <p className="text-xs text-red-400 mb-1">Total Hutang Aktif</p>
          <p className="font-black text-lg sm:text-xl text-red-700 truncate">{R(totalHutang)}</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-3 sm:p-4 min-w-0">
          <p className="text-xs text-blue-400 mb-1">Total Piutang Aktif</p>
          <p className="font-black text-lg sm:text-xl text-blue-700 truncate">{R(totalPiutang)}</p>
        </div>
      </div>

      <div className="space-y-3">
        {data.map((c, i) => (
          <div key={c._id} className="card min-w-0">
            <button
              onClick={() => setSelected(selected === c._id ? null : c._id)}
              className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div className="flex items-center justify-between gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: ['#6366f1','#22c55e','#f59e0b','#ec4899','#14b8a6'][i % 5] }}>
                    {c.kode}
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-bold text-slate-800 truncate">{c.nama}</p>
                    <p className="text-xs text-slate-400">Klik untuk detail</p>
                  </div>
                </div>
                <span className={`text-slate-400 transition-transform flex-shrink-0 sm:hidden ${selected===c._id?'rotate-180':''}`}>▼</span>
              </div>
              <div className="grid grid-cols-3 sm:flex sm:items-center sm:gap-6 gap-2 text-left sm:text-right w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs text-slate-400">Omset</p>
                  <p className="font-bold text-green-600 text-xs sm:text-base truncate">{R(c.bulanIni.omset)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs text-slate-400">Pengeluaran</p>
                  <p className="font-bold text-red-500 text-xs sm:text-base truncate">{R(c.bulanIni.pengeluaran)}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs text-slate-400">Total Aset</p>
                  <p className="font-bold text-blue-600 text-xs sm:text-base truncate">{R(c.totalAset)}</p>
                </div>
                <span className={`text-slate-400 transition-transform flex-shrink-0 hidden sm:inline ${selected===c._id?'rotate-180':''}`}>▼</span>
              </div>
            </button>

            {selected === c._id && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Omset', value: R(c.bulanIni.omset),       color: 'text-blue-600',   bg: 'bg-blue-50'   },
                    { label: 'Laba',  value: R(c.bulanIni.laba),        color: 'text-green-600',  bg: 'bg-green-50'  },
                    { label: 'Pemasukan Lain', value: R(c.bulanIni.pemasukan), color:'text-teal-600', bg:'bg-teal-50' },
                    { label: 'Pengeluaran', value: R(c.bulanIni.pengeluaran), color:'text-red-600', bg:'bg-red-50'   },
                  ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-xl p-3`}>
                      <p className="text-xs text-slate-400">{s.label} Bulan Ini</p>
                      <p className={`font-bold text-sm ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    { label: '💵 Kas Tunai',    value: R(c.kasTunai),     color: 'text-green-700'  },
                    { label: '🏦 Brankas',       value: R(c.brankas),      color: 'text-amber-700'  },
                    { label: '💳 Saldo Digital', value: R(c.saldoDigital), color: 'text-blue-700'   },
                  ].map(s => (
                    <div key={s.label} className="border border-slate-100 rounded-xl p-3">
                      <p className="text-xs text-slate-400">{s.label}</p>
                      <p className={`font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {(c.hutangAktif > 0 || c.piutangAktif > 0) && (
                  <div className="grid grid-cols-2 gap-3">
                    {c.hutangAktif > 0 && (
                      <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                        <p className="text-xs text-red-400">⚠️ Hutang Belum Lunas</p>
                        <p className="font-bold text-red-700">{R(c.hutangAktif)}</p>
                      </div>
                    )}
                    {c.piutangAktif > 0 && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                        <p className="text-xs text-blue-400">📋 Piutang Belum Lunas</p>
                        <p className="font-bold text-blue-700">{R(c.piutangAktif)}</p>
                      </div>
                    )}
                  </div>
                )}

                {c.saldos?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-slate-400 mb-2">Detail Saldo Digital</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                      {c.saldos.filter(s => s.saldo > 0).map(s => (
                        <div key={s.akunId} className="bg-slate-50 rounded-lg p-2.5">
                          <p className="text-xs text-slate-400">{s.namaAkun}</p>
                          <p className="font-bold text-slate-700 text-xs">{R(s.saldo)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Brankas Section (untuk admin/owner cabang) ─────────────────────────────
function BrankasSection({ isAdmin, cabangId }) {
  const [brankas, setBrankas]           = useState(0);
  const [loading, setLoading]           = useState(true);
  const [showEdit, setShowEdit]         = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [editVal, setEditVal]           = useState('');
  const [transferVal, setTransferVal]   = useState('');
  const [keterangan, setKeterangan]     = useState('');
  const [saving, setSaving]             = useState(false);

  const loadBrankas = useCallback(async () => {
    setLoading(true);
    try {
      const params = cabangId ? { params: { cabang: cabangId } } : {};
      const r = await brankasAPI.get(params);
      setBrankas(r.data.data?.brankasAmount || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [cabangId]);

  useEffect(() => { loadBrankas(); }, [loadBrankas]);

  const handleUpdate = async () => {
    const nominal = parseInt(editVal.replace(/\D/g, '')) || 0;
    if (nominal < 0) return toast.error('Nominal tidak valid');
    setSaving(true);
    try {
      await brankasAPI.update({ brankasAmount: nominal }, cabangId ? { params: { cabang: cabangId } } : {});
      toast.success('Saldo brankas diperbarui');
      setBrankas(nominal);
      setShowEdit(false);
      setEditVal('');
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal update brankas'); }
    finally { setSaving(false); }
  };

  const handleTransfer = async () => {
    const nominal = parseInt(transferVal.replace(/\D/g, '')) || 0;
    if (!nominal || nominal <= 0) return toast.error('Nominal tidak valid');
    if (nominal > brankas) return toast.error(`Saldo brankas tidak cukup (Rp ${formatRupiah(brankas)})`);
    setSaving(true);
    try {
      const r = await brankasAPI.transfer({ amount: nominal, keterangan: keterangan || 'Transfer ke Kas Tunai' }, cabangId ? { params: { cabang: cabangId } } : {});
      toast.success(r.data.message || 'Transfer berhasil');
      setBrankas(r.data.data?.brankasAmount || 0);
      setShowTransfer(false);
      setTransferVal('');
      setKeterangan('');
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal transfer'); }
    finally { setSaving(false); }
  };

  if (loading) return null;

  return (
    <>
      {/* Brankas Card */}
      <div className="card mb-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center flex-shrink-0">
              <Lock size={22} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide">Uang Brankas</p>
              <p className="text-2xl sm:text-3xl font-black text-amber-800 whitespace-nowrap">{formatRupiah(brankas)}</p>
              <p className="text-xs text-amber-500 mt-0.5">Disimpan terpisah dari kas harian</p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <button
                onClick={() => { setEditVal(brankas.toString()); setShowEdit(true); }}
                className="btn btn-outline py-2 px-3 text-xs border-amber-300 text-amber-700 hover:bg-amber-100 w-full justify-center"
              >
                <Edit2 size={13} /> Edit Saldo
              </button>
              <button
                onClick={() => { setShowTransfer(true); }}
                className="btn py-2 px-3 text-xs bg-amber-500 text-white hover:bg-amber-600 w-full justify-center"
                disabled={brankas <= 0}
              >
                <ArrowRightLeft size={13} /> Ke Kas Tunai
              </button>
            </div>
          )}
        </div>

        {brankas > 0 && (
          <div className="mt-3 pt-3 border-t border-amber-200">
            <p className="text-xs text-amber-600">
              💡 Gunakan tombol "Ke Kas Tunai" untuk memindahkan uang brankas ke kas operasional
            </p>
          </div>
        )}
      </div>

      {/* Modal Edit Brankas */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Saldo Brankas" size="sm">
        <div className="space-y-4">
          <div className="bg-amber-50 rounded-xl p-3 text-sm text-amber-700">
            ⚠️ Input saldo brankas aktual yang tersimpan. Ini akan menimpa saldo sebelumnya.
          </div>
          <div>
            <label className="label">Saldo Brankas (Rp)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">Rp</span>
              <input
                className="input pl-10"
                inputMode="numeric"
                placeholder="0"
                value={editVal ? new Intl.NumberFormat('id-ID').format(parseInt(editVal.replace(/\D/g,'')||'0')) : ''}
                onChange={e => setEditVal(e.target.value.replace(/\D/g,''))}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 mt-5">
          <button className="btn btn-outline flex-1" onClick={() => setShowEdit(false)}>Batal</button>
          <button className="btn btn-primary flex-1 bg-amber-500 hover:bg-amber-600" onClick={handleUpdate} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </Modal>

      {/* Modal Transfer Brankas → Kas */}
      <Modal open={showTransfer} onClose={() => setShowTransfer(false)} title="Transfer Brankas → Kas Tunai" size="sm">
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-xs text-blue-600">Saldo Brankas Saat Ini</p>
            <p className="font-bold text-blue-800 text-lg">{formatRupiah(brankas)}</p>
          </div>
          <div>
            <label className="label">Nominal Transfer (Rp)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">Rp</span>
              <input
                className="input pl-10"
                inputMode="numeric"
                placeholder="0"
                value={transferVal ? new Intl.NumberFormat('id-ID').format(parseInt(transferVal.replace(/\D/g,'')||'0')) : ''}
                onChange={e => setTransferVal(e.target.value.replace(/\D/g,''))}
              />
            </div>
          </div>
          <div>
            <label className="label">Keterangan (opsional)</label>
            <input
              className="input"
              value={keterangan}
              onChange={e => setKeterangan(e.target.value)}
              placeholder="Transfer ke kas operasional..."
            />
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 mt-5">
          <button className="btn btn-outline flex-1" onClick={() => setShowTransfer(false)}>Batal</button>
          <button className="btn btn-primary flex-1" onClick={handleTransfer} disabled={saving}>
            {saving ? 'Memproses...' : 'Transfer'}
          </button>
        </div>
      </Modal>
    </>
  );
}

const FINANCE_TYPES = ['pemasukan', 'pengeluaran', 'hutang', 'piutang'];
const CATEGORIES = {
  pemasukan: ['Penjualan Tambahan', 'Modal', 'Investasi', 'Cashback / Fee', 'Lainnya'],
  pengeluaran: ['Sewa Tempat', 'Gaji', 'Listrik & Air', 'Internet', 'Pembelian Stok', 'Transportasi', 'Operasional', 'Lainnya'],
  hutang: ['Hutang Supplier', 'Hutang Bank', 'Hutang Pribadi', 'Lainnya'],
  piutang: ['Hutang Pelanggan', 'Piutang Lainnya']
};

const TYPE_COLORS = {
  pemasukan: 'badge-green', pengeluaran: 'badge-red', hutang: 'badge-yellow', piutang: 'badge-blue'
};

const defaultForm = { type: 'pengeluaran', category: '', description: '', amount: '', date: new Date().toISOString().slice(0,10), relatedParty: '', dueDate: '', isPaid: false, sumberDana: '', sumberDanaName: '' };


// ── Owner: Keuangan Per Cabang ─────────────────────────────────
function KeuanganOwner() {
  const [cabangs, setCabangs]           = useState([]);
  const [selectedCabang, setSelectedCabang] = useState(null);
  const [records, setRecords]           = useState([]);
  const [summary, setSummary]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [loadingRec, setLoadingRec]     = useState(false);
  const [typeFilter, setTypeFilter]     = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editRecord, setEditRecord]     = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [form, setForm]                 = useState(defaultForm);
  const [saving, setSaving]             = useState(false);
  const [deleting, setDeleting]         = useState(false);

  // Load daftar cabang milik owner
  useEffect(() => {
    api.get('/owner/dashboard').then(r => {
      const subs = r.data.data?.subscriptions?.filter(s => ['aktif','gratis'].includes(s.status)) || [];
      const list = subs.map(s => s.cabang).filter(Boolean);
      setCabangs(list);
      if (list.length > 0) setSelectedCabang(list[0]._id);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const loadRecords = useCallback(async () => {
    if (!selectedCabang) return;
    setLoadingRec(true);
    try {
      const [r, s] = await Promise.all([
        api.get('/finance', { params: { cabang: selectedCabang, ...(typeFilter ? { type: typeFilter } : {}) } }),
        api.get('/finance/summary', { params: { cabang: selectedCabang } })
      ]);
      setRecords(r.data.data || []);
      setSummary(s.data.data);
    } catch { toast.error('Gagal memuat data keuangan'); }
    finally { setLoadingRec(false); }
  }, [selectedCabang, typeFilter]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const openAdd  = () => { setEditRecord(null); setForm({ ...defaultForm }); setShowModal(true); };
  const openEdit = (r) => {
    setEditRecord(r);
    setForm({ type: r.type, category: r.category, description: r.description, amount: r.amount, date: r.date?.slice(0,10)||'', relatedParty: r.relatedParty||'', dueDate: r.dueDate?.slice(0,10)||'', isPaid: r.isPaid });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.category || !form.description || !form.amount) return toast.error('Kategori, deskripsi, dan nominal wajib diisi');
    setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount), cabang: selectedCabang };
      if (editRecord) await api.put(`/finance/${editRecord._id}`, payload);
      else await api.post('/finance', payload, { params: { cabang: selectedCabang } });
      toast.success(editRecord ? 'Data diperbarui' : 'Data ditambahkan');
      setShowModal(false); loadRecords();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/finance/${selectedRecord._id}`);
      toast.success('Data dihapus');
      setShowDeleteConfirm(false); loadRecords();
    } catch { toast.error('Gagal menghapus'); }
    finally { setDeleting(false); }
  };

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const cabangNama = cabangs.find(c => c._id === selectedCabang)?.nama || '';

  if (loading) return <Loader />;

  return (
    <div className="animate-fade-in-up pb-24 lg:pb-0 min-w-0">
      <PageHeader title="Keuangan Cabang" subtitle="Pembukuan per cabang"
        actions={
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <select
              className="border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-200 font-semibold flex-1 sm:flex-none min-w-0"
              value={selectedCabang || ''}
              onChange={e => { setSelectedCabang(e.target.value); setTypeFilter(''); }}
            >
              {cabangs.map(c => <option key={c._id} value={c._id}>{c.nama}</option>)}
            </select>
            <button className="btn btn-primary flex-shrink-0" onClick={openAdd}><Plus size={16} /> Catat</button>
          </div>
        }
      />

      {/* Brankas per cabang */}
      {selectedCabang && <BrankasSection isAdmin={true} cabangId={selectedCabang} />}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <StatCard title="Total Penjualan"     value={formatRupiah(summary.salesRevenue)}   subtitle="Bulan ini" icon={TrendingUp}   color="blue"   />
          <StatCard title="Total Pemasukan"     value={formatRupiah(summary.totalIncome)}     subtitle="Bulan ini" icon={DollarSign}   color="green"  />
          <StatCard title="Total Pengeluaran"   value={formatRupiah(summary.totalExpense)}    subtitle="Bulan ini" icon={TrendingDown} color="orange" />
          <StatCard title="Piutang Belum Lunas" value={formatRupiah(summary.totalReceivable)} icon={AlertCircle}  color="red"    />
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap min-w-0 max-w-full">
        {['', ...FINANCE_TYPES].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`btn ${typeFilter === t ? 'btn-primary' : 'btn-outline'} py-2 text-xs sm:text-sm flex-shrink-0 whitespace-nowrap`}>
            {t ? FINANCE_TYPE_LABELS[t] : 'Semua'}
          </button>
        ))}
      </div>

      {loadingRec ? <Loader /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr>
              <th>Tanggal</th><th>Tipe</th><th>Kategori</th><th>Deskripsi</th>
              <th>Pihak Terkait</th><th>Nominal</th><th>Status</th><th>Aksi</th>
            </tr></thead>
            <tbody className="bg-white dark:bg-slate-800">
              {records.length === 0
                ? <tr><td colSpan={8}><EmptyState message="Belum ada catatan keuangan" /></td></tr>
                : records.map(r => (
                  <tr key={r._id}>
                    <td className="text-xs">
                      <div>{formatDate(r.date)}</div>
                      {r.createdAt && (
                        <div className="text-xs text-slate-400">
                          {new Date(r.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </div>
                      )}
                    </td>
                    <td><span className={`badge ${TYPE_COLORS[r.type]}`}>{FINANCE_TYPE_LABELS[r.type]}</span></td>
                    <td className="text-slate-500 text-xs">{r.category}</td>
                    <td className="font-medium text-slate-700 dark:text-slate-300">{r.description}</td>
                    <td className="text-slate-500 text-xs">{r.relatedParty || '-'}</td>
                    <td className={`font-bold ${r.type==='pemasukan'?'text-green-600':r.type==='pengeluaran'?'text-red-500':'text-slate-700'}`}>
                      {r.type==='pemasukan'?'+':r.type==='pengeluaran'?'-':''}{formatRupiah(r.amount)}
                    </td>
                    <td>
                      {(r.type==='hutang'||r.type==='piutang')
                        ? <span className={`badge ${r.isPaid?'badge-green':'badge-red'}`}>{r.isPaid?'Lunas':'Belum Lunas'}</span>
                        : <span className="badge badge-gray">-</span>}
                    </td>
                    <td>
                      <div className="flex gap-1.5">
                        <button onClick={() => openEdit(r)} className="btn btn-outline py-1.5 px-2.5 text-xs"><Edit2 size={13} /></button>
                        <button onClick={() => { setSelectedRecord(r); setShowDeleteConfirm(true); }} className="btn btn-danger py-1.5 px-2.5 text-xs"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Add/Edit */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editRecord ? 'Edit Catatan' : `Catat Keuangan — ${cabangNama}`} size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Tipe *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FINANCE_TYPES.map(t => (
                <button key={t} onClick={() => F('type', t)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${form.type===t?'bg-primary-600 text-white border-primary-600':'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {FINANCE_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Kategori *</label>
            <select className="input" value={form.category} onChange={e => F('category', e.target.value)}>
              <option value="">-- Pilih Kategori --</option>
              {(CATEGORIES[form.type]||[]).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="label">Deskripsi *</label><input className="input" value={form.description} onChange={e => F('description', e.target.value)} placeholder="Keterangan..." /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Nominal (Rp) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold select-none pointer-events-none">Rp</span>
                <input className="input pl-10" inputMode="numeric" placeholder="0"
                  value={form.amount ? new Intl.NumberFormat('id-ID').format(parseInt(form.amount)) : ''}
                  onChange={e => F('amount', e.target.value.replace(/\D/g,''))} />
              </div>
            </div>
            <div><label className="label">Tanggal</label><input className="input" type="date" value={form.date} onChange={e => F('date', e.target.value)} /></div>
          </div>
          {(form.type==='hutang'||form.type==='piutang') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="label">Nama Pihak</label><input className="input" value={form.relatedParty} onChange={e => F('relatedParty', e.target.value)} placeholder="Nama supplier/pelanggan" /></div>
              <div><label className="label">Jatuh Tempo</label><input className="input" type="date" value={form.dueDate} onChange={e => F('dueDate', e.target.value)} /></div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input type="checkbox" id="isPaid" checked={form.isPaid} onChange={e => F('isPaid', e.target.checked)} className="rounded" />
                <label htmlFor="isPaid" className="text-sm text-slate-700 dark:text-slate-300">Sudah Lunas</label>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 mt-5">
          <button className="btn btn-outline flex-1" onClick={() => setShowModal(false)}>Batal</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>{saving?'Menyimpan...':'Simpan'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={handleDelete}
        title="Hapus Catatan" message="Yakin ingin menghapus catatan keuangan ini?" loading={deleting} />
    </div>
  );
}

export default function KeuanganPage() {
  const { isAdmin, isSuperAdmin, isOwner } = useAuth();
  if (isSuperAdmin) return <KeuanganSuperAdmin />;
  if (isOwner) return <KeuanganOwner />;

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('keuangan');
  const [hutangList, setHutangList] = useState([]);
  const [hutangLoading, setHutangLoading] = useState(false);
  const [hutangFilter, setHutangFilter] = useState('hutang');
  const [bayarLoading, setBayarLoading] = useState(null);
  const [showBayarModal, setShowBayarModal] = useState(false);
  const [bayarTx, setBayarTx] = useState(null);
  const [bayarMetode, setBayarMetode] = useState('cash');
  const [bayarAkunId, setBayarAkunId] = useState('');
  const [saldos, setSaldos] = useState([]); // daftar akun saldo untuk pilihan sumber dana

  const loadHutang = useCallback(async () => {
    setHutangLoading(true);
    try {
      const r = await transactionAPI.getHutang({ status: hutangFilter });
      setHutangList(r.data.data || []);
    } catch { toast.error('Gagal memuat data hutang'); }
    finally { setHutangLoading(false); }
  }, [hutangFilter]);

  useEffect(() => { if (activeMainTab === 'hutang') loadHutang(); }, [activeMainTab, loadHutang]);

  const handleBayarHutang = (tx) => {
    setBayarTx(tx);
    setBayarMetode('cash');
    setBayarAkunId('');
    setShowBayarModal(true);
  };

  const handleKonfirmasiBayar = async () => {
    if (!bayarTx) return;
    if ((bayarMetode === 'transfer' || bayarMetode === 'qris') && !bayarAkunId)
      return toast.error('Pilih akun tujuan pembayaran!');
    setBayarLoading(bayarTx._id);
    try {
      await transactionAPI.bayarHutang(bayarTx._id, { metode: bayarMetode, akunId: bayarAkunId });
      toast.success(`Hutang ${bayarTx.invoiceNumber} berhasil dilunasi! ✅`);
      setShowBayarModal(false);
      setBayarTx(null);
      loadHutang();
      load(); // refresh saldo
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal melunasi hutang'); }
    finally { setBayarLoading(null); }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Filter summary bulan ini
      const now = new Date();
      const startBulan = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
      const endBulan   = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10);

      const [r, s, sl] = await Promise.all([
        financeAPI.getAll(typeFilter ? { type: typeFilter } : {}),
        financeAPI.getSummary({ startDate: startBulan, endDate: endBulan }),
        saldoAPI.getAll()
      ]);
      setRecords(r.data.data || []);
      setSummary(s.data.data);
      // Semua akun kecuali brankas sebagai pilihan sumber dana
      setSaldos((sl.data.data || []).filter(a => a.akunId !== 'brankas' && a.isActive));
    } catch { toast.error('Gagal memuat data keuangan'); }
    finally { setLoading(false); }
  }, [typeFilter]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditRecord(null); setForm(defaultForm); setShowModal(true); };
  const openEdit = (r) => {
    setEditRecord(r);
    setForm({ type: r.type, category: r.category, description: r.description, amount: r.amount, date: r.date?.slice(0,10) || '', relatedParty: r.relatedParty || '', dueDate: r.dueDate?.slice(0,10) || '', isPaid: r.isPaid, sumberDana: r.sumberDana || '', sumberDanaName: r.sumberDanaName || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.category || !form.description || !form.amount) return toast.error('Kategori, deskripsi, dan nominal wajib diisi');
    setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (editRecord) await financeAPI.update(editRecord._id, payload);
      else await financeAPI.create(payload);
      toast.success(editRecord ? 'Data diperbarui' : 'Data ditambahkan');
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await financeAPI.delete(selectedRecord._id);
      toast.success('Data dihapus');
      setShowDeleteConfirm(false); load();
    } catch { toast.error('Gagal menghapus data'); }
    finally { setDeleting(false); }
  };

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="animate-fade-in-up pb-24 lg:pb-0 min-w-0">
      <PageHeader title="Keuangan" subtitle="Pembukuan pemasukan, pengeluaran, hutang & piutang"
        actions={
          <div className="flex gap-2">
            {activeMainTab === 'keuangan' && <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> <span className="hidden sm:inline">Catat </span>Keuangan</button>}
            {activeMainTab === 'hutang' && <button className="btn btn-outline" onClick={loadHutang}><RefreshCw size={16} /> Refresh</button>}
          </div>
        }
      />

      {/* Main Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 sm:pb-0 min-w-0 max-w-full">
        <button onClick={() => setActiveMainTab('keuangan')} className={`btn flex-shrink-0 whitespace-nowrap ${activeMainTab === 'keuangan' ? 'btn-primary' : 'btn-outline'}`}>
          <DollarSign size={16} /> Keuangan
        </button>
        <button onClick={() => setActiveMainTab('hutang')} className={`btn flex-shrink-0 whitespace-nowrap ${activeMainTab === 'hutang' ? 'btn-primary' : 'btn-outline'}`}>
          <CreditCard size={16} /> Hutang Pelanggan
        </button>
      </div>

      {/* Tab Hutang */}
      {activeMainTab === 'hutang' && (
        <div className="animate-fade-in-up min-w-0">
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap min-w-0 max-w-full">
            <button onClick={() => setHutangFilter('hutang')} className={`btn ${hutangFilter === 'hutang' ? 'btn-danger' : 'btn-outline'} py-2 text-xs sm:text-sm flex-shrink-0 whitespace-nowrap`}>Belum Lunas</button>
            <button onClick={() => setHutangFilter('lunas')} className={`btn ${hutangFilter === 'lunas' ? 'btn-success' : 'btn-outline'} py-2 text-xs sm:text-sm flex-shrink-0 whitespace-nowrap`}>Sudah Lunas</button>
            <button onClick={() => setHutangFilter('')} className={`btn ${hutangFilter === '' ? 'btn-primary' : 'btn-outline'} py-2 text-xs sm:text-sm flex-shrink-0 whitespace-nowrap`}>Semua</button>
          </div>
          {hutangLoading ? <Loader /> : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Faktur</th><th>Tanggal</th><th>Pelanggan</th><th>Item</th><th>Total</th><th>Status</th><th>Aksi</th></tr>
                </thead>
                <tbody className="bg-white">
                  {hutangList.length === 0
                    ? <tr><td colSpan={7}><EmptyState message="Tidak ada data hutang" /></td></tr>
                    : hutangList.map(tx => (
                      <tr key={tx._id}>
                        <td><code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">{tx.invoiceNumber}</code></td>
                        <td className="text-xs text-slate-500">{new Date(tx.transactionDate).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
                        <td className="font-medium">{tx.customerName || 'Umum'}</td>
                        <td className="text-xs text-slate-500">{tx.items?.length || 0} item</td>
                        <td className="font-bold text-blue-600">{formatRupiah(tx.total)}</td>
                        <td>
                          <span className={`badge ${tx.paymentStatus === 'lunas' ? 'badge-green' : 'badge-red'}`}>
                            {tx.paymentStatus === 'lunas' ? 'Lunas' : 'Belum Lunas'}
                          </span>
                        </td>
                        <td>
                          {tx.paymentStatus !== 'lunas' && (
                            <button onClick={() => handleBayarHutang(tx)} disabled={bayarLoading === tx._id} className="btn btn-success py-1 px-3 text-xs">
                              {bayarLoading === tx._id ? '...' : <><CheckCircle size={12} /> Lunasi</>}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Keuangan */}
      {activeMainTab === 'keuangan' && (
        <div className="min-w-0">
          <BrankasSection isAdmin={isAdmin} cabangId={null} />
          {summary && (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
              <StatCard title="Total Penjualan" value={formatRupiah(summary.salesRevenue)} icon={TrendingUp} color="blue" />
              <StatCard title="Total Pemasukan" value={formatRupiah(summary.totalIncome)} icon={DollarSign} color="green" />
              <StatCard title="Total Pengeluaran" value={formatRupiah(summary.totalExpense)} icon={TrendingDown} color="orange" />
              <StatCard title="Piutang Belum Lunas" value={formatRupiah(summary.totalReceivable)} icon={AlertCircle} color="red" />
            </div>
          )}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap min-w-0 max-w-full">
            {['', ...FINANCE_TYPES].map(t => (
              <button key={t} onClick={() => setTypeFilter(t)} className={`btn ${typeFilter === t ? 'btn-primary' : 'btn-outline'} py-2 text-xs sm:text-sm flex-shrink-0 whitespace-nowrap`}>
                {t ? FINANCE_TYPE_LABELS[t] : 'Semua'}
              </button>
            ))}
          </div>
          {loading ? <Loader /> : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Tanggal</th><th>Tipe</th><th>Kategori</th><th>Deskripsi</th><th>Pihak Terkait</th><th>Sumber Dana</th><th>Nominal</th><th>Status</th><th>Aksi</th></tr>
                </thead>
                <tbody className="bg-white">
                  {records.length === 0
                    ? <tr><td colSpan={8}><EmptyState message="Belum ada catatan keuangan" /></td></tr>
                    : records.map(r => (
                      <tr key={r._id}>
                        <td className="text-xs">
                      <div>{formatDate(r.date)}</div>
                      {r.createdAt && (
                        <div className="text-xs text-slate-400">
                          {new Date(r.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </div>
                      )}
                    </td>
                        <td><span className={`badge ${TYPE_COLORS[r.type]}`}>{FINANCE_TYPE_LABELS[r.type]}</span></td>
                        <td className="text-slate-500 text-xs">{r.category}</td>
                        <td className="font-medium text-slate-700">{r.description}</td>
                        <td className="text-slate-500 text-xs">{r.relatedParty || '-'}</td>
                        <td className="text-slate-500 text-xs">
                          {r.sumberDanaName
                            ? <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-medium">💳 {r.sumberDanaName}</span>
                            : <span className="text-slate-400">Kas Tunai</span>
                          }
                        </td>
                        <td className={`font-bold ${r.type === 'pemasukan' ? 'text-green-600' : r.type === 'pengeluaran' ? 'text-red-500' : 'text-slate-700'}`}>
                          {r.type === 'pemasukan' ? '+' : r.type === 'pengeluaran' ? '-' : ''}{formatRupiah(r.amount)}
                        </td>
                        <td>
                          {(r.type === 'hutang' || r.type === 'piutang')
                            ? <span className={`badge ${r.isPaid ? 'badge-green' : 'badge-red'}`}>{r.isPaid ? 'Lunas' : 'Belum Lunas'}</span>
                            : <span className="badge badge-gray">-</span>}
                        </td>
                        <td>
                          <div className="flex gap-1.5">
                            <button onClick={() => openEdit(r)} className="btn btn-outline py-1.5 px-2.5 text-xs"><Edit2 size={13} /></button>
                            <button onClick={() => { setSelectedRecord(r); setShowDeleteConfirm(true); }} className="btn btn-danger py-1.5 px-2.5 text-xs"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Add/Edit */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editRecord ? 'Edit Catatan' : 'Catat Keuangan'} size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Tipe *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FINANCE_TYPES.map(t => (
                <button key={t} onClick={() => F('type', t)}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${form.type === t ? 'bg-primary-600 text-white border-primary-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {FINANCE_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Kategori *</label>
            <select className="input" value={form.category} onChange={e => F('category', e.target.value)}>
              <option value="">-- Pilih Kategori --</option>
              {(CATEGORIES[form.type] || []).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="label">Deskripsi *</label><input className="input" value={form.description} onChange={e => F('description', e.target.value)} placeholder="Keterangan..." /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Nominal (Rp) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold select-none pointer-events-none">Rp</span>
                <input className="input pl-10" inputMode="numeric" placeholder="0"
                  value={form.amount ? new Intl.NumberFormat('id-ID').format(parseInt(form.amount)) : ''}
                  onChange={e => F('amount', e.target.value.replace(/\D/g, ''))} />
              </div>
            </div>
            <div><label className="label">Tanggal</label><input className="input" type="date" value={form.date} onChange={e => F('date', e.target.value)} /></div>
          </div>
          {form.type === 'pengeluaran' && (
            <div>
              <label className="label">Sumber Dana</label>
              <select className="input bg-white"
                value={form.sumberDana}
                onChange={e => {
                  const akun = saldos.find(s => s.akunId === e.target.value);
                  F('sumberDana', e.target.value);
                  F('sumberDanaName', akun?.namaAkun || '');
                }}>
                <option value="">💵 Kas Tunai (default)</option>
                {saldos.map(s => (
                  <option key={s.akunId} value={s.akunId}>
                    {s.namaAkun} — {formatRupiah(s.saldo)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">Saldo akun yang dipilih akan berkurang otomatis</p>
            </div>
          )}
          {form.type === 'pemasukan' && (
            <div>
              <label className="label">Masuk ke Akun</label>
              <select className="input bg-white"
                value={form.sumberDana}
                onChange={e => {
                  const akun = saldos.find(s => s.akunId === e.target.value);
                  F('sumberDana', e.target.value);
                  F('sumberDanaName', akun?.namaAkun || '');
                }}>
                <option value="">💵 Kas Tunai (default)</option>
                {saldos.map(s => (
                  <option key={s.akunId} value={s.akunId}>
                    {s.namaAkun} — {formatRupiah(s.saldo)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">Saldo akun yang dipilih akan bertambah otomatis</p>
            </div>
          )}
          {(form.type === 'hutang' || form.type === 'piutang') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="label">Nama Pihak</label><input className="input" value={form.relatedParty} onChange={e => F('relatedParty', e.target.value)} placeholder="Nama supplier/pelanggan" /></div>
              <div><label className="label">Jatuh Tempo</label><input className="input" type="date" value={form.dueDate} onChange={e => F('dueDate', e.target.value)} /></div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <input type="checkbox" id="isPaid" checked={form.isPaid} onChange={e => F('isPaid', e.target.checked)} className="rounded" />
                <label htmlFor="isPaid" className="text-sm text-slate-700">Sudah Lunas</label>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 mt-5">
          <button className="btn btn-outline flex-1" onClick={() => setShowModal(false)}>Batal</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={handleDelete}
        title="Hapus Catatan" message="Yakin ingin menghapus catatan keuangan ini?" loading={deleting} />

      {/* Modal Bayar Hutang */}
      {showBayarModal && bayarTx && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-3 sm:p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-slate-800 mb-1">Lunasi Hutang</h3>
            <div className="bg-slate-50 rounded-xl p-3 mb-4 min-w-0">
              <p className="text-xs text-slate-500 truncate">{bayarTx.invoiceNumber} · {bayarTx.customerName}</p>
              <p className="text-lg sm:text-xl font-black text-slate-800 mt-1 break-all">{formatRupiah(bayarTx.total)}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Metode Pembayaran</label>
                <div className="grid grid-cols-3 gap-2">
                  {[["cash","💵 Tunai"],["transfer","🏦 Transfer"],["qris","📱 QRIS"]].map(([val, label]) => (
                    <button key={val} onClick={() => { setBayarMetode(val); setBayarAkunId(""); }}
                      className={"py-2 px-1 rounded-xl text-[11px] sm:text-xs font-semibold border transition whitespace-nowrap " + (bayarMetode === val ? "bg-primary-600 text-white border-primary-600" : "border-slate-200 text-slate-600 hover:border-primary-300")}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {(bayarMetode === "transfer" || bayarMetode === "qris") && (
                <div>
                  <label className="label">Akun Tujuan</label>
                  <select className="input bg-white" value={bayarAkunId} onChange={e => setBayarAkunId(e.target.value)}>
                    <option value="">Pilih akun...</option>
                    {saldos.filter(s => s.group !== "Tunai" && s.akunId !== "brankas").map(s => (
                      <option key={s.akunId} value={s.akunId}>{s.namaAkun} — {formatRupiah(s.saldo)}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 mt-4">
              <button onClick={() => setShowBayarModal(false)} className="btn btn-outline flex-1">Batal</button>
              <button onClick={handleKonfirmasiBayar} disabled={!!bayarLoading}
                className="btn btn-success flex-1 flex items-center justify-center gap-2">
                {bayarLoading ? "..." : <><CheckCircle size={15} /> Lunasi</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

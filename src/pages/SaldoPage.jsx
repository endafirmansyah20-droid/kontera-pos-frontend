import React, { useState, useEffect, useCallback } from 'react';
import { saldoAPI, transactionAPI } from '../services/api';
import { formatRupiah, formatDateTime } from '../utils/helpers';
import { PageHeader, Modal, Loader, EmptyState } from '../components/UI';
import {
  Wallet, ArrowUpCircle, ArrowDownCircle, ArrowLeftRight,
  RefreshCw, Edit3, TrendingUp, TrendingDown, AlertTriangle,
  History, Plus, Trash2, Settings, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const GROUP_ORDER = ['Server Pulsa', 'Bank', 'E-Wallet', 'Tunai'];

export default function SaldoPage() {
  const { isAdmin } = useAuth();
  const [saldos, setSaldos] = useState([]);
  const [totalSaldo, setTotalSaldo] = useState(0);
  const [kasTunaiData, setKasTunaiData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mutasi
  const [selectedAkun, setSelectedAkun] = useState(null);
  const [mutasi, setMutasi] = useState([]);
  const [mutasiLoading, setMutasiLoading] = useState(false);
  const [showMutasi, setShowMutasi] = useState(false);

  // Top Up
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpForm, setTopUpForm] = useState({ akunId: '', amount: '', keterangan: '' });

  // Transfer
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferForm, setTransferForm] = useState({ fromAkunId: '', toAkunId: '', amount: '', biayaTransfer: '', keterangan: '' });

  // Koreksi
  const [showKoreksi, setShowKoreksi] = useState(false);
  const [koreksiForm, setKoreksiForm] = useState({ akunId: '', saldoBaru: '', keterangan: '' });

  // Riwayat Transaksi per Akun
  const [showRiwayatTx, setShowRiwayatTx] = useState(false);
  const [riwayatTx, setRiwayatTx] = useState([]);
  const [riwayatTxLoading, setRiwayatTxLoading] = useState(false);
  const [riwayatTxAkun, setRiwayatTxAkun] = useState(null);
  const [riwayatTxPage, setRiwayatTxPage] = useState(1);
  const [riwayatTxPages, setRiwayatTxPages] = useState(1);

  // Edit Transaksi
  const [showEditTx, setShowEditTx] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editForm, setEditForm] = useState({ sellPrice: '', purchasePrice: '', cashback: '' });
  const [editSaving, setEditSaving] = useState(false);

  // Kelola Akun
  const [showKelolaAkun, setShowKelolaAkun] = useState(false);
  const [semuaAkun, setSemuaAkun] = useState([]);
  const [showTambahAkun, setShowTambahAkun] = useState(false);
  const [showEditAkun, setShowEditAkun] = useState(false);
  const [selectedAkunEdit, setSelectedAkunEdit] = useState(null);
  const [savingAkun, setSavingAkun] = useState(false);
  const [akunForm, setAkunForm] = useState({ akunId: '', namaAkun: '', group: 'Bank', icon: '💳' });

  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await saldoAPI.getAll();
      const all = data.data || [];
      const kas = all.find(s => s.akunId === 'tunai' || s.akunId.startsWith('tunai'));
      setKasTunaiData(kas || null);
      setSaldos(all.filter(s => !s.akunId.startsWith('tunai')));
      setTotalSaldo(all.filter(s => !s.akunId.startsWith('tunai')).reduce((s, a) => s + a.saldo, 0));
    } catch { toast.error('Gagal memuat saldo'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadMutasi = async (akun) => {
    setSelectedAkun(akun);
    setShowMutasi(true);
    setMutasiLoading(true);
    try {
      const { data } = await saldoAPI.getMutasi(akun.akunId);
      setMutasi(data.data || []);
    } catch { toast.error('Gagal memuat mutasi'); }
    finally { setMutasiLoading(false); }
  };

  const loadRiwayatTx = async (akun, page = 1) => {
    setRiwayatTxAkun(akun);
    setShowRiwayatTx(true);
    setRiwayatTxLoading(true);
    try {
      const { data } = await transactionAPI.getPerSumber(akun.akunId, { page, limit: 15 });
      setRiwayatTx(data.data || []);
      setRiwayatTxPages(data.pages || 1);
      setRiwayatTxPage(page);
    } catch { toast.error('Gagal memuat riwayat'); }
    finally { setRiwayatTxLoading(false); }
  };

  const loadSemuaAkun = async () => {
    try {
      const { data } = await saldoAPI.getAllAdmin();
      setSemuaAkun(data.data || []);
    } catch { toast.error('Gagal memuat akun'); }
  };

  const openEditTx = (tx, item) => {
    setSelectedTx(tx);
    setSelectedItem(item);
    setEditForm({
      sellPrice: item.sellPrice || '',
      purchasePrice: item.modalAmount || item.purchasePrice || '',
      cashback: item.cashback || 0,
    });
    setShowEditTx(true);
  };

  const handleEditTx = async () => {
    setEditSaving(true);
    try {
      await transactionAPI.editItem(selectedTx._id, selectedItem._id, editForm);
      toast.success('Transaksi berhasil diupdate! ✅');
      setShowEditTx(false);
      loadRiwayatTx(riwayatTxAkun, riwayatTxPage);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal update'); }
    finally { setEditSaving(false); }
  };

  const handleTopUp = async () => {
    if (!topUpForm.akunId || !topUpForm.amount) return toast.error('Lengkapi data!');
    setSaving(true);
    try {
      await saldoAPI.topUp(topUpForm);
      toast.success('Saldo berhasil ditambahkan! ✅');
      setShowTopUp(false);
      setTopUpForm({ akunId: '', amount: '', keterangan: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal top up'); }
    finally { setSaving(false); }
  };

  const handleTransfer = async () => {
    if (!transferForm.fromAkunId || !transferForm.toAkunId || !transferForm.amount) return toast.error('Lengkapi data!');
    setSaving(true);
    try {
      await saldoAPI.transfer(transferForm);
      toast.success('Transfer berhasil! ✅');
      setShowTransfer(false);
      setTransferForm({ fromAkunId: '', toAkunId: '', amount: '', biayaTransfer: '', keterangan: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal transfer'); }
    finally { setSaving(false); }
  };

  const handleKoreksi = async () => {
    if (!koreksiForm.akunId || koreksiForm.saldoBaru === '') return toast.error('Lengkapi data!');
    setSaving(true);
    try {
      await saldoAPI.koreksi(koreksiForm);
      toast.success('Saldo dikoreksi! ✅');
      setShowKoreksi(false);
      setKoreksiForm({ akunId: '', saldoBaru: '', keterangan: '' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal koreksi'); }
    finally { setSaving(false); }
  };

  const handleTambahAkun = async () => {
    if (!akunForm.akunId || !akunForm.namaAkun) return toast.error('ID Akun dan Nama wajib diisi!');
    setSavingAkun(true);
    try {
      await saldoAPI.tambahAkun(akunForm);
      toast.success('Akun berhasil ditambahkan! ✅');
      setShowTambahAkun(false);
      setAkunForm({ akunId: '', namaAkun: '', group: 'Bank', icon: '💳' });
      loadSemuaAkun(); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal tambah akun'); }
    finally { setSavingAkun(false); }
  };

  const handleUpdateAkun = async () => {
    setSavingAkun(true);
    try {
      await saldoAPI.updateAkun(selectedAkunEdit.akunId, akunForm);
      toast.success('Akun berhasil diupdate! ✅');
      setShowEditAkun(false);
      loadSemuaAkun(); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal update akun'); }
    finally { setSavingAkun(false); }
  };

  const handleDeleteAkun = async (akun) => {
    if (!window.confirm(`Nonaktifkan akun ${akun.namaAkun}?`)) return;
    try {
      await saldoAPI.deleteAkun(akun.akunId);
      toast.success('Akun dinonaktifkan!');
      loadSemuaAkun(); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal nonaktifkan'); }
  };

  const openTopUp = (akun) => {
    setTopUpForm({ akunId: akun.akunId, amount: '', keterangan: '' });
    setShowTopUp(true);
  };

  const openKoreksi = (akun) => {
    setKoreksiForm({ akunId: akun.akunId, saldoBaru: akun.saldo, keterangan: '' });
    setShowKoreksi(true);
  };

  const getSaldosByGroup = (group) => saldos.filter(s => s.group === group);

  const allSaldos = [...saldos, ...(kasTunaiData ? [kasTunaiData] : [])];

  const formatDisp = (v) => {
    if (!v && v !== 0) return '';
    const n = v.toString().replace(/\D/g, '');
    return n ? new Intl.NumberFormat('id-ID').format(parseInt(n)) : '';
  };

  const SumberDanaSelect = ({ value, onChange, label = 'Akun', excludeAkunId = '' }) => (
    <div>
      <label className="label">{label}</label>
      <select className="input" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">-- Pilih Akun --</option>
        {GROUP_ORDER.map(g => {
          const group = allSaldos.filter(s => s.group === g && s.akunId !== excludeAkunId);
          if (!group.length) return null;
          return (
            <optgroup key={g} label={g}>
              {group.map(s => (
                <option key={s.akunId} value={s.akunId}>
                  {s.icon} {s.namaAkun} — {formatRupiah(s.saldo)}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
      {value && (() => {
        const info = allSaldos.find(s => s.akunId === value);
        return info ? (
          <div className={`mt-1.5 flex justify-between px-3 py-2 rounded-lg text-xs ${info.saldo < 50000 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
            <span>Saldo {info.namaAkun}</span>
            <span className="font-bold">{formatRupiah(info.saldo)}</span>
          </div>
        ) : null;
      })()}
    </div>
  );

  const SaldoKartu = ({ akun }) => (
    <div className={`card hover:shadow-card-hover transition-all ${akun.saldo < 0 ? 'border-red-200 bg-red-50' : akun.saldo < 50000 ? 'border-yellow-200 bg-yellow-50' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{akun.icon}</span>
          <div>
            <p className="text-sm font-bold text-slate-700">{akun.namaAkun}</p>
            <p className="text-xs text-slate-400">{akun.group}</p>
          </div>
        </div>
        {akun.saldo < 50000 && akun.saldo >= 0 && <span className="badge badge-yellow text-xs">Rendah</span>}
        {akun.saldo < 0 && <span className="badge badge-red text-xs">Minus!</span>}
      </div>

      <p className={`text-xl font-black mb-3 ${akun.saldo < 0 ? 'text-red-600' : 'text-slate-800'}`}>
        {formatRupiah(akun.saldo)}
      </p>

      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => loadMutasi(akun)} className="btn btn-outline py-1.5 px-2.5 text-xs flex-1">
          <ArrowLeftRight size={12} /> Mutasi
        </button>
        <button onClick={() => loadRiwayatTx(akun)} className="btn btn-outline py-1.5 px-2.5 text-xs flex-1">
          <History size={12} /> Transaksi
        </button>
        <button onClick={() => openTopUp(akun)} className="btn btn-success py-1.5 px-2.5 text-xs flex-1">
          <ArrowUpCircle size={12} /> Top Up
        </button>
        {isAdmin && (
          <button onClick={() => openKoreksi(akun)} className="btn btn-outline py-1.5 px-2.5 text-xs">
            <Edit3 size={12} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in-up pb-24 lg:pb-0">
      <PageHeader
        title="Mutasi Saldo"
        subtitle="Kelola saldo semua akun — server pulsa, bank, e-wallet"
        actions={
          <div className="flex gap-2">
            <button className="btn btn-outline" onClick={load}><RefreshCw size={16} /> Refresh</button>
            {isAdmin && (
              <button className="btn btn-outline" onClick={() => { loadSemuaAkun(); setShowKelolaAkun(true); }}>
                <Settings size={16} /> Kelola Akun
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setShowTransfer(true)}>
              <ArrowLeftRight size={16} /> Transfer Saldo
            </button>
          </div>
        }
      />

      {/* Total Saldo Digital */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="card bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm font-medium mb-1">Total Saldo Digital</p>
              <p className="text-2xl font-black">{formatRupiah(totalSaldo)}</p>
              <p className="text-blue-200 text-xs mt-1">Server Pulsa, Bank, E-Wallet</p>
            </div>
            <Wallet size={36} className="text-blue-300" />
          </div>
        </div>
        <div className={`card border-0 text-white ${(kasTunaiData?.saldo || 0) < 50000 ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-green-600 to-green-700'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/70 text-sm font-medium mb-1">💵 Kas Tunai (Fisik)</p>
              <p className="text-2xl font-black">{formatRupiah(kasTunaiData?.saldo || 0)}</p>
              <p className="text-white/70 text-xs mt-1">Uang fisik di laci/kas</p>
            </div>
            {(kasTunaiData?.saldo || 0) < 50000
              ? <AlertTriangle size={36} className="text-white/70" />
              : <span className="text-4xl">💵</span>}
          </div>
          {kasTunaiData && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-white/20">
              <button
                onClick={() => loadMutasi(kasTunaiData)}
                className="flex-1 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center justify-center gap-1"
              >
                ↕ Mutasi
              </button>
              {isAdmin && (
                <button
                  onClick={() => { setKoreksiForm({ akunId: kasTunaiData.akunId, saldoBaru: String(kasTunaiData.saldo), keterangan: '' }); setShowKoreksi(true); }}
                  className="flex-1 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold flex items-center justify-center gap-1"
                >
                  ✏️ Koreksi
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? <Loader /> : (
        <div className="space-y-6">
          {GROUP_ORDER.filter(g => g !== 'Tunai').map(group => {
            const groupSaldos = getSaldosByGroup(group);
            if (!groupSaldos.length) return null;
            const groupTotal = groupSaldos.reduce((s, a) => s + a.saldo, 0);
            return (
              <div key={group}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-700 text-sm">{group}</h3>
                  <span className="text-sm font-bold text-slate-500">{formatRupiah(groupTotal)}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {groupSaldos.map(akun => <SaldoKartu key={akun.akunId} akun={akun} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Mutasi ── */}
      <Modal open={showMutasi} onClose={() => setShowMutasi(false)}
        title={`Mutasi: ${selectedAkun?.icon} ${selectedAkun?.namaAkun}`} size="lg">
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl mb-4">
          <span className="text-sm text-slate-500">Saldo Saat Ini</span>
          <span className="text-lg font-black">{formatRupiah(selectedAkun?.saldo)}</span>
        </div>
        <div className="flex gap-2 mb-3">
          <button onClick={() => { setShowMutasi(false); openTopUp(selectedAkun); }} className="btn btn-success flex-1 justify-center text-xs">
            <ArrowUpCircle size={14} /> Top Up
          </button>
          {isAdmin && (
            <button onClick={() => { setShowMutasi(false); openKoreksi(selectedAkun); }} className="btn btn-outline flex-1 justify-center text-xs">
              <Edit3 size={14} /> Koreksi
            </button>
          )}
        </div>
        {mutasiLoading ? <Loader size="sm" /> : (
          <div className="max-h-96 overflow-y-auto">
            {mutasi.length === 0 ? <EmptyState message="Belum ada mutasi" />
              : mutasi.map((m, i) => (
                <div key={i} className="flex items-center gap-3 py-3 border-b border-slate-50 last:border-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.type === 'masuk' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {m.type === 'masuk' ? <TrendingUp size={14} className="text-green-600" /> : <TrendingDown size={14} className="text-red-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">{m.keterangan}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(m.createdAt)}</p>
                    <p className="text-xs text-slate-400">{formatRupiah(m.saldoBefore)} → {formatRupiah(m.saldoAfter)}</p>
                  </div>
                  <p className={`text-sm font-bold ${m.type === 'masuk' ? 'text-green-600' : 'text-red-500'}`}>
                    {m.type === 'masuk' ? '+' : '-'}{formatRupiah(m.amount)}
                  </p>
                </div>
              ))
            }
          </div>
        )}
      </Modal>

      {/* ── Modal: Riwayat Transaksi ── */}
      <Modal open={showRiwayatTx} onClose={() => setShowRiwayatTx(false)}
        title={`Transaksi: ${riwayatTxAkun?.icon} ${riwayatTxAkun?.namaAkun}`} size="lg">
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl mb-4">
          <span className="text-sm text-slate-500">Saldo Saat Ini</span>
          <span className="text-lg font-black">{formatRupiah(riwayatTxAkun?.saldo || 0)}</span>
        </div>
        {riwayatTxLoading ? <Loader size="sm" /> : (
          <>
            {riwayatTx.length === 0 ? <EmptyState message="Belum ada transaksi" />
              : riwayatTx.map(tx => (
                <div key={tx._id} className="mb-4 border border-slate-100 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50">
                    <div>
                      <code className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-slate-200">{tx.invoiceNumber}</code>
                      <span className="text-xs text-slate-400 ml-2">{formatDateTime(tx.transactionDate)}</span>
                    </div>
                    <span className="text-xs text-slate-500">{tx.customerName}</span>
                  </div>
                  {tx.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border-t border-slate-50">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-700">{item.productName}</p>
                        {item.targetNumber && <p className="text-xs text-slate-400">→ {item.targetNumber}</p>}
                        <div className="flex gap-3 mt-1 text-xs">
                          {item.category === 'tarik_tunai' ? (
                            <>
                              <span className="text-slate-500">Tarik: <span className="font-bold">{formatRupiah((item.modalAmount || item.purchasePrice || 0) * (item.quantity || 1))}</span></span>
                              <span className="text-slate-500">Fee: <span className="font-bold text-blue-600">{formatRupiah(item.sellPrice * (item.quantity || 1))}</span></span>
                            </>
                          ) : (
                            <>
                              <span className="text-slate-500">Modal: <span className="font-bold">{formatRupiah((item.modalAmount || item.purchasePrice || 0) * (item.quantity || 1))}</span></span>
                              <span className="text-slate-500">Jual: <span className="font-bold text-blue-600">{formatRupiah(item.sellPrice * (item.quantity || 1))}</span></span>
                            </>
                          )}
                          {item.cashback > 0 && <span className="text-green-600">CB: +{formatRupiah(item.cashback)}</span>}
                        </div>
                        {item.category === 'tarik_tunai' ? (
                          <p className="text-xs font-bold mt-1 text-green-600">
                            Fee/Jasa: {formatRupiah(item.sellPrice * (item.quantity || 1) + (item.cashback || 0))}
                          </p>
                        ) : (
                          <p className={`text-xs font-bold mt-1 ${((item.sellPrice * (item.quantity||1) - (item.modalAmount || item.purchasePrice || 0) * (item.quantity||1)) + (item.cashback || 0)) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            Laba: {formatRupiah((item.sellPrice * (item.quantity||1) - (item.modalAmount || item.purchasePrice || 0) * (item.quantity||1)) + (item.cashback || 0))}
                          </p>
                        )}
                      </div>
                      <button onClick={() => openEditTx(tx, item)} className="btn btn-outline py-1.5 px-3 text-xs flex-shrink-0">
                        <Edit3 size={12} /> Edit
                      </button>
                    </div>
                  ))}
                </div>
              ))
            }
            {riwayatTxPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs text-slate-400">Hal {riwayatTxPage} / {riwayatTxPages}</p>
                <div className="flex gap-2">
                  <button className="btn btn-outline py-1.5 px-3 text-xs" onClick={() => loadRiwayatTx(riwayatTxAkun, riwayatTxPage - 1)} disabled={riwayatTxPage <= 1}>←</button>
                  <button className="btn btn-outline py-1.5 px-3 text-xs" onClick={() => loadRiwayatTx(riwayatTxAkun, riwayatTxPage + 1)} disabled={riwayatTxPage >= riwayatTxPages}>→</button>
                </div>
              </div>
            )}
          </>
        )}
      </Modal>

      {/* ── Modal: Edit Nominal Transaksi ── */}
      <Modal open={showEditTx} onClose={() => setShowEditTx(false)} title="Edit Nominal Transaksi" size="sm">
        {selectedItem && (
          <>
            <div className="bg-slate-50 rounded-xl p-3 mb-4">
              <p className="text-sm font-bold text-slate-700">{selectedItem.productName}</p>
              {selectedItem.targetNumber && <p className="text-xs text-slate-400">→ {selectedItem.targetNumber}</p>}
              <p className="text-xs text-slate-400 mt-1">{selectedTx?.invoiceNumber}</p>
            </div>
            <div className="space-y-3">
              {[
                { label: selectedItem.category === 'tarik_tunai' ? 'Tarik (Rp)' : 'Modal (Rp)', key: 'purchasePrice' },
                { label: selectedItem.category === 'tarik_tunai' ? 'Fee/Jasa (Rp)' : 'Harga Jual (Rp)', key: 'sellPrice' },
                { label: 'Cashback (Rp)', key: 'cashback' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold pointer-events-none">Rp</span>
                    <input className="input pl-10" inputMode="numeric" placeholder="0"
                      value={formatDisp(editForm[key])}
                      onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value.replace(/\D/g, '') }))} />
                  </div>
                </div>
              ))}
              {editForm.sellPrice && editForm.purchasePrice && (
                <div className={`flex justify-between px-3 py-2 rounded-lg text-xs ${selectedItem.category === 'tarik_tunai' ? 'bg-green-50 text-green-700' : (parseInt(editForm.sellPrice) - parseInt(editForm.purchasePrice) + (parseInt(editForm.cashback) || 0)) >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  <span>{selectedItem.category === 'tarik_tunai' ? 'Fee/Jasa estimasi' : 'Laba estimasi'}</span>
                  <span className="font-bold">{selectedItem.category === 'tarik_tunai'
                    ? formatRupiah((parseInt(editForm.sellPrice) || 0) + (parseInt(editForm.cashback) || 0))
                    : formatRupiah((parseInt(editForm.sellPrice) || 0) - (parseInt(editForm.purchasePrice) || 0) + (parseInt(editForm.cashback) || 0))}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn btn-outline flex-1" onClick={() => setShowEditTx(false)}>Batal</button>
              <button className="btn btn-primary flex-1" onClick={handleEditTx} disabled={editSaving}>
                {editSaving ? <Loader2 size={16} className="animate-spin" /> : <Edit3 size={16} />}
                {editSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </>
        )}
      </Modal>

      {/* ── Modal: Top Up ── */}
      <Modal open={showTopUp} onClose={() => setShowTopUp(false)} title="Top Up Saldo" size="sm">
        <div className="space-y-3">
          <SumberDanaSelect value={topUpForm.akunId} onChange={v => setTopUpForm(f => ({ ...f, akunId: v }))} label="Akun" />
          <div>
            <label className="label">Nominal Top Up (Rp)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold pointer-events-none">Rp</span>
              <input className="input pl-10" inputMode="numeric" placeholder="0"
                value={formatDisp(topUpForm.amount)}
                onChange={e => setTopUpForm(f => ({ ...f, amount: e.target.value.replace(/\D/g, '') }))} />
            </div>
            <div className="grid grid-cols-4 gap-1.5 mt-2">
              {[100000, 200000, 500000, 1000000].map(v => (
                <button key={v} onClick={() => setTopUpForm(f => ({ ...f, amount: String(v) }))}
                  className="py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600">
                  {v >= 1000000 ? '1jt' : `${v / 1000}rb`}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Keterangan</label>
            <input className="input" placeholder="Transfer dari BCA, setoran tunai, dll..."
              value={topUpForm.keterangan} onChange={e => setTopUpForm(f => ({ ...f, keterangan: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button className="btn btn-outline flex-1" onClick={() => setShowTopUp(false)}>Batal</button>
          <button className="btn btn-success flex-1" onClick={handleTopUp} disabled={saving}>
            {saving ? 'Menyimpan...' : '✅ Top Up'}
          </button>
        </div>
      </Modal>

      {/* ── Modal: Transfer ── */}
      <Modal open={showTransfer} onClose={() => setShowTransfer(false)} title="Transfer Antar Akun" size="sm">
        <div className="space-y-3">
          <SumberDanaSelect value={transferForm.fromAkunId} onChange={v => setTransferForm(f => ({ ...f, fromAkunId: v }))} label="Dari Akun" />
          <SumberDanaSelect value={transferForm.toAkunId} onChange={v => setTransferForm(f => ({ ...f, toAkunId: v }))} label="Ke Akun" excludeAkunId={transferForm.fromAkunId} />
          <div>
            <label className="label">Jumlah Transfer (Rp)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold pointer-events-none">Rp</span>
              <input className="input pl-10" inputMode="numeric" placeholder="0"
                value={formatDisp(transferForm.amount)}
                onChange={e => setTransferForm(f => ({ ...f, amount: e.target.value.replace(/\D/g, '') }))} />
            </div>
          </div>
          <div>
            <label className="label">Biaya Transfer (Rp)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold pointer-events-none">Rp</span>
              <input className="input pl-10" inputMode="numeric" placeholder="0"
                value={formatDisp(transferForm.biayaTransfer)}
                onChange={e => setTransferForm(f => ({ ...f, biayaTransfer: e.target.value.replace(/\D/g, '') }))} />
            </div>
          </div>
          <div>
            <label className="label">Keterangan</label>
            <input className="input" placeholder="Isi ulang modal server pulsa, dll..."
              value={transferForm.keterangan} onChange={e => setTransferForm(f => ({ ...f, keterangan: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button className="btn btn-outline flex-1" onClick={() => setShowTransfer(false)}>Batal</button>
          <button className="btn btn-primary flex-1" onClick={handleTransfer} disabled={saving}>
            {saving ? 'Memproses...' : '🔄 Transfer'}
          </button>
        </div>
      </Modal>

      {/* ── Modal: Koreksi ── */}
      <Modal open={showKoreksi} onClose={() => setShowKoreksi(false)} title="Koreksi Saldo Manual" size="sm">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
          <p className="text-xs text-yellow-700">⚠️ Koreksi manual akan langsung mengubah saldo. Gunakan hanya untuk penyesuaian.</p>
        </div>
        <div className="space-y-3">
          <SumberDanaSelect value={koreksiForm.akunId} onChange={v => setKoreksiForm(f => ({ ...f, akunId: v }))} label="Akun" />
          <div>
            <label className="label">Saldo Baru (Rp)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold pointer-events-none">Rp</span>
              <input className="input pl-10" inputMode="numeric" placeholder="0"
                value={formatDisp(koreksiForm.saldoBaru)}
                onChange={e => setKoreksiForm(f => ({ ...f, saldoBaru: e.target.value.replace(/\D/g, '') }))} />
            </div>
          </div>
          <div>
            <label className="label">Alasan Koreksi</label>
            <input className="input" placeholder="Sesuai mutasi bank, selisih hitung, dll..."
              value={koreksiForm.keterangan} onChange={e => setKoreksiForm(f => ({ ...f, keterangan: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button className="btn btn-outline flex-1" onClick={() => setShowKoreksi(false)}>Batal</button>
          <button className="btn btn-danger flex-1" onClick={handleKoreksi} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Koreksi'}
          </button>
        </div>
      </Modal>

      {/* ── Modal: Kelola Akun ── */}
      <Modal open={showKelolaAkun} onClose={() => setShowKelolaAkun(false)} title="Kelola Akun Saldo" size="lg">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-slate-500">{semuaAkun.length} akun terdaftar</p>
          <button className="btn btn-primary text-xs py-2"
            onClick={() => { setAkunForm({ akunId: '', namaAkun: '', group: 'Bank', icon: '💳' }); setShowTambahAkun(true); }}>
            <Plus size={14} /> Tambah Akun
          </button>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {GROUP_ORDER.map(group => {
            const groupAkun = semuaAkun.filter(a => a.group === group);
            if (!groupAkun.length) return null;
            return (
              <div key={group}>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">{group}</p>
                {groupAkun.map(akun => (
                  <div key={akun.akunId} className={`flex items-center gap-3 p-3 rounded-xl border mb-1.5 ${!akun.isActive ? 'opacity-50 bg-slate-50' : 'bg-white border-slate-100'}`}>
                    <span className="text-xl">{akun.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-700">{akun.namaAkun}</p>
                      <p className="text-xs text-slate-400">{akun.akunId} • {formatRupiah(akun.saldo)}</p>
                    </div>
                    <div className="flex gap-1.5 items-center">
                      {!akun.isActive && <span className="badge badge-red text-xs">Nonaktif</span>}
                      <button onClick={() => {
                        setSelectedAkunEdit(akun);
                        setAkunForm({ namaAkun: akun.namaAkun, group: akun.group, icon: akun.icon, isActive: akun.isActive !== false });
                        setShowEditAkun(true);
                      }} className="btn btn-outline py-1 px-2 text-xs">
                        <Edit3 size={12} /> Edit
                      </button>
                      {akun.akunId !== 'tunai' && akun.isActive && (
                        <button onClick={() => handleDeleteAkun(akun)} className="btn btn-danger py-1 px-2 text-xs">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </Modal>

      {/* ── Modal: Tambah Akun ── */}
      <Modal open={showTambahAkun} onClose={() => setShowTambahAkun(false)} title="Tambah Akun Saldo Baru" size="sm">
        <div className="space-y-3">
          <div>
            <label className="label">ID Akun * <span className="text-slate-400 font-normal text-xs">(unik, tanpa spasi)</span></label>
            <input className="input" placeholder="contoh: bni, dana3, shopee_pay"
              value={akunForm.akunId}
              onChange={e => setAkunForm(f => ({ ...f, akunId: e.target.value.toLowerCase().replace(/\s/g, '_') }))} />
            <p className="text-xs text-slate-400 mt-1">Huruf kecil dan underscore. Contoh: bni, dana3</p>
          </div>
          <div>
            <label className="label">Nama Akun *</label>
            <input className="input" placeholder="BNI, DANA 3, ShopeePay, dll"
              value={akunForm.namaAkun}
              onChange={e => setAkunForm(f => ({ ...f, namaAkun: e.target.value }))} />
          </div>
          <div>
            <label className="label">Grup *</label>
            <select className="input" value={akunForm.group} onChange={e => setAkunForm(f => ({ ...f, group: e.target.value }))}>
              <option value="Server Pulsa">Server Pulsa</option>
              <option value="Bank">Bank</option>
              <option value="E-Wallet">E-Wallet</option>
              <option value="Tunai">Tunai</option>
            </select>
          </div>
          <div>
            <label className="label">Icon Emoji</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {['💳', '🏦', '🏧', '💙', '💚', '💜', '🟠', '📡', '🛒', '💻', '💵', '⭐'].map(e => (
                <button key={e} onClick={() => setAkunForm(f => ({ ...f, icon: e }))}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition ${akunForm.icon === e ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-slate-100 hover:bg-slate-200'}`}>
                  {e}
                </button>
              ))}
            </div>
            <input className="input" placeholder="Atau ketik emoji lain..."
              value={akunForm.icon} onChange={e => setAkunForm(f => ({ ...f, icon: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button className="btn btn-outline flex-1" onClick={() => setShowTambahAkun(false)}>Batal</button>
          <button className="btn btn-primary flex-1" onClick={handleTambahAkun} disabled={savingAkun}>
            {savingAkun ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {savingAkun ? 'Menyimpan...' : 'Tambah Akun'}
          </button>
        </div>
      </Modal>

      {/* ── Modal: Edit Akun ── */}
      <Modal open={showEditAkun} onClose={() => setShowEditAkun(false)} title={`Edit: ${selectedAkunEdit?.namaAkun}`} size="sm">
        <div className="space-y-3">
          <div>
            <label className="label">ID Akun</label>
            <input className="input bg-slate-50" value={selectedAkunEdit?.akunId} disabled />
            <p className="text-xs text-slate-400 mt-1">ID tidak bisa diubah</p>
          </div>
          <div>
            <label className="label">Nama Akun *</label>
            <input className="input" placeholder="Nama akun"
              value={akunForm.namaAkun} onChange={e => setAkunForm(f => ({ ...f, namaAkun: e.target.value }))} />
          </div>
          <div>
            <label className="label">Grup *</label>
            <select className="input" value={akunForm.group} onChange={e => setAkunForm(f => ({ ...f, group: e.target.value }))}>
              <option value="Server Pulsa">Server Pulsa</option>
              <option value="Bank">Bank</option>
              <option value="E-Wallet">E-Wallet</option>
              <option value="Tunai">Tunai</option>
            </select>
          </div>
          <div>
            <label className="label">Icon Emoji</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {['💳', '🏦', '🏧', '💙', '💚', '💜', '🟠', '📡', '🛒', '💻', '💵', '⭐'].map(e => (
                <button key={e} onClick={() => setAkunForm(f => ({ ...f, icon: e }))}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition ${akunForm.icon === e ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-slate-100 hover:bg-slate-200'}`}>
                  {e}
                </button>
              ))}
            </div>
            <input className="input" placeholder="Atau ketik emoji lain..."
              value={akunForm.icon} onChange={e => setAkunForm(f => ({ ...f, icon: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
            <input type="checkbox" id="isActiveEdit" checked={akunForm.isActive !== false}
              onChange={e => setAkunForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded" />
            <label htmlFor="isActiveEdit" className="text-sm font-medium text-slate-700">Akun Aktif</label>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button className="btn btn-outline flex-1" onClick={() => setShowEditAkun(false)}>Batal</button>
          <button className="btn btn-primary flex-1" onClick={handleUpdateAkun} disabled={savingAkun}>
            {savingAkun ? <Loader2 size={16} className="animate-spin" /> : <Edit3 size={16} />}
            {savingAkun ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
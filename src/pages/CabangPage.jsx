import React, { useState, useEffect, useCallback } from 'react';
import api, { cabangAPI } from '../services/api';
import { formatRupiah } from '../utils/helpers';
import { PageHeader, Modal, EmptyState, Loader, ConfirmDialog } from '../components/UI';
import {
  Plus, Edit2, Trash2, Building2, RefreshCw,
  User, MapPin, Phone, CreditCard, Calendar, BarChart3, Store
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  gratis:   { cls: 'bg-green-100 text-green-700',  label: 'GRATIS' },
  aktif:    { cls: 'bg-blue-100 text-blue-700',    label: 'AKTIF' },
  nonaktif: { cls: 'bg-red-100 text-red-700',      label: 'BELUM BAYAR' },
  expired:  { cls: 'bg-orange-100 text-orange-700',label: 'EXPIRED' },
};

const fmtDate = d => d
  ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  : '-';

const defaultForm = { nama: '', kode: '', alamat: '', telepon: '' };

function StatBox({ label, value, color = 'slate' }) {
  const colors = {
    blue:  'bg-blue-50 text-blue-400 text-blue-700',
    green: 'bg-green-50 text-green-400 text-green-700',
    purple:'bg-purple-50 text-purple-400 text-purple-700',
    amber: 'bg-amber-50 text-amber-400 text-amber-700',
    slate: 'bg-slate-50 text-slate-400 text-slate-700',
    red:   'bg-red-50 text-red-400 text-red-700',
  };
  const [bg, lb, vb] = (colors[color]||colors.slate).split(' ');
  return (
    <div className={`${bg} rounded-xl p-2.5 text-center`}>
      <p className={`text-xs ${lb} mb-0.5`}>{label}</p>
      <p className={`font-bold ${vb} text-xs leading-tight`}>{value}</p>
    </div>
  );
}

function PeriodTab({ active, onClick, label }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${active ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
      {label}
    </button>
  );
}

function CabangFormModal({ open, onClose, onSaved, editData }) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(editData
      ? { nama: editData.nama, kode: editData.kode, alamat: editData.alamat || '', telepon: editData.telepon || '' }
      : defaultForm);
  }, [open, editData]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.nama.trim()) return toast.error('Nama client wajib diisi');
    if (!form.kode.trim()) return toast.error('Kode client wajib diisi');
    setSaving(true);
    try {
      editData ? await cabangAPI.update(editData._id, form) : await cabangAPI.create(form);
      toast.success(editData ? 'Client diperbarui' : `Client ${form.nama} berhasil dibuat`);
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={editData ? 'Edit Client' : 'Tambah Client Baru'} size="sm">
      <div className="space-y-3">
        <div>
          <label className="label">Nama Client *</label>
          <input className="input" placeholder="Toko Pusat, Cabang Utara..." value={form.nama} onChange={e => set('nama', e.target.value)} />
        </div>
        <div>
          <label className="label flex items-center gap-2">Kode Client * <span className="text-slate-400 font-normal text-xs">(max 5 huruf)</span></label>
          <input className="input uppercase" placeholder="PUSAT / UTR" maxLength={5}
            value={form.kode} onChange={e => set('kode', e.target.value.toUpperCase())} disabled={!!editData} />
          {!editData && <p className="text-xs text-slate-400 mt-1">Kode tidak bisa diubah setelah dibuat</p>}
        </div>
        <div>
          <label className="label">Alamat</label>
          <input className="input" placeholder="Alamat client..." value={form.alamat} onChange={e => set('alamat', e.target.value)} />
        </div>
        <div>
          <label className="label">Telepon</label>
          <input className="input" placeholder="08xx..." value={form.telepon} onChange={e => set('telepon', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        <button className="btn btn-outline flex-1" onClick={onClose}>Batal</button>
        <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
          {saving ? 'Menyimpan...' : (editData ? 'Simpan Perubahan' : 'Buat Client')}
        </button>
      </div>
    </Modal>
  );
}

function ClientDetailModal({ open, onClose, cabang, summary, subscription, ownerCabangs }) {
  if (!cabang) return null;
  const statusInfo = subscription ? STATUS_BADGE[subscription.status] : null;
  const totalTx    = (summary?.harian?.count || 0) + (summary?.mingguan?.count || 0) + (summary?.bulanan?.count || 0);
  const stats = [
    { label: 'Hari Ini',    k: 'harian'   },
    { label: '7 Hari',      k: 'mingguan' },
    { label: 'Bulan Ini',   k: 'bulanan'  },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Detail Client" size="md">
      <div className="space-y-4">
        {/* Header info */}
        <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-primary-50 to-violet-50 rounded-2xl">
          <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center shrink-0">
            <Building2 size={22} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-black text-slate-800 text-base">{cabang.nama}</p>
              <code className="text-xs bg-white px-2 py-0.5 rounded font-mono text-slate-600">{cabang.kode}</code>
              <span className={`badge text-xs ${cabang.isActive ? 'badge-green' : 'badge-red'}`}>
                {cabang.isActive ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
            {cabang.alamat && (
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <MapPin size={11} /> {cabang.alamat}
              </p>
            )}
            {cabang.telepon && (
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <Phone size={11} /> {cabang.telepon}
              </p>
            )}
          </div>
        </div>

        {/* Owner */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Owner</p>
          <div className="p-3 bg-slate-50 rounded-xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
              {subscription?.owner?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-700 text-sm truncate">
                {subscription?.owner?.name || 'Belum ada owner'}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {subscription?.owner?.username ? `@${subscription.owner.username}` : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <CreditCard size={12} /> Subscription
          </p>
          {subscription ? (
            <div className="p-3 bg-slate-50 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Status</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusInfo?.cls || 'bg-slate-100 text-slate-500'}`}>
                  {statusInfo?.label || subscription.status?.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 flex items-center gap-1"><Calendar size={11} /> Expired</span>
                <span className="text-sm font-semibold text-slate-700">{fmtDate(subscription.expiredAt) || 'Tidak ada batas'}</span>
              </div>
              {subscription.harga > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Tagihan</span>
                  <span className="text-sm font-bold text-amber-600">{formatRupiah(subscription.harga)} / bln</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">Belum ada subscription</p>
          )}
        </div>

        {/* Statistik */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <BarChart3 size={12} /> Statistik Penjualan
          </p>
          <div className="grid grid-cols-3 gap-2">
            {stats.map(s => {
              const p = summary?.[s.k] || {};
              return (
                <div key={s.k} className="bg-slate-50 rounded-xl p-2.5">
                  <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                  <p className="text-sm font-bold text-blue-600">{p.count || 0} tx</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">Omset {formatRupiah(p.omset || 0)}</p>
                  <p className="text-xs text-emerald-600 truncate">Laba {formatRupiah(p.laba || 0)}</p>
                </div>
              );
            })}
          </div>
          {totalTx === 0 && (
            <p className="text-xs text-slate-400 mt-2 text-center">Belum ada transaksi tercatat</p>
          )}
        </div>

        {/* Cabang milik owner ini */}
        {ownerCabangs && ownerCabangs.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Store size={12} /> Cabang Lain Milik Owner
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {ownerCabangs.length}
              </span>
            </p>
            <div className="space-y-1.5">
              {ownerCabangs.map(c => (
                <div key={c._id} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl">
                  <Building2 size={14} className="text-slate-400 shrink-0" />
                  <span className="text-sm font-semibold text-slate-700 truncate flex-1">{c.nama}</span>
                  <code className="text-xs bg-white px-1.5 py-0.5 rounded text-slate-500">{c.kode}</code>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-3 mt-5">
        <button className="btn btn-outline flex-1" onClick={onClose}>Tutup</button>
      </div>
    </Modal>
  );
}

export default function CabangPage() {
  const [cabangs, setCabangs]     = useState([]);
  const [summary, setSummary]     = useState([]);
  const [subs, setSubs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData]   = useState(null);
  const [deactConfirm, setDeactConfirm] = useState(null);
  const [detailCabang, setDetailCabang] = useState(null);
  const [period, setPeriod]       = useState('harian'); // harian | mingguan | bulanan

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, s, su] = await Promise.all([
        cabangAPI.getAll(),
        cabangAPI.getSummary(),
        api.get('/owner/subscriptions'),
      ]);
      setCabangs(c.data.data || []);
      setSummary(s.data.data || []);
      setSubs(su.data.data || []);
    } catch { toast.error('Gagal memuat data client'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDeactivate = async () => {
    try {
      await cabangAPI.deactivate(deactConfirm._id);
      toast.success('Client dinonaktifkan');
      setDeactConfirm(null); load();
    } catch { toast.error('Gagal menonaktifkan'); }
  };

  const getSummary = (id) => summary.find(s => String(s._id) === String(id)) || {};
  const getSub     = (id) => subs.find(s => String(s.cabang?._id) === String(id));
  const getOwnerOtherCabangs = (currentCabangId, ownerId) => {
    if (!ownerId) return [];
    const ownerSubs = subs.filter(s => String(s.owner?._id) === String(ownerId) && String(s.cabang?._id) !== String(currentCabangId));
    return ownerSubs.map(s => s.cabang).filter(Boolean);
  };

  const totalOmset   = summary.reduce((t, s) => t + (s[period]?.omset || 0), 0);
  const totalTx      = summary.reduce((t, s) => t + (s[period]?.count || 0), 0);
  const totalSaldo   = summary.reduce((t, s) => t + (s.saldoDigital || 0) + (s.kasTunai || 0) + (s.brankas || 0), 0);

  const detailSub        = detailCabang ? getSub(detailCabang._id) : null;
  const detailOwnerOther = detailCabang ? getOwnerOtherCabangs(detailCabang._id, detailSub?.owner?._id) : [];

  return (
    <div className="animate-fade-in-up pb-24 lg:pb-0">
      <PageHeader
        title="Manajemen Client"
        subtitle="Monitor semua client secara real-time"
        actions={
          <div className="flex gap-2">
            <button className="btn btn-outline py-2 px-3" onClick={load}><RefreshCw size={15} /></button>
            <button className="btn btn-primary" onClick={() => { setEditData(null); setModalOpen(true); }}>
              <Plus size={16} /> Tambah Client
            </button>
          </div>
        }
      />

      {/* Period Selector */}
      <div className="flex gap-2 mb-5">
        {[['harian','Hari Ini'],['mingguan','7 Hari'],['bulanan','Bulan Ini']].map(([k,l]) => (
          <PeriodTab key={k} active={period===k} onClick={() => setPeriod(k)} label={l} />
        ))}
      </div>

      {/* Ringkasan Global */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="card py-3 text-center">
          <p className="text-xs text-slate-400">Total Client</p>
          <p className="text-2xl font-bold text-slate-700">{cabangs.filter(c=>c.isActive).length}</p>
          <p className="text-xs text-slate-400">aktif</p>
        </div>
        <div className="card py-3 text-center border-blue-100 bg-blue-50">
          <p className="text-xs text-blue-400">Total Transaksi</p>
          <p className="text-2xl font-bold text-blue-700">{totalTx}</p>
          <p className="text-xs text-blue-400">semua client</p>
        </div>
        <div className="card py-3 text-center border-green-100 bg-green-50">
          <p className="text-xs text-green-400">Total Omset</p>
          <p className="text-lg font-bold text-green-700">{formatRupiah(totalOmset)}</p>
          <p className="text-xs text-green-400">semua client</p>
        </div>
        <div className="card py-3 text-center border-purple-100 bg-purple-50">
          <p className="text-xs text-purple-400">Total Aset</p>
          <p className="text-lg font-bold text-purple-700">{formatRupiah(totalSaldo)}</p>
          <p className="text-xs text-purple-400">kas+saldo+brankas</p>
        </div>
      </div>

      {/* Kartu Per Client */}
      {loading ? <Loader /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {cabangs.length === 0
            ? <div className="col-span-3"><EmptyState message="Belum ada client. Tambah client pertama!" /></div>
            : cabangs.map(c => {
              const s = getSummary(c._id);
              const p = s[period] || {};
              const sub = getSub(c._id);
              const sInfo = sub ? STATUS_BADGE[sub.status] : null;
              return (
                <div key={c._id}
                  onClick={() => setDetailCabang(c)}
                  className={`card flex flex-col gap-3 cursor-pointer hover:shadow-lg hover:border-primary-200 transition-all ${!c.isActive ? 'opacity-60' : ''}`}>
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center">
                        <Building2 size={22} className="text-primary-600" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{c.nama}</p>
                        <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-600">{c.kode}</code>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`badge text-xs ${c.isActive ? 'badge-green' : 'badge-red'}`}>
                        {c.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                      {sInfo && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sInfo.cls}`}>
                          {sInfo.label}
                        </span>
                      )}
                    </div>
                  </div>
                  {sub?.owner && (
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <User size={11} /> {sub.owner.name} <span className="text-slate-400">(@{sub.owner.username})</span>
                    </p>
                  )}
                  {c.alamat && <p className="text-xs text-slate-400">📍 {c.alamat}</p>}

                  {/* Statistik Transaksi */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                      Penjualan — {period === 'harian' ? 'Hari Ini' : period === 'mingguan' ? '7 Hari' : 'Bulan Ini'}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <StatBox label="Transaksi" value={p.count || 0} color="blue" />
                      <StatBox label="Omset" value={formatRupiah(p.omset || 0)} color="green" />
                      <StatBox label="Laba" value={formatRupiah(p.laba || 0)} color="purple" />
                    </div>
                  </div>

                  {/* Aset */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Aset Client</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      <StatBox label="Stok" value={`${s.jumlahProduk||0} prd`} color="slate" />
                      <StatBox label="Kas Tunai" value={formatRupiah(s.kasTunai||0)} color="green" />
                      <StatBox label="Brankas" value={formatRupiah(s.brankas||0)} color="amber" />
                      <StatBox label="Digital" value={formatRupiah(s.saldoDigital||0)} color="blue" />
                    </div>
                  </div>

                  {/* Aksi */}
                  <div className="flex gap-2 pt-1 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                    <button onClick={() => { setEditData(c); setModalOpen(true); }}
                      className="btn btn-outline flex-1 py-1.5 text-xs">
                      <Edit2 size={13} /> Edit
                    </button>
                    {c.isActive && (
                      <button onClick={() => setDeactConfirm(c)}
                        className="btn btn-danger py-1.5 px-3 text-xs">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          }
        </div>
      )}

      <CabangFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} editData={editData} />
      <ClientDetailModal
        open={!!detailCabang}
        onClose={() => setDetailCabang(null)}
        cabang={detailCabang}
        summary={detailCabang ? getSummary(detailCabang._id) : null}
        subscription={detailSub}
        ownerCabangs={detailOwnerOther}
      />
      <ConfirmDialog
        open={!!deactConfirm} onClose={() => setDeactConfirm(null)} onConfirm={handleDeactivate}
        title="Nonaktifkan Client?"
        message={`Client "${deactConfirm?.nama}" akan dinonaktifkan. Data tidak akan dihapus.`}
        confirmLabel="Nonaktifkan" danger
      />
    </div>
  );
}

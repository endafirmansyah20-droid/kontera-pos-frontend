import React, { useState, useEffect, useCallback } from 'react';
import { cabangAPI } from '../services/api';
import { formatRupiah } from '../utils/helpers';
import { PageHeader, Modal, EmptyState, Loader, ConfirmDialog } from '../components/UI';
import { Plus, Edit2, Trash2, Building2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

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
    if (!form.nama.trim()) return toast.error('Nama cabang wajib diisi');
    if (!form.kode.trim()) return toast.error('Kode cabang wajib diisi');
    setSaving(true);
    try {
      editData ? await cabangAPI.update(editData._id, form) : await cabangAPI.create(form);
      toast.success(editData ? 'Cabang diperbarui' : `Cabang ${form.nama} berhasil dibuat`);
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={editData ? 'Edit Cabang' : 'Tambah Cabang Baru'} size="sm">
      <div className="space-y-3">
        <div>
          <label className="label">Nama Cabang *</label>
          <input className="input" placeholder="Cabang Pusat, Cabang Utara..." value={form.nama} onChange={e => set('nama', e.target.value)} />
        </div>
        <div>
          <label className="label flex items-center gap-2">Kode Cabang * <span className="text-slate-400 font-normal text-xs">(max 5 huruf)</span></label>
          <input className="input uppercase" placeholder="PUSAT / UTR" maxLength={5}
            value={form.kode} onChange={e => set('kode', e.target.value.toUpperCase())} disabled={!!editData} />
          {!editData && <p className="text-xs text-slate-400 mt-1">Kode tidak bisa diubah setelah dibuat</p>}
        </div>
        <div>
          <label className="label">Alamat</label>
          <input className="input" placeholder="Alamat cabang..." value={form.alamat} onChange={e => set('alamat', e.target.value)} />
        </div>
        <div>
          <label className="label">Telepon</label>
          <input className="input" placeholder="08xx..." value={form.telepon} onChange={e => set('telepon', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        <button className="btn btn-outline flex-1" onClick={onClose}>Batal</button>
        <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
          {saving ? 'Menyimpan...' : (editData ? 'Simpan Perubahan' : 'Buat Cabang')}
        </button>
      </div>
    </Modal>
  );
}

export default function CabangPage() {
  const [cabangs, setCabangs]     = useState([]);
  const [summary, setSummary]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData]   = useState(null);
  const [deactConfirm, setDeactConfirm] = useState(null);
  const [period, setPeriod]       = useState('harian'); // harian | mingguan | bulanan

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([cabangAPI.getAll(), cabangAPI.getSummary()]);
      setCabangs(c.data.data || []);
      setSummary(s.data.data || []);
    } catch { toast.error('Gagal memuat data cabang'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDeactivate = async () => {
    try {
      await cabangAPI.deactivate(deactConfirm._id);
      toast.success('Cabang dinonaktifkan');
      setDeactConfirm(null); load();
    } catch { toast.error('Gagal menonaktifkan'); }
  };

  const getSummary = (id) => summary.find(s => String(s._id) === String(id)) || {};

  const totalOmset   = summary.reduce((t, s) => t + (s[period]?.omset || 0), 0);
  const totalTx      = summary.reduce((t, s) => t + (s[period]?.count || 0), 0);
  const totalSaldo   = summary.reduce((t, s) => t + (s.saldoDigital || 0) + (s.kasTunai || 0) + (s.brankas || 0), 0);

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Manajemen Cabang"
        subtitle="Monitor semua cabang secara real-time"
        actions={
          <div className="flex gap-2">
            <button className="btn btn-outline py-2 px-3" onClick={load}><RefreshCw size={15} /></button>
            <button className="btn btn-primary" onClick={() => { setEditData(null); setModalOpen(true); }}>
              <Plus size={16} /> Tambah Cabang
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
          <p className="text-xs text-slate-400">Total Cabang</p>
          <p className="text-2xl font-bold text-slate-700">{cabangs.filter(c=>c.isActive).length}</p>
          <p className="text-xs text-slate-400">aktif</p>
        </div>
        <div className="card py-3 text-center border-blue-100 bg-blue-50">
          <p className="text-xs text-blue-400">Total Transaksi</p>
          <p className="text-2xl font-bold text-blue-700">{totalTx}</p>
          <p className="text-xs text-blue-400">semua cabang</p>
        </div>
        <div className="card py-3 text-center border-green-100 bg-green-50">
          <p className="text-xs text-green-400">Total Omset</p>
          <p className="text-lg font-bold text-green-700">{formatRupiah(totalOmset)}</p>
          <p className="text-xs text-green-400">semua cabang</p>
        </div>
        <div className="card py-3 text-center border-purple-100 bg-purple-50">
          <p className="text-xs text-purple-400">Total Aset</p>
          <p className="text-lg font-bold text-purple-700">{formatRupiah(totalSaldo)}</p>
          <p className="text-xs text-purple-400">kas+saldo+brankas</p>
        </div>
      </div>

      {/* Kartu Per Cabang */}
      {loading ? <Loader /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {cabangs.length === 0
            ? <div className="col-span-3"><EmptyState message="Belum ada cabang. Tambah cabang pertama!" /></div>
            : cabangs.map(c => {
              const s = getSummary(c._id);
              const p = s[period] || {};
              return (
                <div key={c._id} className={`card flex flex-col gap-3 ${!c.isActive ? 'opacity-50' : ''}`}>
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
                    <span className={`badge text-xs ${c.isActive ? 'badge-green' : 'badge-red'}`}>
                      {c.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
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
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Aset Cabang</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      <StatBox label="Stok" value={`${s.jumlahProduk||0} prd`} color="slate" />
                      <StatBox label="Kas Tunai" value={formatRupiah(s.kasTunai||0)} color="green" />
                      <StatBox label="Brankas" value={formatRupiah(s.brankas||0)} color="amber" />
                      <StatBox label="Digital" value={formatRupiah(s.saldoDigital||0)} color="blue" />
                    </div>
                  </div>

                  {/* Aksi */}
                  <div className="flex gap-2 pt-1 border-t border-slate-100">
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
      <ConfirmDialog
        open={!!deactConfirm} onClose={() => setDeactConfirm(null)} onConfirm={handleDeactivate}
        title="Nonaktifkan Cabang?"
        message={`Cabang "${deactConfirm?.nama}" akan dinonaktifkan. Data tidak akan dihapus.`}
        confirmLabel="Nonaktifkan" danger
      />
    </div>
  );
}

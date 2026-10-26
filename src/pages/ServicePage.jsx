import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { serviceAPI, customerAPI, authAPI, sparepartAPI } from '../services/api';
import { formatRupiah, formatDate, formatDateTime } from '../utils/helpers';
import { PageHeader, Modal, Loader, EmptyState, ConfirmDialog, RupiahInput } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Archive, Pencil } from 'lucide-react';
import {
  Wrench, Plus, Search, RefreshCw, Edit2, Trash2,
  CheckCircle, Clock, AlertCircle, XCircle, Package,
  TrendingUp, TrendingDown, DollarSign, ChevronRight,
  Smartphone, User, Phone, FileText, X, Boxes, PackagePlus, EyeOff, Eye
} from 'lucide-react';

// ─── Konstanta ────────────────────────────────────────────────
const STATUS_LIST = [
  { key: 'antrian', label: 'Antrian',  color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  { key: 'proses',  label: 'Proses',   color: 'bg-blue-100 text-blue-700',     icon: Wrench },
  { key: 'selesai', label: 'Selesai',  color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  { key: 'diambil', label: 'Diambil',  color: 'bg-slate-100 text-slate-500',   icon: Package },
  { key: 'batal',   label: 'Batal',    color: 'bg-red-100 text-red-500',       icon: XCircle },
];

const STATUS_MAP = Object.fromEntries(STATUS_LIST.map(s => [s.key, s]));

const FINANCE_CATS = ['sparepart', 'peralatan', 'operasional', 'umum', 'lainnya'];

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.antrian;
  return <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.color}`}>{s.label}</span>;
}

// ─── Form default ─────────────────────────────────────────────
const defaultForm = {
  customerName: '', customerPhone: '', customerId: null,
  deviceBrand: '', deviceModel: '', deviceColor: '',
  complaint: '', diagnosis: '', workDone: '',
  sparepartItems: [], serviceFee: 0,
  status: 'antrian', isPaid: false, notes: '',
  estimatedDone: '', technician: '',
};

const defaultFinForm = { type: 'pengeluaran', amount: 0, description: '', category: 'umum', date: new Date().toISOString().slice(0, 10) };

// ══════════════════════════════════════════════════════════════
// Modal Form Transaksi Servis
// ══════════════════════════════════════════════════════════════
function ServiceFormModal({ open, onClose, onSaved, editData }) {
  const [form, setForm]       = useState(defaultForm);
  const [saving, setSaving]   = useState(false);
  const [memberList, setMemberList]   = useState([]);
  const [memberQuery, setMemberQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchingMember, setSearchingMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [technicianList, setTechnicianList] = useState([]);

  useEffect(() => {
    if (open) {
      // sparepartItems: pakai array dari backend kalau ada; fallback ke
      // transaksi lama (hanya punya partsCost angka tunggal) sebagai 1
      // item eksternal supaya nilainya tetap terbaca saat edit.
      let items = [];
      if (editData) {
        if (Array.isArray(editData.sparepartItems) && editData.sparepartItems.length > 0) {
          items = editData.sparepartItems.map(it => ({
            source:      it.sparepartId ? 'stok' : 'eksternal',
            sparepartId: it.sparepartId?._id || it.sparepartId || null,
            nama:        it.nama || '',
            qty:         Number(it.qty) || 1,
            hargaBeli:   Number(it.hargaBeli) || 0,
            hargaJual:   Number(it.hargaJual) || 0,
            satuan:      it.satuan || '',
          }));
        } else if (Number(editData.partsCost) > 0) {
          items = [{
            source: 'eksternal', sparepartId: null,
            nama: 'Sparepart', qty: 1,
            hargaBeli: Number(editData.partsCost) || 0,
            hargaJual: Number(editData.partsCost) || 0,
            satuan: '',
          }];
        }
      }
      setForm(editData ? {
        customerName:  editData.customerName  || '',
        customerPhone: editData.customerPhone || '',
        deviceBrand:   editData.deviceBrand   || '',
        deviceModel:   editData.deviceModel   || '',
        deviceColor:   editData.deviceColor   || '',
        complaint:     editData.complaint     || '',
        diagnosis:     editData.diagnosis     || '',
        workDone:      editData.workDone      || '',
        sparepartItems: items,
        serviceFee:    editData.serviceFee    || 0,
        status:        editData.status        || 'antrian',
        isPaid:        editData.isPaid        || false,
        notes:         editData.notes         || '',
        estimatedDone: editData.estimatedDone ? editData.estimatedDone.slice(0, 10) : '',
        // technician bisa populated {_id,name} atau ObjectId string
        technician:    editData.technician?._id || editData.technician || '',
      } : defaultForm);
    }
  }, [open, editData]);

  // Fetch daftar teknisi saat modal dibuka. /auth/users sudah di-scope
  // ke cabang user yang login di backend. Gagal → dropdown kosong (field
  // opsional, tidak memblokir simpan).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    authAPI.getUsers()
      .then(r => {
        if (cancelled) return;
        const users = (r.data?.data || []).filter(u => ['admin','karyawan'].includes(u.role));
        setTechnicianList(users);
      })
      .catch(() => { if (!cancelled) setTechnicianList([]); });
    return () => { cancelled = true; };
  }, [open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Search member dari API
  async function searchMember(q) {
    setMemberQuery(q);
    set('customerName', q);
    if (q.length < 2) { setMemberList([]); setShowDropdown(false); return; }
    setSearchingMember(true);
    try {
      const res = await customerAPI.getAll({ search: q });
      const members = (res.data.data || []).filter(c => c.isMember);
      setMemberList(members);
      setShowDropdown(members.length > 0);
    } catch(e) {} finally { setSearchingMember(false); }
  }

  function selectMember(m) {
    set('customerName',  m.name);
    set('customerPhone', m.phone || '');
    set('customerId',    m._id);
    setMemberQuery(m.name);
    setShowDropdown(false);
    setMemberList([]);
    setSelectedMember(m);
  }

  const handleSave = async () => {
    if (!form.customerName.trim()) return toast.error('Nama pelanggan wajib diisi');
    if (!form.complaint.trim())    return toast.error('Keluhan wajib diisi');
    // Validasi item sparepart (kalau ada)
    for (const it of (form.sparepartItems || [])) {
      if (!it.nama?.trim()) return toast.error('Nama item sparepart wajib diisi');
      if (!it.qty || Number(it.qty) <= 0) return toast.error(`Qty untuk "${it.nama}" harus > 0`);
    }
    setSaving(true);
    try {
      // Kirim null (bukan '') untuk optional ObjectId supaya backend tidak CastError.
      // sparepartItems dikirim apa adanya; partsCost dihitung backend otomatis.
      const payload = {
        ...form,
        technician: form.technician || null,
        sparepartItems: (form.sparepartItems || []).map(it => ({
          sparepartId: it.source === 'stok' ? it.sparepartId : null,
          nama:        it.nama,
          qty:         Number(it.qty) || 0,
          hargaBeli:   Number(it.hargaBeli) || 0,
          hargaJual:   Number(it.hargaJual) || 0,
          satuan:      it.satuan || '',
        })),
      };
      if (editData) {
        await serviceAPI.update(editData._id, payload);
        toast.success('Transaksi diperbarui');
      } else {
        await serviceAPI.create(payload);
        toast.success('Transaksi servis dibuat');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    } finally { setSaving(false); }
  };

  const totalModalSparepart = (form.sparepartItems || []).reduce(
    (s, it) => s + (Number(it.hargaBeli) || 0) * (Number(it.qty) || 0),
    0
  );
  const estProfit = (Number(form.serviceFee) || 0) - totalModalSparepart;

  return (
    <Modal open={open} onClose={onClose} title={editData ? 'Edit Servis' : 'Input Servis HP Baru'} size="lg">
      <div className="space-y-4">
        {/* Pelanggan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <label className="label">Nama Pelanggan *</label>
            <input
              className="input"
              placeholder="Ketik nama member atau pelanggan..."
              value={form.customerName}
              onChange={e => searchMember(e.target.value)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              autoComplete="off"
            />
            {searchingMember && <p className="text-xs text-slate-400 mt-1">Mencari member...</p>}
            {showDropdown && memberList.length > 0 && (
              <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                {memberList.map(m => (
                  <div key={m._id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-purple-50 cursor-pointer border-b last:border-0"
                    onMouseDown={() => selectMember(m)}>
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm flex-shrink-0">
                      {m.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-800 flex items-center gap-1">
                        ⭐ {m.name}
                      </p>
                      <p className="text-xs text-slate-400">{m.phone || '-'} · {m.points || 0} poin</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="label">No. HP</label>
            <input className="input" placeholder="08xx..." value={form.customerPhone} onChange={e => set('customerPhone', e.target.value)} />
          </div>
          {selectedMember && (
            <div className="col-span-2 flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2">
              <span className="text-lg">⭐</span>
              <div>
                <p className="text-xs font-semibold text-yellow-700">{selectedMember.name} — Member Aktif</p>
                <p className="text-xs text-yellow-600">{(selectedMember.points || 0).toLocaleString('id-ID')} poin tersedia</p>
              </div>
            </div>
          )}
        </div>

        {/* Data HP */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Merk HP</label>
            <input className="input" placeholder="Samsung, iPhone, Oppo..." value={form.deviceBrand} onChange={e => set('deviceBrand', e.target.value)} />
          </div>
          <div>
            <label className="label">Tipe / Model</label>
            <input className="input" placeholder="Galaxy A54, iPhone 13..." value={form.deviceModel} onChange={e => set('deviceModel', e.target.value)} />
          </div>
          <div>
            <label className="label">Warna</label>
            <input className="input" placeholder="Hitam, Putih..." value={form.deviceColor} onChange={e => set('deviceColor', e.target.value)} />
          </div>
        </div>

        {/* Keluhan & Diagnosa */}
        <div>
          <label className="label">Keluhan Pelanggan *</label>
          <textarea className="input resize-none" rows={2} placeholder="Layar retak, tidak bisa nyala, baterai bocor..." value={form.complaint} onChange={e => set('complaint', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Diagnosa Teknisi</label>
            <textarea className="input resize-none" rows={2} placeholder="Hasil pemeriksaan..." value={form.diagnosis} onChange={e => set('diagnosis', e.target.value)} />
          </div>
          <div>
            <label className="label">Pekerjaan Dilakukan</label>
            <textarea className="input resize-none" rows={2} placeholder="Ganti LCD, solder ic, dll..." value={form.workDone} onChange={e => set('workDone', e.target.value)} />
          </div>
        </div>

        {/* Teknisi (opsional) */}
        <div>
          <label className="label">Teknisi (opsional)</label>
          <select className="input" value={form.technician} onChange={e => set('technician', e.target.value)}>
            <option value="">— Belum ditentukan —</option>
            {technicianList.map(u => (
              <option key={u._id} value={u._id}>
                {u.name}{u.role === 'admin' ? ' (Admin)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Sparepart Items */}
        <SparepartItemsField
          items={form.sparepartItems}
          onChange={(items) => set('sparepartItems', items)}
        />

        {/* Biaya Service + Estimasi Keuntungan (side-by-side) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Biaya Service HP (Dibayar Pelanggan)</label>
            <RupiahInput value={form.serviceFee} onChange={v => set('serviceFee', v)} placeholder="0" />
          </div>
          <div>
            <label className="label">Estimasi Keuntungan</label>
            <div className={`flex items-center justify-between rounded-xl px-3 sm:px-4 py-2.5 gap-2 border ${
              estProfit >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
            }`}>
              <span className="text-[11px] text-slate-500">Service − Modal Sparepart</span>
              <span className={`text-base sm:text-lg font-bold flex-shrink-0 ${
                estProfit >= 0 ? 'text-green-600' : 'text-red-500'
              }`}>
                {formatRupiah(estProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* Status & Bayar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUS_LIST.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Estimasi Selesai</label>
            <input className="input" type="date" value={form.estimatedDone} onChange={e => set('estimatedDone', e.target.value)} />
          </div>
          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2 cursor-pointer sm:mt-4">
              <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={form.isPaid} onChange={e => set('isPaid', e.target.checked)} />
              <span className="text-sm font-semibold text-slate-700">Sudah Lunas (Tunai)</span>
            </label>
          </div>
        </div>

        {/* Catatan */}
        <div>
          <label className="label">Catatan</label>
          <input className="input" placeholder="Catatan tambahan..." value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
          <button className="btn btn-outline w-full sm:w-auto" onClick={onClose}>Batal</button>
          <button className="btn btn-primary w-full sm:w-auto" onClick={handleSave} disabled={saving}>
            {saving ? 'Menyimpan...' : editData ? 'Simpan Perubahan' : 'Buat Servis'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// Modal Detail Servis
// ══════════════════════════════════════════════════════════════
function ServiceDetailModal({ open, onClose, data, onEdit, onVoid, isAdmin }) {
  if (!data) return null;
  return (
    <Modal open={open} onClose={onClose} title={`Detail: ${data.invoiceNumber}`} size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1">Pelanggan</p>
            <p className="font-bold text-slate-800 text-sm">{data.customerName}</p>
            {data.customerPhone && <p className="text-xs text-slate-500">{data.customerPhone}</p>}
          </div>
          <div className="bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1">Perangkat</p>
            <p className="font-bold text-slate-800 text-sm">{data.deviceBrand} {data.deviceModel}</p>
            {data.deviceColor && <p className="text-xs text-slate-500">{data.deviceColor}</p>}
          </div>
        </div>

        <div>
          <p className="text-xs text-slate-400 mb-1">Keluhan</p>
          <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{data.complaint}</p>
        </div>
        {data.diagnosis && (
          <div>
            <p className="text-xs text-slate-400 mb-1">Diagnosa</p>
            <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{data.diagnosis}</p>
          </div>
        )}
        {data.workDone && (
          <div>
            <p className="text-xs text-slate-400 mb-1">Pekerjaan</p>
            <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{data.workDone}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-orange-50 rounded-xl p-3 text-center">
            <p className="text-xs text-orange-400">Biaya Sparepart</p>
            <p className="font-bold text-orange-700 text-sm">{formatRupiah(data.partsCost)}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xs text-blue-400">Biaya Service HP</p>
            <p className="font-bold text-blue-700 text-sm">{formatRupiah(data.serviceFee)}</p>
          </div>
          <div className={`rounded-xl p-3 text-center ${data.profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
            <p className={`text-xs ${data.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>Keuntungan</p>
            <p className={`font-bold text-sm ${data.profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {formatRupiah(data.profit)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <StatusBadge status={data.status} />
          <span className={`text-sm font-bold ${data.isPaid ? 'text-green-600' : 'text-orange-500'}`}>
            {data.isPaid ? `✓ Lunas${data.paidAt ? ` — ${formatDate(data.paidAt)}` : ''}` : '⏳ Belum Lunas'}
          </span>
        </div>

        {data.notes && <p className="text-xs text-slate-400 italic">{data.notes}</p>}

        <div className="flex flex-wrap gap-2 justify-end pt-2">
          {isAdmin && !data.isVoid && (
            <button className="btn btn-danger py-2 px-3 text-xs flex-1 sm:flex-none" onClick={onVoid}>
              <Trash2 size={13} /> Void
            </button>
          )}
          <button className="btn btn-outline py-2 px-3 text-xs flex-1 sm:flex-none" onClick={onEdit}>
            <Edit2 size={13} /> Edit
          </button>
          <button className="btn btn-outline py-2 px-3 text-xs flex-1 sm:flex-none" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// Tab: Transaksi Servis
// ══════════════════════════════════════════════════════════════
function TabTransaksi({ isAdmin }) {
  const [data, setData]       = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editData, setEditData]     = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [voidConfirm, setVoidConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)       params.search = search;
      if (statusFilter) params.status = statusFilter;
      const [r, s] = await Promise.all([
        serviceAPI.getAll(params),
        serviceAPI.getSummary(),
      ]);
      setData(r.data.data || []);
      setSummary(s.data.data);
    } catch { toast.error('Gagal memuat data'); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openNew    = () => { setEditData(null); setModalOpen(true); };
  const openEdit   = (d) => { setEditData(d); setDetailOpen(false); setModalOpen(true); };
  const openDetail = (d) => { setDetailData(d); setDetailOpen(true); };

  const handleVoid = async () => {
    try {
      await serviceAPI.void(detailData._id);
      toast.success('Transaksi dibatalkan');
      setVoidConfirm(false);
      setDetailOpen(false);
      load();
    } catch { toast.error('Gagal membatalkan'); }
  };

  const handleStatusQuick = async (id, status) => {
    try {
      const res = await serviceAPI.update(id, { status, ...(status === 'diambil' ? { isPaid: true } : {}) });
      if (status === 'diambil') {
        const tx = res.data?.data;
        if (tx?.customerId && tx?.totalCost) {
          const pointPer   = 50; // default, bisa disesuaikan
          const earnPoints = Math.floor(tx.totalCost / pointPer);
          if (earnPoints > 0) toast.success(`✅ HP diambil! ⭐ +${earnPoints} poin untuk ${tx.customerName}`);
          else toast.success(`Status diubah ke ${STATUS_MAP[status]?.label}`);
        } else {
          toast.success(`Status diubah ke ${STATUS_MAP[status]?.label}`);
        }
      } else {
        toast.success(`Status diubah ke ${STATUS_MAP[status]?.label}`);
      }
      load();
    } catch { toast.error('Gagal ubah status'); }
  };

  const sc = summary?.statusCount || {};

  return (
    <div>
      {/* Summary chips status */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="card py-3 text-center">
            <p className="text-xs text-slate-400">Omset (Lunas)</p>
            <p className="font-bold text-blue-600 text-sm">{formatRupiah(summary.omsetMurni)}</p>
          </div>
          <div className="card py-3 text-center">
            <p className="text-xs text-slate-400">Laba Kotor</p>
            <p className="font-bold text-green-600 text-sm">{formatRupiah(summary.labaKotor)}</p>
          </div>
          <div className="card py-3 text-center">
            <p className="text-xs text-slate-400">Antrian</p>
            <p className="font-bold text-yellow-600 text-sm">{sc.antrian || 0} unit</p>
          </div>
          <div className="card py-3 text-center">
            <p className="text-xs text-slate-400">Sedang Proses</p>
            <p className="font-bold text-blue-600 text-sm">{sc.proses || 0} unit</p>
          </div>
        </div>
      )}

      {/* Filter & search */}
      <div className="card mb-4 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Cari nama, HP, merk, invoice..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 flex-wrap">
          {[{ key: '', label: 'Semua' }, ...STATUS_LIST].map(s => (
            <button key={s.key} onClick={() => setStatusFilter(s.key)}
              className={`btn py-1.5 px-3 text-xs ${statusFilter === s.key ? 'btn-primary' : 'btn-outline'}`}>
              {s.label}
            </button>
          ))}
        </div>
        <button className="btn btn-outline py-2 px-3" onClick={load}><RefreshCw size={14} /></button>
      </div>

      {loading ? <Loader /> : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Pelanggan</th>
                  <th>HP</th>
                  <th>Keluhan</th>
                  <th>Sparepart</th>
                  <th>Biaya Service</th>
                  <th>Keuntungan</th>
                  <th>Status</th>
                  <th>Bayar</th>
                  <th>Tgl Masuk</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {data.length === 0
                  ? <tr><td colSpan={11}><EmptyState message="Tidak ada data servis" /></td></tr>
                  : data.map(d => (
                    <tr key={d._id} className={d.isVoid ? 'opacity-40 line-through' : ''}>
                      <td><code className="text-xs font-mono text-primary-600">{d.invoiceNumber}</code></td>
                      <td>
                        <p className="font-semibold text-slate-700 text-sm">{d.customerName}</p>
                        {d.customerPhone && <p className="text-xs text-slate-400">{d.customerPhone}</p>}
                      </td>
                      <td className="text-sm">{d.deviceBrand} {d.deviceModel}</td>
                      <td className="text-sm max-w-[160px] truncate" title={d.complaint}>{d.complaint}</td>
                      <td className="text-sm">{formatRupiah(d.partsCost)}</td>
                      <td className="text-sm">{formatRupiah(d.serviceFee)}</td>
                      <td className={(d.profit||0) >= 0 ? "font-bold text-green-600" : "font-bold text-red-500"}>{formatRupiah(d.profit||0)}</td>
                      <td>
                        {!d.isVoid ? (
                          <select value={d.status}
                            onChange={e => handleStatusQuick(d._id, e.target.value)}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white cursor-pointer">
                            {STATUS_LIST.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                          </select>
                        ) : <StatusBadge status={d.status} />}
                      </td>
                      <td>
                        <span className={`text-xs font-bold ${d.isPaid ? 'text-green-600' : 'text-orange-500'}`}>
                          {d.isPaid ? '✓ Lunas' : '⏳ Belum'}
                        </span>
                      </td>
                      <td className="text-xs text-slate-400">{formatDate(d.receivedAt)}</td>
                      <td>
                        <button onClick={() => openDetail(d)} className="btn btn-outline py-1 px-2 text-xs">
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ServiceFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} editData={editData} />
      <ServiceDetailModal
        open={detailOpen} onClose={() => setDetailOpen(false)}
        data={detailData} onEdit={() => openEdit(detailData)}
        onVoid={() => setVoidConfirm(true)} isAdmin={isAdmin}
      />
      <ConfirmDialog
        open={voidConfirm} onClose={() => setVoidConfirm(false)} onConfirm={handleVoid}
        title="Batalkan Transaksi?" message={`Void ${detailData?.invoiceNumber}?`} confirmLabel="Ya, Void" danger
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Tab: Keuangan Servis
// ══════════════════════════════════════════════════════════════
function TabKeuangan({ isAdmin }) {
  const [finance, setFinance]   = useState([]);
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState(defaultFinForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [delConfirm, setDelConfirm] = useState(null);
  const [editData, setEditData]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, s] = await Promise.all([serviceAPI.getFinance(), serviceAPI.getSummary()]);
      setFinance(f.data.data || []);
      setSummary(s.data.data);
    } catch { toast.error('Gagal memuat data keuangan'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.description.trim()) return toast.error('Keterangan wajib diisi');
    if (!form.amount || form.amount <= 0) return toast.error('Nominal harus lebih dari 0');
    setSaving(true);
    try {
      if (editData) {
        await serviceAPI.updateFinance(editData._id, form);
        toast.success('Catatan diperbarui');
      } else {
        await serviceAPI.createFinance(form);
        toast.success('Catatan disimpan');
      }
      setModalOpen(false);
      setForm(defaultFinForm);
      setEditData(null);
      load();
    } catch { toast.error('Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const handleEdit = (f) => {
    setEditData(f);
    setForm({
      type: f.type,
      description: f.description,
      category: f.category,
      amount: f.amount,
      date: f.date?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    });
    setModalOpen(true);
  };

  const handleDelete = async () => {
    try {
      await serviceAPI.deleteFinance(delConfirm._id);
      toast.success('Dihapus');
      setDelConfirm(null);
      load();
    } catch { toast.error('Gagal menghapus'); }
  };

  return (
    <div className="min-w-0">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Kas Tunai Servis',  val: summary.omset,        color: 'blue',
              sub: 'Total bayar pelanggan masuk' },
            { label: 'Total Pengeluaran', val: summary.totalExpense,  color: 'orange',
              sub: 'Sparepart & operasional' },
            { label: 'Laba Bersih',       val: summary.omsetMurni - summary.totalExpense,
              color: (summary.omsetMurni - summary.totalExpense) >= 0 ? 'green' : 'red',
              sub: 'Kas Tunai − Pengeluaran' },
          ].map(({ label, val, color, sub }) => {
            const colorMap = {
              blue:   'bg-blue-50 border-blue-100 text-blue-700',
              green:  'bg-green-50 border-green-100 text-green-700',
              orange: 'bg-orange-50 border-orange-100 text-orange-700',
              red:    'bg-red-50 border-red-100 text-red-600',
            };
            return (
              <div key={label} className={`rounded-xl border p-3 min-w-0 ${colorMap[color]}`}>
                <p className="text-xs font-semibold text-slate-500 mb-1 truncate">{label}</p>
                <p className="text-sm font-bold truncate">{formatRupiah(val)}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Header + tombol tambah */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold text-slate-700">Catatan Keuangan Servis</h3>
        <button className="btn btn-primary py-2 px-3 text-xs flex-shrink-0" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> <span className="hidden sm:inline">Tambah </span>Catatan
        </button>
      </div>

      {loading ? <Loader /> : (
        <>
          {/* Desktop / tablet — tabel */}
          <div className="card hidden sm:block">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Tipe</th>
                    <th>Kategori</th>
                    <th>Keterangan</th>
                    <th className="text-right">Nominal</th>
                    {isAdmin && <th></th>}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {finance.length === 0
                    ? <tr><td colSpan={6}><EmptyState message="Belum ada catatan keuangan servis" /></td></tr>
                    : finance.map(f => (
                      <tr key={f._id}>
                        <td className="text-xs text-slate-400">{formatDate(f.date)}</td>
                        <td>
                          <span className={`badge ${f.type === 'pemasukan' ? 'badge-green' : 'badge-red'}`}>
                            {f.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}
                          </span>
                        </td>
                        <td className="text-xs text-slate-500 capitalize">{f.category}</td>
                        <td className="text-sm text-slate-700">{f.description}</td>
                        <td className={`text-right font-bold text-sm ${f.type === 'pemasukan' ? 'text-green-600' : 'text-red-500'}`}>
                          {f.type === 'pemasukan' ? '+' : '-'}{formatRupiah(f.amount)}
                        </td>
                        {isAdmin && (
                          <td>
                            <div className="flex gap-1">
                              <button onClick={() => handleEdit(f)} className="btn btn-outline py-1 px-2 text-xs text-blue-500">
                                <Pencil size={12} />
                              </button>
                              <button onClick={() => setDelConfirm(f)} className="btn btn-outline py-1 px-2 text-xs text-red-500">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile — kartu */}
          <div className="sm:hidden space-y-2">
            {finance.length === 0
              ? <div className="card"><EmptyState message="Belum ada catatan keuangan servis" /></div>
              : finance.map(f => (
                <div key={f._id} className="card !p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className={`badge ${f.type === 'pemasukan' ? 'badge-green' : 'badge-red'} flex-shrink-0`}>
                      {f.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}
                    </span>
                    <p className="text-[11px] text-slate-400 flex-shrink-0">{formatDate(f.date)}</p>
                  </div>
                  <p className="text-sm text-slate-700 mb-0.5">{f.description}</p>
                  <p className="text-[11px] text-slate-500 capitalize mb-2">Kategori: {f.category}</p>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <span className={`font-bold text-base ${f.type === 'pemasukan' ? 'text-green-600' : 'text-red-500'}`}>
                      {f.type === 'pemasukan' ? '+' : '-'}{formatRupiah(f.amount)}
                    </span>
                    {isAdmin && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => handleEdit(f)} className="btn btn-outline py-1.5 px-2.5 text-xs text-blue-500">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setDelConfirm(f)} className="btn btn-outline py-1.5 px-2.5 text-xs text-red-500">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        </>
      )}

      {/* Modal tambah catatan */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditData(null); setForm(defaultFinForm); }} title={editData ? 'Edit Catatan Keuangan' : 'Tambah Catatan Keuangan Servis'} size="sm">
        <div className="space-y-3">
          <div>
            <label className="label">Tipe</label>
            <div className="flex gap-2">
              {['pengeluaran', 'pemasukan'].map(t => (
                <button key={t} onClick={() => setF('type', t)}
                  className={`flex-1 btn py-2 text-sm ${form.type === t ? 'btn-primary' : 'btn-outline'}`}>
                  {t === 'pemasukan' ? '+ Pemasukan' : '− Pengeluaran'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Keterangan *</label>
            <input className="input" placeholder="Beli LCD, beli solder, dll..." value={form.description} onChange={e => setF('description', e.target.value)} />
          </div>
          <div>
            <label className="label">Kategori</label>
            <select className="input" value={form.category} onChange={e => setF('category', e.target.value)}>
              {FINANCE_CATS.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Nominal *</label>
            <RupiahInput value={form.amount} onChange={v => setF('amount', v)} />
          </div>
          <div>
            <label className="label">Tanggal</label>
            <input className="input" type="date" value={form.date} onChange={e => setF('date', e.target.value)} />
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
            <button className="btn btn-outline w-full sm:w-auto" onClick={() => setModalOpen(false)}>Batal</button>
            <button className="btn btn-primary w-full sm:w-auto" onClick={handleSave} disabled={saving}>
              {saving ? 'Menyimpan...' : editData ? 'Update' : 'Simpan'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!delConfirm} onClose={() => setDelConfirm(null)} onConfirm={handleDelete}
        title="Hapus Catatan?" message={`Hapus "${delConfirm?.description}"?`} confirmLabel="Hapus" danger
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════
// TAB CLOSING SERVICE
// ══════════════════════════════════════════════════════════════
function TabArsip() {
  const [arsipList, setArsipList] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [detail, setDetail]       = useState(null);
  const [loadingD, setLoadingD]   = useState(false);

  useEffect(() => { loadArsip(); }, []);

  async function loadArsip() {
    setLoading(true);
    try {
      const res = await serviceAPI.getArsipList();
      setArsipList(res.data.data || []);
    } catch(e) {} finally { setLoading(false); }
  }

  async function loadDetail(bulan, tahun) {
    setLoadingD(true);
    try {
      const res = await serviceAPI.getArsipDetail(bulan, tahun);
      setDetail(res.data.data);
    } catch(e) {} finally { setLoadingD(false); }
  }

  return (
    <div className="space-y-5 min-w-0">
      <div className="card min-w-0">
        <h3 className="font-bold text-slate-800 mb-1">📦 Arsip Transaksi Service</h3>
        <p className="text-xs text-slate-400 mb-4">Transaksi bulan-bulan sebelumnya — otomatis tersimpan saat berganti bulan</p>
        {loading ? <Loader /> : arsipList.length === 0 ? (
          <EmptyState message="Belum ada arsip" />
        ) : (
          <div className="space-y-3">
            {arsipList.map(a => (
              <div key={`${a.bulan}-${a.tahun}`}
                className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                onClick={() => loadDetail(a.bulan, a.tahun)}>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800 text-sm sm:text-base truncate">{a.label}</p>
                  <p className="text-[11px] sm:text-xs text-slate-400">{a.jumlahTx} transaksi</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-green-600 text-sm sm:text-base">{formatRupiah(a.laba)}</p>
                  <p className="text-[11px] sm:text-xs text-slate-400">Laba Kotor</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Detail Arsip */}
      {detail && (
        <Modal open={!!detail} onClose={() => setDetail(null)} title={`Arsip ${detail.label}`} size="lg">
          {loadingD ? <Loader /> : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
                <div className="card py-3 text-center bg-blue-50">
                  <p className="text-[11px] sm:text-xs text-slate-400">Omset</p>
                  <p className="font-bold text-blue-600 text-xs sm:text-sm">{formatRupiah(detail.omset)}</p>
                </div>
                <div className="card py-3 text-center bg-green-50">
                  <p className="text-[11px] sm:text-xs text-slate-400">Laba Kotor</p>
                  <p className="font-bold text-green-600 text-xs sm:text-sm">{formatRupiah(detail.laba)}</p>
                </div>
                <div className="card py-3 text-center bg-red-50">
                  <p className="text-[11px] sm:text-xs text-slate-400">Pengeluaran</p>
                  <p className="font-bold text-red-500 text-xs sm:text-sm">{formatRupiah(detail.totalExpense)}</p>
                </div>
                <div className="card py-3 text-center bg-purple-50">
                  <p className="text-[11px] sm:text-xs text-slate-400">Laba Bersih</p>
                  <p className={`font-bold text-xs sm:text-sm ${detail.labaBersih >= 0 ? 'text-purple-600' : 'text-red-500'}`}>{formatRupiah(detail.labaBersih)}</p>
                </div>
              </div>

              {/* Desktop / tablet — tabel */}
              <div className="overflow-x-auto hidden sm:block">
                <table className="w-full text-sm">
                  <thead><tr className="border-b">
                    <th className="text-left py-2">Invoice</th>
                    <th className="text-left py-2">Pelanggan</th>
                    <th className="text-left py-2">Device</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-right py-2">Bayar</th>
                    <th className="text-right py-2">Biaya</th>
                  </tr></thead>
                  <tbody>
                    {(detail.transactions || []).map(t => (
                      <tr key={t._id} className="border-b hover:bg-slate-50">
                        <td className="py-2 font-mono text-xs">{t.invoiceNumber}</td>
                        <td className="py-2">{t.customerName}</td>
                        <td className="py-2 text-xs">{t.deviceBrand} {t.deviceModel}</td>
                        <td className="py-2"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.status === 'diambil' ? 'bg-green-100 text-green-700' : t.status === 'batal' ? 'bg-red-100 text-red-500' : 'bg-yellow-100 text-yellow-700'}`}>{t.status}</span></td>
                        <td className="py-2 text-right text-xs">{t.isPaid ? '✅ Lunas' : '⏳ Belum'}</td>
                        <td className="py-2 text-right font-semibold">{formatRupiah(t.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile — kartu */}
              <div className="sm:hidden space-y-2">
                {(detail.transactions || []).map(t => (
                  <div key={t._id} className="p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <code className="text-xs font-mono text-slate-500 truncate">{t.invoiceNumber}</code>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${t.status === 'diambil' ? 'bg-green-100 text-green-700' : t.status === 'batal' ? 'bg-red-100 text-red-500' : 'bg-yellow-100 text-yellow-700'}`}>{t.status}</span>
                    </div>
                    <p className="font-semibold text-sm text-slate-700 truncate">{t.customerName}</p>
                    <p className="text-[11px] text-slate-500 mb-2 truncate">{t.deviceBrand} {t.deviceModel}</p>
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200">
                      <p className="text-[11px]">{t.isPaid ? '✅ Lunas' : '⏳ Belum'}</p>
                      <p className="font-bold text-sm">{formatRupiah(t.totalCost)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════
// Sparepart Items Field — builder item sparepart di form transaksi
// ══════════════════════════════════════════════════════════════
function SparepartItemsField({ items, onChange }) {
  const [showPicker, setShowPicker]   = useState(false);
  const [pickMode, setPickMode]       = useState(null); // 'stok' | 'eksternal'
  const [stockList, setStockList]     = useState([]);
  const [loadingStok, setLoadingStok] = useState(false);
  const [stokQuery, setStokQuery]     = useState('');
  const [draft, setDraft]             = useState(null); // item sedang disusun

  const total = (items || []).reduce(
    (s, it) => s + (Number(it.hargaBeli) || 0) * (Number(it.qty) || 0),
    0
  );

  const openPicker = () => { setShowPicker(true); setPickMode(null); setDraft(null); setStokQuery(''); };
  const closePicker = () => { setShowPicker(false); setPickMode(null); setDraft(null); };

  // Load stok sparepart saat user pilih mode "Dari Stok"
  useEffect(() => {
    if (pickMode !== 'stok') return;
    let cancelled = false;
    setLoadingStok(true);
    sparepartAPI.getAll()
      .then(r => { if (!cancelled) setStockList(r.data?.data || []); })
      .catch(() => { if (!cancelled) setStockList([]); })
      .finally(() => { if (!cancelled) setLoadingStok(false); });
    return () => { cancelled = true; };
  }, [pickMode]);

  const filteredStok = useMemo(() => {
    const q = stokQuery.trim().toLowerCase();
    const base = stockList.filter(s => s.isActive !== false);
    if (!q) return base;
    return base.filter(s =>
      (s.nama || '').toLowerCase().includes(q) ||
      (s.kategori || '').toLowerCase().includes(q)
    );
  }, [stockList, stokQuery]);

  function pickFromStok(sp) {
    setDraft({
      source: 'stok', sparepartId: sp._id,
      nama: sp.nama,
      qty: 1,
      hargaBeli: sp.hargaBeli || 0,
      hargaJual: sp.hargaJual || 0,
      satuan: sp.satuan || '',
      _stokTersedia: sp.stok || 0,
    });
  }

  function startEksternal() {
    setDraft({
      source: 'eksternal', sparepartId: null,
      nama: '', qty: 1, hargaBeli: 0, hargaJual: 0, satuan: '',
    });
  }

  function commitDraft() {
    if (!draft) return;
    if (!draft.nama?.trim()) return toast.error('Nama item wajib diisi');
    if (!draft.qty || Number(draft.qty) <= 0) return toast.error('Qty harus > 0');
    if (draft.source === 'stok' && Number(draft.qty) > Number(draft._stokTersedia || 0)) {
      return toast.error(`Stok tidak cukup. Tersedia: ${draft._stokTersedia}`);
    }
    const { _stokTersedia, ...clean } = draft;
    onChange([...(items || []), clean]);
    closePicker();
  }

  function removeItem(idx) {
    onChange((items || []).filter((_, i) => i !== idx));
  }

  function updateItem(idx, patch) {
    onChange((items || []).map((it, i) => i === idx ? { ...it, ...patch } : it));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="label !mb-0">Sparepart Digunakan</label>
        <button type="button" onClick={openPicker}
          className="btn btn-outline py-1.5 px-3 text-xs">
          <Plus size={13} /> Tambah Sparepart
        </button>
      </div>

      {(!items || items.length === 0) ? (
        <div className="text-xs text-slate-400 italic bg-slate-50 border border-dashed border-slate-200 rounded-xl px-3 py-4 text-center">
          Belum ada sparepart. Klik tombol di atas untuk menambahkan.
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="divide-y divide-slate-100">
            {items.map((it, idx) => {
              const subtotal = (Number(it.hargaBeli) || 0) * (Number(it.qty) || 0);
              return (
                <div key={idx} className="px-3 py-2 bg-white">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm text-slate-700 truncate">{it.nama}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          it.source === 'stok' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {it.source === 'stok' ? 'STOK' : 'EKSTERNAL'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-1.5">
                        <div>
                          <p className="text-[10px] text-slate-400">Qty</p>
                          <input type="number" min="1" step="1"
                            className="input !py-1 !px-2 text-xs"
                            value={it.qty}
                            onChange={e => updateItem(idx, { qty: e.target.value })}
                          />
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400">Harga Jual</p>
                          <RupiahInput
                            value={it.hargaJual}
                            onChange={v => updateItem(idx, { hargaJual: v })}
                          />
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400">Subtotal</p>
                          <p className="text-xs font-bold text-slate-700 mt-1.5">{formatRupiah(subtotal)}</p>
                        </div>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeItem(idx)}
                      className="text-red-500 hover:bg-red-50 rounded-lg p-1.5 flex-shrink-0" title="Hapus">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-t border-slate-200">
            <span className="text-xs font-semibold text-slate-600">Total Biaya Sparepart</span>
            <span className="text-sm font-bold text-primary-600">{formatRupiah(total)}</span>
          </div>
        </div>
      )}

      {/* Picker Modal */}
      <Modal open={showPicker} onClose={closePicker} title="Tambah Sparepart" size="md">
        {!pickMode && !draft && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Pilih sumber sparepart:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button type="button" onClick={() => setPickMode('stok')}
                className="group border-2 border-slate-200 hover:border-primary-500 hover:bg-primary-50 rounded-xl p-4 text-left transition-all">
                <Boxes className="text-primary-600 mb-2" size={22} />
                <p className="font-bold text-slate-800 text-sm">Dari Stok</p>
                <p className="text-xs text-slate-500 mt-0.5">Pilih item dari stok sparepart yang ada, stok otomatis berkurang.</p>
              </button>
              <button type="button" onClick={() => { setPickMode('eksternal'); startEksternal(); }}
                className="group border-2 border-slate-200 hover:border-amber-500 hover:bg-amber-50 rounded-xl p-4 text-left transition-all">
                <PackagePlus className="text-amber-600 mb-2" size={22} />
                <p className="font-bold text-slate-800 text-sm">Belanja / Eksternal</p>
                <p className="text-xs text-slate-500 mt-0.5">Input manual, untuk sparepart yang baru dibeli khusus servis ini.</p>
              </button>
            </div>
          </div>
        )}

        {pickMode === 'stok' && !draft && (
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" placeholder="Cari sparepart..."
                value={stokQuery} onChange={e => setStokQuery(e.target.value)} />
            </div>
            {loadingStok ? <Loader /> : filteredStok.length === 0 ? (
              <EmptyState message="Tidak ada sparepart di stok" />
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {filteredStok.map(sp => (
                  <button key={sp._id} type="button" onClick={() => pickFromStok(sp)}
                    className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-slate-700 truncate">{sp.nama}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {sp.kategori || '—'} · Stok: <span className={`font-bold ${sp.stok > 0 ? 'text-green-600' : 'text-red-500'}`}>{sp.stok}</span> {sp.satuan || ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-slate-400">Jual</p>
                        <p className="text-sm font-bold text-primary-600">{formatRupiah(sp.hargaJual || 0)}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={() => setPickMode(null)} className="btn btn-outline w-full">
              Kembali
            </button>
          </div>
        )}

        {draft && (
          <div className="space-y-3">
            {draft.source === 'eksternal' ? (
              <div>
                <label className="label">Nama Sparepart *</label>
                <input className="input" placeholder="LCD iPhone 11, Baterai Oppo A5s..."
                  value={draft.nama}
                  onChange={e => setDraft(d => ({ ...d, nama: e.target.value }))} />
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs text-blue-500">Sparepart dari stok</p>
                <p className="font-bold text-blue-800">{draft.nama}</p>
                <p className="text-[11px] text-blue-500 mt-0.5">
                  Stok tersedia: <span className="font-bold">{draft._stokTersedia}</span> {draft.satuan}
                </p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="label">Qty *</label>
                <input type="number" min="1" step="1" className="input"
                  value={draft.qty}
                  onChange={e => setDraft(d => ({ ...d, qty: e.target.value }))} />
              </div>
              <div>
                <label className="label">Harga Beli</label>
                <RupiahInput value={draft.hargaBeli}
                  onChange={v => setDraft(d => ({ ...d, hargaBeli: v }))} />
              </div>
              <div>
                <label className="label">Harga Jual</label>
                <RupiahInput value={draft.hargaJual}
                  onChange={v => setDraft(d => ({ ...d, hargaJual: v }))} />
              </div>
            </div>
            {draft.source === 'eksternal' && (
              <div>
                <label className="label">Satuan</label>
                <input className="input" placeholder="pcs, unit, set..."
                  value={draft.satuan}
                  onChange={e => setDraft(d => ({ ...d, satuan: e.target.value }))} />
              </div>
            )}
            <div className="bg-slate-50 rounded-xl px-3 py-2 flex items-center justify-between">
              <span className="text-xs text-slate-500">Subtotal</span>
              <span className="font-bold text-primary-600">
                {formatRupiah((Number(draft.hargaJual) || 0) * (Number(draft.qty) || 0))}
              </span>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button type="button" onClick={() => setDraft(null)}
                className="btn btn-outline">Kembali</button>
              <button type="button" onClick={commitDraft}
                className="btn btn-primary">
                <Plus size={14} /> Tambahkan
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Modal Form Sparepart (tambah / edit)
// ══════════════════════════════════════════════════════════════
const defaultSparepart = {
  nama: '', kategori: '', hargaBeli: 0, hargaJual: 0, stok: 0, satuan: 'pcs',
};

function SparepartFormModal({ open, onClose, onSaved, editData }) {
  const [form, setForm]     = useState(defaultSparepart);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editData ? {
        nama:      editData.nama      || '',
        kategori:  editData.kategori  || '',
        hargaBeli: editData.hargaBeli || 0,
        hargaJual: editData.hargaJual || 0,
        stok:      editData.stok      || 0,
        satuan:    editData.satuan    || 'pcs',
      } : defaultSparepart);
    }
  }, [open, editData]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.nama.trim()) return toast.error('Nama sparepart wajib diisi');
    setSaving(true);
    try {
      // Saat edit, field "stok" tidak dikirim: tambah stok lewat endpoint
      // khusus /add-stock supaya backend bisa log pergerakan.
      const payload = editData
        ? { nama: form.nama, kategori: form.kategori, hargaBeli: Number(form.hargaBeli) || 0, hargaJual: Number(form.hargaJual) || 0, satuan: form.satuan }
        : { ...form, hargaBeli: Number(form.hargaBeli) || 0, hargaJual: Number(form.hargaJual) || 0, stok: Number(form.stok) || 0 };
      if (editData) {
        await sparepartAPI.update(editData._id, payload);
        toast.success('Sparepart diperbarui');
      } else {
        await sparepartAPI.create(payload);
        toast.success('Sparepart ditambahkan');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    } finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={editData ? 'Edit Sparepart' : 'Tambah Sparepart'} size="sm">
      <div className="space-y-3">
        <div>
          <label className="label">Nama Sparepart *</label>
          <input className="input" placeholder="LCD iPhone 11, Baterai Oppo..."
            value={form.nama} onChange={e => set('nama', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Kategori</label>
            <input className="input" placeholder="LCD, Baterai, Konektor..."
              value={form.kategori} onChange={e => set('kategori', e.target.value)} />
          </div>
          <div>
            <label className="label">Satuan</label>
            <input className="input" placeholder="pcs, unit, set"
              value={form.satuan} onChange={e => set('satuan', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Harga Beli</label>
            <RupiahInput value={form.hargaBeli} onChange={v => set('hargaBeli', v)} />
          </div>
          <div>
            <label className="label">Harga Jual</label>
            <RupiahInput value={form.hargaJual} onChange={v => set('hargaJual', v)} />
          </div>
        </div>
        {!editData && (
          <div>
            <label className="label">Stok Awal</label>
            <input type="number" min="0" step="1" className="input"
              value={form.stok} onChange={e => set('stok', e.target.value)} />
            <p className="text-[11px] text-slate-400 mt-1">
              Untuk menambah stok di kemudian hari, gunakan tombol "Tambah Stok" di daftar.
            </p>
          </div>
        )}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
          <button className="btn btn-outline w-full sm:w-auto" onClick={onClose}>Batal</button>
          <button className="btn btn-primary w-full sm:w-auto" onClick={handleSave} disabled={saving}>
            {saving ? 'Menyimpan...' : editData ? 'Simpan Perubahan' : 'Tambah'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// Modal Tambah Stok Sparepart
// ══════════════════════════════════════════════════════════════
function AddStockModal({ open, onClose, onSaved, sparepart }) {
  const [jumlah, setJumlah] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setJumlah(''); }, [open]);

  async function handleSave() {
    const n = Number(jumlah);
    if (!n || n <= 0) return toast.error('Jumlah harus lebih dari 0');
    setSaving(true);
    try {
      await sparepartAPI.addStock(sparepart._id, n);
      toast.success(`Stok ${sparepart.nama} +${n}`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal tambah stok');
    } finally { setSaving(false); }
  }

  if (!sparepart) return null;
  return (
    <Modal open={open} onClose={onClose} title="Tambah Stok" size="sm">
      <div className="space-y-3">
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-xs text-slate-400">Sparepart</p>
          <p className="font-bold text-slate-800">{sparepart.nama}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Stok sekarang: <span className="font-bold text-slate-700">{sparepart.stok}</span> {sparepart.satuan || ''}
          </p>
        </div>
        <div>
          <label className="label">Jumlah Ditambahkan *</label>
          <input type="number" min="1" step="1" autoFocus
            className="input" value={jumlah}
            onChange={e => setJumlah(e.target.value)} />
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
          <button className="btn btn-outline w-full sm:w-auto" onClick={onClose}>Batal</button>
          <button className="btn btn-primary w-full sm:w-auto" onClick={handleSave} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Tambah Stok'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// Tab: Stok Sparepart
// ══════════════════════════════════════════════════════════════
function TabSparepart({ isAdmin }) {
  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData]   = useState(null);
  const [stockFor, setStockFor]   = useState(null);
  const [delConfirm, setDelConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = showInactive ? { includeInactive: true } : {};
      const r = await sparepartAPI.getAll(params);
      setData(r.data?.data || []);
    } catch { toast.error('Gagal memuat sparepart'); }
    finally { setLoading(false); }
  }, [showInactive]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(s =>
      (s.nama || '').toLowerCase().includes(q) ||
      (s.kategori || '').toLowerCase().includes(q)
    );
  }, [data, search]);

  async function handleDelete() {
    if (!delConfirm) return;
    try {
      await sparepartAPI.delete(delConfirm._id);
      toast.success('Sparepart dinonaktifkan');
      setDelConfirm(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menonaktifkan');
    }
  }

  const openNew  = () => { setEditData(null); setModalOpen(true); };
  const openEdit = (d) => { setEditData(d); setModalOpen(true); };

  // Summary ringan
  const totalItem   = data.length;
  const totalStok   = data.reduce((s, x) => s + (Number(x.stok) || 0), 0);
  const totalModal  = data.reduce((s, x) => s + (Number(x.stok) || 0) * (Number(x.hargaBeli) || 0), 0);
  const lowStok     = data.filter(x => (Number(x.stok) || 0) <= 2 && x.isActive !== false).length;

  return (
    <div className="min-w-0">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
        <div className="card py-3 px-2 text-center min-w-0">
          <p className="text-[11px] sm:text-xs text-slate-400 truncate">Jumlah Item</p>
          <p className="font-bold text-slate-700 text-xs sm:text-sm">{totalItem}</p>
        </div>
        <div className="card py-3 px-2 text-center min-w-0">
          <p className="text-[11px] sm:text-xs text-slate-400 truncate">Total Stok</p>
          <p className="font-bold text-blue-600 text-xs sm:text-sm">{totalStok}</p>
        </div>
        <div className="card py-3 px-2 text-center min-w-0 bg-amber-50 border-amber-100">
          <p className="text-[11px] sm:text-xs text-amber-500 truncate">Nilai Modal</p>
          <p className="font-bold text-amber-700 text-xs sm:text-sm truncate">{formatRupiah(totalModal)}</p>
        </div>
        <div className={`card py-3 px-2 text-center min-w-0 ${lowStok > 0 ? 'bg-red-50 border-red-100' : ''}`}>
          <p className={`text-[11px] sm:text-xs truncate ${lowStok > 0 ? 'text-red-400' : 'text-slate-400'}`}>Stok Menipis</p>
          <p className={`font-bold text-xs sm:text-sm ${lowStok > 0 ? 'text-red-600' : 'text-slate-700'}`}>{lowStok} item</p>
        </div>
      </div>

      {/* Filter & action */}
      <div className="card mb-4 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-center min-w-0">
        <div className="relative flex-1 min-w-0 sm:min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Cari nama, kategori..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button
          onClick={() => setShowInactive(v => !v)}
          className={`btn py-2 px-3 text-xs flex-shrink-0 ${showInactive ? 'btn-primary' : 'btn-outline'}`}>
          {showInactive ? <Eye size={14} /> : <EyeOff size={14} />}
          {showInactive ? 'Tampil Nonaktif' : 'Sembunyikan Nonaktif'}
        </button>
        <button className="btn btn-outline py-2 px-3 flex-shrink-0" onClick={load}>
          <RefreshCw size={14} />
        </button>
        <button className="btn btn-primary py-2 px-3 text-xs flex-shrink-0" onClick={openNew}>
          <Plus size={14} /> <span className="hidden sm:inline">Tambah </span>Sparepart
        </button>
      </div>

      {loading ? <Loader /> : (
        <>
          {/* Desktop / tablet — tabel */}
          <div className="card hidden sm:block">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Kategori</th>
                    <th className="text-right">Harga Beli</th>
                    <th className="text-right">Harga Jual</th>
                    <th className="text-right">Stok</th>
                    <th>Satuan</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filtered.length === 0
                    ? <tr><td colSpan={7}><EmptyState message="Belum ada sparepart" /></td></tr>
                    : filtered.map(s => {
                      const inactive = s.isActive === false;
                      const low = (Number(s.stok) || 0) <= 2 && !inactive;
                      return (
                        <tr key={s._id} className={inactive ? 'opacity-50' : ''}>
                          <td>
                            <p className="font-semibold text-slate-700 text-sm">{s.nama}</p>
                            {inactive && <span className="text-[10px] text-red-500 font-bold">NONAKTIF</span>}
                          </td>
                          <td className="text-xs text-slate-500">{s.kategori || '—'}</td>
                          <td className="text-right text-sm">{formatRupiah(s.hargaBeli || 0)}</td>
                          <td className="text-right text-sm font-semibold text-primary-600">{formatRupiah(s.hargaJual || 0)}</td>
                          <td className={`text-right font-bold text-sm ${low ? 'text-red-500' : 'text-slate-700'}`}>
                            {s.stok || 0}
                          </td>
                          <td className="text-xs text-slate-500">{s.satuan || '—'}</td>
                          <td>
                            <div className="flex gap-1 flex-wrap">
                              {!inactive && (
                                <button onClick={() => setStockFor(s)}
                                  className="btn btn-outline py-1 px-2 text-xs text-blue-500" title="Tambah stok">
                                  <PackagePlus size={12} /> Stok
                                </button>
                              )}
                              <button onClick={() => openEdit(s)}
                                className="btn btn-outline py-1 px-2 text-xs" title="Edit">
                                <Pencil size={12} />
                              </button>
                              {isAdmin && !inactive && (
                                <button onClick={() => setDelConfirm(s)}
                                  className="btn btn-outline py-1 px-2 text-xs text-red-500" title="Nonaktifkan">
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  }
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile — kartu */}
          <div className="sm:hidden space-y-2">
            {filtered.length === 0
              ? <div className="card"><EmptyState message="Belum ada sparepart" /></div>
              : filtered.map(s => {
                const inactive = s.isActive === false;
                const low = (Number(s.stok) || 0) <= 2 && !inactive;
                return (
                  <div key={s._id} className={`card !p-3 ${inactive ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-slate-700 truncate">{s.nama}</p>
                        <p className="text-[11px] text-slate-400 truncate">{s.kategori || '—'}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`font-bold text-base ${low ? 'text-red-500' : 'text-slate-700'}`}>
                          {s.stok || 0} <span className="text-xs font-normal text-slate-400">{s.satuan || ''}</span>
                        </p>
                        {inactive && <span className="text-[10px] text-red-500 font-bold">NONAKTIF</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                      <div>
                        <p className="text-[10px] text-slate-400">Harga Beli</p>
                        <p className="text-xs font-semibold">{formatRupiah(s.hargaBeli || 0)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">Harga Jual</p>
                        <p className="text-xs font-bold text-primary-600">{formatRupiah(s.hargaJual || 0)}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 pt-2 mt-2 border-t border-slate-100">
                      {!inactive && (
                        <button onClick={() => setStockFor(s)}
                          className="btn btn-outline py-1.5 px-2.5 text-xs flex-1 text-blue-500">
                          <PackagePlus size={13} /> Tambah Stok
                        </button>
                      )}
                      <button onClick={() => openEdit(s)}
                        className="btn btn-outline py-1.5 px-2.5 text-xs">
                        <Pencil size={13} />
                      </button>
                      {isAdmin && !inactive && (
                        <button onClick={() => setDelConfirm(s)}
                          className="btn btn-outline py-1.5 px-2.5 text-xs text-red-500">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            }
          </div>
        </>
      )}

      <SparepartFormModal
        open={modalOpen} onClose={() => setModalOpen(false)}
        onSaved={load} editData={editData}
      />
      <AddStockModal
        open={!!stockFor} onClose={() => setStockFor(null)}
        onSaved={load} sparepart={stockFor}
      />
      <ConfirmDialog
        open={!!delConfirm} onClose={() => setDelConfirm(null)} onConfirm={handleDelete}
        title="Nonaktifkan Sparepart?"
        message={`Nonaktifkan "${delConfirm?.nama}"? Item tidak hilang, hanya disembunyikan dari daftar aktif.`}
        confirmLabel="Ya, Nonaktifkan" danger
      />
    </div>
  );
}

// Main ServicePage
// ══════════════════════════════════════════════════════════════
export default function ServicePage() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('transaksi');

  return (
    <div className="animate-fade-in-up min-w-0 pb-24 lg:pb-0">
      <PageHeader
        title="Service HP"
        subtitle="Manajemen servis & keuangan bengkel HP"
        actions={
          tab === 'transaksi' && (
            <button className="btn btn-primary" onClick={() => {
              window.dispatchEvent(new CustomEvent('service:new'));
            }}>
              <Plus size={16} /> <span className="hidden sm:inline">Input </span>Servis
            </button>
          )
        }
      />

      {/* Tab bar */}
      <div className="bg-slate-100 p-1 rounded-xl mb-5 overflow-x-auto sm:w-fit">
        <div className="flex gap-1 w-max sm:w-auto">
          {[
            { key: 'transaksi', label: 'Transaksi Servis', icon: Wrench },
            { key: 'keuangan',  label: 'Keuangan Servis',  icon: DollarSign },
            { key: 'sparepart', label: 'Stok Sparepart',   icon: Boxes },
            { key: 'arsip',     label: 'Arsip',             icon: Archive },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                tab === key ? 'bg-white shadow-sm text-primary-700' : 'text-slate-500 hover:text-slate-700'
              }`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'transaksi' && <TabTransaksiWithRef isAdmin={isAdmin} />}
      {tab === 'keuangan'  && <TabKeuangan isAdmin={isAdmin} />}
      {tab === 'sparepart' && <TabSparepart isAdmin={isAdmin} />}
      {tab === 'arsip'     && <TabArsip />}
    </div>
  );
}

// Wrapper untuk menangkap event tombol "Input Servis" dari header
function TabTransaksiWithRef({ isAdmin }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [data, setData]       = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editData, setEditData]     = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [voidConfirm, setVoidConfirm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)       params.search = search;
      if (statusFilter) params.status = statusFilter;
      const [r, s] = await Promise.all([
        serviceAPI.getAll(params),
        serviceAPI.getSummary(),
      ]);
      setData(r.data.data || []);
      setSummary(s.data.data);
    } catch { toast.error('Gagal memuat data'); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Listen event dari tombol header
  useEffect(() => {
    const handler = () => { setEditData(null); setModalOpen(true); };
    window.addEventListener('service:new', handler);
    return () => window.removeEventListener('service:new', handler);
  }, []);

  const openEdit   = (d) => { setEditData(d); setDetailOpen(false); setModalOpen(true); };
  const openDetail = (d) => { setDetailData(d); setDetailOpen(true); };

  const handleVoid = async () => {
    try {
      await serviceAPI.void(detailData._id);
      toast.success('Transaksi dibatalkan');
      setVoidConfirm(false);
      setDetailOpen(false);
      load();
    } catch { toast.error('Gagal membatalkan'); }
  };

  const handleStatusQuick = async (id, status) => {
    try {
      await serviceAPI.update(id, { status, ...(status === 'diambil' ? { isPaid: true } : {}) });
      toast.success(`Status → ${STATUS_MAP[status]?.label}`);
      load();
    } catch { toast.error('Gagal ubah status'); }
  };

  const sc = summary?.statusCount || {};

  return (
    <div className="min-w-0">
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-4">
          <div className="card py-3 px-2 text-center min-w-0">
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">Omset (Lunas)</p>
            <p className="font-bold text-blue-600 text-xs sm:text-sm truncate">{formatRupiah(summary.omsetMurni)}</p>
          </div>
          <div className="card py-3 px-2 text-center min-w-0">
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">Laba Kotor</p>
            <p className="font-bold text-green-600 text-xs sm:text-sm truncate">{formatRupiah(summary.labaKotor)}</p>
          </div>
          <div className="card py-3 px-2 text-center border-yellow-100 bg-yellow-50 min-w-0">
            <p className="text-[11px] sm:text-xs text-yellow-500 truncate">Antrian</p>
            <p className="font-bold text-yellow-700 text-xs sm:text-sm truncate">{sc.antrian || 0} unit</p>
          </div>
          <div className="card py-3 px-2 text-center border-blue-100 bg-blue-50 min-w-0">
            <p className="text-[11px] sm:text-xs text-blue-500 truncate">Proses</p>
            <p className="font-bold text-blue-700 text-xs sm:text-sm truncate">{sc.proses || 0} unit</p>
          </div>
          <div className="card py-3 px-2 text-center border-emerald-100 bg-emerald-50 min-w-0">
            <p className="text-[11px] sm:text-xs text-emerald-500 truncate">Selesai</p>
            <p className="font-bold text-emerald-700 text-xs sm:text-sm truncate">{sc.selesai || 0} unit</p>
          </div>
          <div className="card py-3 px-2 text-center border-slate-100 bg-slate-50 min-w-0">
            <p className="text-[11px] sm:text-xs text-slate-500 truncate">Diambil</p>
            <p className="font-bold text-slate-600 text-xs sm:text-sm truncate">{sc.diambil || 0} unit</p>
          </div>
        </div>
      )}

      <div className="card mb-4 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-center min-w-0">
        <div className="relative flex-1 min-w-0 sm:min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Cari nama, HP, merk, invoice..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap min-w-0 max-w-full">
          {[{ key: '', label: 'Semua' }, ...STATUS_LIST].map(s => (
            <button key={s.key} onClick={() => setStatusFilter(s.key)}
              className={`btn py-1.5 px-3 text-xs flex-shrink-0 whitespace-nowrap ${statusFilter === s.key ? 'btn-primary' : 'btn-outline'}`}>
              {s.label}
            </button>
          ))}
          <button className="btn btn-outline py-2 px-3 flex-shrink-0 sm:hidden" onClick={load}><RefreshCw size={14} /></button>
        </div>
        <button className="btn btn-outline py-2 px-3 hidden sm:inline-flex" onClick={load}><RefreshCw size={14} /></button>
      </div>

      {loading ? <Loader /> : (
        <>
          {/* Desktop / tablet — tabel */}
          <div className="card hidden sm:block">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Pelanggan</th>
                    <th>HP</th>
                    <th>Keluhan</th>
                    <th>Sparepart</th>
                    <th>Biaya Service</th>
                    <th>Keuntungan</th>
                    <th>Status</th>
                    <th>Bayar</th>
                    <th>Tgl Masuk</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {data.length === 0
                    ? <tr><td colSpan={11}><EmptyState message="Belum ada data servis" /></td></tr>
                    : data.map(d => (
                      <tr key={d._id} className={d.isVoid ? 'opacity-40' : ''}>
                        <td><code className="text-xs font-mono text-primary-600">{d.invoiceNumber}</code></td>
                        <td>
                          <p className="font-semibold text-slate-700 text-sm">{d.customerName}</p>
                          {d.customerPhone && <p className="text-xs text-slate-400">{d.customerPhone}</p>}
                        </td>
                        <td className="text-sm text-slate-600">{d.deviceBrand} {d.deviceModel}</td>
                        <td className="text-sm max-w-[160px] truncate text-slate-600" title={d.complaint}>{d.complaint}</td>
                        <td className="text-sm">{formatRupiah(d.partsCost)}</td>
                        <td className="text-sm">{formatRupiah(d.serviceFee)}</td>
                        <td className={(d.profit||0) >= 0 ? "font-bold text-green-600" : "font-bold text-red-500"}>{formatRupiah(d.profit||0)}</td>
                        <td>
                          {!d.isVoid ? (
                            <select value={d.status} onChange={e => handleStatusQuick(d._id, e.target.value)}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white cursor-pointer">
                              {STATUS_LIST.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                            </select>
                          ) : <StatusBadge status={d.status} />}
                        </td>
                        <td>
                          <span className={`text-xs font-bold ${d.isPaid ? 'text-green-600' : 'text-orange-500'}`}>
                            {d.isPaid ? '✓ Lunas' : '⏳ Belum'}
                          </span>
                        </td>
                        <td className="text-xs text-slate-400">{formatDate(d.receivedAt)}</td>
                        <td>
                          <button onClick={() => openDetail(d)} className="btn btn-outline py-1 px-2 text-xs">Detail</button>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile — kartu */}
          <div className="sm:hidden space-y-2">
            {data.length === 0
              ? <div className="card"><EmptyState message="Belum ada data servis" /></div>
              : data.map(d => (
                <div key={d._id} className={`card !p-3 ${d.isVoid ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <code className="text-xs font-mono text-primary-600 truncate">{d.invoiceNumber}</code>
                    <span className={`text-[11px] font-bold flex-shrink-0 ${d.isPaid ? 'text-green-600' : 'text-orange-500'}`}>
                      {d.isPaid ? '✓ Lunas' : '⏳ Belum'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-semibold text-sm text-slate-700 truncate flex-1">{d.customerName}</p>
                    {!d.isVoid ? (
                      <select value={d.status} onChange={e => handleStatusQuick(d._id, e.target.value)}
                        className="text-[11px] border border-slate-200 rounded-lg px-2 py-1 bg-white cursor-pointer flex-shrink-0">
                        {STATUS_LIST.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    ) : <StatusBadge status={d.status} />}
                  </div>
                  {d.customerPhone && <p className="text-[11px] text-slate-400 mb-1">{d.customerPhone}</p>}
                  <p className="text-xs text-slate-600 mb-1">{d.deviceBrand} {d.deviceModel}</p>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-2" title={d.complaint}>{d.complaint}</p>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                    <div>
                      <p className="text-[10px] text-slate-400">Sparepart</p>
                      <p className="text-[11px] font-semibold">{formatRupiah(d.partsCost)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Service</p>
                      <p className="text-[11px] font-semibold">{formatRupiah(d.serviceFee)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400">Untung</p>
                      <p className={`text-[11px] font-bold ${(d.profit||0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatRupiah(d.profit||0)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-slate-100">
                    <p className="text-[11px] text-slate-400">{formatDate(d.receivedAt)}</p>
                    <button onClick={() => openDetail(d)} className="btn btn-outline py-1.5 px-3 text-xs">Detail</button>
                  </div>
                </div>
              ))
            }
          </div>
        </>
      )}

      <ServiceFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={load} editData={editData} />
      <ServiceDetailModal
        open={detailOpen} onClose={() => setDetailOpen(false)}
        data={detailData} onEdit={() => openEdit(detailData)}
        onVoid={() => setVoidConfirm(true)} isAdmin={isAdmin}
      />
      <ConfirmDialog
        open={voidConfirm} onClose={() => setVoidConfirm(false)} onConfirm={handleVoid}
        title="Batalkan Transaksi?" message={`Void ${detailData?.invoiceNumber}?`} confirmLabel="Ya, Void" danger
      />
    </div>
  );
}

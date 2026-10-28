import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { serviceAPI, customerAPI, authAPI, sparepartAPI, servicePriceAPI } from '../services/api';
import { formatRupiah, formatDate, formatDateTime } from '../utils/helpers';
import { PageHeader, Modal, Loader, EmptyState, ConfirmDialog, RupiahInput } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Archive, Pencil } from 'lucide-react';
import {
  Wrench, Plus, Search, RefreshCw, Edit2, Trash2,
  CheckCircle, Clock, AlertCircle, XCircle, Package,
  TrendingUp, TrendingDown, DollarSign, ChevronRight,
  Smartphone, User, Phone, FileText, X, Boxes, PackagePlus, EyeOff, Eye,
  History, ShoppingCart, ChevronLeft, Tag
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
  const { user } = useAuth();
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
            source:      it.source || (it.sparepartId ? 'stok' : 'eksternal'),
            sparepartId: it.sparepartId?._id || it.sparepartId || null,
            name:        it.name || it.nama || '',
            qty:         Number(it.qty) || 1,
            hargaBeli:   Number(it.hargaBeli) || 0,
            hargaJual:   Number(it.hargaJual) || 0,
            satuan:      it.satuan || '',
          }));
        } else if (Number(editData.partsCost) > 0) {
          items = [{
            source: 'eksternal', sparepartId: null,
            name: 'Sparepart', qty: 1,
            hargaBeli: Number(editData.partsCost) || 0,
            hargaJual: Number(editData.partsCost) || 0,
            satuan: '',
          }];
        }
      }
      // Karyawan yang bikin servis baru → default teknisi = dirinya sendiri.
      // Role lain (admin/owner) tetap kosong supaya dipilih manual.
      const defaultTechnician = (!editData && user?.role === 'karyawan')
        ? (user._id || user.id || '')
        : '';
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
      } : { ...defaultForm, technician: defaultTechnician });
    }
  }, [open, editData, user]);

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
      .catch((err) => {
        if (cancelled) return;
        // /auth/users adalah endpoint admin-only; karyawan dapat 403.
        // Fallback: isi list dengan user sendiri supaya dropdown tetap
        // bisa match default technician = user._id.
        const uid = user?._id || user?.id;
        if (err?.response?.status === 403 && user?.role === 'karyawan' && uid) {
          setTechnicianList([{ _id: uid, name: user.name }]);
        } else {
          setTechnicianList([]);
        }
      });
    return () => { cancelled = true; };
  }, [open, user]);

  // Default teknisi untuk karyawan — dipasang SETELAH technicianList ter-fetch.
  // Perlu di sini supaya nilai technician di state match dengan option yang
  // benar-benar ada di dropdown (kalau di-set saat list masih kosong,
  // controlled select bisa tampil "— Belum ditentukan —" karena optionnya
  // belum ada). Mode edit tidak disentuh, dan tidak overwrite kalau user
  // sudah pilih manual.
  useEffect(() => {
    if (editData) return;
    if (user?.role !== 'karyawan') return;
    if (!technicianList.length) return;
    const myId = user._id || user.id;
    if (!myId) return;
    setForm(f => f.technician ? f : { ...f, technician: myId });
  }, [technicianList, user]);

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
      if (!it.name?.trim()) return toast.error('Nama item sparepart wajib diisi');
      if (!it.qty || Number(it.qty) <= 0) return toast.error(`Qty untuk "${it.name}" harus > 0`);
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
          source:      it.source === 'stok' ? 'stok' : 'eksternal',
          name:        it.name,
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
// Tab: Arsip — transaksi "diambil" dari bulan sebelumnya ke bawah.
// Transaksi "diambil" bulan berjalan tetap di Tab Transaksi Servis.
// ══════════════════════════════════════════════════════════════
function TabArsip({ canEdit }) {
  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Ambil semua transaksi status 'diambil', lalu filter frontend:
      // hanya yang createdAt < awal bulan berjalan (= bulan lalu ke bawah).
      const res = await serviceAPI.getAll({ status: 'diambil' });
      const all = res.data?.data || [];
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const archived = all.filter(t => {
        const ts = new Date(t.createdAt || t.receivedAt).getTime();
        return !Number.isNaN(ts) && ts < startOfMonth;
      });
      setData(archived);
    } catch { toast.error('Gagal memuat arsip'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(d =>
      (d.invoiceNumber || '').toLowerCase().includes(q) ||
      (d.customerName  || '').toLowerCase().includes(q) ||
      (d.customerPhone || '').toLowerCase().includes(q) ||
      (d.deviceBrand   || '').toLowerCase().includes(q) ||
      (d.deviceModel   || '').toLowerCase().includes(q)
    );
  }, [data, search]);

  const openEdit = (d) => { setEditData(d); setModalOpen(true); };

  // Summary ringkas untuk arsip
  const totalTx     = data.length;
  const totalOmset  = data.reduce((s, t) => s + (Number(t.serviceFee) || 0), 0);
  const totalProfit = data.reduce((s, t) => s + (Number(t.profit)     || 0), 0);

  return (
    <div className="min-w-0">
      {/* Header kecil */}
      <div className="mb-3">
        <h3 className="font-bold text-slate-800 text-sm sm:text-base">📦 Arsip Transaksi Service</h3>
        <p className="text-[11px] sm:text-xs text-slate-400">
          Transaksi status "Diambil" dari bulan-bulan sebelumnya (bulan berjalan tetap di Tab Transaksi).
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
        <div className="card py-3 px-2 text-center min-w-0">
          <p className="text-[11px] sm:text-xs text-slate-400 truncate">Jumlah Transaksi</p>
          <p className="font-bold text-slate-700 text-xs sm:text-sm">{totalTx}</p>
        </div>
        <div className="card py-3 px-2 text-center min-w-0">
          <p className="text-[11px] sm:text-xs text-slate-400 truncate">Total Omset</p>
          <p className="font-bold text-blue-600 text-xs sm:text-sm truncate">{formatRupiah(totalOmset)}</p>
        </div>
        <div className="card py-3 px-2 text-center min-w-0">
          <p className="text-[11px] sm:text-xs text-slate-400 truncate">Total Laba</p>
          <p className={`font-bold text-xs sm:text-sm truncate ${totalProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatRupiah(totalProfit)}
          </p>
        </div>
      </div>

      {/* Search + refresh */}
      <div className="card mb-4 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-center min-w-0">
        <div className="relative flex-1 min-w-0 sm:min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Cari invoice, nama, HP..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-outline py-2 px-3 flex-shrink-0" onClick={load}>
          <RefreshCw size={14} />
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
                    <th>Invoice</th>
                    <th>Pelanggan</th>
                    <th>HP</th>
                    <th>Sparepart</th>
                    <th>Biaya Service</th>
                    <th>Keuntungan</th>
                    <th>Bayar</th>
                    <th>Tgl</th>
                    {canEdit && <th>Aksi</th>}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filtered.length === 0
                    ? <tr><td colSpan={canEdit ? 9 : 8}><EmptyState message="Belum ada arsip transaksi" /></td></tr>
                    : filtered.map(d => (
                      <tr key={d._id}>
                        <td><code className="text-xs font-mono text-primary-600">{d.invoiceNumber}</code></td>
                        <td>
                          <p className="font-semibold text-slate-700 text-sm">{d.customerName}</p>
                          {d.customerPhone && <p className="text-xs text-slate-400">{d.customerPhone}</p>}
                        </td>
                        <td className="text-sm text-slate-600">{d.deviceBrand} {d.deviceModel}</td>
                        <td className="text-sm">{formatRupiah(d.partsCost)}</td>
                        <td className="text-sm">{formatRupiah(d.serviceFee)}</td>
                        <td className={(d.profit || 0) >= 0 ? "font-bold text-green-600" : "font-bold text-red-500"}>
                          {formatRupiah(d.profit || 0)}
                        </td>
                        <td>
                          <span className={`text-xs font-bold ${d.isPaid ? 'text-green-600' : 'text-orange-500'}`}>
                            {d.isPaid ? '✓ Lunas' : '⏳ Belum'}
                          </span>
                        </td>
                        <td className="text-xs text-slate-400">{formatDate(d.createdAt || d.receivedAt)}</td>
                        {canEdit && (
                          <td>
                            <button onClick={() => openEdit(d)}
                              className="btn btn-outline py-1 px-2 text-xs text-blue-500" title="Edit">
                              <Edit2 size={12} /> Edit
                            </button>
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
            {filtered.length === 0
              ? <div className="card"><EmptyState message="Belum ada arsip transaksi" /></div>
              : filtered.map(d => (
                <div key={d._id} className="card !p-3">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <code className="text-xs font-mono text-primary-600 truncate">{d.invoiceNumber}</code>
                    <span className={`text-[11px] font-bold flex-shrink-0 ${d.isPaid ? 'text-green-600' : 'text-orange-500'}`}>
                      {d.isPaid ? '✓ Lunas' : '⏳ Belum'}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-slate-700 truncate">{d.customerName}</p>
                  {d.customerPhone && <p className="text-[11px] text-slate-400 mb-1">{d.customerPhone}</p>}
                  <p className="text-xs text-slate-600 mb-2">{d.deviceBrand} {d.deviceModel}</p>
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
                      <p className={`text-[11px] font-bold ${(d.profit || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {formatRupiah(d.profit || 0)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-slate-100">
                    <p className="text-[11px] text-slate-400">{formatDate(d.createdAt || d.receivedAt)}</p>
                    {canEdit && (
                      <button onClick={() => openEdit(d)} className="btn btn-outline py-1.5 px-3 text-xs text-blue-500">
                        <Edit2 size={13} /> Edit
                      </button>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        </>
      )}

      <ServiceFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
        editData={editData}
      />
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
      name: sp.nama,
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
      name: '', qty: 1, hargaBeli: 0, hargaJual: 0, satuan: '',
    });
  }

  function commitDraft() {
    if (!draft) return;
    if (!draft.name?.trim()) return toast.error('Nama item wajib diisi');
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
                        <span className="font-semibold text-sm text-slate-700 truncate">{it.name}</span>
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
                  value={draft.name}
                  onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs text-blue-500">Sparepart dari stok</p>
                <p className="font-bold text-blue-800">{draft.name}</p>
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
        isActive:  editData.isActive !== false,
      } : { ...defaultSparepart, isActive: true });
    }
  }, [open, editData]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.nama.trim()) return toast.error('Nama sparepart wajib diisi');
    setSaving(true);
    try {
      // Stok TIDAK diubah lewat modal ini — tambah stok hanya via tab Pembelian
      // supaya backend bisa catat log pergerakan.
      const payload = editData
        ? {
            nama: form.nama,
            kategori: form.kategori,
            hargaBeli: Number(form.hargaBeli) || 0,
            hargaJual: Number(form.hargaJual) || 0,
            satuan: form.satuan,
            isActive: !!form.isActive,
          }
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
    <Modal open={open} onClose={onClose} title={editData ? 'Edit Sparepart' : 'Daftarkan Sparepart Baru'} size="sm">
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
        {editData && (
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
        )}
        {!editData && (
          <div>
            <label className="label">Stok Awal</label>
            <input type="number" min="0" step="1" className="input"
              value={form.stok} onChange={e => set('stok', e.target.value)} />
            <p className="text-[11px] text-slate-400 mt-1">
              Untuk menambah stok di kemudian hari, gunakan tab "Pembelian".
            </p>
          </div>
        )}
        {editData && (
          <div className="bg-slate-50 rounded-xl px-3 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Status Aktif</p>
              <p className="text-[11px] text-slate-400">
                {form.isActive
                  ? 'Sparepart tampil di daftar aktif & bisa dipilih di transaksi.'
                  : 'Dinonaktifkan — tersembunyi dari daftar aktif.'}
              </p>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer flex-shrink-0">
              <input type="checkbox" className="w-4 h-4 accent-primary-600"
                checked={!!form.isActive}
                onChange={e => set('isActive', e.target.checked)} />
              <span className={`text-sm font-bold ${form.isActive ? 'text-green-600' : 'text-slate-500'}`}>
                {form.isActive ? 'Aktif' : 'Nonaktif'}
              </span>
            </label>
          </div>
        )}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
          <button className="btn btn-outline w-full sm:w-auto" onClick={onClose}>Batal</button>
          <button className="btn btn-primary w-full sm:w-auto" onClick={handleSave} disabled={saving}>
            {saving ? 'Menyimpan...' : editData ? 'Simpan Perubahan' : 'Daftarkan'}
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
      await sparepartAPI.addStock(sparepart._id, { jumlah: n });
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
// Helper: format tanggal log + komponen Pagination kecil
// ══════════════════════════════════════════════════════════════
function fmtLogDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function PagerBar({ page, setPage, totalPages, total }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2">
      <span className="text-xs text-slate-500">
        Halaman {page} dari {totalPages} ({total} total)
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="btn btn-outline py-1.5 px-3 text-xs disabled:opacity-40 disabled:pointer-events-none">
          <ChevronLeft size={13} /> Prev
        </button>
        <button
          type="button"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="btn btn-outline py-1.5 px-3 text-xs disabled:opacity-40 disabled:pointer-events-none">
          Next <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Modal: SparePartLogModal — riwayat stok (masuk/keluar) per item
// ══════════════════════════════════════════════════════════════
function SparePartLogModal({ open, onClose, sparepart }) {
  const [logs, setLogs]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [jenis, setJenis]           = useState(''); // '' | 'masuk' | 'keluar'
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const limit = 10;

  // Reset state saat modal buka / sparepart ganti / filter jenis berubah
  useEffect(() => {
    if (!open) return;
    setPage(1);
  }, [open, sparepart?._id, jenis]);

  useEffect(() => {
    if (!open || !sparepart?._id) return;
    let cancelled = false;
    setLoading(true);
    const params = { page, limit };
    if (jenis) params.jenis = jenis;
    sparepartAPI.getLogs(sparepart._id, params)
      .then(r => {
        if (cancelled) return;
        setLogs(r.data?.data || []);
        setTotal(r.data?.total || 0);
        setTotalPages(r.data?.totalPages || 0);
      })
      .catch(err => {
        if (cancelled) return;
        console.error('getLogs error', err);
        toast.error('Gagal memuat riwayat');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, sparepart?._id, page, jenis]);

  if (!sparepart) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Riwayat Stok — ${sparepart.nama}`} size="lg">
      <div className="space-y-3">
        {/* Info stok saat ini */}
        <div className="bg-slate-50 rounded-xl px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-slate-500">Stok saat ini</span>
          <span className="font-bold text-slate-700">
            {sparepart.stok || 0} <span className="text-xs font-normal text-slate-400">{sparepart.satuan || ''}</span>
          </span>
        </div>

        {/* Filter jenis */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {[
            { key: '',       label: 'Semua' },
            { key: 'masuk',  label: '📥 Masuk' },
            { key: 'keluar', label: '📤 Keluar' },
          ].map(f => (
            <button key={f.key || 'all'} type="button" onClick={() => setJenis(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                jenis === f.key ? 'bg-white shadow text-primary-700' : 'text-slate-500 hover:text-slate-700'
              }`}>{f.label}</button>
          ))}
        </div>

        {loading ? <Loader /> : logs.length === 0 ? (
          <EmptyState message="Belum ada riwayat" />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden sm:block">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Jenis</th>
                      <th className="text-right">Jumlah</th>
                      <th className="text-right">Stok</th>
                      <th>Keterangan</th>
                      <th>Oleh</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {logs.map(l => (
                      <tr key={l._id}>
                        <td className="text-xs text-slate-500 whitespace-nowrap">{fmtLogDateTime(l.createdAt)}</td>
                        <td>
                          <span className={`badge ${l.jenis === 'masuk' ? 'badge-green' : 'badge-red'}`}>
                            {l.jenis === 'masuk' ? '📥 Masuk' : '📤 Keluar'}
                          </span>
                        </td>
                        <td className={`text-right text-sm font-bold ${l.jenis === 'masuk' ? 'text-green-600' : 'text-red-500'}`}>
                          {l.jenis === 'masuk' ? '+' : '−'}{l.jumlah}
                        </td>
                        <td className="text-right text-xs text-slate-500 whitespace-nowrap">
                          {l.stokSebelum} → <span className="font-bold text-slate-700">{l.stokSesudah}</span>
                        </td>
                        <td className="text-xs text-slate-600">{l.keterangan || '—'}</td>
                        <td className="text-xs text-slate-500">{l.createdBy?.name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile */}
            <div className="sm:hidden space-y-2">
              {logs.map(l => (
                <div key={l._id} className="bg-slate-50 rounded-xl p-2.5">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className={`badge ${l.jenis === 'masuk' ? 'badge-green' : 'badge-red'}`}>
                      {l.jenis === 'masuk' ? '📥 Masuk' : '📤 Keluar'} {l.jumlah}
                    </span>
                    <span className="text-[10px] text-slate-400">{fmtLogDateTime(l.createdAt)}</span>
                  </div>
                  <p className="text-xs text-slate-600 mb-1">{l.keterangan || '—'}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Stok: {l.stokSebelum} → <span className="font-bold text-slate-600">{l.stokSesudah}</span></span>
                    <span>{l.createdBy?.name || '—'}</span>
                  </div>
                </div>
              ))}
            </div>

            <PagerBar page={page} setPage={setPage} totalPages={totalPages} total={total} />
          </>
        )}
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// Modal: InputPembelianModal — input pembelian sparepart multi-item.
// Submit = loop addStock per item.
// ══════════════════════════════════════════════════════════════
function InputPembelianModal({ open, onClose, onSaved }) {
  const [spareList, setSpareList] = useState([]);
  const [items, setItems]         = useState([]);
  const [saving, setSaving]       = useState(false);
  const [rowErrors, setRowErrors] = useState({}); // { [idx]: 'pesan' }

  const emptyRow = () => ({ sparepartId: '', qty: 1, hargaBeli: 0, keterangan: '' });

  // Fetch sparepart list + reset state tiap buka
  useEffect(() => {
    if (!open) return;
    setItems([emptyRow()]);
    setRowErrors({});
    let cancelled = false;
    sparepartAPI.getAll({ includeInactive: false })
      .then(r => { if (!cancelled) setSpareList(r.data?.data || []); })
      .catch(() => { if (!cancelled) setSpareList([]); });
    return () => { cancelled = true; };
  }, [open]);

  const addRow    = () => setItems(arr => [...arr, emptyRow()]);
  const removeRow = (idx) => setItems(arr => arr.length > 1 ? arr.filter((_, i) => i !== idx) : arr);
  const updateRow = (idx, patch) =>
    setItems(arr => arr.map((it, i) => i === idx ? { ...it, ...patch } : it));

  const totalPreview = items.reduce(
    (s, it) => s + (Number(it.hargaBeli) || 0) * (Number(it.qty) || 0),
    0
  );

  function validateAll() {
    const errs = {};
    const seen = new Set();
    items.forEach((it, idx) => {
      if (!it.sparepartId) errs[idx] = 'Pilih sparepart';
      else if (seen.has(it.sparepartId)) errs[idx] = 'Sparepart ini sudah dipilih di baris lain';
      else if (!it.qty || Number(it.qty) < 1) errs[idx] = 'Qty minimal 1';
      else if (Number(it.hargaBeli) < 0) errs[idx] = 'Harga beli tidak boleh negatif';
      if (it.sparepartId) seen.add(it.sparepartId);
    });
    setRowErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validateAll()) return toast.error('Periksa kembali data pembelian');
    setSaving(true);
    const errs = {};
    let okCount = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      try {
        await sparepartAPI.addStock(it.sparepartId, {
          jumlah: Number(it.qty),
          hargaBeli: Number(it.hargaBeli) || 0,
          keterangan: it.keterangan || '',
        });
        okCount++;
      } catch (err) {
        errs[i] = err.response?.data?.message || 'Gagal menyimpan item';
      }
    }
    setSaving(false);
    if (Object.keys(errs).length > 0) {
      setRowErrors(errs);
      toast.error(`${okCount} berhasil, ${Object.keys(errs).length} gagal. Periksa baris error.`);
      // Tetap trigger onSaved kalau ada yang berhasil, supaya tabel refresh partial
      if (okCount > 0) onSaved?.();
      return;
    }
    toast.success(`Pembelian berhasil disimpan (${okCount} item)`);
    onSaved?.();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Input Pembelian Sparepart" size="lg">
      <div className="space-y-3">
        <p className="text-xs text-slate-500">
          Setiap baris akan menambah stok sparepart yang dipilih. Harga beli & keterangan
          disimpan di log pembelian.
        </p>

        {/* List baris item */}
        <div className="space-y-2">
          {items.map((it, idx) => {
            const err = rowErrors[idx];
            return (
              <div key={idx} className={`border rounded-xl p-2.5 ${err ? 'border-red-200 bg-red-50/40' : 'border-slate-200 bg-slate-50/40'}`}>
                <div className="grid grid-cols-12 gap-2 items-end">
                  {/* Sparepart dropdown */}
                  <div className="col-span-12 sm:col-span-5">
                    <label className="label">Sparepart *</label>
                    <select className="input"
                      value={it.sparepartId}
                      onChange={e => updateRow(idx, { sparepartId: e.target.value })}>
                      <option value="">— Pilih sparepart —</option>
                      {spareList.map(s => (
                        <option key={s._id} value={s._id}>
                          {s.nama} (stok: {s.stok || 0})
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Qty */}
                  <div className="col-span-4 sm:col-span-2">
                    <label className="label">Qty *</label>
                    <input type="number" min="1" step="1" className="input"
                      value={it.qty}
                      onChange={e => updateRow(idx, { qty: e.target.value })} />
                  </div>
                  {/* Harga Beli — format rupiah */}
                  <div className="col-span-7 sm:col-span-3">
                    <label className="label">Harga Beli</label>
                    <RupiahInput value={it.hargaBeli}
                      onChange={v => updateRow(idx, { hargaBeli: v })} />
                  </div>
                  {/* Tombol hapus */}
                  <div className="col-span-1 sm:col-span-2 flex justify-end">
                    <button type="button" onClick={() => removeRow(idx)}
                      disabled={items.length <= 1}
                      className="btn btn-outline py-2 px-2 text-red-500 disabled:opacity-30 disabled:pointer-events-none"
                      title="Hapus baris">
                      <X size={14} />
                    </button>
                  </div>
                  {/* Keterangan */}
                  <div className="col-span-12">
                    <label className="label">Keterangan (opsional)</label>
                    <input type="text" className="input"
                      placeholder="misal: Beli di Mangga Dua"
                      value={it.keterangan}
                      onChange={e => updateRow(idx, { keterangan: e.target.value })} />
                  </div>
                </div>
                <div className="flex items-center justify-end pt-2 mt-1 border-t border-slate-100 text-xs">
                  <span className="font-bold text-slate-700">
                    Subtotal: {formatRupiah((Number(it.hargaBeli) || 0) * (Number(it.qty) || 0))}
                  </span>
                </div>
                {err && <p className="text-xs text-red-500 mt-1">⚠ {err}</p>}
              </div>
            );
          })}
        </div>

        {/* Tambah item */}
        <button type="button" onClick={addRow}
          className="btn btn-outline w-full py-2 text-sm">
          <Plus size={14} /> Tambah Item
        </button>

        {/* Total preview */}
        <div className="flex items-center justify-between bg-slate-100 rounded-xl px-3 py-2.5">
          <span className="text-sm font-semibold text-slate-600">Total Modal</span>
          <span className="text-base font-bold text-primary-600">{formatRupiah(totalPreview)}</span>
        </div>

        {/* Action */}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
          <button className="btn btn-outline w-full sm:w-auto" onClick={onClose} disabled={saving}>
            Batal
          </button>
          <button className="btn btn-primary w-full sm:w-auto" onClick={handleSave} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Pembelian'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// Panel: Pembelian — riwayat log pembelian (jenis masuk, agregat)
// ══════════════════════════════════════════════════════════════
function PembelianPanel({ onSparepartChange }) {
  const [data, setData]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [startDate, setStartDate]   = useState('');
  const [endDate, setEndDate]       = useState('');
  const [sparepart, setSparepart]   = useState('');
  const [page, setPage]             = useState(1);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [spareList, setSpareList]   = useState([]);
  const [inputOpen, setInputOpen]   = useState(false);
  const limit = 20;

  const loadSpareList = useCallback(() => {
    let cancelled = false;
    sparepartAPI.getAll({ includeInactive: true })
      .then(r => { if (!cancelled) setSpareList(r.data?.data || []); })
      .catch(() => { if (!cancelled) setSpareList([]); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const cleanup = loadSpareList();
    return cleanup;
  }, [loadSpareList]);

  // Reset page saat filter berubah
  useEffect(() => { setPage(1); }, [startDate, endDate, sparepart]);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit };
    if (startDate) params.startDate = startDate;
    if (endDate)   params.endDate   = endDate;
    if (sparepart) params.sparepart = sparepart;
    sparepartAPI.getLogPembelian(params)
      .then(r => {
        setData(r.data?.data || []);
        setTotal(r.data?.total || 0);
        setTotalPages(r.data?.totalPages || 0);
      })
      .catch(err => {
        console.error('getLogPembelian error', err);
        toast.error('Gagal memuat riwayat pembelian');
      })
      .finally(() => setLoading(false));
  }, [page, startDate, endDate, sparepart]);

  useEffect(() => { load(); }, [load]);

  const reset = () => {
    setStartDate(''); setEndDate(''); setSparepart(''); setPage(1);
  };

  return (
    <div className="min-w-0">
      {/* Header + action */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-bold text-slate-800 text-sm sm:text-base">Riwayat Pembelian</h3>
        <button className="btn btn-primary py-2 px-3 text-xs flex-shrink-0"
          onClick={() => setInputOpen(true)}>
          <ShoppingCart size={14} /> <span className="hidden sm:inline">Input </span>Pembelian
        </button>
      </div>

      {/* Filter row */}
      <div className="card mb-4 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
        <div>
          <label className="label">Dari Tanggal</label>
          <input type="date" className="input" value={startDate}
            onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Sampai Tanggal</label>
          <input type="date" className="input" value={endDate}
            onChange={e => setEndDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Sparepart</label>
          <select className="input" value={sparepart}
            onChange={e => setSparepart(e.target.value)}>
            <option value="">Semua Sparepart</option>
            {spareList.map(s => (
              <option key={s._id} value={s._id}>{s.nama}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline py-2 px-3 text-xs flex-1" onClick={reset}>Reset</button>
          <button className="btn btn-outline py-2 px-3" onClick={load}><RefreshCw size={14} /></button>
        </div>
      </div>

      {loading ? <Loader /> : data.length === 0 ? (
        <div className="card"><EmptyState message="Belum ada riwayat pembelian" /></div>
      ) : (
        <>
          {/* Desktop */}
          <div className="card hidden sm:block">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th className="text-left w-[180px]">Tanggal</th>
                    <th className="text-left min-w-[200px]">Nama Sparepart</th>
                    <th className="text-center w-[120px]">Jumlah Masuk</th>
                    <th className="text-center w-[130px]">Harga Beli</th>
                    <th className="text-center w-[130px]">Total Modal</th>
                    <th className="text-left w-[130px]">Dicatat Oleh</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {data.map(l => {
                    const hb = Number(l.hargaBeli) || 0;
                    const sub = hb * (Number(l.jumlah) || 0);
                    return (
                      <tr key={l._id}>
                        <td className="text-left w-[180px] text-xs text-slate-500 whitespace-nowrap">{fmtLogDateTime(l.createdAt)}</td>
                        <td className="text-left min-w-[200px] text-sm font-semibold text-slate-700">{l.sparepart?.nama || '—'}</td>
                        <td className="text-center w-[120px] text-sm font-bold text-green-600">{l.jumlah}</td>
                        <td className="text-center w-[130px] text-sm">{formatRupiah(hb)}</td>
                        <td className="text-center w-[130px] text-sm">{formatRupiah(sub)}</td>
                        <td className="text-left w-[130px] text-xs text-slate-500">{l.createdBy?.name || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100">
                    <td colSpan={2} className="text-left text-xs text-slate-600 uppercase tracking-wide font-semibold">Total halaman ini</td>
                    <td className="text-center w-[120px] text-sm text-green-700 font-semibold">
                      {data.reduce((s, l) => s + (Number(l.jumlah) || 0), 0)}
                    </td>
                    <td className="text-right w-[130px] font-semibold"></td>
                    <td className="text-center w-[130px] text-sm text-slate-700 font-semibold">
                      {formatRupiah(data.reduce((s, l) => s + (Number(l.hargaBeli) || 0) * (Number(l.jumlah) || 0), 0))}
                    </td>
                    <td className="text-left w-[130px] font-semibold"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Mobile */}
          <div className="sm:hidden space-y-2">
            {data.map(l => {
              const hb = Number(l.hargaBeli) || 0;
              const sub = hb * (Number(l.jumlah) || 0);
              return (
                <div key={l._id} className="card !p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-semibold text-sm text-slate-700 truncate">{l.sparepart?.nama || '—'}</p>
                    <span className="text-[11px] font-bold text-green-600 flex-shrink-0">+{l.jumlah}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{fmtLogDateTime(l.createdAt)}</p>
                  <div className="grid grid-cols-2 gap-2 pt-2 mt-2 border-t border-slate-100 text-[11px]">
                    <div>
                      <span className="text-slate-400">Harga Beli:</span>{' '}
                      <span className="text-slate-600 font-semibold">{hb > 0 ? formatRupiah(hb) : '—'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400">Total Modal:</span>{' '}
                      <span className="text-slate-700 font-bold">{hb > 0 ? formatRupiah(sub) : '—'}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Oleh: {l.createdBy?.name || '—'}</p>
                </div>
              );
            })}
            {/* Footer total untuk mobile */}
            <div className="card !p-3 bg-slate-100 border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600 uppercase tracking-wide">Total halaman ini</span>
                <div className="flex gap-3">
                  <span className="font-bold text-green-700">
                    +{data.reduce((s, l) => s + (Number(l.jumlah) || 0), 0)}
                  </span>
                  <span className="font-bold text-slate-700">
                    {formatRupiah(data.reduce((s, l) => s + (Number(l.hargaBeli) || 0) * (Number(l.jumlah) || 0), 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <PagerBar page={page} setPage={setPage} totalPages={totalPages} total={total} />
        </>
      )}

      <InputPembelianModal
        open={inputOpen}
        onClose={() => setInputOpen(false)}
        onSaved={() => {
          load();
          loadSpareList();
          onSparepartChange?.();
        }}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Tab: Stok Sparepart
// ══════════════════════════════════════════════════════════════
function TabSparepart({ isAdmin }) {
  const [activeSpareTab, setActiveSpareTab] = useState('daftar'); // 'daftar' | 'pembelian'
  const [logFor, setLogFor]       = useState(null); // sparepart yang dilihat log-nya
  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData]   = useState(null);
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
      {/* Sub-tab bar */}
      <div className="bg-slate-100 p-1 rounded-xl mb-4 w-fit">
        <div className="flex gap-1">
          {[
            { key: 'daftar',    label: 'Daftar Stok', icon: Boxes },
            { key: 'pembelian', label: 'Pembelian',   icon: ShoppingCart },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" onClick={() => setActiveSpareTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                activeSpareTab === key ? 'bg-white shadow text-primary-700' : 'text-slate-500 hover:text-slate-700'
              }`}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {activeSpareTab === 'pembelian' ? (
        <PembelianPanel onSparepartChange={load} />
      ) : (
        <>
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
          <Plus size={14} /> <span className="hidden sm:inline">Daftarkan </span>Sparepart
        </button>
      </div>

      {loading ? <Loader /> : (
        <>
          {/* Desktop / tablet — tabel */}
          <div className="card hidden sm:block">
            <div className="table-wrap">
              <table className="table table-fixed w-full">
                <thead>
                  <tr>
                    <th className="text-left min-w-[200px]">Nama</th>
                    <th className="text-left w-[120px]">Kategori</th>
                    <th className="text-center w-[130px]">Harga Beli</th>
                    <th className="text-center w-[130px]">Harga Jual</th>
                    <th className="text-center w-[80px]">Stok</th>
                    <th className="text-center w-[80px]">Satuan</th>
                    <th className="text-center w-[80px]">Aksi</th>
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
                          <td className="text-left min-w-[200px]">
                            <button type="button" onClick={() => setLogFor(s)}
                              className="font-semibold text-slate-700 text-sm text-left hover:text-primary-600 hover:underline inline-flex items-center gap-1"
                              title="Lihat riwayat stok">
                              {s.nama}
                              <History size={11} className="text-slate-400" />
                            </button>
                            {inactive && <div><span className="text-[10px] text-red-500 font-bold">NONAKTIF</span></div>}
                          </td>
                          <td className="text-left w-[120px] text-xs text-slate-500">{s.kategori || '—'}</td>
                          <td className="text-center w-[130px] text-sm">{formatRupiah(s.hargaBeli || 0)}</td>
                          <td className="text-center w-[130px] text-sm font-semibold text-primary-600">{formatRupiah(s.hargaJual || 0)}</td>
                          <td className={`text-center w-[80px] font-bold text-sm ${low ? 'text-red-500' : 'text-slate-700'}`}>
                            {s.stok || 0}
                          </td>
                          <td className="text-center w-[80px] text-xs text-slate-500">{s.satuan || '—'}</td>
                          <td className="text-center w-[80px]">
                            <div className="flex gap-1 flex-wrap justify-center">
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
                        <button type="button" onClick={() => setLogFor(s)}
                          className="font-semibold text-sm text-slate-700 truncate w-full text-left hover:text-primary-600 inline-flex items-center gap-1"
                          title="Lihat riwayat stok">
                          <span className="truncate">{s.nama}</span>
                          <History size={11} className="text-slate-400 flex-shrink-0" />
                        </button>
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
                      <button onClick={() => openEdit(s)}
                        className="btn btn-outline py-1.5 px-2.5 text-xs flex-1">
                        <Pencil size={13} /> Edit
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
        </>
      )}

      <SparepartFormModal
        open={modalOpen} onClose={() => setModalOpen(false)}
        onSaved={load} editData={editData}
      />
      <ConfirmDialog
        open={!!delConfirm} onClose={() => setDelConfirm(null)} onConfirm={handleDelete}
        title="Nonaktifkan Sparepart?"
        message={`Nonaktifkan "${delConfirm?.nama}"? Item tidak hilang, hanya disembunyikan dari daftar aktif.`}
        confirmLabel="Ya, Nonaktifkan" danger
      />
      <SparePartLogModal
        open={!!logFor} onClose={() => setLogFor(null)}
        sparepart={logFor}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Tab Daftar Harga Servis
// ══════════════════════════════════════════════════════════════
function TabDaftarHarga({ canEdit }) {
  const [prices, setPrices]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filterMerek, setFilterMerek] = useState('');
  const [showModal, setShowModal]     = useState(false);
  const [editData, setEditData]       = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Debounce search 300ms
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterMerek)     params.merek  = filterMerek;
      const r = await servicePriceAPI.getAll(params);
      setPrices(r.data?.data || r.data || []);
    } catch { toast.error('Gagal memuat daftar harga'); }
    finally { setLoading(false); }
  }, [debouncedSearch, filterMerek]);

  useEffect(() => { load(); }, [load]);

  // Merek unik untuk dropdown & datalist
  const merekList = useMemo(() => {
    const set = new Set();
    prices.forEach(p => { if (p.merek) set.add(p.merek); });
    return Array.from(set).sort();
  }, [prices]);

  const jenisKerusakanList = useMemo(() => {
    const set = new Set();
    prices.forEach(p => { if (p.jenisKerusakan) set.add(p.jenisKerusakan); });
    return Array.from(set).sort();
  }, [prices]);

  const openNew  = () => { setEditData(null); setShowModal(true); };
  const openEdit = (d) => { setEditData(d); setShowModal(true); };
  const resetFilter = () => { setSearch(''); setFilterMerek(''); };

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await servicePriceAPI.delete(confirmDelete._id);
      toast.success('Harga dihapus');
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus');
    }
  }

  return (
    <div className="min-w-0">
      {/* Filter & action */}
      <div className="card mb-4 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-center min-w-0">
        <div className="relative flex-1 min-w-0 sm:min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Cari tipe HP atau jenis kerusakan..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-[180px] flex-shrink-0"
          value={filterMerek} onChange={e => setFilterMerek(e.target.value)}>
          <option value="">Semua Merek</option>
          {merekList.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <button className="btn btn-outline py-2 px-3 text-xs flex-shrink-0" onClick={resetFilter}>
          <RefreshCw size={14} /> Reset
        </button>
        {canEdit && (
          <button className="btn btn-primary py-2 px-3 text-xs flex-shrink-0" onClick={openNew}>
            <Plus size={14} /> <span className="hidden sm:inline">Tambah </span>Harga
          </button>
        )}
      </div>

      {loading ? <Loader /> : (
        <>
          {/* Desktop / tablet — tabel */}
          <div className="card hidden sm:block">
            <div className="table-wrap">
              <table className="table table-fixed w-full">
                <thead>
                  <tr>
                    <th className="text-left min-w-[160px]">Tipe HP</th>
                    <th className="text-left w-[120px]">Merek</th>
                    <th className="text-left min-w-[160px]">Jenis Kerusakan</th>
                    <th className="text-center w-[130px]">Harga</th>
                    <th className="text-left min-w-[160px]">Keterangan</th>
                    {canEdit && <th className="text-center w-[90px]">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {prices.length === 0
                    ? <tr><td colSpan={canEdit ? 6 : 5}><EmptyState message="Belum ada daftar harga" /></td></tr>
                    : prices.map(p => (
                      <tr key={p._id}>
                        <td className="text-left min-w-[160px] text-sm font-semibold text-slate-700">{p.tipeHP || '—'}</td>
                        <td className="text-left w-[120px]">
                          <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                            {p.merek || '—'}
                          </span>
                        </td>
                        <td className="text-left min-w-[160px] text-sm text-slate-600">{p.jenisKerusakan || '—'}</td>
                        <td className="text-center w-[130px] text-sm font-bold text-primary-600">{formatRupiah(p.harga || 0)}</td>
                        <td className="text-left min-w-[160px] text-xs text-slate-500">{p.keterangan || '—'}</td>
                        {canEdit && (
                          <td className="text-center w-[90px]">
                            <div className="flex gap-1 flex-wrap justify-center">
                              <button onClick={() => openEdit(p)}
                                className="btn btn-outline py-1 px-2 text-xs" title="Edit">
                                <Pencil size={12} />
                              </button>
                              <button onClick={() => setConfirmDelete(p)}
                                className="btn btn-outline py-1 px-2 text-xs text-red-500" title="Hapus">
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
            {prices.length === 0
              ? <div className="card"><EmptyState message="Belum ada daftar harga" /></div>
              : prices.map(p => (
                <div key={p._id} className="card !p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-slate-700 truncate">{p.tipeHP || '—'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold">
                          {p.merek || '—'}
                        </span>
                        <span className="text-[11px] text-slate-500 truncate">{p.jenisKerusakan || '—'}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-base text-primary-600">{formatRupiah(p.harga || 0)}</p>
                    </div>
                  </div>
                  {p.keterangan && (
                    <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 mt-1">{p.keterangan}</p>
                  )}
                  {canEdit && (
                    <div className="flex gap-1 pt-2 mt-2 border-t border-slate-100">
                      <button onClick={() => openEdit(p)}
                        className="btn btn-outline py-1.5 px-2.5 text-xs flex-1">
                        <Pencil size={13} /> Edit
                      </button>
                      <button onClick={() => setConfirmDelete(p)}
                        className="btn btn-outline py-1.5 px-2.5 text-xs text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        </>
      )}

      <ServicePriceModal
        open={showModal} onClose={() => setShowModal(false)}
        onSaved={load} editData={editData}
        merekList={merekList} jenisKerusakanList={jenisKerusakanList}
      />
      <ConfirmDialog
        open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete}
        title="Hapus Daftar Harga?"
        message={`Hapus harga "${confirmDelete?.tipeHP} — ${confirmDelete?.jenisKerusakan}"? Tindakan ini tidak bisa dibatalkan.`}
        confirmLabel="Ya, Hapus" danger
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// Modal Tambah/Edit Daftar Harga
// ══════════════════════════════════════════════════════════════
function ServicePriceModal({ open, onClose, onSaved, editData, merekList, jenisKerusakanList }) {
  const [form, setForm] = useState({
    tipeHP: '', merek: '', jenisKerusakan: '', harga: 0, keterangan: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(editData ? {
        tipeHP:         editData.tipeHP         || '',
        merek:          editData.merek          || '',
        jenisKerusakan: editData.jenisKerusakan || '',
        harga:          editData.harga          || 0,
        keterangan:     editData.keterangan     || '',
      } : { tipeHP: '', merek: '', jenisKerusakan: '', harga: 0, keterangan: '' });
    }
  }, [open, editData]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.tipeHP.trim())         return toast.error('Tipe HP wajib diisi');
    if (!form.merek.trim())          return toast.error('Merek wajib diisi');
    if (!form.jenisKerusakan.trim()) return toast.error('Jenis kerusakan wajib diisi');
    if (!(Number(form.harga) > 0))   return toast.error('Harga wajib diisi');

    setSaving(true);
    try {
      const payload = {
        tipeHP:         form.tipeHP.trim(),
        merek:          form.merek.trim(),
        jenisKerusakan: form.jenisKerusakan.trim(),
        harga:          Number(form.harga) || 0,
        keterangan:     form.keterangan.trim(),
      };
      if (editData) {
        await servicePriceAPI.update(editData._id, payload);
        toast.success('Harga diperbarui');
      } else {
        await servicePriceAPI.create(payload);
        toast.success('Harga ditambahkan');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan');
    } finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={editData ? 'Edit Harga' : 'Tambah Harga Baru'} size="sm">
      <div className="space-y-3">
        <div>
          <label className="label">Tipe HP *</label>
          <input className="input" placeholder="iPhone 11, Samsung A51..."
            value={form.tipeHP} onChange={e => set('tipeHP', e.target.value)} />
        </div>
        <div>
          <label className="label">Merek *</label>
          <input className="input" list="merekList" placeholder="Apple, Samsung, Xiaomi..."
            value={form.merek} onChange={e => set('merek', e.target.value)} />
          <datalist id="merekList">
            {(merekList || []).map(m => <option key={m} value={m} />)}
          </datalist>
        </div>
        <div>
          <label className="label">Jenis Kerusakan *</label>
          <input className="input" list="jenisKerusakanList" placeholder="Ganti LCD, Ganti Baterai..."
            value={form.jenisKerusakan} onChange={e => set('jenisKerusakan', e.target.value)} />
          <datalist id="jenisKerusakanList">
            {(jenisKerusakanList || []).map(j => <option key={j} value={j} />)}
          </datalist>
        </div>
        <div>
          <label className="label">Harga *</label>
          <RupiahInput value={form.harga} onChange={v => set('harga', v)} />
        </div>
        <div>
          <label className="label">Keterangan</label>
          <input className="input" placeholder="misal: termasuk sparepart original"
            value={form.keterangan} onChange={e => set('keterangan', e.target.value)} />
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-1">
          <button className="btn btn-outline w-full sm:w-auto" onClick={onClose}>Batal</button>
          <button className="btn btn-primary w-full sm:w-auto" onClick={handleSave} disabled={saving}>
            {saving ? 'Menyimpan...' : editData ? 'Simpan Perubahan' : 'Tambahkan'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Main ServicePage
// ══════════════════════════════════════════════════════════════
export default function ServicePage() {
  const { isAdmin, isOwner } = useAuth();
  const canEditArsip = isAdmin || isOwner;
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
            { key: 'transaksi',    label: 'Transaksi Servis', icon: Wrench },
            { key: 'keuangan',     label: 'Keuangan Servis',  icon: DollarSign },
            { key: 'sparepart',    label: 'Stok Sparepart',   icon: Boxes },
            { key: 'arsip',        label: 'Arsip',            icon: Archive },
            { key: 'daftarHarga',  label: 'Daftar Harga',     icon: Tag },
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

      {tab === 'transaksi'   && <TabTransaksiWithRef isAdmin={isAdmin} />}
      {tab === 'keuangan'    && <TabKeuangan isAdmin={isAdmin} />}
      {tab === 'sparepart'   && <TabSparepart isAdmin={isAdmin} />}
      {tab === 'arsip'       && <TabArsip canEdit={canEditArsip} />}
      {tab === 'daftarHarga' && <TabDaftarHarga canEdit={canEditArsip} />}
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

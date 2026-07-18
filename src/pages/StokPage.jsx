import React, { useEffect, useState, useCallback } from 'react';
import { productAPI, settingsAPI, saldoAPI, pembelianAPI } from '../services/api';
import { formatRupiah, formatDateTime, CATEGORY_LABELS, CATEGORY_COLORS } from '../utils/helpers';
import { Modal, PageHeader, EmptyState, Loader, SearchInput } from '../components/UI';
import {
  Plus, Edit3, Trash2, Package, Search, History,
  AlertTriangle, BarChart2, Loader2, RefreshCw,
  PackagePlus, X, Check, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['semua', 'kartu_perdana', 'voucher_data', 'aksesoris', 'parfum', 'sparepart', 'lainnya'];

const FISIK_CATEGORIES = [
  { value: 'kartu_perdana', label: 'Kartu Perdana' },
  { value: 'voucher_data',  label: 'Voucher Data' },
  { value: 'aksesoris',     label: 'Aksesoris' },
  { value: 'parfum',        label: 'Parfum' },
  { value: 'sparepart',     label: 'Sparepart' },
  { value: 'lainnya',       label: 'Lainnya' },
];

const defaultForm = {
  code: '', name: '', category: 'kartu_perdana', type: 'digital',
  sellPrice: '', purchasePrice: '', hargaGrosir: '', stock: '', minStock: '',
  provider: '', denomination: '', unit: 'pcs', description: '',
  pointValue: 0, // poin per transaksi produk ini
};

export default function StokPage() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('stok');

  // Produk
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('semua');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [sortBy, setSortBy] = useState('');
  const [settings, setSettings] = useState(null);

  // Modal Produk
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [stockForm, setStockForm] = useState({ quantity: '', purchasePrice: '', notes: '', expiryDate: '' });
  const [stockLogs, setStockLogs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Pembelian
  const [saldos, setSaldos] = useState([]);
  const [showPembelian, setShowPembelian] = useState(false);
  const [pembelianItems, setPembelianItems] = useState([]);
  const [pembelianForm, setPembelianForm] = useState({
  supplier: '', tanggal: new Date().toISOString().slice(0, 10), catatan: ''
});
  const [savingPembelian, setSavingPembelian] = useState(false);
  const [searchProdukPembelian, setSearchProdukPembelian] = useState('');
  const [showPeringatan, setShowPeringatan] = useState(false);
  const [peringatanData, setPeringatanData] = useState([]);
  const [hargaJualUpdates, setHargaJualUpdates] = useState({});

  // Riwayat Pembelian
  const [riwayatPembelian, setRiwayatPembelian] = useState([]);
  const [riwayatLoading, setRiwayatLoading] = useState(false);
  const [showDetailPembelian, setShowDetailPembelian] = useState(false);
  const [selectedPembelian, setSelectedPembelian] = useState(null);

  const [showBatalConfirm, setShowBatalConfirm] = useState(false);
const [selectedBatal, setSelectedBatal] = useState(null);
const [alasanBatal, setAlasanBatal] = useState('');
const [bataling, setBataling] = useState(false);

  // Edit Pembelian
  const [showEditPembelian, setShowEditPembelian] = useState(false);
  const [selectedEditPembelian, setSelectedEditPembelian] = useState(null);
  const [editPembelianForm, setEditPembelianForm] = useState({ supplier: '', catatan: '', tanggal: '' });
  const [savingEditPembelian, setSavingEditPembelian] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (category !== 'semua') params.category = category;
      const { data } = await productAPI.getAll({ ...params, limit: 200 });
      setProducts(data.data || []);
    } catch { toast.error('Gagal memuat produk'); }
    finally { setLoading(false); }
  }, [search, category]);

  useEffect(() => {
    load();
    settingsAPI.get().then(r => setSettings(r.data.data)).catch(() => {});
    saldoAPI.getAll().then(r => setSaldos(r.data.data || [])).catch(() => {});
    loadRiwayatPembelian();
  }, [load]);

  const loadRiwayatPembelian = async () => {
    setRiwayatLoading(true);
    try {
      const { data } = await pembelianAPI.getAll({ limit: 30 });
      setRiwayatPembelian(data.data || []);
    } catch {} finally { setRiwayatLoading(false); }
  };

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const formatDisp = (v) => {
    if (!v) return '';
    const n = v.toString().replace(/\D/g, '');
    return n ? new Intl.NumberFormat('id-ID').format(parseInt(n)) : '';
  };

  const openAdd = () => { setEditProduct(null); setForm(defaultForm); setShowModal(true); };

  const openEdit = (p) => {
    setEditProduct(p);
    setForm({
      code:        p.code,
      name:        p.name,
      category:    p.category,
      type:        p.type,
      sellPrice:   String(p.sellPrice || ''),
      purchasePrice: String(p.purchasePrice || ''),
      hargaGrosir: String(p.hargaGrosir || ''),
      stock:       String(p.stock || ''),
      minStock:    p.minStock ?? '',
      provider:    p.provider || '',
      denomination: p.denomination || '',
      unit:        p.unit || 'pcs',
      description: p.description || '',
      pointValue:   p.pointValue || 0,
    });
    setShowModal(true);
  };

  const openStock = (p) => {
    setSelectedProduct(p);
    setStockForm({ quantity: '', purchasePrice: String(p.purchasePrice || ''), notes: '', expiryDate: '' });
    setShowStockModal(true);
  };

  const openLogs = async (p) => {
    setSelectedProduct(p);
    const { data } = await productAPI.getStockLogs(p._id);
    setStockLogs(data.data || []);
    setShowLogsModal(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.name || !form.sellPrice) return toast.error('Lengkapi data!');
    setSaving(true);
    try {
      const payload = {
        ...form,
        sellPrice:    Number(form.sellPrice)    || 0,
        purchasePrice:Number(form.purchasePrice)|| 0,
        hargaGrosir:  Number(form.hargaGrosir)  || 0,
        minStock:     form.minStock !== '' ? Number(form.minStock) : 0,
        denomination: form.denomination ? Number(form.denomination) : undefined,
        pointValue:   Number(form.pointValue) || 0,
      };
      if (editProduct) { await productAPI.update(editProduct._id, payload); toast.success('Produk diupdate! ✅'); }
      else { await productAPI.create(payload); toast.success('Produk ditambahkan! ✅'); }
      setShowModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const handleAddStock = async () => {
    if (!stockForm.quantity || parseInt(stockForm.quantity) <= 0) return toast.error('Isi jumlah stok!');
    setSaving(true);
    try {
      const payload = {
        quantity:      parseInt(stockForm.quantity),
        purchasePrice: Number(stockForm.purchasePrice) || 0,
        notes:         stockForm.notes,
        expiryDate:    stockForm.expiryDate || null,
      };
      await productAPI.addStock(selectedProduct._id, payload);
      toast.success('Stok ditambahkan! ✅');
      setShowStockModal(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal tambah stok'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await productAPI.delete(selectedProduct._id);
      toast.success('Produk dihapus!');
      setShowDeleteConfirm(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menghapus'); }
    finally { setDeleting(false); }
  };

  // ── Pembelian ────────────────────────────────────────────────
  const addItemPembelian = (product) => {
  setPembelianItems(prev => {
    if (prev.find(i => i.productId === product._id)) return prev;
    const hargaModal = product.currentPurchasePrice || product.purchasePrice || 0;
    return [...prev, {
      productId: product._id,
      productCode: product.code,
      productName: product.name,
      jumlah: 1,
      hargaModalBaru: hargaModal,
      hargaModalLama: hargaModal,
      hargaJualSekarang: product.sellPrice,
      expiryDate: '',
    }];
  });
};

  const updateItemPembelian = (idx, field, value) => {
    setPembelianItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removeItemPembelian = (idx) => setPembelianItems(prev => prev.filter((_, i) => i !== idx));

  const totalPembelian = pembelianItems.reduce((s, i) => s + ((parseInt(i.hargaModalBaru) || 0) * (parseInt(i.jumlah) || 0)), 0);

  const handleSavePembelian = async () => {
    if (pembelianItems.length === 0) return toast.error('Tambah produk dulu!');
    setSavingPembelian(true);
    try {
      const { data } = await pembelianAPI.create({
  supplier: pembelianForm.supplier,
  // Gabungkan tanggal yang dipilih user dengan jam saat ini
  // agar tidak diparse sebagai UTC midnight yang menyebabkan jam 00:00 atau tanggal mundur
  tanggal: pembelianForm.tanggal
    ? new Date(pembelianForm.tanggal + 'T' + new Date().toTimeString().slice(0, 8)).toISOString()
    : new Date().toISOString(),
  catatan: pembelianForm.catatan,
  items: pembelianItems.map(i => ({ productId: i.productId, jumlah: parseInt(i.jumlah), hargaModalBaru: parseInt(i.hargaModalBaru) }))
});
      toast.success(`✅ ${data.message}`);
      setShowPembelian(false);
      setPembelianItems([]);
      setPembelianForm({ supplier: '', tanggal: new Date().toISOString().slice(0, 10), metodeBayar: 'tunai', akunBayar: '', catatan: '' });
      load(); loadRiwayatPembelian();
      saldoAPI.getAll().then(r => setSaldos(r.data.data || [])).catch(() => {});
      if (data.peringatanHarga?.length > 0) {
        const updates = {};
        data.peringatanHarga.forEach(p => { updates[p.productId] = p.hargaJualSekarang; });
        setHargaJualUpdates(updates);
        setPeringatanData(data.peringatanHarga);
        setShowPeringatan(true);
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal menyimpan'); }
    finally { setSavingPembelian(false); }
  };

  const handleUpdateHargaJual = async () => {
    try {
      const updates = peringatanData
        .filter(p => hargaJualUpdates[p.productId] && parseInt(hargaJualUpdates[p.productId]) > 0)
        .map(p => ({ productId: p.productId, hargaJualBaru: parseInt(hargaJualUpdates[p.productId]) }));
      if (updates.length > 0) {
        await pembelianAPI.updateHargaJual({ updates });
        toast.success('Harga jual diupdate! ✅');
      }
      setShowPeringatan(false); load();
    } catch { toast.error('Gagal update harga jual'); }
  };

  const handleBatalkan = async () => {
  if (!alasanBatal.trim()) return toast.error('Isi alasan pembatalan!');
  setBataling(true);
  try {
    await pembelianAPI.batalkan(selectedBatal._id, { alasan: alasanBatal });
    toast.success('Pembelian berhasil dibatalkan!');
    setShowBatalConfirm(false);
    setAlasanBatal('');
    loadRiwayatPembelian();
    load();
  } catch (err) { toast.error(err.response?.data?.message || 'Gagal membatalkan'); }
  finally { setBataling(false); }
};

  const openEditPembelian = (p) => {
    setSelectedEditPembelian(p);
    setEditPembelianForm({
      supplier: p.supplier || '',
      catatan: p.catatan || '',
      tanggal: p.tanggal ? new Date(p.tanggal).toISOString().slice(0, 16) : '',
      items: p.items.map(i => ({ ...i, product: String(i.product || i._id), jumlah: i.jumlah, hargaModalBaru: i.hargaModalBaru })),
    });
    setShowEditPembelian(true);
  };

  const handleSaveEditPembelian = async () => {
    if (editPembelianForm.items.length === 0) return toast.error('Minimal 1 item!');
    setSavingEditPembelian(true);
    try {
      await pembelianAPI.edit(selectedEditPembelian._id, editPembelianForm);
      toast.success('Pembelian berhasil diupdate! ✅');
      setShowEditPembelian(false);
      loadRiwayatPembelian();
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal mengupdate'); }
    finally { setSavingEditPembelian(false); }
  };

  const filteredProducts = filterLowStock
    ? products.filter(p => p.type === 'fisik' && p.stock <= (p.minStock || settings?.lowStockThreshold || 5))
    : products;

  const displayProducts = (() => {
    if (!sortBy) return filteredProducts;
    const arr = [...filteredProducts];
    switch (sortBy) {
      case 'stock-asc':  arr.sort((a, b) => (a.stock || 0) - (b.stock || 0)); break;
      case 'stock-desc': arr.sort((a, b) => (b.stock || 0) - (a.stock || 0)); break;
      case 'name-asc':   arr.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'id')); break;
      case 'name-desc':  arr.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'id')); break;
      case 'modal-asc':  arr.sort((a, b) => (a.purchasePrice || 0) - (b.purchasePrice || 0)); break;
      case 'modal-desc': arr.sort((a, b) => (b.purchasePrice || 0) - (a.purchasePrice || 0)); break;
      default: break;
    }
    return arr;
  })();

  return (
    <div className="animate-fade-in-up">
      <PageHeader title="Stok Barang" subtitle="Manajemen produk & stok"
        actions={
          <div className="flex flex-wrap gap-2 justify-end w-full sm:w-auto">
            <button className="btn btn-outline" onClick={load}><RefreshCw size={16} /> Refresh</button>
            <button className="btn btn-success" onClick={() => { saldoAPI.getAll().then(r => setSaldos(r.data.data || [])).catch(() => {}); setShowPembelian(true); }}>
              <Plus size={16} /> <span className="hidden sm:inline">Input </span>Pembelian
            </button>
            {isAdmin && <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> <span className="hidden sm:inline">Tambah </span>Produk</button>}
          </div>
        }
      />

      {/* Tab */}
      <div className="flex gap-2 mb-4 overflow-x-auto -mx-1 px-1 pb-1 sm:pb-0 sm:mx-0 sm:px-0">
        <button onClick={() => setActiveTab('stok')} className={`btn flex-shrink-0 ${activeTab === 'stok' ? 'btn-primary' : 'btn-outline'}`}>
          <Package size={16} /> Stok Barang
        </button>
        <button onClick={() => { setActiveTab('riwayat'); loadRiwayatPembelian(); }} className={`btn flex-shrink-0 ${activeTab === 'riwayat' ? 'btn-primary' : 'btn-outline'}`}>
          <History size={16} /> Riwayat Pembelian
        </button>
      </div>

      {/* ── TAB STOK ── */}
      {activeTab === 'stok' && (
        <div className="pb-24 lg:pb-0">
          <div className="card mb-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <SearchInput value={search} onChange={setSearch} placeholder="Cari produk / kode..." className="flex-1" />
            <select className="input w-full sm:w-auto" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c === 'semua' ? 'Semua Kategori' : FISIK_CATEGORIES.find(f => f.value === c)?.label || c}</option>)}
            </select>
            <select className="input w-full sm:w-auto" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="">Urutan Default</option>
              <option value="stock-asc">Stok Terendah → Tertinggi</option>
              <option value="stock-desc">Stok Tertinggi → Terendah</option>
              <option value="name-asc">Nama A-Z</option>
              <option value="name-desc">Nama Z-A</option>
              <option value="modal-asc">Modal Terendah → Tertinggi</option>
              <option value="modal-desc">Modal Tertinggi → Terendah</option>
            </select>
            <button onClick={() => setFilterLowStock(!filterLowStock)} className={`btn justify-center ${filterLowStock ? 'btn-primary' : 'btn-outline'}`}>
              <AlertTriangle size={16} /> {filterLowStock ? 'Stok Menipis' : 'Semua Stok'}
            </button>
          </div>

          {loading ? <Loader /> : (
            <>
              {/* Desktop / tablet — tabel (scroll horizontal di dalam wrapper) */}
              <div className="table-wrap hidden sm:block max-w-full">
                <table className="table">
                  <thead>
                    <tr><th>Kode</th><th>Nama Produk</th><th>Kategori</th><th>Tipe</th><th>Harga Jual</th><th>Modal</th><th>Stok</th><th>Min. Stok</th><th>Expired</th><th>Aksi</th></tr>
                  </thead>
                  <tbody className="bg-white">
                    {displayProducts.length === 0
                      ? <tr><td colSpan={10}><EmptyState message="Tidak ada produk" /></td></tr>
                      : displayProducts.map(p => {
                        const activeBatches = (p.stockBatches || []).filter(b => b.remainingQty > 0 && b.expiryDate);
                        const today = new Date(); today.setHours(0,0,0,0);
                        const soon  = new Date(); soon.setDate(soon.getDate() + 30);
                        const nearestExp = activeBatches.sort((a,b) => new Date(a.expiryDate) - new Date(b.expiryDate))[0];
                        const isExpired  = nearestExp && new Date(nearestExp.expiryDate) <= today;
                        const isSoonExp  = nearestExp && !isExpired && new Date(nearestExp.expiryDate) <= soon;

                        return (
                        <tr key={p._id} className={isExpired ? 'bg-red-50 dark:bg-red-900/20' : ''}>
                          <td>
                            <code className="text-xs font-mono bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 px-1.5 py-0.5 rounded">{p.code}</code>
                            {p.provider && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{p.provider}</p>}
                          </td>
                          <td className="font-medium text-slate-700 dark:text-slate-100">{p.name}</td>
                          <td><span className={`badge ${CATEGORY_COLORS?.[p.category] || 'badge-gray'}`}>{CATEGORY_LABELS?.[p.category] || p.category}</span></td>
                          <td><span className={`badge ${p.type === 'fisik' ? 'badge-blue' : p.type === 'jasa' ? 'badge-green' : 'badge-purple'}`}>{p.type}</span></td>
                          <td className="font-bold text-blue-600 dark:text-blue-400">{formatRupiah(p.sellPrice)}</td>
                          <td className="text-slate-500 dark:text-slate-400">{formatRupiah(p.purchasePrice)}</td>
                          <td>
                            {p.type === 'fisik'
                              ? <span className={`badge ${p.stock <= 0 ? 'badge-red' : p.stock <= (p.minStock || settings?.lowStockThreshold || 5) ? 'badge-yellow' : 'badge-green'}`}>{p.stock} {p.unit || 'pcs'}</span>
                              : <span className="text-slate-300 dark:text-slate-500 text-xs">∞</span>}
                          </td>
                          <td className="text-slate-500 dark:text-slate-400 text-sm">{p.type === 'fisik' ? p.minStock || 5 : '—'}</td>
                          <td>
                            {nearestExp ? (
                              <span className={`badge text-xs ${isExpired ? 'badge-red' : isSoonExp ? 'badge-yellow' : 'badge-green'}`}>
                                {isExpired ? '⚠️ Expired' : isSoonExp ? '⏳ Segera' : '✓ OK'}
                                <span className="ml-1 font-normal">
                                  {new Date(nearestExp.expiryDate).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'2-digit' })}
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-500 text-xs">—</span>
                            )}
                          </td>
                          <td>
                            <div className="flex gap-1">
                              {p.type === 'fisik' && (
                                <button onClick={() => openStock(p)} className="btn btn-success py-1 px-2 text-xs" title="Tambah Stok"><PackagePlus size={13} /></button>
                              )}
                              <button onClick={() => openLogs(p)} className="btn btn-outline py-1 px-2 text-xs" title="Log Stok"><BarChart2 size={13} /></button>
                              {isAdmin && (
                                <>
                                  <button onClick={() => openEdit(p)} className="btn btn-outline py-1 px-2 text-xs"><Edit3 size={13} /></button>
                                  <button onClick={() => { setSelectedProduct(p); setShowDeleteConfirm(true); }} className="btn btn-danger py-1 px-2 text-xs"><Trash2 size={13} /></button>
                                </>
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

              {/* Mobile — kartu */}
              <div className="sm:hidden space-y-2">
                {displayProducts.length === 0
                  ? <div className="card"><EmptyState message="Tidak ada produk" /></div>
                  : displayProducts.map(p => {
                    const activeBatches = (p.stockBatches || []).filter(b => b.remainingQty > 0 && b.expiryDate);
                    const today = new Date(); today.setHours(0,0,0,0);
                    const soon  = new Date(); soon.setDate(soon.getDate() + 30);
                    const nearestExp = activeBatches.sort((a,b) => new Date(a.expiryDate) - new Date(b.expiryDate))[0];
                    const isExpired  = nearestExp && new Date(nearestExp.expiryDate) <= today;
                    const isSoonExp  = nearestExp && !isExpired && new Date(nearestExp.expiryDate) <= soon;
                    const lowStock   = p.type === 'fisik' && p.stock <= (p.minStock || settings?.lowStockThreshold || 5);

                    return (
                      <div key={p._id} className={`card !p-3 ${isExpired ? 'border-red-200 bg-red-50/40 dark:border-red-800 dark:bg-red-900/20' : ''}`}>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="min-w-0 flex-1">
                            <code className="text-xs font-mono bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 px-1.5 py-0.5 rounded">{p.code}</code>
                            <p className="font-bold text-sm text-slate-700 dark:text-slate-100 mt-1 leading-tight break-words">{p.name}</p>
                            {p.provider && <p className="text-xs text-slate-400 dark:text-slate-500">{p.provider}</p>}
                          </div>
                          {p.type === 'fisik'
                            ? <span className={`badge flex-shrink-0 ${p.stock <= 0 ? 'badge-red' : lowStock ? 'badge-yellow' : 'badge-green'}`}>
                                {p.stock} {p.unit || 'pcs'}
                              </span>
                            : <span className="badge badge-gray flex-shrink-0">∞</span>
                          }
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          <span className={`badge ${CATEGORY_COLORS?.[p.category] || 'badge-gray'}`}>{CATEGORY_LABELS?.[p.category] || p.category}</span>
                          <span className={`badge ${p.type === 'fisik' ? 'badge-blue' : p.type === 'jasa' ? 'badge-green' : 'badge-purple'}`}>{p.type}</span>
                          {nearestExp && (
                            <span className={`badge text-xs ${isExpired ? 'badge-red' : isSoonExp ? 'badge-yellow' : 'badge-green'}`}>
                              {isExpired ? '⚠️ Exp' : isSoonExp ? '⏳' : '✓'} {new Date(nearestExp.expiryDate).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'2-digit' })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-end justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                          <div className="min-w-0">
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">Harga Jual</p>
                            <p className="font-bold text-blue-600 dark:text-blue-400 text-base leading-tight">{formatRupiah(p.sellPrice)}</p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Modal: {formatRupiah(p.purchasePrice)}</p>
                          </div>
                          <div className="flex flex-wrap gap-1 justify-end flex-shrink-0">
                            {p.type === 'fisik' && (
                              <button onClick={() => openStock(p)} className="btn btn-success py-1.5 px-2.5 text-xs" title="Tambah Stok"><PackagePlus size={13} /></button>
                            )}
                            <button onClick={() => openLogs(p)} className="btn btn-outline py-1.5 px-2.5 text-xs" title="Log Stok"><BarChart2 size={13} /></button>
                            {isAdmin && (
                              <>
                                <button onClick={() => openEdit(p)} className="btn btn-outline py-1.5 px-2.5 text-xs"><Edit3 size={13} /></button>
                                <button onClick={() => { setSelectedProduct(p); setShowDeleteConfirm(true); }} className="btn btn-danger py-1.5 px-2.5 text-xs"><Trash2 size={13} /></button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TAB RIWAYAT PEMBELIAN ── */}
      {activeTab === 'riwayat' && (
        <div className="pb-24 lg:pb-0">
          {riwayatLoading ? <Loader /> : (
            <>
              {/* Desktop / tablet — tabel */}
              <div className="table-wrap hidden sm:block max-w-full">
                <table className="table">
                  <thead>
                    <tr><th>No. PO</th><th>Tanggal</th><th>Supplier</th><th>Item</th><th>Total</th><th>Kasir</th><th>Aksi</th></tr>
                  </thead>
                  <tbody className="bg-white">
                    {riwayatPembelian.length === 0
                      ? <tr><td colSpan={8}><EmptyState message="Belum ada riwayat pembelian" /></td></tr>
                      : riwayatPembelian.map(p => (
                        <tr key={p._id}>
                          <td>
                            <code className="text-xs font-mono bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 px-2 py-0.5 rounded">{p.nomorPO}</code>
                            {p.isBatal && <span className="badge badge-red text-xs ml-1">Dibatalkan</span>}
                          </td>
                          <td className="text-xs text-slate-400 dark:text-slate-500">{formatDateTime(p.tanggal)}</td>
                          <td className="font-medium text-sm dark:text-slate-100">{p.supplier || '-'}</td>
                          <td className="text-slate-500 dark:text-slate-400 text-xs">{p.totalItem} item</td>
                          <td className="font-bold text-blue-600 dark:text-blue-400">{formatRupiah(p.totalHarga)}</td>
                          <td className="text-sm dark:text-slate-300">{p.createdByName}</td>
                          <td>
                            <div className="flex gap-1">
                              <button onClick={async () => {
                                const { data } = await pembelianAPI.getDetail(p._id);
                                setSelectedPembelian(data.data);
                                setShowDetailPembelian(true);
                              }} className="btn btn-outline py-1.5 px-2.5 text-xs">
                                <Eye size={13} /> Detail
                              </button>
                              {isAdmin && !p.isBatal && (
                                <button onClick={() => openEditPembelian(p)}
                                  className="btn btn-outline py-1.5 px-2.5 text-xs text-blue-600 border-blue-300 hover:bg-blue-50">
                                  <Edit3 size={13} /> Edit
                                </button>
                              )}
                              {isAdmin && !p.isBatal && (
                                <button onClick={() => { setSelectedBatal(p); setShowBatalConfirm(true); }}
                                  className="btn btn-danger py-1.5 px-2.5 text-xs">
                                  <Trash2 size={13} /> Batal
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>

              {/* Mobile — kartu */}
              <div className="sm:hidden space-y-2">
                {riwayatPembelian.length === 0
                  ? <div className="card"><EmptyState message="Belum ada riwayat pembelian" /></div>
                  : riwayatPembelian.map(p => (
                    <div key={p._id} className={`card !p-3 ${p.isBatal ? 'opacity-70 border-red-100 bg-red-50/30 dark:border-red-900 dark:bg-red-900/20' : ''}`}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <code className="text-xs font-mono bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 px-2 py-0.5 rounded truncate">{p.nomorPO}</code>
                        {p.isBatal && <span className="badge badge-red text-xs flex-shrink-0">Dibatalkan</span>}
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-1.5">{formatDateTime(p.tanggal)}</p>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="font-semibold text-sm text-slate-700 dark:text-slate-100 truncate flex-1">{p.supplier || 'Tanpa supplier'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">{p.totalItem} item</p>
                      </div>
                      <div className="flex items-end justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <div className="min-w-0">
                          <p className="text-[11px] text-slate-400 dark:text-slate-500">Total</p>
                          <p className="font-bold text-blue-600 dark:text-blue-400 text-base leading-tight">{formatRupiah(p.totalHarga)}</p>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">Kasir: {p.createdByName}</p>
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end flex-shrink-0">
                          <button onClick={async () => {
                            const { data } = await pembelianAPI.getDetail(p._id);
                            setSelectedPembelian(data.data);
                            setShowDetailPembelian(true);
                          }} className="btn btn-outline py-1.5 px-2.5 text-xs">
                            <Eye size={13} /> Detail
                          </button>
                          {isAdmin && !p.isBatal && (
                            <button onClick={() => openEditPembelian(p)}
                              className="btn btn-outline py-1.5 px-2.5 text-xs text-blue-600 border-blue-300">
                              <Edit3 size={13} />
                            </button>
                          )}
                          {isAdmin && !p.isBatal && (
                            <button onClick={() => { setSelectedBatal(p); setShowBatalConfirm(true); }}
                              className="btn btn-danger py-1.5 px-2.5 text-xs">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Modal: Tambah/Edit Produk ── */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editProduct ? `Edit: ${editProduct.name}` : 'Tambah Produk Baru'} size="lg">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Kode Produk *</label>
              <input className="input" placeholder="AKS-CAR-01" value={form.code} onChange={e => F('code', e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className="label">Tipe *</label>
              <select className="input" value={form.type} onChange={e => F('type', e.target.value)}>
                <option value="fisik">Fisik</option>
                <option value="digital">Digital</option>
                <option value="jasa">Jasa</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Nama Produk *</label>
            <input className="input" placeholder="Nama produk" value={form.name} onChange={e => F('name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Kategori</label>
              <select className="input" value={form.category} onChange={e => F('category', e.target.value)}>
                {FISIK_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Provider</label>
              <input className="input" placeholder="Telkomsel, XL, dll" value={form.provider} onChange={e => F('provider', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Harga Jual (Rp) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold pointer-events-none">Rp</span>
                <input className="input pl-10" inputMode="numeric" placeholder="0" value={formatDisp(form.sellPrice)} onChange={e => F('sellPrice', e.target.value.replace(/\D/g, ''))} />
              </div>
            </div>
            <div>
              <label className="label">Harga Modal (Rp)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold pointer-events-none">Rp</span>
                <input className="input pl-10" inputMode="numeric" placeholder="0" value={formatDisp(form.purchasePrice)} onChange={e => F('purchasePrice', e.target.value.replace(/\D/g, ''))} />
              </div>
            </div>
          </div>
          {form.type === 'fisik' && (
            <div>
              <label className="label">Harga Grosir (Rp)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold pointer-events-none">Rp</span>
                <input className="input pl-10" inputMode="numeric" placeholder="0 = tidak ada harga grosir" value={formatDisp(form.hargaGrosir)} onChange={e => F('hargaGrosir', e.target.value.replace(/\D/g, ''))} />
              </div>
            </div>
          )}
          {form.type === 'fisik' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Stok Awal</label>
                <input className="input" type="number" min="0" placeholder="0" value={form.stock} onChange={e => F('stock', e.target.value)} />
              </div>
              <div>
                <label className="label">Min. Stok</label>
                <input className="input" type="number" min="0" placeholder="5" value={form.minStock} onChange={e => F('minStock', e.target.value)} />
              </div>
              <div>
                <label className="label">Satuan</label>
                <select className="input" value={form.unit} onChange={e => F('unit', e.target.value)}>
                  <option value="pcs">pcs</option>
                  <option value="box">box</option>
                  <option value="lusin">lusin</option>
                  <option value="unit">unit</option>
                </select>
              </div>
            </div>
          )}
          {/* Poin per transaksi */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <label className="label">⭐ Poin per Transaksi</label>
            <input className="input" type="number" min="0" placeholder="0"
              value={form.pointValue}
              onChange={e => F('pointValue', e.target.value)} />
            <p className="text-xs text-slate-400 mt-1">
              {form.type === 'fisik'
                ? form.pointValue > 0 ? `Member dapat ${form.pointValue} poin per produk ini` : 'Nilai 0 = tidak dapat poin'
                : form.pointValue > 0 ? `Member dapat ${form.pointValue} poin per transaksi` : 'Nilai 0 = pakai sistem global (dari total belanja)'}
            </p>
          </div>
          <div>
            <label className="label">Deskripsi</label>
            <textarea className="input h-20 resize-none" placeholder="Keterangan tambahan..." value={form.description} onChange={e => F('description', e.target.value)} />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button className="btn btn-outline flex-1" onClick={() => setShowModal(false)}>Batal</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? 'Menyimpan...' : editProduct ? 'Update' : 'Tambah'}
          </button>
        </div>
      </Modal>

      {/* ── Modal: Tambah Stok ── */}
      <Modal open={showStockModal} onClose={() => setShowStockModal(false)} title={`Tambah Stok: ${selectedProduct?.name}`} size="sm">
        <div className="bg-blue-50 rounded-xl p-3 mb-4 text-xs text-blue-700">Stok baru ditambah sebagai batch FIFO.</div>
        <div className="space-y-3">
          <div>
            <label className="label">Jumlah Masuk *</label>
            <input className="input" type="number" min="1" placeholder="0" value={stockForm.quantity} onChange={e => setStockForm(f => ({ ...f, quantity: e.target.value }))} />
          </div>
          <div>
            <label className="label">Harga Modal (Rp)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold pointer-events-none">Rp</span>
              <input className="input pl-10" inputMode="numeric" placeholder="0" value={formatDisp(stockForm.purchasePrice)} onChange={e => setStockForm(f => ({ ...f, purchasePrice: e.target.value.replace(/\D/g, '') }))} />
            </div>
          </div>
          <div>
            <label className="label">Catatan</label>
            <input className="input" placeholder="Nomor PO, supplier, dll..." value={stockForm.notes} onChange={e => setStockForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div>
            <label className="label flex items-center gap-2">
              Tanggal Kadaluwarsa
              <span className="text-slate-400 font-normal normal-case text-xs">(opsional)</span>
            </label>
            <input
              className="input"
              type="date"
              value={stockForm.expiryDate}
              onChange={e => setStockForm(f => ({ ...f, expiryDate: e.target.value }))}
            />
            {stockForm.expiryDate && (
              <p className="text-xs text-slate-400 mt-1">
                Exp: {new Date(stockForm.expiryDate).toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button className="btn btn-outline flex-1" onClick={() => setShowStockModal(false)}>Batal</button>
          <button className="btn btn-success flex-1" onClick={handleAddStock} disabled={saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : <PackagePlus size={16} />}
            {saving ? 'Menyimpan...' : 'Tambah Stok'}
          </button>
        </div>
      </Modal>

      {/* ── Modal: Log Stok ── */}
      <Modal open={showLogsModal} onClose={() => setShowLogsModal(false)} title={`Log Stok: ${selectedProduct?.name}`} size="md">
        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl mb-4">
          <span className="text-sm text-slate-500">Stok Saat Ini</span>
          <span className="text-lg font-black">{selectedProduct?.stock} {selectedProduct?.unit || 'pcs'}</span>
        </div>
        <div className="max-h-80 overflow-y-auto space-y-2">
          {stockLogs.length === 0 ? <EmptyState message="Belum ada log stok" />
            : stockLogs.map((log, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${log.type === 'masuk' || log.type === 'adjustment' ? 'bg-green-100' : 'bg-red-100'}`}>
                  {log.type === 'keluar' ? <X size={14} className="text-red-500" /> : <Plus size={14} className="text-green-600" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700 capitalize">{log.type}</p>
                  <p className="text-xs text-slate-400">{log.notes}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(log.createdAt)}</p>
                </div>
                <p className={`text-sm font-bold ${log.type === 'keluar' ? 'text-red-500' : 'text-green-600'}`}>
                  {log.type === 'keluar' ? '-' : '+'}{log.quantity}
                </p>
              </div>
            ))}
        </div>
      </Modal>

      {/* ── Modal: Hapus ── */}
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Hapus Produk" size="sm">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-bold text-red-600">⚠️ Perhatian!</p>
          <p className="text-xs text-red-500 mt-1">Produk <strong>{selectedProduct?.name}</strong> akan dihapus permanen.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn btn-outline flex-1" onClick={() => setShowDeleteConfirm(false)}>Batal</button>
          <button className="btn btn-danger flex-1" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {deleting ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </Modal>

      {/* ── Modal: Input Pembelian ── */}
      <Modal open={showPembelian} onClose={() => setShowPembelian(false)} title="Input Pembelian Stok" size="xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Kiri: Pilih Produk */}
          <div>
            <h4 className="font-bold text-slate-700 text-sm mb-3">Pilih Produk Fisik</h4>
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9 text-sm" placeholder="Cari produk..."
                value={searchProdukPembelian} onChange={e => setSearchProdukPembelian(e.target.value)} />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1.5">
              {products
                .filter(p => p.type === 'fisik' &&
                  (p.name.toLowerCase().includes(searchProdukPembelian.toLowerCase()) ||
                   p.code.toLowerCase().includes(searchProdukPembelian.toLowerCase())))
                .map(p => (
                  <button key={p._id} onClick={() => addItemPembelian(p)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition ${pembelianItems.find(i => i.productId === p._id) ? 'border-blue-300 bg-blue-50' : 'border-slate-100 hover:border-blue-200 hover:bg-blue-50'}`}>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-700">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.code} • Stok: {p.stock} • Modal: {formatRupiah(p.currentPurchasePrice || p.purchasePrice || 0)}</p>
                    </div>
                    {pembelianItems.find(i => i.productId === p._id)
                      ? <span className="badge badge-blue text-xs">✓</span>
                      : <Plus size={14} className="text-blue-500" />}
                  </button>
                ))}
            </div>
          </div>

          {/* Kanan: Form */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-700 text-sm">Item Pembelian</h4>
            {pembelianItems.length === 0
              ? <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-slate-400 text-sm">Pilih produk dari kiri</div>
              : (
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {pembelianItems.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xs font-bold text-slate-700">{item.productName}</p>
                          <p className="text-xs text-slate-400">Modal lama: {formatRupiah(item.hargaModalLama)}</p>
                        </div>
                        <button onClick={() => removeItemPembelian(idx)} className="text-red-400"><X size={13} /></button>
                      </div>
                      <div className="flex flex-wrap gap-2 items-end mt-2">
  <div className="w-16 sm:w-[70px]">
    <label className="label text-xs">Jumlah</label>
    <input className="input text-xs text-center px-2" type="text" inputMode="numeric" min="1"
      value={item.jumlah}
      onChange={e => updateItemPembelian(idx, 'jumlah', e.target.value)} />
  </div>
  <div className="flex-1 min-w-[120px]">
    <label className="label text-xs">Harga Modal Baru (Rp)</label>
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold pointer-events-none">Rp</span>
      <input className="input text-xs pl-7"
        inputMode="numeric"
        value={item.hargaModalBaru ? new Intl.NumberFormat('id-ID').format(parseInt(item.hargaModalBaru)) : ''}
        onChange={e => updateItemPembelian(idx, 'hargaModalBaru', e.target.value.replace(/\D/g, ''))} />
    </div>
  </div>
  <div className="w-20 sm:w-[80px] text-right">
    <label className="label text-xs">Subtotal</label>
    <p className="text-xs font-bold text-blue-600 py-2 truncate">{formatRupiah((parseInt(item.hargaModalBaru) || 0) * (parseInt(item.jumlah) || 0))}</p>
  </div>
</div>
                      {/* Input kadaluwarsa — opsional */}
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <label className="text-xs text-slate-400 whitespace-nowrap">Exp:</label>
                        <input
                          className="input text-xs py-1 flex-1 min-w-[140px]"
                          type="date"
                          placeholder="Kadaluwarsa (opsional)"
                          value={item.expiryDate || ''}
                          onChange={e => updateItemPembelian(idx, 'expiryDate', e.target.value)}
                        />
                        {item.expiryDate && (
                          <span className="text-xs text-orange-500 whitespace-nowrap">
                            📅 {new Date(item.expiryDate).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })}
                          </span>
                        )}
                      </div>
                      {item.hargaModalBaru && parseInt(item.hargaModalBaru) !== item.hargaModalLama && (
                        <div className={`mt-2 text-xs px-2 py-1.5 rounded-lg flex items-center gap-1.5 ${parseInt(item.hargaModalBaru) > item.hargaModalLama ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                          <AlertTriangle size={12} />
                          Modal {parseInt(item.hargaModalBaru) > item.hargaModalLama ? 'naik' : 'turun'} → perlu review harga jual!
                        </div>
                      )}
                      
                    </div>
                  ))}
                </div>
              )}

            <div className="border-t border-slate-100 pt-3">
  <div className="grid grid-cols-2 gap-2">
    <div>
      <label className="label text-xs">Supplier</label>
      <input className="input text-sm" placeholder="Nama supplier"
        value={pembelianForm.supplier}
        onChange={e => setPembelianForm(f => ({ ...f, supplier: e.target.value }))} />
    </div>
    <div>
      <label className="label text-xs">Tanggal</label>
      <input className="input text-sm" type="date"
        value={pembelianForm.tanggal}
        onChange={e => setPembelianForm(f => ({ ...f, tanggal: e.target.value }))} />
    </div>
  </div>
</div>

            {pembelianItems.length > 0 && (
              <div className="bg-blue-50 rounded-xl p-3 flex justify-between items-center">
                <span className="text-sm font-bold text-blue-700">Total Pembelian</span>
                <span className="text-lg font-black text-blue-700">{formatRupiah(totalPembelian)}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button className="btn btn-outline flex-1" onClick={() => setShowPembelian(false)}>Batal</button>
              <button className="btn btn-primary flex-1" onClick={handleSavePembelian} disabled={savingPembelian || pembelianItems.length === 0}>
                {savingPembelian ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {savingPembelian ? 'Menyimpan...' : 'Simpan Pembelian'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Peringatan Harga ── */}
      <Modal open={showPeringatan} onClose={() => setShowPeringatan(false)} title="⚠️ Peringatan Perubahan Harga Modal" size="md">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4">
          <p className="text-sm font-bold text-orange-700">Harga modal berubah!</p>
          <p className="text-xs text-orange-600 mt-1">Review dan update harga jual jika perlu.</p>
        </div>
        <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
          {peringatanData.map(p => (
            <div key={p.productId} className="border border-orange-200 rounded-xl p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-sm font-bold text-slate-700">{p.productName}</p>
                  <p className="text-xs text-slate-400">{p.productCode}</p>
                </div>
                <span className={`badge ${p.selisihModal > 0 ? 'badge-red' : 'badge-green'} text-xs`}>
                  {p.selisihModal > 0 ? '+' : ''}{formatRupiah(p.selisihModal)}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                <div className="bg-slate-50 rounded-lg p-2 text-center"><p className="text-slate-400">Modal Lama</p><p className="font-bold">{formatRupiah(p.hargaModalLama)}</p></div>
                <div className="bg-slate-50 rounded-lg p-2 text-center"><p className="text-slate-400">Modal Baru</p><p className={`font-bold ${p.selisihModal > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatRupiah(p.hargaModalBaru)}</p></div>
                <div className="bg-slate-50 rounded-lg p-2 text-center"><p className="text-slate-400">Harga Jual</p><p className="font-bold text-blue-600">{formatRupiah(p.hargaJualSekarang)}</p></div>
              </div>
              <div>
                <label className="label text-xs">Update Harga Jual Baru (Rp)</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold pointer-events-none">Rp</span>
                  <input className="input text-sm pl-8" inputMode="numeric"
                    placeholder={`Saat ini: ${formatRupiah(p.hargaJualSekarang)}`}
                    value={hargaJualUpdates[p.productId] ? new Intl.NumberFormat('id-ID').format(parseInt(hargaJualUpdates[p.productId])) : ''}
                    onChange={e => setHargaJualUpdates(prev => ({ ...prev, [p.productId]: e.target.value.replace(/\D/g, '') }))} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button className="btn btn-outline flex-1" onClick={() => setShowPeringatan(false)}>Lewati</button>
          <button className="btn btn-primary flex-1" onClick={handleUpdateHargaJual}><Check size={16} /> Update Harga Jual</button>
        </div>
      </Modal>

      {/* ── Modal: Detail Pembelian ── */}
      <Modal open={showDetailPembelian} onClose={() => setShowDetailPembelian(false)} title={`Detail: ${selectedPembelian?.nomorPO}`} size="md">
        {selectedPembelian && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-slate-400">Tanggal</p><p className="font-medium">{formatDateTime(selectedPembelian.tanggal)}</p></div>
              <div><p className="text-xs text-slate-400">Supplier</p><p className="font-medium">{selectedPembelian.supplier || '-'}</p></div>
              <div><p className="text-xs text-slate-400">Metode Bayar</p>
                <span className={`badge ${selectedPembelian.metodeBayar === 'tunai' ? 'badge-green' : selectedPembelian.metodeBayar === 'transfer' ? 'badge-blue' : 'badge-yellow'}`}>
                  {selectedPembelian.metodeBayar}
                </span>
              </div>
              <div><p className="text-xs text-slate-400">Kasir</p><p className="font-medium">{selectedPembelian.createdByName}</p></div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Produk</th><th>Jumlah</th><th>Modal Baru</th><th>Subtotal</th><th>Selisih</th></tr></thead>
                <tbody className="bg-white">
                  {selectedPembelian.items?.map((item, i) => (
                    <tr key={i}>
                      <td><p className="text-xs font-medium">{item.productName}</p><p className="text-xs text-slate-400">{item.productCode}</p></td>
                      <td className="text-xs">{item.jumlah}</td>
                      <td className="text-xs font-bold">{formatRupiah(item.hargaModalBaru)}</td>
                      <td className="text-xs font-bold text-blue-600">{formatRupiah(item.subtotal)}</td>
                      <td>{item.selisihModal !== 0 && <span className={`badge text-xs ${item.selisihModal > 0 ? 'badge-red' : 'badge-green'}`}>{item.selisihModal > 0 ? '+' : ''}{formatRupiah(item.selisihModal)}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 flex justify-between">
              <span className="font-bold text-blue-700">Total</span>
              <span className="text-lg font-black text-blue-700">{formatRupiah(selectedPembelian.totalHarga)}</span>
            </div>
            {selectedPembelian.catatan && <div><p className="text-xs text-slate-400 mb-1">Catatan</p><p className="text-sm bg-slate-50 p-3 rounded-xl">{selectedPembelian.catatan}</p></div>}
          </div>
        )}
      </Modal>
      <Modal open={showEditPembelian} onClose={() => setShowEditPembelian(false)} title={`Edit: ${selectedEditPembelian?.nomorPO}`} size="lg">
        <div className="space-y-4">
          {/* Info dasar */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tanggal</label>
              <input type="datetime-local" className="input"
                value={editPembelianForm.tanggal}
                onChange={e => setEditPembelianForm(f => ({ ...f, tanggal: e.target.value }))} />
            </div>
            <div>
              <label className="label">Supplier</label>
              <input type="text" className="input" placeholder="Nama supplier..."
                value={editPembelianForm.supplier}
                onChange={e => setEditPembelianForm(f => ({ ...f, supplier: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Catatan</label>
            <textarea className="input h-16 resize-none" placeholder="Catatan pembelian..."
              value={editPembelianForm.catatan}
              onChange={e => setEditPembelianForm(f => ({ ...f, catatan: e.target.value }))} />
          </div>

          {/* Tabel item */}
          <div>
            <label className="label">Item Pembelian</label>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Produk</th><th>Jumlah</th><th>Harga Modal</th><th>Subtotal</th><th></th></tr>
                </thead>
                <tbody className="bg-white">
                  {editPembelianForm.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td>
                        <p className="text-xs font-medium">{item.productName}</p>
                        <p className="text-xs text-slate-400">{item.productCode}</p>
                      </td>
                      <td>
                        <input type="number" min="1"
                          className="input py-1 px-2 text-xs w-20 text-center"
                          value={item.jumlah}
                          onChange={e => setEditPembelianForm(f => ({
                            ...f,
                            items: f.items.map((it, i) => i === idx ? { ...it, jumlah: parseInt(e.target.value) || 1 } : it)
                          }))} />
                      </td>
                      <td>
                        <input type="number" min="0"
                          className="input py-1 px-2 text-xs w-28"
                          value={item.hargaModalBaru}
                          onChange={e => setEditPembelianForm(f => ({
                            ...f,
                            items: f.items.map((it, i) => i === idx ? { ...it, hargaModalBaru: parseInt(e.target.value) || 0 } : it)
                          }))} />
                      </td>
                      <td className="text-xs font-bold text-blue-600">
                        {formatRupiah((item.jumlah || 0) * (item.hargaModalBaru || 0))}
                      </td>
                      <td>
                        <button onClick={() => setEditPembelianForm(f => ({
                          ...f, items: f.items.filter((_, i) => i !== idx)
                        }))} className="text-red-400 hover:text-red-600 p-1">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Total */}
            <div className="bg-blue-50 rounded-xl p-3 flex justify-between mt-2">
              <span className="font-bold text-blue-700">Total</span>
              <span className="text-lg font-black text-blue-700">
                {formatRupiah(editPembelianForm.items?.reduce((s, i) => s + ((i.jumlah || 0) * (i.hargaModalBaru || 0)), 0) || 0)}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button className="btn btn-outline flex-1" onClick={() => setShowEditPembelian(false)}>Batal</button>
            <button className="btn btn-primary flex-1" onClick={handleSaveEditPembelian} disabled={savingEditPembelian}>
              {savingEditPembelian ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {savingEditPembelian ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      </Modal>
      <Modal open={showBatalConfirm} onClose={() => { setShowBatalConfirm(false); setAlasanBatal(''); }} title="Batalkan Pembelian" size="sm">
  <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
    <p className="text-sm font-bold text-red-600">⚠️ Perhatian!</p>
    <p className="text-xs text-red-500 mt-1">
      Pembelian <strong>{selectedBatal?.nomorPO}</strong> akan dibatalkan dan stok akan dikurangi kembali.
    </p>
  </div>
  <label className="label">Alasan Pembatalan *</label>
  <textarea className="input h-24 resize-none mb-4" placeholder="Isi alasan pembatalan..."
    value={alasanBatal} onChange={e => setAlasanBatal(e.target.value)} />
  <div className="flex gap-3">
    <button className="btn btn-outline flex-1" onClick={() => { setShowBatalConfirm(false); setAlasanBatal(''); }}>Tutup</button>
    <button className="btn btn-danger flex-1" onClick={handleBatalkan} disabled={bataling || !alasanBatal.trim()}>
      {bataling ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
      {bataling ? 'Memproses...' : 'Ya, Batalkan'}
    </button>
  </div>
</Modal>
    </div>
  );
}
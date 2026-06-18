import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import ReactDOM from 'react-dom';
import { productAPI, transactionAPI, settingsAPI, saldoAPI, customerAPI, pointAPI } from '../services/api';
import { formatRupiah, formatDateTime, PAYMENT_LABELS, PAYMENT_COLORS } from '../utils/helpers';
import { Modal, EmptyState, ReceiptView, PageHeader, Loader, SearchInput } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import {
  ShoppingCart, Search, Plus, Minus, X, CheckCircle2, Loader2,
  History, Package, Printer, Trash2, Eye, AlertTriangle,
  Smartphone, Zap, Gamepad2, Wallet, ArrowLeftRight, Banknote,
  CreditCard, RefreshCw, Briefcase
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';

const DIGITAL_MENUS = [
  { id: 'pulsa',         label: 'Pulsa',          icon: Smartphone },
  { id: 'kuota',         label: 'Kuota',           icon: Zap },
  { id: 'ewallet',       label: 'Top Up E-Wallet', icon: Wallet },
  { id: 'token_listrik', label: 'Token Listrik',   icon: Zap },
  { id: 'game',          label: 'Game Voucher',    icon: Gamepad2 },
  { id: 'transfer',      label: 'Transfer',        icon: ArrowLeftRight },
  { id: 'tarik_tunai',   label: 'Tarik Tunai',     icon: Banknote },
  { id: 'tagihan',       label: 'Tagihan',         icon: CreditCard },
];

const PAYMENT_METHODS = ['cash', 'qris', 'transfer', 'hutang'];

// ─── Rupiah Input ─────────────────────────────────────────────
const RupiahInput = memo(({ value, onChange, placeholder = '0' }) => {
  const formatDisplay = (raw) => {
    if (!raw && raw !== 0) return '';
    const angka = raw.toString().replace(/\D/g, '');
    if (!angka) return '';
    return new Intl.NumberFormat('id-ID').format(parseInt(angka));
  };
  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    onChange(raw);
  };
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold select-none pointer-events-none">Rp</span>
      <input className="input pl-10" value={formatDisplay(value)} onChange={handleChange} placeholder={placeholder} inputMode="numeric" />
    </div>
  );
});

// ─── Saldo Info Box ───────────────────────────────────────────
const SaldoBox = memo(({ saldos, akunId }) => {
  const info = saldos.find(s => s.akunId === akunId);
  if (!info) return null;
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs mt-1.5 ${info.saldo < 50000 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
      <span>{info.icon} Saldo {info.namaAkun}</span>
      <span className="font-bold">{formatRupiah(info.saldo)}</span>
    </div>
  );
});

// ─── Kategori per Group Sumber Dana ──────────────────────────
const MENU_PER_GROUP = {
  'Server Pulsa': ['pulsa', 'kuota', 'ewallet', 'token_listrik', 'game', 'transfer', 'tarik_tunai', 'tagihan'],
  'Bank':         ['transfer', 'tarik_tunai', 'ewallet'],
  'E-Wallet':     ['ewallet', 'tarik_tunai'],
  'Tunai':        [],
};

// ─── Sumber Dana Select ───────────────────────────────────────
const SumberDanaSelect = memo(({ saldos, value, onChange, label = 'Sumber Dana' }) => (
  <div>
    <label className="label">{label}</label>
    <select className="input" value={value} onChange={e => onChange(e.target.value)}>
      <option value="">-- Pilih Sumber Dana --</option>
      {['Server Pulsa', 'Bank', 'E-Wallet', 'Tunai'].map(g => {
        const group = saldos.filter(s => s.group === g);
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
    {value && <SaldoBox saldos={saldos} akunId={value} />}
  </div>
));

// ─── Digital Form ─────────────────────────────────────────────
const DigitalForm = memo(({ saldos, digitalMenu, onAddToCart, defaultSumber = '' }) => {
  const [form, setForm] = useState({ sumberDana: defaultSumber, targetNumber: '', nominal: '', hargaJual: '', cashback: '', keterangan: '' });
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const modal = parseInt(form.nominal) || 0;
  const hargaJual = parseInt(form.hargaJual) || 0;
  const cashback = parseInt(form.cashback) || 0;
  const labaEst = hargaJual && modal ? (hargaJual - modal) + cashback : null;

  const handleAdd = () => {
    if (!form.sumberDana) return toast.error('Pilih sumber dana!');
    if (!form.hargaJual || hargaJual <= 0) return toast.error('Isi harga jual!');
    const sInfo = saldos.find(s => s.akunId === form.sumberDana);
    const menu = DIGITAL_MENUS.find(m => m.id === digitalMenu);
    const nama = form.keterangan ? `${menu?.label} - ${form.keterangan}` : menu?.label || digitalMenu;
    onAddToCart({
      productId: `d-${Date.now()}`, productCode: digitalMenu.slice(0, 4).toUpperCase(),
      productName: nama, category: digitalMenu, type: 'digital',
      sellPrice: hargaJual, purchasePrice: modal || hargaJual,
      quantity: 1, subtotal: hargaJual, maxQty: 999,
      targetNumber: form.targetNumber,
      sumberDana: form.sumberDana, sumberDanaLabel: sInfo?.namaAkun, sumberDanaIcon: sInfo?.icon,
      modalAmount: modal || hargaJual, cashback,
    });
    setForm(f => ({ ...f, targetNumber: '', nominal: '', hargaJual: '', cashback: '', keterangan: '' }));
  };

  return (
    <div className="p-3 space-y-3">
      <SumberDanaSelect saldos={saldos} value={form.sumberDana} onChange={v => F('sumberDana', v)} />
      <div>
        <label className="label">Nomor Tujuan</label>
        <input className="input" placeholder="08xxxxxxxxxx" value={form.targetNumber} onChange={e => F('targetNumber', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Modal (Rp)</label>
          <RupiahInput value={form.nominal} onChange={v => F('nominal', v)} placeholder="Modal keluar" />
        </div>
        <div>
          <label className="label">Harga Jual (Rp) *</label>
          <RupiahInput value={form.hargaJual} onChange={v => F('hargaJual', v)} placeholder="Harga pelanggan" />
        </div>
      </div>
      <div>
        <label className="label">Cashback (Rp) <span className="text-green-600 font-normal text-xs">→ masuk saldo + laba</span></label>
        <RupiahInput value={form.cashback} onChange={v => F('cashback', v)} placeholder="0 jika tidak ada" />
      </div>
      {labaEst !== null && (
        <div className={`rounded-xl px-3 py-2 text-xs ${labaEst >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          <div className="flex justify-between"><span>Laba jual</span><span className="font-bold">{formatRupiah(hargaJual - modal)}</span></div>
          {cashback > 0 && <div className="flex justify-between"><span>+ Cashback</span><span className="font-bold">+{formatRupiah(cashback)}</span></div>}
          <div className="flex justify-between font-bold border-t border-current/20 pt-1 mt-1"><span>Total laba</span><span>{formatRupiah(labaEst)}</span></div>
        </div>
      )}
      <div>
        <label className="label">Keterangan (opsional)</label>
        <input className="input" placeholder="Telkomsel, XL, GoPay, dll" value={form.keterangan} onChange={e => F('keterangan', e.target.value)} />
      </div>
      <button onClick={handleAdd} className="btn btn-primary w-full justify-center"><Plus size={16} /> Tambah ke Keranjang</button>
    </div>
  );
});

// ─── Transfer Form ────────────────────────────────────────────
const TransferForm = memo(({ saldos, onAddToCart, defaultSumber = '' }) => {
  const [form, setForm] = useState({ sumberDana: defaultSumber, nomorTujuan: '', namaTujuan: '', nominal: '', hargaJual: '', cashback: '', keterangan: '' });
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const modal = parseInt(form.nominal) || 0;
  const hargaJual = parseInt(form.hargaJual) || 0;
  const cashback = parseInt(form.cashback) || 0;
  const labaEst = hargaJual && modal ? (hargaJual - modal) + cashback : null;

  const handleAdd = () => {
    if (!form.sumberDana) return toast.error('Pilih sumber dana!');
    // FIXED: Nomor tujuan tidak diwajibkan
    if (!form.nominal) return toast.error('Isi modal!');
    if (!form.hargaJual) return toast.error('Isi harga jual!');
    const sInfo = saldos.find(s => s.akunId === form.sumberDana);
    const nama = form.keterangan ? `Transfer - ${form.keterangan}` : 'Transfer';
    onAddToCart({
      productId: `trf-${Date.now()}`, productCode: 'TRF',
      productName: nama, category: 'transfer', type: 'digital',
      sellPrice: hargaJual, purchasePrice: modal,
      quantity: 1, subtotal: hargaJual, maxQty: 999,
      targetNumber: form.nomorTujuan ? `${form.nomorTujuan}${form.namaTujuan ? ' (' + form.namaTujuan + ')' : ''}` : (form.namaTujuan || '-'),
      sumberDana: form.sumberDana, sumberDanaLabel: sInfo?.namaAkun, sumberDanaIcon: sInfo?.icon,
      modalAmount: modal, cashback,
    });
    setForm(f => ({ ...f, nomorTujuan: '', namaTujuan: '', nominal: '', hargaJual: '', cashback: '', keterangan: '' }));
  };

  return (
    <div className="p-3 space-y-3">
      <SumberDanaSelect saldos={saldos} value={form.sumberDana} onChange={v => F('sumberDana', v)} />
      <div>
        <label className="label">Nomor Tujuan <span className="text-slate-400 font-normal text-xs">(opsional)</span></label>
        <input className="input" placeholder="No. HP / No. Rekening" value={form.nomorTujuan} onChange={e => F('nomorTujuan', e.target.value)} />
      </div>
      <div>
        <label className="label">Nama Penerima (opsional)</label>
        <input className="input" placeholder="Nama penerima" value={form.namaTujuan} onChange={e => F('namaTujuan', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Modal (Rp) *</label>
          <RupiahInput value={form.nominal} onChange={v => F('nominal', v)} placeholder="Modal keluar" />
        </div>
        <div>
          <label className="label">Harga Jual (Rp) *</label>
          <RupiahInput value={form.hargaJual} onChange={v => F('hargaJual', v)} placeholder="Harga pelanggan" />
        </div>
      </div>
      <div>
        <label className="label">Cashback (Rp) <span className="text-green-600 font-normal text-xs">→ masuk saldo + laba</span></label>
        <RupiahInput value={form.cashback} onChange={v => F('cashback', v)} placeholder="0 jika tidak ada" />
      </div>
      {labaEst !== null && (
        <div className={`rounded-xl px-3 py-2 text-xs ${labaEst >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          <div className="flex justify-between font-bold"><span>Total laba</span><span>{formatRupiah(labaEst)}</span></div>
        </div>
      )}
      <div>
        <label className="label">Keterangan (opsional)</label>
        <input className="input" placeholder="GoPay, OVO, BCA, dll" value={form.keterangan} onChange={e => F('keterangan', e.target.value)} />
      </div>
      <button onClick={handleAdd} className="btn btn-primary w-full justify-center"><ArrowLeftRight size={16} /> Tambah ke Keranjang</button>
    </div>
  );
});

// ─── Tarik Tunai Form ─────────────────────────────────────────
const TarikTunaiForm = memo(({ saldos, onAddToCart, defaultSumber = '' }) => {
  const [sumber, setSumber] = useState(defaultSumber);
  const [nominal, setNominal] = useState('');
  const [biaya, setBiaya] = useState('2000');

  const handleAdd = () => {
    if (!sumber) return toast.error('Pilih sumber dana!');
    if (!nominal) return toast.error('Isi nominal!');
    const sInfo = saldos.find(s => s.akunId === sumber);
    const nom = parseInt(nominal);
    const fee = parseInt(biaya) || 0;
    onAddToCart({
      productId: `tt-${Date.now()}`, productCode: 'TT',
      productName: `Tarik Tunai ${formatRupiah(nom)}`,
      category: 'tarik_tunai', type: 'digital',
      sellPrice: fee, purchasePrice: 0, quantity: 1, subtotal: fee, maxQty: 999,
      targetNumber: formatRupiah(nom),
      sumberDana: sumber, sumberDanaLabel: sInfo?.namaAkun, sumberDanaIcon: sInfo?.icon,
      modalAmount: nom,
    });
    toast.success('Tarik tunai ditambahkan!');
    setNominal(''); setBiaya('2000');
  };

  return (
    <div className="p-3 space-y-3">
      <SumberDanaSelect saldos={saldos} value={sumber} onChange={setSumber} />
      <div>
        <label className="label">Nominal Tarik (Rp)</label>
        <RupiahInput value={nominal} onChange={setNominal} placeholder="Nominal tarik" />
        <div className="grid grid-cols-4 gap-1.5 mt-1.5">
          {[50000, 100000, 200000, 500000].map(v => (
            <button key={v} onClick={() => setNominal(String(v))}
              className="py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-600">
              {v / 1000}rb
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Biaya Admin (Rp)</label>
        <RupiahInput value={biaya} onChange={setBiaya} placeholder="Biaya admin" />
      </div>
      <button onClick={handleAdd} className="btn btn-primary w-full justify-center"><Banknote size={16} /> Tambah ke Keranjang</button>
    </div>
  );
});

// ─── Jasa Form ────────────────────────────────────────────────
const JasaForm = memo(({ onAddToCart }) => {
  const [form, setForm] = useState({
    namaJasa: '',
    fee: '',
    keterangan: ''
  });
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const JASA_CEPAT = [
    { nama: 'Pasang Anti Gores', fee: '5000' },
    { nama: 'Numpang Transfer', fee: '5000' },
    { nama: 'Numpang Print', fee: '1000' },
    { nama: 'Jasa Isi Pulsa', fee: '1000' },
    { nama: 'Buat akun google', fee: '5000' },
    { nama: 'Numpang Fotocopy', fee: '500' },
  ];

  const handleAdd = () => {
    if (!form.namaJasa) return toast.error('Isi nama jasa!');
    if (!form.fee || parseInt(form.fee) <= 0) return toast.error('Isi fee jasa!');

    const fee = parseInt(form.fee);
    onAddToCart({
      productId: `jasa-${Date.now()}`,
      productCode: 'JASA',
      productName: form.keterangan
        ? `${form.namaJasa} - ${form.keterangan}`
        : form.namaJasa,
      category: 'jasa',
      type: 'jasa',
      sellPrice: fee,
      purchasePrice: 0,
      quantity: 1,
      subtotal: fee,
      maxQty: 999,
      targetNumber: '',
      sumberDana: null,
    });

    setForm({ namaJasa: '', fee: '', keterangan: '' });
  };

  return (
    <div className="space-y-4">
      {/* Pilihan Cepat */}
      <div>
        <p className="label mb-2">Pilihan Cepat</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {JASA_CEPAT.map(j => (
            <button key={j.nama}
              onClick={() => setForm(f => ({ ...f, namaJasa: j.nama, fee: j.fee }))}
              className={`p-3 rounded-xl border text-left transition-all ${form.namaJasa === j.nama ? 'border-green-400 bg-green-50' : 'border-slate-100 bg-white hover:border-green-300 hover:bg-green-50'}`}>
              <p className="text-xs font-bold text-slate-700">{j.nama}</p>
              <p className="text-sm font-black text-green-600 mt-1">{formatRupiah(parseInt(j.fee))}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4 space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Atau Input Manual</p>

        <div>
          <label className="label">Nama Jasa *</label>
          <input className="input" placeholder="Pasang anti gores, numpang transfer, dll"
            value={form.namaJasa}
            onChange={e => F('namaJasa', e.target.value)} />
        </div>

        <div>
          <label className="label">Fee / Nominal (Rp) *</label>
          <RupiahInput
            value={form.fee}
            onChange={v => F('fee', v)}
            placeholder="Nominal fee jasa"
          />
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            {[5000, 10000, 15000, 20000].map(v => (
              <button key={v} onClick={() => F('fee', String(v))}
                className="py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600">
                {v >= 1000 ? `${v/1000}rb` : v}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Keterangan (opsional)</label>
          <input className="input" placeholder="Detail tambahan..."
            value={form.keterangan}
            onChange={e => F('keterangan', e.target.value)} />
        </div>

        {form.fee && parseInt(form.fee) > 0 && (
          <div className="bg-green-50 rounded-xl p-3 flex justify-between text-sm">
            <span className="text-green-700 font-semibold">{form.namaJasa || 'Jasa'}</span>
            <span className="text-green-700 font-black">{formatRupiah(parseInt(form.fee))}</span>
          </div>
        )}

        <button onClick={handleAdd} className="btn btn-primary w-full justify-center py-3">
          <Plus size={16} /> Tambah ke Keranjang
        </button>
      </div>
    </div>
  );
});

// ══════════════════════════════════════════════════════════════
// KOMPONEN UTAMA
// ══════════════════════════════════════════════════════════════
export default function TransaksiPage() {
  const { user, isAdmin, isOwner, isSuperAdmin } = useAuth();
  const location = useLocation();
  // FIXED: Baca state dari navigate (dari widget dashboard anomaly)
  useEffect(() => {
    if (location.state?.tab === 'riwayat') {
      setActiveMainTab('riwayat');
      if (location.state?.profitMinus) setProfitMinusFilter(true);
      window.history.replaceState({}, document.title);
    }
  }, []); // eslint-disable-line
  const isPrivileged = isAdmin || isOwner || isSuperAdmin; // boleh void transaksi lama
  const [activeMainTab, setActiveMainTab] = useState('kasir');
  const [activeTab, setActiveTab] = useState('fisik');
  const [digitalMenu, setDigitalMenu] = useState('pulsa');
  const [selectedSumberDana, setSelectedSumberDana] = useState('');
  const [products, setProducts] = useState([]);
  const [saldos, setSaldos] = useState([]);
  const [cart, setCart] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [discount, setDiscount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [selectedMember, setSelectedMember] = useState(null); // member yang dipilih
  const [redeemPoints, setRedeemPoints] = useState(''); // poin yang mau diredeem
  const [redeemDiskon, setRedeemDiskon] = useState(0); // nilai diskon dari redeem poin
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [showRedeemInput, setShowRedeemInput] = useState(false);
  const [memberSearch, setMemberSearch] = useState(''); // input search member
  const [memberResults, setMemberResults] = useState([]); // hasil search
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [showDaftarMember, setShowDaftarMember] = useState(false); // form daftar member baru
  const [daftarForm, setDaftarForm] = useState({ name: '', phone: '', address: '' });
  const [daftarLoading, setDaftarLoading] = useState(false);
  const [akunTransfer, setAkunTransfer] = useState('');
  const [akunQris, setAkunQris] = useState('');
  const [kasTunai, setKasTunai] = useState(0);

  // Mobile bottom sheet keranjang
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [sheetDragY, setSheetDragY] = useState(0);
  const sheetDragStartY = useRef(null);

  // Riwayat
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txSearch, setTxSearch] = useState('');
  const [txPage, setTxPage] = useState(1);
  const [profitMinusFilter, setProfitMinusFilter] = useState(false);
  const [marqueeSettings, setMarqueeSettings] = useState({ enabled: true, speed: 28, messages: [
    '💪 Semangat bekerja! Kejujuran adalah aset terbaik kita',
    '🌟 Setiap transaksi yang jujur membangun kepercayaan pelanggan',
    '✅ Teliti sebelum input, cek kembali sebelum bayar',
    '🤝 Pelanggan yang puas adalah kebanggaan kita bersama',
    '💡 Input yang benar hari ini, laporan yang akurat esok hari',
    '🏆 Kerja keras dan jujur adalah kunci kesuksesan toko kita',
  ]});
  const [txPages, setTxPages] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [txTotalItems, setTxTotalItems] = useState(0);
  const [todayTx, setTodayTx]       = useState(0);
  const [todayItems, setTodayItems] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  // Riwayat Pembatalan (admin/owner only)
  const [voidedTx, setVoidedTx] = useState([]);
  const [voidedLoading, setVoidedLoading] = useState(false);
  const [voidedSearch, setVoidedSearch] = useState('');
  const [voidedPage, setVoidedPage] = useState(1);
  const [voidedPages, setVoidedPages] = useState(1);
  const [voidedTotal, setVoidedTotal] = useState(0);

  const codeRef = useRef();
  const amountPaidRef = useRef(); // FIXED: ref untuk keyboard shortcut focus input bayar
  const printRef = useRef();
  const printRefDetail = useRef(); // ref untuk cetak dari riwayat

  const PAGE_STYLE = `
    @page { size: 58mm auto !important; margin: 0mm !important; }
    html, body { width: 58mm !important; min-width: 58mm !important; max-width: 58mm !important; margin: 0 !important; padding: 0 !important; background: white !important; }
    .print-container { width: 58mm !important; max-width: 58mm !important; font-family: 'Courier New', Courier, monospace !important; font-size: 9pt !important; line-height: 1.3 !important; color: #000 !important; padding: 2mm !important; margin: 0 !important; }
    .print-title { font-size: 11pt !important; font-weight: bold !important; }
    .print-total { font-size: 10pt !important; font-weight: bold !important; }
  `;

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    pageStyle: PAGE_STYLE,
    removeAfterPrint: true,
    copyStyles: false,
  });

  const handlePrintDetail = useReactToPrint({
    content: () => printRefDetail.current,
    pageStyle: PAGE_STYLE,
    removeAfterPrint: true,
    copyStyles: false,
  });

  const doPrintDetail = () => {
    setTimeout(() => handlePrintDetail(), 300);
  };

  // Share struk via WhatsApp
  const handleShareWA = (tx) => {
    if (!tx) return;
    const fmt = (n) => new Intl.NumberFormat('id-ID').format(n || 0);
    const tgl = new Date(tx.transactionDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const items = tx.items?.map(i => `  • ${i.productName} ${i.quantity}x${fmt(i.sellPrice)} = Rp ${fmt(i.subtotal)}`).join('\n');
    const PAYMENT_LABEL = { cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer', hutang: 'Hutang' };
    const text = [
      `🧾 *STRUK ${settings?.storeName || 'KONTER'}*`,
      `📅 ${tgl}`,
      `🔖 ${tx.invoiceNumber}`,
      `👤 Kasir: ${tx.cashierName || '-'}`,
      tx.customerName && tx.customerName !== 'Umum' ? `🙍 Pelanggan: ${tx.customerName}` : '',
      ``,
      `*Item:*`,
      items,
      ``,
      tx.discount > 0 ? `Diskon: -Rp ${fmt(tx.discount)}` : '',
      `*TOTAL: Rp ${fmt(tx.total)}*`,
      `Bayar (${PAYMENT_LABEL[tx.paymentMethod] || tx.paymentMethod}): Rp ${fmt(tx.amountPaid || tx.total)}`,
      tx.change > 0 ? `Kembalian: Rp ${fmt(tx.change)}` : '',
      ``,
      settings?.receiptFooter || 'Terima kasih sudah berbelanja!',
    ].filter(l => l !== null && l !== undefined).join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const refreshSaldos = useCallback(() => {
    saldoAPI.getAll().then(r => {
      const all = r.data.data || [];
      setSaldos(all.filter(s => s.akunId !== 'tunai'));
      const kas = all.find(s => s.akunId === 'tunai');
      setKasTunai(kas?.saldo || 0);
    }).catch(() => {});
  }, []);

  const loadTodaySummary = useCallback(() => {
    transactionAPI.getTodaySummary()
      .then(r => {
        const d = r.data.data || {};
        setTodayTx(d.totalTransactions || 0);
        setTodayItems(d.totalItems || 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    settingsAPI.get().then(r => {
      setSettings(r.data.data);
      if (r.data?.data?.marqueeSettings) setMarqueeSettings(r.data.data.marqueeSettings);
    }).catch(() => {});
    productAPI.getAll({ limit: 300 }).then(r => setProducts(r.data.data || [])).catch(() => {});
    refreshSaldos();
    loadTodaySummary();
    codeRef.current?.focus();
  }, [refreshSaldos, loadTodaySummary]);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const { data } = await transactionAPI.getAll({ search: txSearch, page: txPage, limit: 15, ...(profitMinusFilter ? { profitMinus: 'true' } : {}) });
      const txData = data.data || [];
      setTransactions(txData);
      setTxTotal(data.total || 0);
      setTxPages(data.pages || 1);
      setTxTotalItems(txData.reduce((s, tx) => s + (tx.items?.length || 0), 0));
    } catch { toast.error('Gagal memuat riwayat'); }
    finally { setTxLoading(false); }
  }, [txSearch, txPage, profitMinusFilter]);

  const loadVoidedTransactions = useCallback(async () => {
    setVoidedLoading(true);
    try {
      const { data } = await transactionAPI.getVoided({ search: voidedSearch, page: voidedPage, limit: 15 });
      setVoidedTx(data.data || []);
      setVoidedTotal(data.total || 0);
      setVoidedPages(data.pages || 1);
    } catch { toast.error('Gagal memuat riwayat pembatalan'); }
    finally { setVoidedLoading(false); }
  }, [voidedSearch, voidedPage]);

  useEffect(() => {
    if (activeMainTab === 'riwayat') loadTransactions();
  }, [activeMainTab, loadTransactions]);

  useEffect(() => {
    if (activeMainTab === 'pembatalan') loadVoidedTransactions();
  }, [activeMainTab, loadVoidedTransactions]);

  const fisikProducts = products.filter(p => p.type === 'fisik');
  const jasaProducts  = products.filter(p => p.type === 'jasa');

  // ── Cart ────────────────────────────────────────────────────
  const addToCart = useCallback((product) => {
    if (product.type === 'fisik' && product.stock <= 0) return toast.error(`Stok ${product.name} habis!`);
    setCart(prev => {
      const existing = prev.find(i => i.productId === product._id);
      if (existing) {
        if (product.type === 'fisik' && existing.quantity >= product.stock) { toast.error(`Stok hanya ${product.stock}`); return prev; }
        return prev.map(i => i.productId === product._id ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.sellPrice } : i);
      }
      return [...prev, {
        productId: product._id, productCode: product.code,
        productName: product.name, category: product.category,
        type: product.type, sellPrice: product.sellPrice,
        purchasePrice: product.type === 'jasa' ? 0 : product.purchasePrice,
        quantity: 1, subtotal: product.sellPrice,
        maxQty: product.type === 'fisik' ? product.stock : 999,
        targetNumber: '', sumberDana: null
      }];
    });
  }, []);

  const addItemToCart = useCallback((item) => {
    setCart(prev => [...prev, item]);
    toast.success(`${item.productName} ditambahkan!`);
  }, []);

  const updateQty = useCallback((idx, delta) => setCart(prev => prev.map((item, i) => {
    if (i !== idx) return item;
    const newQty = Math.max(1, Math.min(item.quantity + delta, item.maxQty));
    return { ...item, quantity: newQty, subtotal: newQty * item.sellPrice };
  })), []);

  const removeItem = useCallback((idx) => setCart(prev => prev.filter((_, i) => i !== idx)), []);

  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const discountAmt = parseInt(discount) || 0;
  const total = subtotal - discountAmt;
  const change = paymentMethod === 'cash' ? (parseInt(amountPaid) || 0) - total : 0;

  const formatDisp = (v) => {
    if (!v) return '';
    const n = v.toString().replace(/\D/g, '');
    return n ? new Intl.NumberFormat('id-ID').format(parseInt(n)) : '';
  };

  // ── Checkout ────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) return toast.error('Keranjang kosong!');
    if (paymentMethod === 'transfer' && !akunTransfer) return toast.error('Pilih akun tujuan transfer!');
    if (paymentMethod === 'qris' && !akunQris) return toast.error('Pilih akun tujuan QRIS!');
    // Kalau cash dan field diisi, validasi harus >= total
    // Kalau kosong = otomatis Pas (bayar exact), tidak perlu error
    const paidAmount = parseInt(amountPaid) || 0;
    if (paymentMethod === 'cash' && paidAmount > 0 && paidAmount < total) return toast.error('Jumlah bayar kurang!');
    setLoading(true);
    try {
      const { data } = await transactionAPI.create({
        items: cart.map(item => ({ ...item, purchasePrice: item.purchasePrice || item.sellPrice })),
        customerName: customerName || 'Umum',
        customerId: selectedMember?._id || null,
        paymentMethod, amountPaid: parseInt(amountPaid) || total, discount: discountAmt,
        transferData: paymentMethod === 'transfer' && akunTransfer ? { akunId: akunTransfer } : 
                      paymentMethod === 'qris' && akunQris ? { akunId: akunQris } : undefined,
      });

      // Update saldo digital
      for (const item of cart) {
        if (item.type !== 'digital' || !item.sumberDana) continue;
        try {
          if (item.category === 'tarik_tunai') {
            const nominalTarik = item.modalAmount || 0;
            if (nominalTarik > 0) {
              await saldoAPI.topUp({ akunId: item.sumberDana, amount: nominalTarik, keterangan: `Tarik Tunai masuk | ${data.data.invoiceNumber}` });
            }
            await saldoAPI.topUp({ akunId: 'tunai', amount: -nominalTarik, keterangan: `Kas keluar Tarik Tunai | ${data.data.invoiceNumber}` });
          } else {
            const modalKeluar = (item.modalAmount || item.purchasePrice || 0) * (item.quantity || 1);
            if (modalKeluar > 0) {
              await saldoAPI.topUp({ akunId: item.sumberDana, amount: -modalKeluar, keterangan: `${item.productName}${item.targetNumber ? ' → ' + item.targetNumber : ''} | ${data.data.invoiceNumber}` });
            }
            if (item.cashback && item.cashback > 0) {
              const totalCashback = item.cashback * (item.quantity || 1);
              await saldoAPI.topUp({ akunId: item.sumberDana, amount: totalCashback, keterangan: `Cashback ${item.productName} | ${data.data.invoiceNumber}` });
            }
          }
        } catch (err) { console.error('Saldo error:', err.message); }
      }

      // Transfer/QRIS → tambah saldo akun tujuan
      if (paymentMethod === 'transfer' && akunTransfer) {
        await saldoAPI.topUp({ akunId: akunTransfer, amount: total, keterangan: `Pembayaran Transfer ${data.data.invoiceNumber}` }).catch(() => {});
      }
      if (paymentMethod === 'qris' && akunQris) {
        await saldoAPI.topUp({ akunId: akunQris, amount: total, keterangan: `Pembayaran QRIS ${data.data.invoiceNumber}` }).catch(() => {});
      }

      // Cash → tambah kas tunai
      if (paymentMethod === 'cash') {
        await saldoAPI.topUp({ akunId: 'tunai', amount: total, keterangan: `Penjualan Cash ${data.data.invoiceNumber}` }).catch(() => {});
      }

      refreshSaldos();
      setLastTransaction(data.data);
      setShowReceipt(true);
      setCart([]); setAmountPaid(''); setDiscount(''); setCustomerName('');
      setSelectedMember(null); setMemberSearch(''); setMemberResults([]);
      setRedeemDiskon(0); setRedeemPoints(''); setShowRedeemInput(false);
      setAkunTransfer(''); setAkunQris('');
      toast.success(`✅ ${data.data.invoiceNumber} berhasil!`);
      if (data.earnedPoints > 0) {
        setTimeout(() => toast.success(`⭐ +${data.earnedPoints} poin untuk ${customerName}!`, { duration: 4000 }), 800);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transaksi gagal');
    } finally { setLoading(false); }
  };

  // Helper: cek apakah transaksi hari ini
  const isToday = (dateStr) => {
    const today = new Date();
    const txDate = new Date(dateStr);
    return txDate.getFullYear() === today.getFullYear() &&
           txDate.getMonth()    === today.getMonth() &&
           txDate.getDate()     === today.getDate();
  };

  // Karyawan hanya boleh void transaksi hari ini
  const canVoid = (tx) => {
    if (!tx || tx.isVoid) return false;
    if (isPrivileged) return true;          // owner/admin/superadmin bebas
    return isToday(tx.transactionDate);     // karyawan: hanya hari ini
  };

  const handleVoid = async () => {
    if (!voidReason.trim()) return toast.error('Isi alasan pembatalan!');
    setVoiding(true);
    try {
      // Semua logika kembalikan saldo dihandle backend voidTransaction
      await transactionAPI.void(selectedTx._id, { voidReason });

      refreshSaldos();
      toast.success('Transaksi dibatalkan & saldo dikembalikan');
      setShowVoidConfirm(false); setShowDetail(false); setVoidReason('');
      loadTransactions();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal membatalkan'); }
    finally { setVoiding(false); }
  };

  const searchProducts = async (q) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try { const { data } = await productAPI.getAll({ search: q }); setSearchResults(data.data || []); }
    catch {} finally { setSearching(false); }
  };

  const handleCodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      // FIXED: Enter di input kosong = langsung checkout
      if (!codeInput.trim()) {
        if (cart.length === 0) return toast.error('Keranjang kosong!');
        handleCheckout();
        return;
      }
      productAPI.getByCode(codeInput.trim())
        .then(r => { if (r.data.success) addToCart(r.data.data); else toast.error('Tidak ditemukan'); })
        .catch(() => toast.error('Tidak ditemukan'));
      setCodeInput('');
    }
  };

  // FIXED: Global keyboard shortcut untuk kasir
  useEffect(() => {
    const handleGlobalKey = (e) => {
      // Abaikan jika sedang mengetik di input/textarea/select
      const tag = document.activeElement?.tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      // F2 -> Fokus ke input kode produk
      if (e.key === 'F2') {
        e.preventDefault();
        setActiveMainTab('kasir');
        setTimeout(() => codeRef.current?.focus(), 50);
        toast('Scan / ketik kode produk', { icon: '🔍', duration: 1500 });
        return;
      }

      // F4 -> Set jumlah bayar = total (Pas)
      if (e.key === 'F4') {
        e.preventDefault();
        setPaymentMethod('cash');
        setAmountPaid(String(cart.reduce((s, i) => s + i.subtotal, 0)));
        amountPaidRef.current?.focus();
        toast('Bayar pas', { icon: '💵', duration: 1500 });
        return;
      }

      // F6 -> Fokus ke input jumlah bayar
      if (e.key === 'F6') {
        e.preventDefault();
        setPaymentMethod('cash');
        amountPaidRef.current?.focus();
        amountPaidRef.current?.select();
        return;
      }

      // F9 -> Proses bayar (checkout)
      if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length === 0) { toast.error('Keranjang kosong!'); return; }
        handleCheckout();
        return;
      }

      // Escape -> Kosongkan keranjang (hanya saat tidak sedang mengetik)
      if (e.key === 'Escape' && !isTyping && cart.length > 0) {
        e.preventDefault();
        if (window.confirm('Kosongkan keranjang?')) setCart([]);
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [cart, handleCheckout]); // eslint-disable-line

  // ── Fungsi Member ──────────────────────────────────────────
  const searchMember = async (q) => {
    setMemberSearch(q);
    if (!q.trim()) { setMemberResults([]); setShowMemberDropdown(false); return; }
    setShowMemberDropdown(true); // tampilkan dropdown dulu termasuk tombol daftar
    setMemberSearchLoading(true);
    try {
      const { data } = await customerAPI.getAll({ search: q, limit: 5 });
      setMemberResults(data.data || []);
    } catch {}
    finally { setMemberSearchLoading(false); }
  };

  const selectMember = (member) => {
    setSelectedMember(member);
    setCustomerName(member.name);
    setMemberSearch(member.name);
    setShowMemberDropdown(false);
  };

  const handleDaftarMember = async () => {
    if (!daftarForm.name) return toast.error('Nama wajib diisi!');
    setDaftarLoading(true);
    try {
      const { data } = await customerAPI.create({ ...daftarForm, isMember: true, memberSince: new Date() });
      toast.success(`✅ ${daftarForm.name} berhasil didaftarkan sebagai member!`);
      selectMember({ ...data.data, points: 0 });
      setShowDaftarMember(false);
      setDaftarForm({ name: '', phone: '', address: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mendaftarkan member');
    } finally { setDaftarLoading(false); }
  };

  const applyRedeem = async () => {
    if (!selectedMember || !redeemPoints) return;
    const pts = parseInt(redeemPoints) || 0;
    if (pts <= 0) return toast.error('Masukkan jumlah poin!');
    setRedeemLoading(true);
    try {
      const { data } = await pointAPI.redeem({ customerId: selectedMember._id, pointsToRedeem: pts });
      setRedeemDiskon(data.data.diskon);
      setDiscount(String(data.data.diskon));
      setSelectedMember(m => ({ ...m, points: data.data.sisaPoin }));
      setShowRedeemInput(false);
      setRedeemPoints('');
      toast.success(`✅ ${pts} poin diredeem = diskon ${formatRupiah(data.data.diskon)}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal redeem poin');
    } finally { setRedeemLoading(false); }
  };

  const cancelRedeem = () => {
    setRedeemDiskon(0);
    setDiscount('');
    setRedeemPoints('');
    setShowRedeemInput(false);
  };

  const clearMember = () => {
    setSelectedMember(null);
    setCustomerName('');
    setMemberSearch('');
    setMemberResults([]);
    setShowMemberDropdown(false);
    setRedeemDiskon(0);
    setRedeemPoints('');
    setShowRedeemInput(false);
    setDiscount('');
    setShowDaftarMember(false);
    setDaftarForm({ name: '', phone: '', address: '' });
  };

  // Tutup bottom sheet otomatis saat keranjang kosong (mis. setelah checkout)
  useEffect(() => {
    if (cart.length === 0 && showMobileCart) setShowMobileCart(false);
  }, [cart.length, showMobileCart]);

  // Swipe-down untuk dismiss bottom sheet
  const handleSheetTouchStart = (e) => {
    sheetDragStartY.current = e.touches[0].clientY;
    setSheetDragY(0);
  };
  const handleSheetTouchMove = (e) => {
    if (sheetDragStartY.current === null) return;
    const dy = e.touches[0].clientY - sheetDragStartY.current;
    if (dy > 0) setSheetDragY(dy);
  };
  const handleSheetTouchEnd = () => {
    if (sheetDragY > 80) setShowMobileCart(false);
    setSheetDragY(0);
    sheetDragStartY.current = null;
  };

  // Hitung jumlah qty per productId di keranjang (untuk badge di kartu produk fisik)
  const cartQtyByProduct = cart.reduce((m, item) => {
    if (item.productId) m[item.productId] = (m[item.productId] || 0) + item.quantity;
    return m;
  }, {});
  const totalCartQty = cart.reduce((s, i) => s + i.quantity, 0);

  // ── Bagian keranjang dipecah agar desktop & mobile bisa pakai layout berbeda
  //    Desktop: header | items(scroll) | form+bayar
  //    Mobile : header | items+form(scroll) | bayar(pinned)
  const renderCartHeader = () => (
    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2">
        <ShoppingCart size={16} className="text-blue-600" />
        <span className="font-bold text-sm">Keranjang</span>
        {cart.length > 0 && <span className="badge badge-blue">{cart.length}</span>}
      </div>
      {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-red-500 py-1 px-2 -my-1 -mr-2">Kosongkan</button>}
    </div>
  );

  const renderCartItems = () => (
    cart.length === 0
      ? <EmptyState message="Tambahkan produk ke keranjang" icon={ShoppingCart} />
      : cart.map((item, idx) => (
        <div key={item.productId || idx} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
          <div className="flex justify-between items-start mb-1 gap-2">
            <p className="text-xs sm:text-sm font-bold text-slate-700 flex-1 leading-tight break-words">{item.productName}</p>
            <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 flex-shrink-0 p-1 -m-1"><X size={16} /></button>
          </div>
          {item.type === 'jasa' && <span className="badge badge-green text-xs mb-1">Jasa</span>}
          {item.sumberDana && <p className="text-xs text-blue-500 mb-0.5 truncate">{item.sumberDanaIcon} {item.sumberDanaLabel}</p>}
          {item.targetNumber && <p className="text-xs text-slate-400 mb-1 truncate">→ {item.targetNumber}</p>}
          <div className="flex items-center justify-between mt-1 gap-2">
            <div className="flex items-center gap-1.5">
              <button onClick={() => updateQty(idx, -1)} className="w-8 h-8 sm:w-7 sm:h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 active:scale-95"><Minus size={14} /></button>
              <span className="text-sm font-bold text-slate-700 w-7 text-center">{item.quantity}</span>
              <button onClick={() => updateQty(idx, 1)} className="w-8 h-8 sm:w-7 sm:h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 active:scale-95"><Plus size={14} /></button>
            </div>
            <p className="text-sm font-bold text-blue-600 text-right">{formatRupiah(item.subtotal)}</p>
          </div>
        </div>
      ))
  );

  const renderCartForm = () => (
    <>
        {selectedMember && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-yellow-700">⭐ {selectedMember.name}</p>
                <p className="text-xs text-yellow-600">{selectedMember.points?.toLocaleString("id-ID") || 0} poin tersedia</p>
              </div>
              <div className="flex items-center gap-1.5">
                {selectedMember.isMember && selectedMember.points > 0 && !redeemDiskon && (
                  <button onClick={() => setShowRedeemInput(r => !r)}
                    className="btn btn-outline py-1 px-2 text-xs text-yellow-600 border-yellow-300">
                    🎁 Tukar Poin
                  </button>
                )}
                {redeemDiskon > 0 && (
                  <button onClick={cancelRedeem}
                    className="btn btn-outline py-1 px-2 text-xs text-red-500 border-red-300">
                    ✕ Batal Redeem
                  </button>
                )}
                <button onClick={clearMember} className="text-yellow-400 hover:text-red-400 text-lg leading-none">&times;</button>
              </div>
            </div>
            {showRedeemInput && (
              <div className="mt-2 pt-2 border-t border-yellow-200">
                <p className="text-xs text-yellow-600 mb-1.5">Masukkan jumlah poin yang ingin ditukar:</p>
                <div className="flex gap-1.5">
                  <input className="input text-xs py-1.5 flex-1" type="text" inputMode="numeric"
                    placeholder={`Maks ${selectedMember.points?.toLocaleString("id-ID")} poin`}
                    value={redeemPoints}
                    onChange={e => setRedeemPoints(e.target.value.replace(/\D/g, ""))}
                  />
                  <button onClick={applyRedeem} disabled={redeemLoading}
                    className="btn btn-primary py-1.5 px-3 text-xs">
                    {redeemLoading ? "..." : "Terapkan"}
                  </button>
                </div>
                {redeemPoints && parseInt(redeemPoints) > 0 && (
                  <p className="text-xs text-green-600 font-bold mt-1">
                    = diskon {formatRupiah(parseInt(redeemPoints) * (settings?.pointSettings?.rupiahPerPoint || 10))}
                  </p>
                )}
              </div>
            )}
            {redeemDiskon > 0 && (
              <p className="text-xs text-green-700 font-bold mt-1.5">✅ Redeem aktif: diskon {formatRupiah(redeemDiskon)}</p>
            )}
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-1.5">
          <div className="relative flex-1 min-w-0">
            <input className="input text-sm sm:text-xs py-2 sm:py-1.5 w-full"
              placeholder={selectedMember ? selectedMember.name : "Cari member / nama pelanggan..."}
              value={memberSearch}
              onChange={e => searchMember(e.target.value)}
              onFocus={() => setShowMemberDropdown(true)}
              onBlur={() => setTimeout(() => setShowMemberDropdown(false), 200)}
            />
            {showMemberDropdown && (memberResults.length > 0 || memberSearch) && (
              <div className="absolute top-full left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                {memberSearchLoading && <div className="px-3 py-2 text-xs text-slate-400">Mencari...</div>}
                {memberResults.map(m => (
                  <button key={m._id} onMouseDown={() => selectMember(m)}
                    className="w-full px-3 py-2 text-left hover:bg-yellow-50 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-700">{m.name}</p>
                      <p className="text-xs text-slate-400">{m.phone || "-"}</p>
                    </div>
                    <div className="text-right">
                      {m.isMember
                        ? <span className="text-xs font-bold text-yellow-600">⭐ {m.points?.toLocaleString("id-ID")} poin</span>
                        : <span className="text-xs text-slate-400">Bukan member</span>}
                    </div>
                  </button>
                ))}
                {memberSearch && (
                  <button onMouseDown={() => { setCustomerName(memberSearch); setShowMemberDropdown(false); }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 border-t">
                    <p className="text-xs text-slate-500">Pakai nama "<span className="font-bold">{memberSearch}</span>" (tanpa member)</p>
                  </button>
                )}
                <button onMouseDown={() => { setShowDaftarMember(true); setShowMemberDropdown(false); setDaftarForm(f => ({...f, name: memberSearch, phone: '', address: ''})); }}
                  className="w-full px-3 py-2 text-left hover:bg-green-50 border-t flex items-center gap-2">
                  <span className="text-green-600 font-bold text-xs">+ Daftar Member Baru</span>
                </button>
              </div>
            )}
            {showDaftarMember && (
              <div className="mt-1.5 bg-green-50 border border-green-200 rounded-xl p-2.5 space-y-1.5">
                <p className="text-xs font-bold text-green-700">+ Daftar Member Baru</p>
                <input className="input text-xs py-1.5" placeholder="Nama *"
                  value={daftarForm.name} onChange={e => setDaftarForm(f=>({...f,name:e.target.value}))} />
                <input className="input text-xs py-1.5" placeholder="No. WhatsApp"
                  value={daftarForm.phone} onChange={e => setDaftarForm(f=>({...f,phone:e.target.value}))} />
                <input className="input text-xs py-1.5" placeholder="Alamat (opsional)"
                  value={daftarForm.address} onChange={e => setDaftarForm(f=>({...f,address:e.target.value}))} />
                <div className="flex gap-1.5">
                  <button onClick={() => { setShowDaftarMember(false); setDaftarForm({name:'',phone:'',address:''}); }}
                    className="btn btn-outline py-1 px-2 text-xs flex-1">Batal</button>
                  <button onClick={handleDaftarMember} disabled={daftarLoading}
                    className="btn btn-primary py-1 px-2 text-xs flex-1">
                    {daftarLoading ? '...'  : 'Daftar & Pilih'}
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="relative w-full sm:w-28 flex-shrink-0">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold select-none pointer-events-none">Rp</span>
            <input className="input text-sm sm:text-xs py-2 sm:py-1.5 pl-7 w-full" placeholder="Diskon"
              value={formatDisp(discount)}
              onChange={e => setDiscount(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-1.5">
          {PAYMENT_METHODS.map(k => (
            <button key={k} onClick={() => setPaymentMethod(k)}
              className={`py-2.5 sm:py-2 rounded-lg text-xs font-semibold transition border ${paymentMethod === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
              {PAYMENT_LABELS[k]}
            </button>
          ))}
        </div>

        {(paymentMethod === 'transfer' || paymentMethod === 'qris') && (
          <div>
            <label className="label text-xs">{paymentMethod === 'transfer' ? '🏦 Transfer masuk ke' : '📱 QRIS masuk ke'}</label>
            <select className="input text-sm"
              value={paymentMethod === 'transfer' ? akunTransfer : akunQris}
              onChange={e => paymentMethod === 'transfer' ? setAkunTransfer(e.target.value) : setAkunQris(e.target.value)}>
              <option value="">-- Pilih Akun --</option>
              {['Bank', 'E-Wallet', 'Server Pulsa', 'Tunai'].map(g => {
                const group = saldos.filter(s => s.group === g);
                if (!group.length) return null;
                return (
                  <optgroup key={g} label={g}>
                    {group.map(s => <option key={s.akunId} value={s.akunId}>{s.icon} {s.namaAkun}</option>)}
                  </optgroup>
                );
              })}
            </select>
          </div>
        )}

        {paymentMethod === 'cash' && (
          <div>
            <div className="relative mb-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold select-none pointer-events-none">Rp</span>
              <input ref={amountPaidRef} className="input pl-10 text-sm" placeholder="Jumlah bayar (F6)"
                value={formatDisp(amountPaid)}
                onChange={e => setAmountPaid(e.target.value.replace(/\D/g, ''))}
                inputMode="numeric" />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[total, 50000, 100000].map(v => (
                <button key={v} onClick={() => setAmountPaid(String(v))}
                  className="py-2 sm:py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 active:scale-95">
                  {v === total ? 'Pas' : `${v / 1000}rb`}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-50 rounded-xl p-2.5 text-xs space-y-1">
          <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatRupiah(subtotal)}</span></div>
          {discountAmt > 0 && <div className="flex justify-between text-red-500"><span>Diskon</span><span>-{formatRupiah(discountAmt)}</span></div>}
          <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-200">
            <span>Total</span><span className="text-blue-600">{formatRupiah(total)}</span>
          </div>
          {paymentMethod === 'cash' && amountPaid && (
            <div className={`flex justify-between font-semibold ${change < 0 ? 'text-red-500' : 'text-green-600'}`}>
              <span>Kembalian</span><span>{formatRupiah(change)}</span>
            </div>
          )}
        </div>
    </>
  );

  const renderBayarButton = () => (
    <button onClick={handleCheckout} disabled={loading || cart.length === 0} className="btn btn-primary w-full justify-center py-3" title="Shortcut: F9">
      {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
      {loading ? 'Memproses...' : `Bayar ${formatRupiah(total)}`}
    </button>
  );

  return (
    <div className="animate-fade-in-up">
      {/* Marquee motivasi — dikontrol dari Pengaturan */}
      {marqueeSettings.enabled !== false && marqueeSettings.messages?.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #8b1a6b 0%, #c026d3 100%)',
          borderRadius: 8, padding: '5px 12px', marginBottom: 8,
          overflow: 'hidden', position: 'relative', height: 28,
          display: 'flex', alignItems: 'center',
        }}>
          <style>{`
            @keyframes marquee-tx { 0% { transform: translateX(100vw) } 100% { transform: translateX(-100%) } }
            .marquee-tx-track { display: inline-block; white-space: nowrap; animation: marquee-tx ${marqueeSettings.speed || 28}s linear infinite; position: absolute; }
            .marquee-tx-track:hover { animation-play-state: paused; }
          `}</style>
          <div className="marquee-tx-track" style={{ color: 'white', fontSize: 11.5, fontWeight: 600 }}>
            {[...marqueeSettings.messages, ...marqueeSettings.messages].map((msg, i) => (
              <span key={i} style={{ marginRight: 80 }}>✨ {msg}</span>
            ))}
          </div>
        </div>
      )}

      <PageHeader
        title="Transaksi"
        subtitle="Kasir produk fisik, jasa & digital"
        actions={
          <div className="flex items-center gap-2">
            <button className="btn btn-outline" onClick={() => {
              productAPI.getAll({ limit: 300 }).then(r => setProducts(r.data.data || [])).catch(() => {});
              refreshSaldos();
              loadTodaySummary();
              toast.success('Data diperbarui!');
            }}>
              <RefreshCw size={16} /> Refresh
            </button>

          </div>
        }
      />

      <div className="flex gap-2 mb-4 overflow-x-auto -mx-1 px-1 pb-1 sm:pb-0 sm:mx-0 sm:px-0">
        <button onClick={() => setActiveMainTab('kasir')} className={`btn flex-shrink-0 ${activeMainTab === 'kasir' ? 'btn-primary' : 'btn-outline'}`}>
          <ShoppingCart size={16} /> Kasir
        </button>
        <button onClick={() => setActiveMainTab('riwayat')} className={`btn flex-shrink-0 ${activeMainTab === 'riwayat' ? 'btn-primary' : 'btn-outline'}`}>
          <History size={16} /> Riwayat
        </button>
        {isPrivileged && (
          <button onClick={() => setActiveMainTab('pembatalan')} className={`btn flex-shrink-0 ${activeMainTab === 'pembatalan' ? 'btn-danger' : 'btn-outline'}`}>
            <Trash2 size={16} /> Pembatalan
          </button>
        )}
      </div>

      {/* ── Kartu ringkasan — selalu tampil ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4">
        <div className="card !p-3 sm:!p-4 flex items-center gap-3">
          <div className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <ShoppingCart size={18} className="text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400 font-medium truncate">Transaksi Hari Ini</p>
            <p className="text-base sm:text-lg font-bold text-blue-600">{todayTx} <span className="text-xs font-normal text-slate-400">transaksi</span></p>
          </div>
        </div>
        <div className="card !p-3 sm:!p-4 flex items-center gap-3">
          <div className="w-10 h-10 sm:w-9 sm:h-9 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Package size={18} className="text-emerald-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400 font-medium truncate">Item Terjual Hari Ini</p>
            <p className="text-base sm:text-lg font-bold text-emerald-600">{todayItems} <span className="text-xs font-normal text-slate-400">item</span></p>
          </div>
        </div>
        <div className={`card !p-3 sm:!p-4 flex items-center gap-3 ${kasTunai < 50000 ? 'border-red-200 bg-red-50' : ''}`}>
          <div className={`w-10 h-10 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${kasTunai < 50000 ? 'bg-red-100' : 'bg-yellow-100'}`}>
            <span className="text-lg">💵</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400 font-medium truncate">Kas Tunai</p>
            <p className={`text-base sm:text-lg font-bold flex items-center gap-1.5 flex-wrap ${kasTunai < 50000 ? 'text-red-600' : 'text-yellow-600'}`}>
              <span className="truncate">{formatRupiah(kasTunai)}</span>
              {kasTunai < 50000 && <span className="badge badge-red text-xs flex-shrink-0">Rendah!</span>}
            </p>
          </div>
        </div>
      </div>

      {/* ══ KASIR ══ */}
      {activeMainTab === 'kasir' && (
        <>
        <div className="flex flex-col lg:flex-row lg:items-start gap-3 pb-32 lg:pb-0">

          {/* Kiri — height menyesuaikan konten di mobile; desktop dibatasi viewport agar produk scroll internal */}
          <div className="flex-1 min-w-0 flex flex-col card p-0 lg:max-h-[calc(100vh-2rem)] lg:overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-100 flex-shrink-0">
              <button onClick={() => setActiveTab('fisik')}
                className={`flex-1 py-3 sm:py-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition whitespace-nowrap ${activeTab === 'fisik' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                <Package size={14} /> Fisik
              </button>
              <button onClick={() => setActiveTab('jasa')}
                className={`flex-1 py-3 sm:py-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition whitespace-nowrap ${activeTab === 'jasa' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                <Briefcase size={14} /> Jasa
              </button>
              <button onClick={() => setActiveTab('digital')}
                className={`flex-1 py-3 sm:py-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition whitespace-nowrap ${activeTab === 'digital' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                <Smartphone size={14} /> Digital
              </button>
            </div>

            {/* ── FISIK ── */}
            {activeTab === 'fisik' && (
              <>
                <div className="p-2 sm:p-3 border-b border-slate-100 flex gap-2 flex-shrink-0">
                  <div className="relative flex-1 min-w-0">
                    <input ref={codeRef} className="input pr-20" placeholder="F2 | Scan / kode produk → Enter"
                      value={codeInput} onChange={e => setCodeInput(e.target.value)} onKeyDown={handleCodeKeyDown} />
                    <button onClick={() => {
                      productAPI.getByCode(codeInput.trim()).then(r => { if (r.data.success) addToCart(r.data.data); else toast.error('Tidak ditemukan'); }).catch(() => toast.error('Tidak ditemukan'));
                      setCodeInput('');
                    }} className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-primary py-1.5 px-2.5 text-xs">Tambah</button>
                  </div>
                  <button className="btn btn-outline py-2 px-3 flex-shrink-0" onClick={() => setShowSearch(true)}><Search size={15} /></button>
                </div>
                <div className="flex-1 lg:overflow-y-auto p-2 sm:p-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-2.5">
                    {fisikProducts.map(p => {
                      const out = p.stock <= 0;
                      const cartQty = cartQtyByProduct[p._id] || 0;
                      return (
                        <button key={p._id} onClick={() => !out && addToCart(p)} disabled={out}
                          className={`relative p-2.5 sm:p-3 rounded-xl border text-left transition-all min-h-[88px] ${out ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'bg-white hover:border-blue-400 hover:bg-blue-50 active:scale-95'} ${cartQty > 0 ? 'border-emerald-300 ring-1 ring-emerald-200' : ''}`}>
                          <p className="text-xs font-bold text-slate-700 leading-tight mb-1 pl-8 pr-8 line-clamp-2">{p.name}</p>
                          <p className="text-[10px] sm:text-xs text-slate-400 font-mono truncate">{p.code}</p>
                          <p className="text-sm font-bold text-blue-600 mt-1.5 sm:mt-2">{formatRupiah(p.sellPrice)}</p>
                          <span className={`absolute top-1.5 left-1.5 sm:top-2 sm:left-2 badge text-xs ${p.stock <= (p.minStock || 5) ? 'badge-red' : 'badge-green'}`}>{p.stock}</span>
                          {cartQty > 0 && (
                            <span className="absolute top-1 right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center shadow-md ring-2 ring-white z-10">
                              {cartQty}
                            </span>
                          )}
                          {out && <span className="absolute inset-0 rounded-xl flex items-center justify-center bg-slate-100/80 text-xs font-bold text-red-500">HABIS</span>}
                        </button>
                      );
                    })}
                    {fisikProducts.length === 0 && <div className="col-span-2 sm:col-span-3 xl:col-span-4"><EmptyState message="Tidak ada produk fisik" /></div>}
                  </div>
                </div>
              </>
            )}

            {/* ── JASA ── */}
{activeTab === 'jasa' && (
  <div className="flex-1 lg:overflow-y-auto p-3 sm:p-4">
    <JasaForm onAddToCart={addItemToCart} />
  </div>
)}
           
            {/* ── DIGITAL ── */}
            {activeTab === 'digital' && (
              <div className="flex flex-col lg:flex-row flex-1 lg:overflow-hidden">
                {/* Panel sumber dana — di mobile DIGANTI form saat sumber dana dipilih (toggle).
                    Di desktop tetap selalu tampil di kiri. */}
                <div className={`${selectedSumberDana ? 'hidden lg:block' : 'block'} w-full lg:w-28 border-b lg:border-b-0 lg:border-r border-slate-100 lg:overflow-y-auto bg-slate-50 flex-shrink-0`}>
                  {/* ─ Mobile (< lg): grouped grid 3-col per kategori ─ */}
                  <div className="lg:hidden p-3 space-y-3">
                    {['Server Pulsa', 'Bank', 'E-Wallet', 'Tunai'].map(group => {
                      const groupSaldos = saldos.filter(s => s.group === group && s.isActive !== false);
                      if (!groupSaldos.length) return null;
                      return (
                        <div key={group}>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 px-0.5">{group}</p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {groupSaldos.map(s => {
                              const isSelected = selectedSumberDana === s.akunId;
                              return (
                                <button key={s.akunId}
                                  onClick={() => { setSelectedSumberDana(s.akunId); setDigitalMenu(MENU_PER_GROUP[s.group]?.[0] || 'pulsa'); }}
                                  className={`flex flex-col items-center gap-0.5 py-2 px-1.5 rounded-lg border transition active:scale-95 ${
                                    isSelected
                                      ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-blue-50'
                                  }`}>
                                  <span className="text-lg leading-none">{s.icon}</span>
                                  <span className="text-[11px] font-semibold leading-tight truncate w-full text-center">{s.namaAkun}</span>
                                  <span className={`text-[10px] font-medium truncate w-full text-center ${isSelected ? 'text-blue-100' : 'text-green-600'}`}>
                                    {formatRupiah(s.saldo)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ─ Desktop (lg+): grouped vertical seperti semula ─ */}
                  <div className="hidden lg:block">
                    {['Server Pulsa', 'Bank', 'E-Wallet', 'Tunai'].map(group => {
                      const groupSaldos = saldos.filter(s => s.group === group && s.isActive !== false);
                      if (!groupSaldos.length) return null;
                      return (
                        <div key={group}>
                          <div className="px-2 py-1 text-xs text-slate-400 font-bold bg-slate-100 border-b border-slate-200">{group}</div>
                          <div>
                            {groupSaldos.map(s => (
                              <button key={s.akunId} onClick={() => { setSelectedSumberDana(s.akunId); setDigitalMenu(MENU_PER_GROUP[s.group]?.[0] || 'pulsa'); }}
                                className={`w-full flex flex-col items-center gap-1 py-2.5 px-1 text-xs font-semibold transition border-b border-slate-100 ${selectedSumberDana === s.akunId ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-white'}`}>
                                <span className="text-base">{s.icon}</span>
                                <span className="text-center leading-tight truncate w-full px-0.5">{s.namaAkun}</span>
                                <span className={`text-xs truncate w-full text-center ${selectedSumberDana === s.akunId ? 'text-blue-100' : 'text-green-600'}`}>{formatRupiah(s.saldo)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bawah (mobile) / Kanan (desktop): Form input (tahap 2) — muncul setelah sumber dana dipilih */}
                <div className="flex-1 lg:overflow-y-auto flex flex-col min-w-0">
                  {!selectedSumberDana ? (
                    <div className="flex-1 flex-col items-center justify-center text-slate-400 gap-2 p-6 hidden lg:flex">
                      <Wallet size={32} className="text-slate-300" />
                      <p className="text-sm font-semibold">Pilih Sumber Dana</p>
                      <p className="text-xs text-center">Pilih akun sumber dana di sebelah kiri terlebih dahulu</p>
                    </div>
                  ) : (
                    <div key={selectedSumberDana} className="flex-1 flex flex-col animate-fade-in-up">
                      {/* Sub menu kategori — disesuaikan per group */}
                      <div className="flex overflow-x-auto border-b border-slate-100 bg-white flex-shrink-0">
                        {(() => {
                          const group = saldos.find(s => s.akunId === selectedSumberDana)?.group || '';
                          const allowed = MENU_PER_GROUP[group] || [];
                          const filtered = DIGITAL_MENUS.filter(m => allowed.includes(m.id));
                          if (filtered.length > 0 && !filtered.find(m => m.id === digitalMenu)) {
                            setTimeout(() => setDigitalMenu(filtered[0].id), 0);
                          }
                          return filtered.map(menu => {
                            const Icon = menu.icon;
                            return (
                              <button key={menu.id} onClick={() => setDigitalMenu(menu.id)}
                                className={`flex flex-col items-center gap-1 py-2 px-3 text-xs font-semibold transition flex-shrink-0 border-b-2 ${digitalMenu === menu.id ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                                <Icon size={14} />
                                <span>{menu.label}</span>
                              </button>
                            );
                          });
                        })()}
                      </div>
                      {/* Info sumber dana terpilih */}
                      <div className="p-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2 flex-shrink-0">
                        <span>{saldos.find(s => s.akunId === selectedSumberDana)?.icon}</span>
                        <div>
                          <p className="text-xs font-bold text-blue-700">{saldos.find(s => s.akunId === selectedSumberDana)?.namaAkun}</p>
                          <p className="text-xs text-blue-500">Saldo: {formatRupiah(saldos.find(s => s.akunId === selectedSumberDana)?.saldo || 0)}</p>
                        </div>
                        <button onClick={() => setSelectedSumberDana('')} className="ml-auto text-blue-400 hover:text-blue-600 text-xs">Ganti</button>
                      </div>
                      {/* Form sesuai kategori */}
                      <div className="flex-1 lg:overflow-y-auto">
                        {(() => {
                          const group = saldos.find(s => s.akunId === selectedSumberDana)?.group || '';
                          const allowed = MENU_PER_GROUP[group] || [];
                          if (allowed.length === 0) return (
                            <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-2 p-6">
                              <p className="text-sm font-semibold">Tidak ada kategori tersedia</p>
                            </div>
                          );
                          if (digitalMenu === 'transfer') return <TransferForm key={`transfer-${selectedSumberDana}`} saldos={saldos} defaultSumber={selectedSumberDana} onAddToCart={addItemToCart} />;
                          if (digitalMenu === 'tarik_tunai') return <TarikTunaiForm key={`tarik-${selectedSumberDana}`} saldos={saldos} defaultSumber={selectedSumberDana} onAddToCart={addItemToCart} />;
                          return <DigitalForm key={`${digitalMenu}-${selectedSumberDana}`} saldos={saldos} digitalMenu={digitalMenu} defaultSumber={selectedSumberDana} onAddToCart={addItemToCart} />;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Kanan: Keranjang (desktop only — sticky agar tidak ikut scroll. Mobile pakai bottom sheet) */}
          <div className="hidden lg:flex lg:w-72 xl:w-80 lg:flex-col card p-0 lg:overflow-hidden lg:sticky lg:top-4 lg:self-start lg:h-[calc(100vh-2rem)]">
            {renderCartHeader()}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
              {renderCartItems()}
            </div>
            <div className="border-t border-slate-100 p-3 space-y-2 flex-shrink-0">
              {renderCartForm()}
              {renderBayarButton()}
            </div>
          </div>
        </div>

        {/* Mobile bottom bar — di-portal ke body agar lepas dari containing block transform parent.
            Diposisikan di ATAS bottom-nav (bottom-16 = 4rem) + safe-area iOS. */}
        {cart.length > 0 && !showMobileCart && ReactDOM.createPortal(
          <div
            className="lg:hidden fixed bottom-16 left-0 right-0 z-40 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-[0_-4px_12px_rgba(0,0,0,0.12)] px-4 py-3 flex items-center justify-between gap-3"
            style={{ marginBottom: 'var(--safe-bottom)' }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-400 font-medium leading-tight">{totalCartQty} item</p>
              <p className="text-base font-bold text-blue-600 truncate leading-tight">{formatRupiah(total)}</p>
            </div>
            <button onClick={() => setShowMobileCart(true)} className="btn btn-primary py-2.5 px-5 flex-shrink-0">
              Lanjut →
            </button>
          </div>,
          document.body
        )}

        {/* Mobile bottom sheet — di-portal ke body agar position fixed bekerja benar
            (parent punya transform dari animate-fade-in-up yang bikin containing block).
            Layout: handle + header (shrink) | items+form (flex-1 scroll) | bayar (shrink, pinned). */}
        {showMobileCart && ReactDOM.createPortal(
          <div className="lg:hidden fixed inset-0 z-50" onClick={() => setShowMobileCart(false)}>
            <div className="absolute inset-0 bg-black/50 animate-fade-in" />
            <div
              onClick={e => e.stopPropagation()}
              className="absolute left-0 right-0 bottom-0 bg-white dark:bg-slate-800 rounded-t-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
              style={{
                transform: `translateY(${sheetDragY}px)`,
                transition: sheetDragY === 0 ? 'transform 0.25s ease' : 'none',
              }}
            >
              <div
                className="flex justify-center pt-2 pb-1 flex-shrink-0 cursor-grab"
                style={{ touchAction: 'none' }}
                onTouchStart={handleSheetTouchStart}
                onTouchMove={handleSheetTouchMove}
                onTouchEnd={handleSheetTouchEnd}
              >
                <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
              </div>
              {renderCartHeader()}
              {/* Scrollable area: berisi list item + form (member/diskon/metode bayar/total) */}
              <div className="flex-1 overflow-y-auto min-h-0">
                <div className="p-2 space-y-2">
                  {renderCartItems()}
                </div>
                <div className="border-t border-slate-100 p-3 space-y-2">
                  {renderCartForm()}
                </div>
              </div>
              {/* Tombol Bayar pinned di bawah — tidak ikut scroll */}
              <div className="border-t border-slate-100 p-3 pb-4 flex-shrink-0 bg-white dark:bg-slate-800">
                {renderBayarButton()}
              </div>
            </div>
          </div>,
          document.body
        )}
        </>
      )}

      {/* ══ RIWAYAT ══ */}
      {activeMainTab === 'riwayat' && (
        <div className="pb-24 lg:pb-0">
          <div className="card mb-4">
            {isPrivileged && (
              <div className="flex items-center gap-2 mb-2">
                <button onClick={() => { setProfitMinusFilter(f => !f); setTxPage(1); }}
                  className={`btn text-xs py-1.5 px-3 flex items-center gap-1.5 ${profitMinusFilter ? "btn-danger" : "btn-outline"}`}>
                  ⚠️ {profitMinusFilter ? "Tampil Semua" : "Profit Minus"}
                </button>
              </div>
            )}
            <SearchInput value={txSearch} onChange={v => { setTxSearch(v); setTxPage(1); }} placeholder="Cari nomor faktur atau nama pelanggan..." />
          </div>
          {txLoading ? <Loader /> : (
            <>
              {/* Desktop / tablet — tabel */}
              <div className="table-wrap hidden sm:block">
                <table className="table">
                  <thead><tr><th>No. Faktur</th><th>Tanggal</th><th>Pelanggan</th><th>Item</th><th>Total</th><th>Bayar</th><th>Status</th><th>Aksi</th></tr></thead>
                  <tbody className="bg-white">
                    {transactions.length === 0
                      ? <tr><td colSpan={8}><EmptyState message="Tidak ada transaksi" /></td></tr>
                      : transactions.map(tx => (
                        <tr key={tx._id} className={tx.isVoid ? 'opacity-50' : ''}>
                          <td><code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">{tx.invoiceNumber}</code></td>
                          <td className="text-xs text-slate-400">{formatDateTime(tx.transactionDate)}</td>
                          <td className="font-medium text-sm">{tx.customerName}</td>
                          <td className="text-slate-400 text-xs">{tx.items?.length} item</td>
                          <td className="font-bold text-blue-600">{formatRupiah(tx.total)}</td>
                          <td><span className={`badge ${PAYMENT_COLORS[tx.paymentMethod]}`}>{PAYMENT_LABELS[tx.paymentMethod]}</span></td>
                          <td>{tx.isVoid ? <span className="badge badge-red">Batal</span> : <span className="badge badge-green">Lunas</span>}</td>
                          <td>
                            <div className="flex gap-1">
                              <button onClick={() => { setSelectedTx(tx); setShowDetail(true); }} className="btn btn-outline py-1.5 px-2.5 text-xs"><Eye size={14} /></button>
                              {canVoid(tx) && <button onClick={() => { setSelectedTx(tx); setShowVoidConfirm(true); }} className="btn btn-danger py-1.5 px-2.5 text-xs"><Trash2 size={14} /></button>}
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
                {transactions.length === 0
                  ? <div className="card"><EmptyState message="Tidak ada transaksi" /></div>
                  : transactions.map(tx => (
                    <div key={tx._id} className={`card !p-3 ${tx.isVoid ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <code className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded truncate">{tx.invoiceNumber}</code>
                        {tx.isVoid
                          ? <span className="badge badge-red flex-shrink-0">Batal</span>
                          : <span className="badge badge-green flex-shrink-0">Lunas</span>}
                      </div>
                      <p className="text-[11px] text-slate-400 mb-1.5">{formatDateTime(tx.transactionDate)}</p>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="font-semibold text-sm text-slate-700 truncate flex-1">{tx.customerName}</p>
                        <span className={`badge ${PAYMENT_COLORS[tx.paymentMethod]} flex-shrink-0`}>{PAYMENT_LABELS[tx.paymentMethod]}</span>
                      </div>
                      <div className="flex items-end justify-between gap-2 pt-2 border-t border-slate-100">
                        <div>
                          <p className="text-[11px] text-slate-400">{tx.items?.length} item</p>
                          <p className="font-bold text-blue-600 text-base leading-tight">{formatRupiah(tx.total)}</p>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button onClick={() => { setSelectedTx(tx); setShowDetail(true); }} className="btn btn-outline py-1.5 px-3 text-xs"><Eye size={14} /> Detail</button>
                          {canVoid(tx) && <button onClick={() => { setSelectedTx(tx); setShowVoidConfirm(true); }} className="btn btn-danger py-1.5 px-2.5 text-xs"><Trash2 size={14} /></button>}
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </>
          )}
          {txPages > 1 && (
            <div className="flex items-center justify-between mt-4 gap-2">
              <p className="text-xs text-slate-400 truncate">Total: {txTotal} transaksi</p>
              <div className="flex gap-2 flex-shrink-0">
                <button className="btn btn-outline py-2 px-3" onClick={() => setTxPage(p => Math.max(1, p - 1))} disabled={txPage <= 1}>←</button>
                <span className="px-3 py-2 text-sm">{txPage}/{txPages}</span>
                <button className="btn btn-outline py-2 px-3" onClick={() => setTxPage(p => Math.min(txPages, p + 1))} disabled={txPage >= txPages}>→</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB PEMBATALAN (admin/owner only) ══ */}
      {activeMainTab === 'pembatalan' && isPrivileged && (
        <div className="pb-24 lg:pb-0">
          <div className="card mb-4">
            <SearchInput value={voidedSearch} onChange={v => { setVoidedSearch(v); setVoidedPage(1); }} placeholder="Cari faktur, pelanggan, atau nama pembatal..." />
          </div>
          {voidedLoading ? <Loader /> : (
            <>
              {/* Desktop / tablet — tabel */}
              <div className="table-wrap hidden sm:block">
                <table className="table">
                  <thead>
                    <tr>
                      <th>No. Faktur</th>
                      <th>Tgl Transaksi</th>
                      <th>Pelanggan</th>
                      <th>Total</th>
                      <th>Dibatalkan Oleh</th>
                      <th>Waktu Batal</th>
                      <th>Alasan</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {voidedTx.length === 0
                      ? <tr><td colSpan={8}><EmptyState message="Tidak ada riwayat pembatalan" /></td></tr>
                      : voidedTx.map(tx => (
                        <tr key={tx._id} className="opacity-80">
                          <td><code className="text-xs font-mono bg-red-50 text-red-600 px-1.5 py-0.5 rounded">{tx.invoiceNumber}</code></td>
                          <td className="text-xs text-slate-400">{formatDateTime(tx.transactionDate)}</td>
                          <td className="font-medium text-sm">{tx.customerName}</td>
                          <td className="font-bold text-red-500">{formatRupiah(tx.total)}</td>
                          <td>
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                              👤 {tx.voidByName || tx.cashierName || '-'}
                            </span>
                          </td>
                          <td className="text-xs text-slate-400">{tx.voidAt ? formatDateTime(tx.voidAt) : '-'}</td>
                          <td className="text-xs text-slate-500 max-w-[160px] truncate" title={tx.voidReason}>{tx.voidReason || '-'}</td>
                          <td>
                            <button onClick={() => { setSelectedTx(tx); setShowDetail(true); }}
                              className="btn btn-outline py-1.5 px-2.5" title="Lihat Detail">
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>

              {/* Mobile — kartu */}
              <div className="sm:hidden space-y-2">
                {voidedTx.length === 0
                  ? <div className="card"><EmptyState message="Tidak ada riwayat pembatalan" /></div>
                  : voidedTx.map(tx => (
                    <div key={tx._id} className="card !p-3 border-red-100 bg-red-50/30">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <code className="text-xs font-mono bg-red-50 text-red-600 px-1.5 py-0.5 rounded truncate">{tx.invoiceNumber}</code>
                        <span className="badge badge-red flex-shrink-0">Dibatalkan</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mb-1.5">{formatDateTime(tx.transactionDate)}</p>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="font-semibold text-sm text-slate-700 truncate flex-1">{tx.customerName}</p>
                        <p className="font-bold text-red-500 text-sm flex-shrink-0">{formatRupiah(tx.total)}</p>
                      </div>
                      <div className="space-y-0.5 pt-2 border-t border-red-100 text-[11px]">
                        <p className="text-slate-600"><span className="text-slate-400">👤 Oleh:</span> <span className="font-semibold">{tx.voidByName || tx.cashierName || '-'}</span></p>
                        <p className="text-slate-400">🕐 {tx.voidAt ? formatDateTime(tx.voidAt) : '-'}</p>
                        {tx.voidReason && <p className="text-slate-500 italic line-clamp-2">📋 {tx.voidReason}</p>}
                      </div>
                      <button onClick={() => { setSelectedTx(tx); setShowDetail(true); }}
                        className="btn btn-outline w-full justify-center py-2 mt-2 text-xs">
                        <Eye size={14} /> Lihat Detail
                      </button>
                    </div>
                  ))
                }
              </div>
            </>
          )}
          {voidedPages > 1 && (
            <div className="flex items-center justify-between mt-4 gap-2">
              <p className="text-xs text-slate-400 truncate">Total: {voidedTotal} pembatalan</p>
              <div className="flex gap-2 flex-shrink-0">
                <button className="btn btn-outline py-2 px-3" onClick={() => setVoidedPage(p => Math.max(1, p - 1))} disabled={voidedPage <= 1}>←</button>
                <span className="px-3 py-2 text-sm">{voidedPage}/{voidedPages}</span>
                <button className="btn btn-outline py-2 px-3" onClick={() => setVoidedPage(p => Math.min(voidedPages, p + 1))} disabled={voidedPage >= voidedPages}>→</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ MODALS ══ */}
      <Modal open={showDetail} onClose={() => setShowDetail(false)} title={`Detail: ${selectedTx?.invoiceNumber}`} size="md">
        {selectedTx && (
          <>
            {selectedTx.isVoid && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex gap-2">
                <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-red-600">Transaksi Dibatalkan</p>
                  <p className="text-xs text-red-500">📋 Alasan: {selectedTx.voidReason}</p>
                  {selectedTx.voidByName && <p className="text-xs text-red-400">👤 Dibatalkan oleh: <span className="font-semibold">{selectedTx.voidByName}</span></p>}
                  {selectedTx.voidAt && <p className="text-xs text-red-400">🕐 Waktu: {formatDateTime(selectedTx.voidAt)}</p>}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div><p className="text-xs text-slate-400">Tanggal</p><p className="font-medium">{formatDateTime(selectedTx.transactionDate)}</p></div>
              <div><p className="text-xs text-slate-400">Kasir</p><p className="font-medium">{selectedTx.cashierName}</p></div>
              <div><p className="text-xs text-slate-400">Pelanggan</p><p className="font-medium">{selectedTx.customerName}</p></div>
              <div><p className="text-xs text-slate-400">Pembayaran</p><span className={`badge ${PAYMENT_COLORS[selectedTx.paymentMethod]}`}>{PAYMENT_LABELS[selectedTx.paymentMethod]}</span></div>
              {/* Sumber dana untuk transaksi Transfer/QRIS */}
              {['transfer','qris'].includes(selectedTx.paymentMethod) && selectedTx.transferData?.akunId && (
                <div className="col-span-2">
                  <p className="text-xs text-slate-400">Akun Tujuan Transfer</p>
                  <p className="font-medium text-blue-600">💳 {selectedTx.transferData?.namaAkun || selectedTx.transferData?.akunId}</p>
                </div>
              )}
            </div>
            <div className="table-wrap mb-4">
              <table className="table">
                <thead>
                  <tr>
                    <th>Produk</th>
                    {selectedTx.items?.some(i => i.type === 'digital') && <th>Sumber Dana</th>}
                    <th>Qty</th>
                    <th>Harga Jual</th>
                    {isPrivileged && <th className="text-orange-500">Modal</th>}
                    {isPrivileged && <th className="text-green-600">Profit</th>}
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {selectedTx.items?.map((item, i) => (
                    <tr key={i}>
                      <td className="text-xs font-medium">{item.productName}</td>
                      {selectedTx.items?.some(it => it.type === 'digital') && (
                        <td className="text-xs">
                          {item.sumberDanaLabel
                            ? <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-medium">
                                {item.sumberDanaIcon && <span>{item.sumberDanaIcon}</span>}
                                {item.sumberDanaLabel}
                              </span>
                            : <span className="text-slate-300">-</span>
                          }
                        </td>
                      )}
                      <td className="text-xs">{item.quantity}</td>
                      <td className="text-xs">{formatRupiah(item.sellPrice)}</td>
                      {isPrivileged && (
                        <td className="text-xs text-orange-600 font-medium">
                          {formatRupiah(item.purchasePrice || item.modalAmount || 0)}
                        </td>
                      )}
                      {isPrivileged && (() => {
                        const profit = item.profit ?? (item.subtotal - (item.purchasePrice || item.modalAmount || 0) * item.quantity);
                        return (
                          <td className={`text-xs font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {formatRupiah(profit)}
                          </td>
                        );
                      })()}
                      <td className="text-xs font-bold">{formatRupiah(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1 mb-4">
              {selectedTx.discount > 0 && <div className="flex justify-between"><span className="text-slate-400">Diskon</span><span className="text-red-500">-{formatRupiah(selectedTx.discount)}</span></div>}
              <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-blue-600">{formatRupiah(selectedTx.total)}</span></div>
              {selectedTx.change > 0 && <div className="flex justify-between text-green-600"><span>Kembalian</span><span>{formatRupiah(selectedTx.change)}</span></div>}
              {isPrivileged && selectedTx.totalProfit !== undefined && (
                <div className={`flex justify-between font-bold border-t pt-1 mt-1 ${selectedTx.totalProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  <span>Total Profit</span>
                  <span>{formatRupiah(selectedTx.totalProfit)}</span>
                </div>
              )}
            </div>
            {canVoid(selectedTx) && (
              <button onClick={() => { setShowDetail(false); setShowVoidConfirm(true); }} className="btn btn-danger w-full justify-center">
                <Trash2 size={16} /> Batalkan Transaksi
              </button>
            )}
            {/* Struk tersembunyi untuk print dari riwayat */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
              <div ref={printRefDetail}><ReceiptView transaction={selectedTx} settings={settings} /></div>
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
              <button className="btn btn-outline flex-1 text-green-600 border-green-300 hover:bg-green-50" onClick={() => handleShareWA(selectedTx)}>
                <span>💬</span> Kirim WA
              </button>
              <button className="btn btn-outline flex-1" onClick={doPrintDetail}>
                <Printer size={15} /> Cetak Struk
              </button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={showVoidConfirm} onClose={() => { setShowVoidConfirm(false); setVoidReason(''); }} title="Batalkan Transaksi" size="sm">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4">
          <p className="text-sm font-bold text-yellow-700">⚠️ Perhatian!</p>
          <p className="text-xs text-yellow-600 mt-1">Transaksi <strong>{selectedTx?.invoiceNumber}</strong> akan dibatalkan.</p>
        </div>
        <label className="label">Alasan Pembatalan *</label>
        <textarea className="input h-24 resize-none mb-4" placeholder="Salah input, pelanggan batal, dll..."
          value={voidReason} onChange={e => setVoidReason(e.target.value)} />
        <div className="flex gap-3">
          <button className="btn btn-outline flex-1" onClick={() => { setShowVoidConfirm(false); setVoidReason(''); }}>Batal</button>
          <button className="btn btn-danger flex-1" onClick={handleVoid} disabled={voiding || !voidReason.trim()}>
            {voiding ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {voiding ? 'Memproses...' : 'Ya, Batalkan'}
          </button>
        </div>
      </Modal>

      <Modal open={showReceipt} onClose={() => setShowReceipt(false)} title="Struk Transaksi" size="sm">
        {lastTransaction && (
          <>
            <div ref={printRef} id="print-root" className="bg-white"><ReceiptView transaction={lastTransaction} settings={settings} /></div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
              <button className="btn btn-outline flex-1" onClick={() => setShowReceipt(false)}>Tutup</button>
              <button className="btn btn-outline flex-1 text-green-600 border-green-300 hover:bg-green-50" onClick={() => handleShareWA(lastTransaction)}>
                <span>💬</span> WA
              </button>
              <button className="btn btn-primary flex-1" onClick={handlePrint}><Printer size={16} /> Cetak</button>
            </div>
          </>
        )}
      </Modal>

      <Modal open={showSearch} onClose={() => setShowSearch(false)} title="Cari Produk" size="lg">
        <input className="input mb-3" placeholder="Ketik nama atau kode..." autoFocus onChange={e => searchProducts(e.target.value)} />
        <div className="max-h-80 overflow-y-auto space-y-2">
          {searching ? <div className="flex justify-center py-6"><Loader2 className="animate-spin text-blue-500" /></div>
            : searchResults.filter(p => p.type === 'fisik').length === 0 ? <EmptyState message="Tidak ada produk fisik" />
              : searchResults.filter(p => p.type === 'fisik').map(p => (
                <button key={p._id} onClick={() => { addToCart(p); setShowSearch(false); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-100 text-left">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-700">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.code} • Stok: {p.stock}</p>
                  </div>
                  <p className="text-sm font-bold text-blue-600">{formatRupiah(p.sellPrice)}</p>
                </button>
              ))
          }
        </div>
      </Modal>
    </div>
  );
}
import React from 'react';
import { X, Inbox, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactDOM from 'react-dom';

// ─── Modal ────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null;

  const maxW = {
    sm: '440px', md: '520px', lg: '680px', xl: '1100px'
  }[size] || '520px';

  const modalContent = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(15,23,42,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '20px',
          width: '100%',
          maxWidth: maxW,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid #e2e8f0', flexShrink: 0,
        }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>{title}</h3>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%', border: 'none',
            background: '#f1f5f9', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#64748b',
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}

// ─── StatCard ─────────────────────────────────────────────────────────────
export function StatCard({ title, value, subtitle, icon: Icon, color = 'blue', trend }) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   border: 'border-blue-100' },
    green:  { bg: 'bg-green-50',  icon: 'text-green-600',  border: 'border-green-100' },
    orange: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-orange-100' },
    red:    { bg: 'bg-red-50',    icon: 'text-red-600',    border: 'border-red-100' },
    purple: { bg: 'bg-purple-50', icon: 'text-purple-600', border: 'border-purple-100' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className="card hover:shadow-card-hover transition-shadow duration-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1 truncate">{title}</p>
          <p className="text-lg sm:text-2xl font-bold text-slate-800 leading-tight break-all">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1 truncate">{subtitle}</p>}
          {trend !== undefined && (
            <p className={`text-xs font-semibold mt-2 ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% vs kemarin
            </p>
          )}
        </div>
        <div className={`p-2.5 sm:p-3 rounded-xl ${c.bg} border ${c.border} shrink-0`}>
          <Icon size={18} className={c.icon} />
        </div>
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────
export function EmptyState({ message = 'Tidak ada data', icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-300">
      <Icon size={48} strokeWidth={1} />
      <p className="mt-3 text-sm font-medium text-slate-400">{message}</p>
    </div>
  );
}

// ─── Loader ───────────────────────────────────────────────────────────────
export function Loader({ size = 'md' }) {
  const s = { sm: 16, md: 24, lg: 40 };
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={s[size]} className="animate-spin text-primary-500" />
    </div>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────
export function Pagination({ page, pages, total, limit, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
      <p className="text-xs text-slate-400">
        Menampilkan {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} dari {total} data
      </p>
      <div className="flex items-center gap-1">
        <button className="btn btn-outline px-3 py-2" onClick={() => onPage(page - 1)} disabled={page <= 1}>
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
          const p = i + Math.max(1, page - 2);
          if (p > pages) return null;
          return (
            <button key={p} onClick={() => onPage(p)}
              className={`btn px-3.5 py-2 text-sm ${p === page ? 'bg-primary-600 text-white' : 'btn-outline'}`}>
              {p}
            </button>
          );
        })}
        <button className="btn btn-outline px-3 py-2" onClick={() => onPage(page + 1)} disabled={page >= pages}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-slate-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button className="btn btn-outline" onClick={onClose}>Batal</button>
        <button className="btn btn-danger" onClick={onConfirm} disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          Konfirmasi
        </button>
      </div>
    </Modal>
  );
}

// ─── SearchInput ──────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Cari...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        className="input pl-9"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

// ─── RupiahInput ──────────────────────────────────────────────
export function RupiahInput({ value, onChange, placeholder = '0', className = '', label, disabled = false }) {
  const [display, setDisplay] = React.useState('');

  React.useEffect(() => {
    if (value === '' || value === null || value === undefined) {
      setDisplay('');
      return;
    }
    const angka = value.toString().replace(/\D/g, '');
    if (angka) {
      setDisplay(new Intl.NumberFormat('id-ID').format(parseInt(angka)));
    }
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (raw === '') {
      setDisplay('');
      onChange('');
      return;
    }
    const formatted = new Intl.NumberFormat('id-ID').format(parseInt(raw));
    setDisplay(formatted);
    onChange(raw);
  };

  return (
    <div className="relative">
      {label && <label className="label">{label}</label>}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium select-none">Rp</span>
        <input
          className={`input pl-9 ${className}`}
          value={display}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          inputMode="numeric"
        />
      </div>
    </div>
  );
}

// ─── ReceiptPrint ─────────────────────────────────────────────────────────
export function ReceiptView({ transaction, settings }) {
  const fmt = (n) => new Intl.NumberFormat('id-ID').format(n || 0);
  const fmtDate = (d) => {
    const dt = new Date(d);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(dt.getDate())}/${pad(dt.getMonth()+1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  };

  // Buat garis separator 32 karakter (lebar 58mm ~32 char courier)
  const LINE  = '--------------------------------';
  const LINE2 = '================================';

  // Format teks kiri-kanan dalam lebar N karakter
  const row = (left, right, width = 26) => {
    const r = String(right);
    const l = String(left).slice(0, width - r.length - 1);
    const spaces = width - l.length - r.length;
    return l + ' '.repeat(Math.max(1, spaces)) + r;
  };

  const PAYMENT_LABEL = {
    cash: 'TUNAI', qris: 'QRIS', transfer: 'TRANSFER', hutang: 'HUTANG'
  };

  return (
    <div
      id="print-root"
      className="print-container bg-white"
      style={{
        width: '54mm',
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: '7.5pt',
        lineHeight: '1.3',
        padding: '1mm',
        color: '#000',
      }}
    >
      {/* Header toko */}
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        <div className="print-title" style={{ fontWeight: 'bold', fontSize: '10pt' }}>
          {settings?.storeName || 'KONTER PULSA'}
        </div>
        {settings?.storeAddress && <div>{settings.storeAddress}</div>}
        {settings?.storePhone   && <div>Telp: {settings.storePhone}</div>}
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '3px 0' }} />

      {/* Info transaksi */}
      <div style={{ whiteSpace: 'pre', fontFamily: 'inherit' }}>
        <div>{row('No', transaction.invoiceNumber)}</div>
        <div>{row('Tgl', fmtDate(transaction.transactionDate))}</div>
        <div>{row('Kasir', transaction.cashierName || '-')}</div>
        {transaction.customerName && transaction.customerName !== 'Umum' && (
          <div>{row('Pelanggan', transaction.customerName)}</div>
        )}
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '3px 0' }} />

      {/* Item */}
      <div>
        {transaction.items?.map((item, i) => (
          <div key={i} style={{ marginBottom: '3px' }}>
            {/* Nama produk — wrap jika panjang */}
            <div style={{ fontWeight: 'bold', wordBreak: 'break-word' }}>
              {item.productName}
            </div>
            {item.targetNumber && (
              <div style={{ color: '#555' }}>  No: {item.targetNumber}</div>
            )}
            <div style={{ whiteSpace: 'pre', fontFamily: 'inherit' }}>
              {row(`  ${item.quantity}x${fmt(item.sellPrice)}`, `${fmt(item.subtotal)}`)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid #000', margin: '3px 0' }} />

      {/* Total */}
      <div style={{ whiteSpace: 'pre', fontFamily: 'inherit' }}>
        {transaction.discount > 0 && (
          <div>{row('Diskon', `-${fmt(transaction.discount)}`)}</div>
        )}
        <div className="print-total" style={{ fontWeight: 'bold' }}>
          {row('TOTAL', `Rp ${fmt(transaction.total)}`)}
        </div>
        <div>{row(`Bayar(${PAYMENT_LABEL[transaction.paymentMethod] || transaction.paymentMethod?.toUpperCase() || '-'})`, `Rp ${fmt(transaction.amountPaid || transaction.total)}`)}</div>
        {(transaction.change || 0) > 0 && (
          <div>{row('Kembali', `Rp ${fmt(transaction.change)}`)}</div>
        )}
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '3px 0' }} />

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '3px', fontSize: '8pt' }}>
        <div>{settings?.receiptFooter || 'Terima kasih sudah berbelanja!'}</div>
        <div style={{ marginTop: '2px', color: '#555' }}>
          {new Date(transaction.transactionDate || new Date()).toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })}
        </div>
      </div>

      {/* Jarak potong */}
      <div style={{ marginTop: '8mm' }} />
    </div>
  );
}

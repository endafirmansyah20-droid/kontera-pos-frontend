import React, { useEffect, useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import { productAPI } from '../services/api';
import { AlertTriangle, X, Package } from 'lucide-react';
import { formatRupiah } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

// ── Notifikasi Stok Menipis ──────────────────────────────────────
function LowStockAlert({ products, onClose }) {
  if (!products || products.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-50 w-80 animate-fade-in-up">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-orange-200 dark:border-orange-700 overflow-hidden">
        {/* Header */}
        <div className="bg-orange-500 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-white" />
            <span className="text-white font-bold text-sm">Stok Menipis!</span>
            <span className="bg-white text-orange-600 text-xs font-black px-2 py-0.5 rounded-full">
              {products.length}
            </span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition">
            <X size={18} />
          </button>
        </div>
        {/* List produk */}
        <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
          {products.map(p => (
            <div key={p._id} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50">
              <div className="flex items-center gap-2 min-w-0">
                <Package size={14} className="text-orange-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.code}</p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <span className={`text-xs font-black ${p.stock === 0 ? 'text-red-600' : 'text-orange-500'}`}>
                  {p.stock === 0 ? 'HABIS' : `Sisa ${p.stock}`}
                </span>
                <p className="text-xs text-slate-400">Min: {p.minStock}</p>
              </div>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div className="px-4 py-2.5 bg-orange-50 dark:bg-orange-900/20 border-t border-orange-100 dark:border-orange-800">
          <p className="text-xs text-orange-600 dark:text-orange-400">
            ⚡ Segera lakukan restock untuk menghindari kehabisan stok
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Layout({ children }) {
  const { isOwner, user } = useAuth();
  const [lowStockCount, setLowStockCount]       = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [showAlert, setShowAlert]               = useState(false);

  const checkLowStock = useCallback(async () => {
    if (isOwner) return; // Owner tidak punya produk langsung
    try {
      const r = await productAPI.getLowStock();
      const products = r.data.data || [];
      const count    = r.data.count || products.length;
      setLowStockCount(count);
      setLowStockProducts(products);
      if (count > 0) {
        // Tampilkan alert hanya jika belum pernah ditutup di session ini
        const dismissed = sessionStorage.getItem('lowStockDismissed');
        if (!dismissed) setShowAlert(true);
      }
    } catch { /* silent */ }
  }, [isOwner, user]);

  useEffect(() => {
    if (!user) return; // Tunggu user siap dulu
    // Delay kecil agar token sudah siap di header
    const timeout = setTimeout(() => checkLowStock(), 500);
    // Cek ulang setiap 10 menit
    const interval = setInterval(checkLowStock, 10 * 60 * 1000);
    return () => { clearTimeout(timeout); clearInterval(interval); };
  }, [checkLowStock, user]);

  const handleCloseAlert = () => {
    setShowAlert(false);
    sessionStorage.setItem('lowStockDismissed', '1');
  };

  return (
    <div className="min-h-screen dark:bg-slate-900 flex transition-colors duration-200">
      <Sidebar lowStockCount={lowStockCount} />
      <main className="flex-1 lg:ml-60 min-h-screen min-w-0 max-w-full overflow-x-hidden mobile-pt lg:pt-0">
        <div className="p-4 lg:p-6 max-w-screen-2xl mx-auto mobile-pb lg:pb-6 min-w-0">
          {children}
        </div>
      </main>

      {/* Notifikasi stok menipis */}
      {showAlert && (
        <LowStockAlert products={lowStockProducts} onClose={handleCloseAlert} />
      )}
    </div>
  );
}

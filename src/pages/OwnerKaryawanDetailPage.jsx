import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ShoppingCart, DollarSign, TrendingUp, Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatRupiah, formatDateTime } from '../utils/helpers';

const HERO_GRADIENT = 'linear-gradient(120deg, #26215C 0%, #3C3489 50%, #7F77DD 100%)';
const PAGE_SIZE = 20;
const fmtRp = v => formatRupiah(v || 0);

const initialsOf = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

function MetricPill({ label, value, icon: Icon }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.06)',
      border: '0.5px solid rgba(255,255,255,0.1)',
      borderRadius: 12, padding: 14,
      flex: '1 1 0', minWidth: 0,
    }}>
      <div className="flex items-center gap-2 mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
        <Icon size={12} />
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-base font-bold truncate" style={{ color: '#fff' }}>{value}</p>
    </div>
  );
}

export default function OwnerKaryawanDetailPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { cashierId } = useParams();

  const [nama, setNama]         = useState(location.state?.nama || '');
  const [stats, setStats]       = useState(null); // { totalTx, totalOmset, totalLaba, avgTx, ... }
  const [txs, setTxs]           = useState([]);
  const [page, setPage]         = useState(1);
  const [pages, setPages]       = useState(1);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Aggregate stats + nama konsisten dari /owner/employee-stats
  const loadStats = useCallback(async () => {
    try {
      const r = await api.get('/owner/employee-stats');
      const list = r.data.data || [];
      const found = list.find(e => e.cashierId === cashierId);
      if (found) {
        setStats(found);
        if (found.cashierName) setNama(found.cashierName);
      }
    } catch { /* silent — nama fallback dari location.state tetap dipakai */ }
  }, [cashierId]);

  const loadTransactions = useCallback(async (p, append) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const r = await api.get('/owner/employee-transactions', {
        params: { cashier: cashierId, page: p, limit: PAGE_SIZE },
      });
      const body = r.data || {};
      const d    = body.data ?? body;
      // Dukung beberapa bentuk umum: { data: [...], pagination: {...} } / { transactions: [...] } / array polos
      const list = Array.isArray(d) ? d
        : (d.transactions || d.items || d.data || []);
      const pag  = d.pagination || body.pagination || d;
      setTxs(prev => append ? [...prev, ...list] : list);
      setPage(pag.page  || p);
      setPages(pag.pages || pag.totalPages || 1);
      setTotal(pag.total || pag.totalCount || list.length);
    } catch {
      toast.error('Gagal memuat riwayat transaksi');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [cashierId]);

  useEffect(() => {
    if (!user) return;
    loadStats();
    loadTransactions(1, false);
  }, [user, loadStats, loadTransactions]);

  const totalTx    = stats?.totalTx    ?? total;
  const totalOmset = stats?.totalOmset ?? txs.reduce((s, t) => s + (t.total || 0), 0);
  const avgTx      = stats?.avgTx      ?? (totalTx > 0 ? totalOmset / totalTx : 0);
  const hasMore    = page < pages;

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto pb-24 lg:pb-6">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-4">
        <button type="button" onClick={() => navigate('/owner/karyawan')}
          style={{
            padding: 8, borderRadius: 10,
            background: 'rgba(255,255,255,0.08)',
            border: '0.5px solid rgba(255,255,255,0.15)',
            color: '#fff', display: 'flex', alignItems: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}>
          <ArrowLeft size={16} />
        </button>
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: 'rgba(127,119,221,0.25)', color: '#AFA9EC',
            fontWeight: 700, fontSize: 13,
          }}>
          {initialsOf(nama)}
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold truncate" style={{ color: '#fff' }} title={nama}>
            {nama || 'Karyawan'}
          </p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Detail transaksi
          </p>
        </div>
      </div>

      {/* ── Ringkasan cepat ── */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <MetricPill label="Total Transaksi" value={`${totalTx} tx`}    icon={ShoppingCart} />
        <MetricPill label="Total Omset"     value={fmtRp(totalOmset)}  icon={DollarSign} />
        <MetricPill label="Rata / Tx"       value={fmtRp(avgTx)}       icon={TrendingUp} />
      </div>

      {/* ── Riwayat transaksi ── */}
      <div style={{
        background: HERO_GRADIENT, borderRadius: 12, padding: 16,
        boxShadow: '0 10px 28px -8px rgba(38,33,92,0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
      }}>
        <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
          Riwayat Transaksi
          {total > 0 && (
            <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>
              {' '}· {txs.length} / {total}
            </span>
          )}
        </p>

        {loading ? (
          <div className="p-10 flex justify-center">
            <div className="animate-spin w-6 h-6 border-2 border-white/40 border-t-transparent rounded-full" />
          </div>
        ) : txs.length === 0 ? (
          <div className="p-10 text-center">
            <Receipt size={32} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.25)' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>Belum ada transaksi</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {txs.map(tx => (
                <div key={tx._id || tx.invoiceNumber}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '0.5px solid rgba(255,255,255,0.1)',
                    borderRadius: 10, padding: 12,
                  }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-semibold" style={{ color: '#fff' }}>
                          {tx.invoiceNumber || '—'}
                        </span>
                        {tx.isVoid && (
                          <span style={{
                            padding: '2px 7px', borderRadius: 6,
                            background: 'rgba(248,113,113,0.2)',
                            color: '#F87171', fontSize: 9, fontWeight: 700,
                          }}>VOID</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs flex-wrap"
                        style={{ color: 'rgba(255,255,255,0.55)' }}>
                        <span>{formatDateTime(tx.transactionDate ?? tx.createdAt)}</span>
                        {tx.cabang?.nama && (
                          <>
                            <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
                            <span>{tx.cabang.nama}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{
                        color: tx.isVoid ? 'rgba(255,255,255,0.4)' : '#fff',
                        textDecoration: tx.isVoid ? 'line-through' : 'none',
                      }}>
                        {fmtRp(tx.total)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="mt-4 flex justify-center">
                <button type="button"
                  onClick={() => loadTransactions(page + 1, true)}
                  disabled={loadingMore}
                  style={{
                    padding: '9px 18px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.08)',
                    border: '0.5px solid rgba(255,255,255,0.15)',
                    color: '#fff', fontSize: 12, fontWeight: 600,
                    cursor: loadingMore ? 'default' : 'pointer',
                    opacity: loadingMore ? 0.6 : 1,
                  }}>
                  {loadingMore
                    ? 'Memuat...'
                    : `Muat lebih banyak (hal ${page + 1} / ${pages})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

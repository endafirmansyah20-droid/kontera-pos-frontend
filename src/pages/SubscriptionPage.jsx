import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Clock, XCircle, RefreshCw, CreditCard, Building2, User } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { PageHeader, Loader, EmptyState, Modal } from '../components/UI';

const STATUS_BADGE = {
  gratis:   'bg-green-100 text-green-700',
  aktif:    'bg-blue-100 text-blue-700',
  nonaktif: 'bg-red-100 text-red-700',
  expired:  'bg-orange-100 text-orange-700',
};

const fmtRp = v => 'Rp ' + (v || 0).toLocaleString('id-ID');
const fmtDate = d => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export default function SubscriptionPage() {
  const [subs, setSubs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('nonaktif');
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [bulan, setBulan]       = useState(1);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/owner/subscriptions');
      setSubs(r.data.data || []);
    } catch { toast.error('Gagal memuat data langganan'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleKonfirmasi = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.put(`/owner/subscriptions/${selected._id}/konfirmasi`, { bulan });
      toast.success(`✅ Pembayaran dikonfirmasi! Cabang aktif ${bulan} bulan.`);
      setShowModal(false);
      setSelected(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal konfirmasi');
    } finally { setSaving(false); }
  };

  const filtered = filter === 'all' ? subs : subs.filter(s => s.status === filter);
  const countNonaktif = subs.filter(s => s.status === 'nonaktif').length;

  return (
    <div className="animate-fade-in-up">
      <PageHeader
        title="Manajemen Langganan"
        subtitle="Konfirmasi pembayaran dan kelola status cabang owner"
        actions={
          <button className="btn btn-outline py-2 px-3" onClick={load}>
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total',        val: subs.length,                            color: 'slate'  },
          { label: 'Aktif',        val: subs.filter(s=>s.status==='aktif').length, color: 'blue' },
          { label: 'Gratis',       val: subs.filter(s=>s.status==='gratis').length, color: 'green'},
          { label: 'Menunggu',     val: countNonaktif,                          color: 'red'    },
        ].map(s => (
          <div key={s.label} className={`bg-${s.color}-50 rounded-2xl p-4`}>
            <p className={`text-2xl font-black text-${s.color}-700`}>{s.val}</p>
            <p className={`text-xs text-${s.color}-500`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { val: 'nonaktif', label: `⏳ Menunggu Konfirmasi${countNonaktif > 0 ? ` (${countNonaktif})` : ''}` },
          { val: 'aktif',   label: '✅ Aktif'   },
          { val: 'gratis',  label: '🎁 Gratis'  },
          { val: 'all',     label: 'Semua'      },
        ].map(f => (
          <button key={f.val} onClick={() => setFilter(f.val)}
            className={`btn py-2 text-sm ${filter === f.val ? 'btn-primary' : 'btn-outline'} ${f.val === 'nonaktif' && countNonaktif > 0 ? 'ring-2 ring-red-300' : ''}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? <Loader /> : filtered.length === 0 ? (
        <div className="card">
          <EmptyState message={filter === 'nonaktif' ? 'Tidak ada pembayaran yang menunggu konfirmasi' : 'Tidak ada data'} />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(sub => (
            <div key={sub._id} className={`card transition ${sub.status === 'nonaktif' ? 'border-l-4 border-l-amber-400' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <Building2 size={20} className="text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-800">{sub.cabang?.nama || 'Cabang tidak diketahui'}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[sub.status] || 'bg-slate-100 text-slate-500'}`}>
                        {sub.status?.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      <User size={11} className="inline mr-1" />
                      {sub.owner?.name} (@{sub.owner?.username})
                    </p>
                    <p className="text-xs text-slate-400">
                      Kode: {sub.cabang?.kode || '-'} · 
                      {sub.expiredAt ? ` Aktif s/d ${fmtDate(sub.expiredAt)}` : ' Tidak ada batas waktu'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Dibuat: {fmtDate(sub.createdAt)}
                    </p>
                    {sub.harga && (
                      <p className="text-xs text-amber-600 font-semibold mt-1">
                        💳 Tagihan: {fmtRp(sub.harga)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  {sub.status === 'nonaktif' ? (
                    <button
                      onClick={() => { setSelected(sub); setBulan(1); setShowModal(true); }}
                      className="btn btn-primary py-2 px-4 text-sm whitespace-nowrap"
                    >
                      <CheckCircle size={14} /> Konfirmasi
                    </button>
                  ) : (
                    <div className="text-right">
                      {sub.status === 'aktif' && (
                        <button
                          onClick={() => { setSelected(sub); setBulan(1); setShowModal(true); }}
                          className="btn btn-outline py-2 px-3 text-xs whitespace-nowrap"
                        >
                          + Perpanjang
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Konfirmasi */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Konfirmasi Pembayaran" size="sm">
        {selected && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-slate-700">{selected.cabang?.nama}</p>
              <p className="text-xs text-slate-500">{selected.owner?.name} (@{selected.owner?.username})</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Durasi Aktif</label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 6].map(b => (
                  <button key={b} onClick={() => setBulan(b)}
                    className={`py-2 rounded-xl text-sm font-semibold border transition ${bulan === b ? 'bg-primary-600 text-white border-primary-600' : 'border-slate-200 text-slate-600'}`}>
                    {b} bln
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-xs text-green-600">Total Pembayaran</p>
              <p className="text-xl font-black text-green-700">{fmtRp(30000 * bulan)}</p>
              <p className="text-xs text-green-500 mt-1">
                Aktif selama {bulan} bulan = {new Date(Date.now() + bulan * 30 * 24 * 3600 * 1000).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        )}
        <div className="flex gap-3 mt-5">
          <button className="btn btn-outline flex-1" onClick={() => setShowModal(false)}>Batal</button>
          <button className="btn btn-primary flex-1" onClick={handleKonfirmasi} disabled={saving}>
            {saving ? 'Memproses...' : '✅ Konfirmasi Bayar'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

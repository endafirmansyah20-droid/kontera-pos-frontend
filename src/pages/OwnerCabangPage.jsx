import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, CreditCard, Copy, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const REKENING = [
  { bank: 'BCA',     no: '1093049059',      nama: 'Enda Firmansyah' },
  { bank: 'Mandiri', no: '1250013988837',   nama: 'Enda Firmansyah' },
  { bank: 'BRI',     no: '372701030137531', nama: 'Enda Firmansyah' },
];

const inputCls = "w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition";

const statusBadge = (s) => {
  if (s === 'gratis') return <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold">GRATIS</span>;
  if (s === 'aktif')  return <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold">AKTIF</span>;
  return <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-bold">NONAKTIF</span>;
};

export default function OwnerCabangPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showPay, setShowPay] = useState(null);
  const [form, setForm]       = useState({ namaCabang: '', alamat: '', telepon: '' });
  const [saving, setSaving]   = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { data: res } = await api.get('/owner/dashboard');
      setData(res.data);
    } catch { toast.error('Gagal memuat data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!user) return;
    refresh();
  }, [user, refresh]);

  const handleTambahCabang = async () => {
    if (!form.namaCabang) return toast.error('Nama cabang wajib diisi');
    setSaving(true);
    try {
      const { data: res } = await api.post('/owner/tambah-cabang', form);
      toast.success('Cabang dibuat! Transfer untuk mengaktifkan.');
      setShowAdd(false);
      setForm({ namaCabang: '', alamat: '', telepon: '' });
      setShowPay(res.data);
      refresh();
    } catch (err) { toast.error(err.response?.data?.message || 'Gagal'); }
    finally { setSaving(false); }
  };

  const copyNo = (no) => { navigator.clipboard.writeText(no); toast.success('Disalin!'); };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto pb-24 lg:pb-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/owner')}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition shrink-0">
            <ArrowLeft size={16} className="text-slate-500" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-slate-800">Cabang Saya</h1>
            <p className="text-sm text-slate-400 mt-0.5">{data?.totalCabang ?? 0}/{data?.maxCabang ?? 0} slot digunakan</p>
          </div>
        </div>
        {data?.sisaSlot > 0 && (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition shrink-0">
            <Plus size={13} /> Tambah Cabang
          </button>
        )}
      </div>

      {/* ── List Cabang ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {(!data?.subscriptions || data.subscriptions.length === 0) ? (
          <div className="p-12 text-center">
            <Building2 size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Belum ada cabang</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {data.subscriptions.map(sub => (
              <div key={sub._id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <Building2 size={18} className="text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 text-sm">{sub.cabang?.nama}</p>
                    <p className="text-xs text-slate-400">Kode: {sub.cabang?.kode}</p>
                    {sub.expiredAt && <p className="text-xs text-slate-300">s/d: {new Date(sub.expiredAt).toLocaleDateString('id-ID')}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {statusBadge(sub.status)}
                  {sub.status === 'nonaktif' && (
                    <button onClick={() => setShowPay({ cabang: sub.cabang })} className="text-xs text-blue-600 font-bold hover:underline">Bayar</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="px-5 py-3 bg-blue-50/60 border-t border-blue-100">
          <p className="text-xs text-blue-600 font-medium">✨ Cabang pertama GRATIS · Cabang ke-2 dst Rp 30.000/bulan</p>
        </div>
      </div>

      {/* ── Modal Tambah Cabang ── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end lg:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="font-bold text-slate-800 mb-1">Tambah Cabang Baru</h3>
            <p className="text-xs text-slate-400 mb-4">Isi detail cabang yang akan ditambahkan</p>
            <div className="space-y-3">
              <input className={inputCls} placeholder="Nama Cabang *" value={form.namaCabang} onChange={e => setForm(f => ({ ...f, namaCabang: e.target.value }))} />
              <input className={inputCls} placeholder="Alamat (opsional)" value={form.alamat} onChange={e => setForm(f => ({ ...f, alamat: e.target.value }))} />
              <input className={inputCls} placeholder="Telepon (opsional)" value={form.telepon} onChange={e => setForm(f => ({ ...f, telepon: e.target.value }))} />
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                <p className="text-amber-700 text-xs font-semibold">⚡ Biaya Rp 30.000/bulan — aktif setelah konfirmasi pembayaran</p>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
                <button onClick={handleTambahCabang} disabled={saving} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-70">
                  {saving ? 'Proses...' : 'Buat Cabang'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Pembayaran ── */}
      {showPay && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end lg:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CreditCard size={28} className="text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-800">Instruksi Pembayaran</h3>
              {showPay?.cabang?.nama && <p className="text-xs text-slate-400 mt-1">Untuk cabang: <strong>{showPay.cabang.nama}</strong></p>}
            </div>
            <div className="bg-gradient-to-r from-blue-500 to-blue-700 rounded-2xl p-4 text-center text-white mb-4">
              <p className="text-3xl font-black">Rp 30.000</p>
              <p className="text-blue-200 text-xs mt-0.5">untuk 1 bulan aktif</p>
            </div>
            <div className="space-y-2.5 mb-4">
              {REKENING.map(r => (
                <div key={r.bank} className="flex items-center justify-between border border-slate-200 rounded-xl p-3.5">
                  <div>
                    <p className="font-bold text-slate-700 text-sm">{r.bank}</p>
                    <p className="text-lg font-mono font-black text-blue-600 tracking-wide">{r.no}</p>
                    <p className="text-xs text-slate-400">a.n. {r.nama}</p>
                  </div>
                  <button onClick={() => copyNo(r.no)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
                    <Copy size={15} className="text-slate-500" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 text-center mb-4">Konfirmasi via WhatsApp. Aktif dalam 1x24 jam.</p>
            <button onClick={() => setShowPay(null)} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition">
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

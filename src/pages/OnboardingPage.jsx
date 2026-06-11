import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store, Package, Users, ShoppingCart, BarChart2,
  ChevronRight, ChevronLeft, CheckCircle, Smartphone,
  ArrowRight, Wallet, ClipboardList, Settings
} from 'lucide-react';

const STEPS = [
  {
    id: 1,
    icon: '🎉',
    title: 'Selamat Datang di KonterA!',
    subtitle: 'Toko kamu sudah siap. Ikuti panduan singkat ini untuk memulai.',
    color: 'from-primary-600 to-primary-400',
    content: (
      <div className="space-y-3 mt-4">
        {[
          { icon: <Package size={18} />, text: 'Kelola stok produk fisik & digital' },
          { icon: <ShoppingCart size={18} />, text: 'Kasir cepat dengan berbagai metode bayar' },
          { icon: <Wallet size={18} />, text: 'Pantau saldo & mutasi semua akun' },
          { icon: <BarChart2 size={18} />, text: 'Laporan lengkap harian & bulanan' },
          { icon: <Users size={18} />, text: 'Kelola karyawan & multi cabang' },
        ].map(({ icon, text }, i) => (
          <div key={i} className="flex items-center gap-3 bg-white/60 rounded-xl px-4 py-3 border border-slate-100">
            <span className="text-primary-500">{icon}</span>
            <span className="text-sm text-slate-700 font-medium">{text}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 2,
    icon: '📦',
    title: 'Langkah 1 — Tambah Produk',
    subtitle: 'Mulai dengan mengisi stok produk yang kamu jual.',
    color: 'from-emerald-600 to-emerald-400',
    content: (
      <div className="space-y-4 mt-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-emerald-700 mb-3">📍 Cara Tambah Produk:</p>
          <ol className="space-y-2.5">
            {[
              'Buka menu Stok di sidebar kiri',
              'Klik tombol "+ Tambah Produk"',
              'Pilih tipe: Fisik (kartu perdana, aksesoris) atau Digital (pulsa, data, token)',
              'Isi nama, harga jual, dan stok awal',
              'Simpan — produk siap dijual di kasir!',
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">{i + 1}</span>
                <span className="text-sm text-slate-700">{t}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-700">💡 <strong>Tips:</strong> Produk digital seperti pulsa bisa diisi stok 999 agar tidak habis.</p>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    icon: '💰',
    title: 'Langkah 2 — Setup Saldo',
    subtitle: 'Daftarkan akun bank & e-wallet toko kamu.',
    color: 'from-blue-600 to-blue-400',
    content: (
      <div className="space-y-4 mt-4">
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-blue-700 mb-3">📍 Cara Setup Saldo:</p>
          <ol className="space-y-2.5">
            {[
              'Buka menu Saldo di sidebar',
              'Klik "+ Tambah Akun Saldo"',
              'Pilih tipe: Tunai, Bank, atau E-Wallet',
              'Isi nama akun & saldo awal sesuai kondisi sekarang',
              'Akun ini akan otomatis terupdate setiap transaksi',
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">{i + 1}</span>
                <span className="text-sm text-slate-700">{t}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['💵 Kas Tunai', '🏦 Transfer Bank', '📱 QRIS / E-Wallet'].map((a, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-2.5 text-center">
              <p className="text-xs font-semibold text-slate-600">{a}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 4,
    icon: '🛒',
    title: 'Langkah 3 — Mulai Transaksi',
    subtitle: 'Kasir KonterA cepat dan mudah digunakan.',
    color: 'from-violet-600 to-violet-400',
    content: (
      <div className="space-y-4 mt-4">
        <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-violet-700 mb-3">📍 Cara Transaksi:</p>
          <ol className="space-y-2.5">
            {[
              'Buka menu Transaksi → tab Kasir',
              'Pilih tab produk: Fisik / Jasa / Digital',
              'Klik produk untuk tambah ke keranjang',
              'Pilih metode bayar: Tunai, QRIS, Transfer, atau Hutang',
              'Klik Bayar — transaksi tersimpan otomatis!',
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-violet-500 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">{i + 1}</span>
                <span className="text-sm text-slate-700">{t}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
          <p className="text-xs text-slate-600">💡 <strong>Tips:</strong> Tekan Tab Riwayat untuk lihat semua transaksi & batalkan jika ada kesalahan.</p>
        </div>
      </div>
    ),
  },
  {
    id: 5,
    icon: '👥',
    title: 'Langkah 4 — Tambah Karyawan',
    subtitle: 'Buat akun untuk kasir atau admin toko kamu.',
    color: 'from-rose-600 to-rose-400',
    content: (
      <div className="space-y-4 mt-4">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-rose-700 mb-3">📍 Cara Tambah Karyawan:</p>
          <ol className="space-y-2.5">
            {[
              'Buka menu Pengaturan → tab Karyawan',
              'Klik "+ Tambah Karyawan"',
              'Isi nama, username, dan password',
              'Pilih role: Admin (akses penuh) atau Kasir (kasir saja)',
              'Bagikan username & password ke karyawan',
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">{i + 1}</span>
                <span className="text-sm text-slate-700">{t}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { role: '👑 Owner', desc: 'Akses semua fitur + closing' },
            { role: '🛡️ Admin', desc: 'Transaksi, stok, laporan' },
            { role: '💼 Kasir', desc: 'Transaksi & riwayat saja' },
            { role: '🏪 Multi Cabang', desc: 'Pisah data per toko' },
          ].map(({ role, desc }, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-3">
              <p className="text-xs font-bold text-slate-700">{role}</p>
              <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 6,
    icon: '🚀',
    title: 'Siap Mulai!',
    subtitle: 'Toko kamu sudah siap beroperasi dengan KonterA.',
    color: 'from-amber-500 to-orange-400',
    content: (
      <div className="space-y-3 mt-4">
        <p className="text-sm text-slate-600 text-center">Ringkasan yang perlu kamu lakukan pertama kali:</p>
        {[
          { icon: '📦', step: 'Tambah produk di menu Stok', done: false },
          { icon: '💰', step: 'Setup saldo akun di menu Saldo', done: false },
          { icon: '🛒', step: 'Coba transaksi pertama di Kasir', done: false },
          { icon: '👥', step: 'Tambah karyawan di Pengaturan', done: false },
          { icon: '📊', step: 'Lihat laporan di menu Laporan', done: false },
        ].map(({ icon, step }, i) => (
          <div key={i} className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-100 shadow-sm">
            <span className="text-lg">{icon}</span>
            <span className="text-sm text-slate-700 flex-1">{step}</span>
            <ArrowRight size={14} className="text-slate-300" />
          </div>
        ))}
      </div>
    ),
  },
];

export default function OnboardingPage() {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const step = STEPS[current];
  const isLast = current === STEPS.length - 1;
  const isFirst = current === 0;

  const finish = () => {
    localStorage.setItem('onboarding_done', '1');
    navigate('/dashboard');
  };

  const skip = () => {
    localStorage.setItem('onboarding_done', '1');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">

      {/* Header */}
      <div className="w-full max-w-lg mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Smartphone size={16} className="text-white" />
          </div>
          <span className="font-bold text-slate-700 text-sm">KonterA</span>
        </div>
        <button onClick={skip} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
          Lewati panduan →
        </button>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">

        {/* Top gradient bar */}
        <div className={`h-2 bg-gradient-to-r ${step.color}`} />

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pt-5 px-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                i === current ? 'w-6 bg-primary-500' : i < current ? 'w-3 bg-primary-300' : 'w-3 bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-4">
          {/* Icon + Title */}
          <div className="text-center mb-1">
            <span className="text-4xl">{step.icon}</span>
            <h2 className="text-xl font-extrabold text-slate-800 mt-2">{step.title}</h2>
            <p className="text-sm text-slate-500 mt-1">{step.subtitle}</p>
          </div>

          {/* Step content */}
          {step.content}

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {!isFirst && (
              <button
                onClick={() => setCurrent(c => c - 1)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-all"
              >
                <ChevronLeft size={16} /> Kembali
              </button>
            )}
            {isLast ? (
              <button
                onClick={finish}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-bold text-sm transition-all shadow-lg"
              >
                <CheckCircle size={16} /> Mulai Gunakan KonterA!
              </button>
            ) : (
              <button
                onClick={() => setCurrent(c => c + 1)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-bold text-sm transition-all shadow-lg"
              >
                Selanjutnya <ChevronRight size={16} />
              </button>
            )}
          </div>

          {/* Step counter */}
          <p className="text-center text-xs text-slate-400 mt-3">
            {current + 1} dari {STEPS.length} langkah
          </p>
        </div>
      </div>
    </div>
  );
}

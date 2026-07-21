import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, BarChart3, Store, FileText, FileSpreadsheet, Bell,
  Users, ShieldCheck, CreditCard, Wallet, Calculator, Package,
  Award, Printer, Moon, Check, ChevronDown, MessageCircle, Mail,
  ArrowRight, Download, Sparkles, Zap
} from 'lucide-react';
import heroDashboardImg from '../assets/landing-dashboard.jpg';
import transaksiImg      from '../assets/landing-transaksi.jpg';
import laporanImg        from '../assets/landing-laporan.jpg';

/* ---------------------------------------------------------------- */
/*  Landing / Marketing Page                                        */
/*  Menggunakan inline style + shared class 'login-root' agar body  */
/*  memakai background gelap (lihat index.css: body:has(.login-root))*/
/* ---------------------------------------------------------------- */

const FEATURES = [
  { icon: ShoppingCart,   title: 'Kasir Super Cepat',       desc: 'Transaksi dalam hitungan detik dengan keyboard shortcut & scan barcode.' },
  { icon: BarChart3,      title: 'Laporan Real-time',       desc: 'Omset, laba bersih, dan stok terupdate otomatis setiap transaksi.' },
  { icon: Store,          title: 'Multi-Cabang',            desc: 'Pantau semua cabang dari satu dashboard terpusat.' },
  { icon: FileText,       title: 'Invoice Digital',         desc: 'Struk & invoice digital yang bisa dikirim langsung ke pelanggan.' },
  { icon: FileSpreadsheet,title: 'Export Excel',            desc: 'Ekspor laporan penjualan dan keuangan ke Excel dengan sekali klik.' },
  { icon: Bell,           title: 'Notif Stok Menipis',      desc: 'Peringatan otomatis saat stok produk hampir habis.' },
  { icon: Users,          title: 'Multi-Role (Admin/Kasir)',desc: 'Hak akses berbeda untuk pemilik, admin, dan kasir toko Anda.' },
  { icon: ShieldCheck,    title: 'Data Aman',               desc: 'Data terenkripsi HTTPS, backup rutin, data antar toko terpisah.' },
  { icon: CreditCard,     title: 'QRIS & Transfer',         desc: 'Dukungan pembayaran cash, QRIS, transfer bank, hingga hutang.' },
  { icon: Wallet,         title: 'Kelola Hutang Piutang',   desc: 'Catat hutang pelanggan dan piutang supplier dengan rapi.' },
  { icon: Calculator,     title: 'Closing Kas Harian',      desc: 'Rekonsiliasi kas akhir hari dengan perhitungan otomatis.' },
  { icon: Package,        title: 'Mode Grosir',             desc: 'Harga khusus grosir yang otomatis berlaku sesuai kuantitas.' },
  { icon: Award,          title: 'Program Member/Loyalty',  desc: 'Poin & reward untuk pelanggan setia agar mereka kembali lagi.' },
  { icon: Printer,        title: 'Cetak Struk Bluetooth',   desc: 'Cetak struk langsung ke printer thermal 58mm via APK Android.' },
  { icon: Moon,           title: 'Dark Mode',               desc: 'Tampilan gelap yang nyaman di mata untuk penggunaan malam hari.' },
];

const FAQS = [
  {
    q: 'Apakah KonterA bisa dipakai di HP Android biasa?',
    a: 'Bisa! KonterA tersedia sebagai aplikasi web (bisa diakses langsung dari browser) maupun APK Android untuk fitur tambahan seperti cetak struk via printer Bluetooth.'
  },
  {
    q: 'Apakah data saya aman?',
    a: 'Data tersimpan aman di server dengan koneksi terenkripsi (HTTPS), dan setiap toko punya data yang terpisah dan tidak bisa diakses toko lain.'
  },
  {
    q: 'Bagaimana kalau saya punya lebih dari 1 cabang?',
    a: 'Tidak masalah! Satu harga langganan sudah mencakup semua cabang Anda, tanpa biaya tambahan per cabang.'
  },
  {
    q: 'Apakah bisa cetak struk otomatis?',
    a: 'Bisa, KonterA mendukung cetak struk langsung ke printer thermal Bluetooth 58mm dari aplikasi Android.'
  },
  {
    q: 'Bagaimana cara mulai menggunakan KonterA?',
    a: 'Klik tombol Mulai Trial Gratis, isi data toko Anda, dan langsung bisa mulai transaksi pertama dalam hitungan menit. Gratis 30 hari, tanpa perlu kartu kredit.'
  },
];

// TODO: ganti dengan testimoni asli setelah ada
const TESTIMONIALS = [
  { name: 'Pemilik Konter', role: 'Konter Pulsa, Jakarta',  initials: 'PK' },
  { name: 'Pemilik Konter', role: 'Konter Pulsa, Bandung',  initials: 'PK' },
  { name: 'Pemilik Konter', role: 'Konter Pulsa, Surabaya', initials: 'PK' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(0);

  const goDaftar = () => navigate('/daftar');
  const goLogin  = () => navigate('/login');

  return (
    <div
      className="login-root"
      style={{
        minHeight: '100vh',
        background: '#06010f',
        color: '#fff',
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes lb1{0%,100%{transform:translate(0,0)}50%{transform:translate(40px,-30px)}}
        @keyframes lb2{0%,100%{transform:translate(0,0)}50%{transform:translate(-25px,20px)}}
        @keyframes lb3{0%,100%{transform:translate(0,0)}50%{transform:translate(15px,-20px)}}
        @keyframes lfadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

        .lp-container { max-width: 1180px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 1; }
        .lp-btn-primary {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 14px 26px; border: none; border-radius: 14px;
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15px; font-weight: 700;
          color: white; cursor: pointer;
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #7c3aed 100%);
          box-shadow: 0 8px 32px rgba(37,99,235,0.42);
          transition: transform .2s, box-shadow .2s;
        }
        .lp-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(37,99,235,0.55); }

        .lp-btn-secondary {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 13px 24px; border-radius: 14px;
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15px; font-weight: 700;
          color: white; cursor: pointer; text-decoration: none;
          background: rgba(255,255,255,0.06);
          border: 1.5px solid rgba(255,255,255,0.14);
          transition: background .2s, border-color .2s, transform .2s;
        }
        .lp-btn-secondary:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.24); transform: translateY(-2px); }

        .lp-feature-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px;
          padding: 22px 20px;
          transition: transform .25s, border-color .25s, background .25s;
        }
        .lp-feature-card:hover {
          transform: translateY(-4px);
          border-color: rgba(59,130,246,0.35);
          background: rgba(37,99,235,0.06);
        }
        .lp-feature-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, rgba(37,99,235,0.18), rgba(124,58,237,0.14));
          border: 1px solid rgba(59,130,246,0.25);
          display: flex; align-items: center; justify-content: center;
          color: #93c5fd;
          margin-bottom: 14px;
        }

        .lp-faq-item {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          overflow: hidden;
          transition: border-color .2s, background .2s;
        }
        .lp-faq-item.open { border-color: rgba(59,130,246,0.4); background: rgba(37,99,235,0.05); }
        .lp-faq-btn {
          width: 100%; text-align: left; background: transparent; border: none; cursor: pointer;
          padding: 18px 22px; color: white; font-size: 15px; font-weight: 600;
          font-family: 'Plus Jakarta Sans', sans-serif;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
        }
        .lp-faq-answer {
          padding: 0 22px 20px; color: rgba(255,255,255,0.6); font-size: 14px; line-height: 1.65;
        }

        .lp-nav {
          position: sticky; top: 0; z-index: 30;
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          background: rgba(6,1,15,0.72);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .lp-hero-title {
          font-size: clamp(36px, 6vw, 64px);
          font-weight: 800;
          line-height: 1.08;
          letter-spacing: -1.8px;
          margin: 0 0 20px;
          background: linear-gradient(135deg,#fff 20%,rgba(147,197,253,0.9) 55%,rgba(234,179,8,0.85) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .lp-section-title {
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 800;
          letter-spacing: -1px;
          margin: 0 0 14px;
          background: linear-gradient(135deg,#fff 40%,rgba(147,197,253,0.85) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .lp-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(37,99,235,0.15);
          border: 1px solid rgba(37,99,235,0.3);
          border-radius: 100px;
          padding: 6px 14px;
          color: rgba(147,197,253,0.95);
          font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;
          margin-bottom: 18px;
        }
        .lp-fade { animation: lfadeUp .8s ease both; }

        .lp-feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
        .lp-hero-cta-row { display: flex; gap: 14px; flex-wrap: wrap; }
        .lp-hero-grid { display: grid; grid-template-columns: 1.05fr 1fr; gap: 60px; align-items: center; }
        .lp-testi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .lp-footer-grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 40px; }

        /* ── Hero screenshot (floating + glow) ─────────────── */
        @keyframes lfloat { 0%,100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-10px) rotate(-2deg); } }
        .lp-hero-shot { position: relative; }
        .lp-hero-shot-inner {
          position: relative;
          animation: lfloat 6s ease-in-out infinite;
        }
        .lp-hero-shot-glow {
          position: absolute; inset: -10% -8% -8% -8%;
          background: radial-gradient(circle at 50% 50%, rgba(37,99,235,0.35) 0%, rgba(124,58,237,0.22) 45%, transparent 70%);
          filter: blur(48px);
          z-index: 0;
          pointer-events: none;
        }
        .lp-hero-shot-frame {
          position: relative; z-index: 1;
          border-radius: 20px;
          padding: 8px;
          background: linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.03));
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: 0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.10);
          overflow: hidden;
        }
        .lp-hero-shot-img {
          display: block;
          width: 100%; height: auto; max-width: 100%;
          border-radius: 14px;
        }

        /* ── Showcase rows (image + text alternating) ──────── */
        .lp-showcase-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }
        .lp-showcase-row.reverse .lp-showcase-media { order: 2; }
        .lp-showcase-media { position: relative; }
        .lp-showcase-media-glow {
          position: absolute; inset: -8%;
          background: radial-gradient(circle at 50% 50%, rgba(37,99,235,0.22) 0%, rgba(124,58,237,0.14) 50%, transparent 75%);
          filter: blur(42px);
          z-index: 0;
          pointer-events: none;
        }
        .lp-showcase-frame {
          position: relative; z-index: 1;
          border-radius: 18px;
          padding: 6px;
          background: linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.12);
          box-shadow: 0 24px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08);
          overflow: hidden;
        }
        .lp-showcase-img {
          display: block;
          width: 100%; height: auto; max-width: 100%;
          border-radius: 12px;
        }
        .lp-showcase-checks { display: flex; flex-direction: column; gap: 12px; margin-top: 22px; }

        @media (max-width: 900px) {
          .lp-hero-grid { grid-template-columns: 1fr; gap: 40px; }
          .lp-feature-grid { grid-template-columns: repeat(2, 1fr); }
          .lp-testi-grid { grid-template-columns: 1fr; }
          .lp-footer-grid { grid-template-columns: 1fr; gap: 28px; }
          .lp-nav-links { display: none !important; }
          .lp-showcase-row { grid-template-columns: 1fr; gap: 32px; }
          .lp-showcase-row.reverse .lp-showcase-media { order: 0; }
          /* Matikan animasi floating di mobile (mengganggu scroll & hemat baterai) */
          .lp-hero-shot-inner { animation: none; transform: none; }
        }
        @media (max-width: 560px) {
          .lp-feature-grid { grid-template-columns: 1fr; }
          .lp-hero-cta-row .lp-btn-primary,
          .lp-hero-cta-row .lp-btn-secondary { flex: 1 1 100%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-hero-shot-inner { animation: none; }
        }
      `}</style>

      {/* Blob background dekorasi */}
      <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', top: -220, left: -180, background: 'radial-gradient(circle,rgba(37,99,235,0.22) 0%,transparent 65%)', animation: 'lb1 13s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 560, height: 560, borderRadius: '50%', top: '20%', right: '-8%', background: 'radial-gradient(circle,rgba(124,58,237,0.18) 0%,transparent 65%)', animation: 'lb2 10s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', bottom: '10%', left: '10%', background: 'radial-gradient(circle,rgba(234,179,8,0.10) 0%,transparent 65%)', animation: 'lb3 8s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,0.016) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.016) 1px,transparent 1px)', backgroundSize: '64px 64px' }} />

      {/* ─── NAV ─────────────────────────────────────────────── */}
      <nav className="lp-nav">
        <div className="lp-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 16px rgba(37,99,235,0.35)' }}>
              <img src="/Logo_KonterA.png" alt="KonterA" style={{ height: 38, display: 'block', objectFit: 'contain' }}
                onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.3px', lineHeight: 1.1 }}>KonterA</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(234,179,8,0.85)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 2 }}>POS System</div>
            </div>
          </div>

          <div className="lp-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <a href="#fitur"     style={navLinkStyle}>Fitur</a>
            <a href="#harga"     style={navLinkStyle}>Harga</a>
            <a href="#testimoni" style={navLinkStyle}>Testimoni</a>
            <a href="#faq"       style={navLinkStyle}>FAQ</a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={goLogin} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '8px 12px' }}>
              Masuk
            </button>
            <button onClick={goDaftar} className="lp-btn-primary" style={{ padding: '10px 20px', fontSize: 14 }}>
              Trial Gratis
            </button>
          </div>
        </div>
      </nav>

      {/* ─── HERO ────────────────────────────────────────────── */}
      <section style={{ padding: '80px 0 100px' }}>
        <div className="lp-container">
          <div className="lp-hero-grid">
            <div className="lp-fade">
              <div className="lp-eyebrow">
                <Sparkles size={12} /> Platform POS Untuk Konter Pulsa
              </div>
              <h1 className="lp-hero-title">Kelola Konter Lebih Cerdas &amp; Efisien</h1>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 17, lineHeight: 1.65, margin: '0 0 32px', maxWidth: 560 }}>
                Sistem POS modern khusus untuk konter pulsa — kasir cepat, laporan real-time, multi-cabang, semua terintegrasi dalam satu aplikasi.
              </p>

              <div className="lp-hero-cta-row">
                <button onClick={goDaftar} className="lp-btn-primary">
                  <Zap size={17} /> Mulai Trial Gratis <ArrowRight size={16} />
                </button>
                <a href="/downloads/konterapos.apk" download className="lp-btn-secondary">
                  <Download size={16} /> Download APK
                </a>
              </div>

              <div style={{ display: 'flex', gap: 32, marginTop: 40, flexWrap: 'wrap' }}>
                {[
                  ['30 Hari', 'Trial Gratis'],
                  ['Rp49rb', 'Per Bulan'],
                  ['Multi', 'Cabang Termasuk'],
                ].map(([v, l]) => (
                  <div key={l}>
                    <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>{v}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 3 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Screenshot dashboard — floating dengan glow di belakang */}
            <div className="lp-fade lp-hero-shot" style={{ animationDelay: '.15s' }}>
              <div className="lp-hero-shot-inner">
                {/* Glow di belakang */}
                <div className="lp-hero-shot-glow" aria-hidden="true" />
                <div className="lp-hero-shot-frame">
                  <img
                    src={heroDashboardImg}
                    alt="Dashboard KonterA menampilkan ringkasan omset, laba, dan grafik penjualan"
                    loading="eager"
                    className="lp-hero-shot-img"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FITUR ───────────────────────────────────────────── */}
      <section id="fitur" style={{ padding: '80px 0' }}>
        <div className="lp-container">
          <div style={{ textAlign: 'center', marginBottom: 50 }}>
            <div className="lp-eyebrow">Fitur Unggulan</div>
            <h2 className="lp-section-title">Semua Yang Anda Butuhkan Untuk Konter</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, maxWidth: 620, margin: '0 auto' }}>
              Dari kasir sampai laporan, KonterA sudah lengkap dengan fitur yang benar-benar dipakai konter setiap hari.
            </p>
          </div>

          <div className="lp-feature-grid">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="lp-feature-card">
                <div className="lp-feature-icon"><Icon size={20} /></div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: 'white' }}>{title}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SHOWCASE (screenshot Transaksi & Laporan) ──────── */}
      <section style={{ padding: '40px 0 60px' }}>
        <div className="lp-container" style={{ display: 'flex', flexDirection: 'column', gap: 100 }}>

          {/* Row 1: Transaksi (image kiri, text kanan) */}
          <div className="lp-showcase-row">
            <div className="lp-showcase-media">
              <div className="lp-showcase-media-glow" aria-hidden="true" />
              <div className="lp-showcase-frame">
                <img
                  src={transaksiImg}
                  alt="Halaman transaksi KonterA — kasir cepat dengan katalog produk dan keranjang"
                  loading="lazy"
                  className="lp-showcase-img"
                />
              </div>
            </div>
            <div>
              <div className="lp-eyebrow"><ShoppingCart size={12} /> Kasir</div>
              <h3 className="lp-section-title" style={{ fontSize: 'clamp(24px, 3vw, 32px)' }}>Kasir Cepat, Transaksi Selesai Dalam Detik</h3>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.7 }}>
                Katalog produk yang bisa dicari cepat, kalkulasi otomatis, dan pilihan pembayaran lengkap — semua dalam satu layar tanpa perlu berpindah menu.
              </p>
              <div className="lp-showcase-checks">
                {[
                  'Scan barcode & keyboard shortcut',
                  'Multi-metode bayar: cash, QRIS, transfer, hutang',
                  'Stok otomatis berkurang setiap transaksi',
                  'Cetak struk thermal Bluetooth 58mm',
                ].map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={12} color="#4ade80" strokeWidth={3} />
                    </div>
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>{item}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: Laporan (image kanan, text kiri) */}
          <div className="lp-showcase-row reverse">
            <div className="lp-showcase-media">
              <div className="lp-showcase-media-glow" aria-hidden="true" />
              <div className="lp-showcase-frame">
                <img
                  src={laporanImg}
                  alt="Halaman laporan KonterA — grafik penjualan, omset harian, dan analisis laba"
                  loading="lazy"
                  className="lp-showcase-img"
                />
              </div>
            </div>
            <div>
              <div className="lp-eyebrow"><BarChart3 size={12} /> Laporan</div>
              <h3 className="lp-section-title" style={{ fontSize: 'clamp(24px, 3vw, 32px)' }}>Laporan Real-time, Keputusan Berbasis Data</h3>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.7 }}>
                Pantau omset, laba bersih, dan performa produk kapan saja. Data update otomatis setiap transaksi — tanpa perlu rekap manual di akhir hari.
              </p>
              <div className="lp-showcase-checks">
                {[
                  'Omset harian, mingguan, bulanan',
                  'Analisis produk terlaris & margin per kategori',
                  'Perbandingan performa antar cabang',
                  'Export ke Excel untuk laporan detail',
                ].map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={12} color="#4ade80" strokeWidth={3} />
                    </div>
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>{item}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ─── HARGA ───────────────────────────────────────────── */}
      <section id="harga" style={{ padding: '80px 0' }}>
        <div className="lp-container">
          <div style={{ textAlign: 'center', marginBottom: 46 }}>
            <div className="lp-eyebrow">Harga Terjangkau</div>
            <h2 className="lp-section-title">Coba Gratis, Lanjut Terjangkau</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, maxWidth: 560, margin: '0 auto' }}>
              Satu harga flat, semua fitur, tanpa batas cabang. Tanpa biaya tersembunyi.
            </p>
          </div>

          <div style={{ maxWidth: 460, margin: '0 auto' }}>
            <div style={{
              position: 'relative',
              background: 'linear-gradient(180deg, rgba(37,99,235,0.10), rgba(124,58,237,0.06))',
              border: '1.5px solid rgba(59,130,246,0.35)',
              borderRadius: 24,
              padding: '38px 32px',
              boxShadow: '0 30px 80px rgba(37,99,235,0.18), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}>
              <div style={{
                position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                background: 'linear-gradient(135deg,#eab308,#f59e0b)', color: '#1a1005',
                padding: '5px 14px', borderRadius: 100, fontSize: 11, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase',
              }}>
                Paling Populer
              </div>

              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 13, color: 'rgba(147,197,253,0.9)', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>
                  Paket Lengkap
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 44, fontWeight: 800, color: 'white', letterSpacing: '-1.5px' }}>Rp49.000</span>
                  <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>/bulan</span>
                </div>
                <div style={{ fontSize: 13, color: 'rgba(234,179,8,0.9)', fontWeight: 700 }}>
                  Trial 30 Hari — GRATIS, akses semua fitur
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                {[
                  'Akses semua fitur tanpa batas',
                  'Multi-cabang tanpa biaya tambahan',
                  'User admin & kasir tak terbatas',
                  'Laporan & export Excel lengkap',
                  'Update fitur baru otomatis',
                  'Dukungan via WhatsApp',
                ].map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={13} color="#4ade80" strokeWidth={3} />
                    </div>
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>{item}</div>
                  </div>
                ))}
              </div>

              <button onClick={goDaftar} className="lp-btn-primary" style={{ width: '100%' }}>
                <Zap size={17} /> Mulai Trial Gratis
              </button>
              <div style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 12 }}>
                Tanpa kartu kredit. Batalkan kapan saja.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONI ───────────────────────────────────────── */}
      <section id="testimoni" style={{ padding: '80px 0' }}>
        <div className="lp-container">
          <div style={{ textAlign: 'center', marginBottom: 46 }}>
            <div className="lp-eyebrow">Testimoni</div>
            <h2 className="lp-section-title">Dipercaya Pemilik Konter</h2>
          </div>

          {/* TODO: ganti card ini dengan testimoni asli setelah tersedia */}
          <div className="lp-testi-grid">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 18, padding: 26,
                display: 'flex', flexDirection: 'column', gap: 18, minHeight: 220,
              }}>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.65, fontStyle: 'italic', flex: 1 }}>
                  &ldquo;Testimoni akan segera hadir.&rdquo;
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 800, fontSize: 14, flexShrink: 0,
                  }}>
                    {t.initials}
                  </div>
                  <div>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─────────────────────────────────────────────── */}
      <section id="faq" style={{ padding: '80px 0' }}>
        <div className="lp-container" style={{ maxWidth: 780 }}>
          <div style={{ textAlign: 'center', marginBottom: 46 }}>
            <div className="lp-eyebrow">FAQ</div>
            <h2 className="lp-section-title">Pertanyaan Yang Sering Ditanyakan</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FAQS.map((f, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className={`lp-faq-item ${isOpen ? 'open' : ''}`}>
                  <button className="lp-faq-btn" onClick={() => setOpenFaq(isOpen ? -1 : i)}>
                    <span>{f.q}</span>
                    <ChevronDown size={18} style={{ transition: 'transform .25s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', flexShrink: 0, color: 'rgba(147,197,253,0.9)' }} />
                  </button>
                  {isOpen && <div className="lp-faq-answer">{f.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── CTA PENUTUP ─────────────────────────────────────── */}
      <section style={{ padding: '80px 0 100px' }}>
        <div className="lp-container">
          <div style={{
            background: 'linear-gradient(135deg, rgba(37,99,235,0.20), rgba(124,58,237,0.18))',
            border: '1.5px solid rgba(59,130,246,0.35)',
            borderRadius: 28,
            padding: 'clamp(40px, 6vw, 70px) clamp(24px, 5vw, 60px)',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 30px 80px rgba(37,99,235,0.18)',
          }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />

            <div className="lp-eyebrow" style={{ position: 'relative' }}>
              <Sparkles size={12} /> Mulai Hari Ini
            </div>
            <h2 className="lp-section-title" style={{ position: 'relative', maxWidth: 680, margin: '0 auto 16px' }}>
              Siap Kelola Konter Anda Lebih Mudah?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, maxWidth: 560, margin: '0 auto 32px', position: 'relative', lineHeight: 1.65 }}>
              Coba KonterA gratis selama 30 hari. Tanpa kartu kredit, tanpa komitmen. Batalkan kapan saja.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', position: 'relative' }}>
              <button onClick={goDaftar} className="lp-btn-primary">
                <Zap size={17} /> Mulai Trial Gratis <ArrowRight size={16} />
              </button>
              <a href="/downloads/konterapos.apk" download className="lp-btn-secondary">
                <Download size={16} /> Download APK
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '50px 0 30px', background: 'rgba(0,0,0,0.25)' }}>
        <div className="lp-container">
          <div className="lp-footer-grid" style={{ marginBottom: 36 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{ borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 16px rgba(37,99,235,0.35)' }}>
                  <img src="/Logo_KonterA.png" alt="KonterA" style={{ height: 36, display: 'block', objectFit: 'contain' }}
                    onError={(e) => { e.target.parentElement.style.display = 'none'; }} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.3px' }}>KonterA</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(234,179,8,0.85)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 2 }}>POS System</div>
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13.5, lineHeight: 1.7, maxWidth: 340, margin: 0 }}>
                Sistem POS modern khusus untuk konter pulsa. Kasir cepat, laporan real-time, semua dalam satu aplikasi.
              </p>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 16 }}>Menu</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <a href="#fitur"     style={footerLinkStyle}>Fitur</a>
                <a href="#harga"     style={footerLinkStyle}>Harga</a>
                <a href="#testimoni" style={footerLinkStyle}>Testimoni</a>
                <a href="#faq"       style={footerLinkStyle}>FAQ</a>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 16 }}>Kontak</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <a href="https://wa.me/6288210152625" target="_blank" rel="noreferrer" style={{ ...footerLinkStyle, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MessageCircle size={16} color="#4ade80" />
                  <span>+62 882-1015-2625</span>
                </a>
                <a href="mailto:kontera204@gmail.com" style={{ ...footerLinkStyle, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Mail size={16} color="#93c5fd" />
                  <span>kontera204@gmail.com</span>
                </a>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
              Copyright © 2026 KonterA
            </div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
              All rights reserved
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const navLinkStyle = {
  color: 'rgba(255,255,255,0.65)',
  fontSize: 14,
  fontWeight: 600,
  textDecoration: 'none',
  transition: 'color .2s',
};

const footerLinkStyle = {
  color: 'rgba(255,255,255,0.55)',
  fontSize: 14,
  textDecoration: 'none',
  transition: 'color .2s',
};

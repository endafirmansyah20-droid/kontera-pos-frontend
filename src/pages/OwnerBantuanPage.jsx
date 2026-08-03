import React, { useState, useMemo } from 'react';
import {
  HelpCircle, Search, MessageCircle, Mail, ChevronDown,
  LayoutDashboard, Building2, Users, ShoppingCart, Wrench,
  Wallet2, BarChart3, BookOpen, Inbox,
} from 'lucide-react';

const HERO_GRADIENT = 'linear-gradient(120deg, #26215C 0%, #3C3489 50%, #7F77DD 100%)';

const WA_NUMBER = '6288210152625';
const EMAIL     = 'kontera204@gmail.com';

const FAQ = [
  {
    q: 'Bagaimana cara menambah cabang baru?',
    a: 'Buka menu Cabang di sidebar Owner → klik tombol "Tambah Cabang" di kanan atas → isi nama, alamat, dan data kontak → simpan. Cabang baru langsung aktif dan bisa diisi karyawan lewat menu Karyawan.',
  },
  {
    q: 'Bagaimana cara reset password karyawan?',
    a: 'Buka menu Karyawan → klik nama karyawan yang password-nya mau direset → di halaman detail, klik "Reset Password" → masukkan password baru minimal 6 karakter → simpan. Password lama otomatis tidak berlaku.',
  },
  {
    q: 'Di mana saya bisa melihat laporan bulanan?',
    a: 'Buka menu Laporan → pilih tab "Laporan Bulanan". Pilih bulan dan tahun, laporan omzet, laba kotor, dan pengeluaran akan tampil per cabang. Bisa juga filter per cabang tertentu lewat dropdown di atas.',
  },
  {
    q: 'Bagaimana cara export laporan ke PDF?',
    a: 'Di halaman Laporan (baik Laporan Bulanan maupun Riwayat), setelah data tampil, klik tombol "Cetak / Print" di kanan atas. Browser akan membuka dialog print — pilih "Save as PDF" sebagai printer untuk menyimpan sebagai file PDF.',
  },
  {
    q: 'Apa itu mode Grosir dan kapan dipakai?',
    a: 'Mode Grosir dipakai saat transaksi dengan harga khusus (pembelian jumlah banyak/reseller). Di halaman Transaksi ada toggle Ritel/Grosir — kalau mode Grosir aktif, harga produk otomatis pakai "harga grosir" yang sudah diatur di Stok. Laporan Ritel vs Grosir menampilkan perbandingan omzet keduanya.',
  },
  {
    q: 'Bagaimana cara aktifkan login dengan Google?',
    a: 'Login via Google sudah tersedia di halaman Login untuk semua user. Cukup klik tombol "Masuk dengan Google" — pastikan email Google Anda sama dengan email yang terdaftar di sistem. Kalau belum terdaftar, admin/owner harus tambahkan user dulu.',
  },
  {
    q: 'Bagaimana cara ganti password saya sendiri?',
    a: 'Untuk role karyawan/kasir: buka sidebar → klik "Ganti Password" di bagian bawah. Untuk Owner: masuk ke Pengaturan → tab Akun → isi password lama & baru → simpan. Password minimal 6 karakter.',
  },
  {
    q: 'Kenapa data tidak muncul setelah ganti cabang?',
    a: 'Coba refresh halaman (F5) — beberapa halaman cache data cabang sebelumnya. Kalau masih kosong, cek dropdown pemilih cabang di bagian atas halaman: pastikan cabang yang benar sudah dipilih. Kalau tetap tidak muncul, kemungkinan cabang tersebut memang belum ada transaksi di periode itu.',
  },
  {
    q: 'Bagaimana cara nonaktifkan cabang?',
    a: 'Buka menu Cabang → klik cabang yang mau dinonaktifkan → tombol "Nonaktifkan" di detail cabang. Cabang non-aktif tidak bisa dipakai transaksi baru, tapi data lama tetap tersimpan dan bisa dilihat di laporan. Bisa diaktifkan kembali kapan saja.',
  },
  {
    q: 'Berapa biaya tambahan per cabang?',
    a: 'Setiap cabang baru dapat gratis trial 30 hari. Setelah trial berakhir, biaya langganan per cabang adalah Rp49.000/bulan. Pembayaran bisa dilakukan lewat menu Pengaturan → Langganan, dan cabang otomatis aktif setelah pembayaran dikonfirmasi admin.',
  },
];

const PANDUAN = [
  {
    icon: LayoutDashboard,
    title: 'Dashboard',
    desc: 'Ringkasan real-time seluruh cabang: total omzet hari ini, transaksi, top produk, dan grafik penjualan per jam. Cocok untuk cek kondisi bisnis sekilas.',
  },
  {
    icon: Building2,
    title: 'Cabang',
    desc: 'Kelola daftar cabang: tambah cabang baru, edit alamat/kontak, nonaktifkan cabang yang tidak dipakai. Setiap cabang punya data transaksi & stok terpisah.',
  },
  {
    icon: Users,
    title: 'Karyawan',
    desc: 'Daftar semua karyawan lintas cabang dengan statistik performa (transaksi, omzet). Klik nama untuk detail per-karyawan atau reset password.',
  },
  {
    icon: ShoppingCart,
    title: 'Penjualan',
    desc: 'Rekap transaksi penjualan semua cabang. Filter per tanggal, cabang, atau metode pembayaran. Bisa lihat detail transaksi termasuk transaksi yang di-void.',
  },
  {
    icon: Wrench,
    title: 'Service HP',
    desc: 'Rekap transaksi servis HP: daftar servis masuk, status pengerjaan, dan omzet servis per cabang. Termasuk keuangan spare-part servis.',
  },
  {
    icon: Wallet2,
    title: 'Keuangan',
    desc: 'Catatan pemasukan, pengeluaran, hutang, dan piutang lintas cabang. Buat entri manual di sini untuk biaya operasional yang tidak masuk kategori transaksi.',
  },
  {
    icon: BarChart3,
    title: 'Laporan',
    desc: 'Empat tab utama: Riwayat Closing kas, Riwayat Pembelian stok, Laporan Bulanan (omzet & laba), dan perbandingan Ritel vs Grosir. Bisa di-export.',
  },
];

function GradientPanel({ children, style = {}, className = '' }) {
  return (
    <div className={className} style={{
      background: HERO_GRADIENT, borderRadius: 12, padding: 16,
      boxShadow: '0 10px 28px -8px rgba(38,33,92,0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
      ...style,
    }}>{children}</div>
  );
}

function ContactCard() {
  const btnBase = {
    flex: 1, minWidth: 180,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '12px 16px', borderRadius: 10,
    fontSize: 13, fontWeight: 700,
    textDecoration: 'none',
    transition: 'transform 0.1s, background 0.15s',
  };
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noopener noreferrer"
        style={{
          ...btnBase,
          background: '#22c55e', color: '#fff',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 4px 12px -2px rgba(34,197,94,0.35)',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#16a34a'}
        onMouseLeave={e => e.currentTarget.style.background = '#22c55e'}
      >
        <MessageCircle size={16} />
        <span>Chat WhatsApp</span>
      </a>
      <a href={`mailto:${EMAIL}`}
        style={{
          ...btnBase,
          background: 'rgba(255,255,255,0.10)', color: '#fff',
          border: '1px solid rgba(255,255,255,0.20)',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.10)'}
      >
        <Mail size={16} />
        <span>Kirim Email</span>
      </a>
    </div>
  );
}

function FaqItem({ item, open, onToggle }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '0.5px solid rgba(255,255,255,0.08)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      <button type="button" onClick={onToggle}
        style={{
          width: '100%', padding: '12px 14px',
          background: 'transparent', border: 'none',
          display: 'flex', alignItems: 'center', gap: 10,
          cursor: 'pointer', color: '#fff',
          textAlign: 'left',
        }}>
        <HelpCircle size={14} style={{ color: '#A5B4FC', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>
          {item.q}
        </span>
        <ChevronDown size={16} style={{
          color: 'rgba(255,255,255,0.6)',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          flexShrink: 0,
        }} />
      </button>
      {open && (
        <div style={{
          padding: '0 14px 14px 38px',
          color: 'rgba(255,255,255,0.75)',
          fontSize: 12, lineHeight: 1.6,
        }}>
          {item.a}
        </div>
      )}
    </div>
  );
}

function PanduanCard({ item }) {
  const Icon = item.icon;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '0.5px solid rgba(255,255,255,0.08)',
      borderRadius: 10, padding: 14,
      display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'rgba(127,119,221,0.20)',
        border: '1px solid rgba(127,119,221,0.35)',
        color: '#C7D2FE',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={16} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{
          color: '#fff', fontSize: 13, fontWeight: 700,
          margin: 0, lineHeight: 1.3,
        }}>{item.title}</p>
        <p style={{
          color: 'rgba(255,255,255,0.7)', fontSize: 12,
          margin: '4px 0 0', lineHeight: 1.5,
        }}>{item.desc}</p>
      </div>
    </div>
  );
}

export default function OwnerBantuanPage() {
  const [search, setSearch] = useState('');
  const [openIdx, setOpenIdx] = useState(null);

  const filteredFaq = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return FAQ;
    return FAQ.filter(f =>
      f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="space-y-4">
      {/* Header + Search */}
      <GradientPanel>
        <div className="flex items-start gap-3 flex-wrap">
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'rgba(255,255,255,0.10)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <HelpCircle size={18} style={{ color: '#fff' }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{
              color: '#fff', fontSize: 16, fontWeight: 700,
              margin: 0, lineHeight: 1.2,
            }}>Pusat Bantuan</h2>
            <p style={{
              color: 'rgba(255,255,255,0.65)', fontSize: 12,
              margin: '2px 0 0',
            }}>
              Cari jawaban dari pertanyaan umum atau hubungi tim support kami
            </p>
          </div>
        </div>

        <div className="mt-4" style={{ position: 'relative' }}>
          <Search size={14} style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)',
            color: 'rgba(255,255,255,0.5)',
            pointerEvents: 'none',
          }} />
          <input type="text" value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari pertanyaan… (misal: reset password, cabang, laporan)"
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.08)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              color: '#fff',
              borderRadius: 10,
              padding: '10px 12px 10px 34px',
              fontSize: 13, outline: 'none',
            }} />
        </div>
      </GradientPanel>

      {/* Kontak Support */}
      <GradientPanel>
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle size={14} style={{ color: '#A5B4FC' }} />
          <h3 style={{
            color: '#fff', fontSize: 13, fontWeight: 700,
            margin: 0, textTransform: 'uppercase', letterSpacing: 0.5,
          }}>Butuh bantuan cepat?</h3>
        </div>
        <p style={{
          color: 'rgba(255,255,255,0.7)', fontSize: 12,
          margin: '0 0 12px', lineHeight: 1.5,
        }}>
          Tim support kami siap membantu setiap hari. Balasan WhatsApp biasanya dalam 15 menit di jam kerja.
        </p>
        <ContactCard />
      </GradientPanel>

      {/* FAQ */}
      <GradientPanel>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <HelpCircle size={14} style={{ color: '#A5B4FC' }} />
            <h3 style={{
              color: '#fff', fontSize: 13, fontWeight: 700,
              margin: 0, textTransform: 'uppercase', letterSpacing: 0.5,
            }}>Pertanyaan yang sering diajukan</h3>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>
            {filteredFaq.length} dari {FAQ.length}
          </span>
        </div>

        {filteredFaq.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px dashed rgba(255,255,255,0.12)',
            borderRadius: 12, padding: '32px 20px',
            textAlign: 'center',
          }}>
            <Inbox size={26} style={{ color: 'rgba(255,255,255,0.35)', margin: '0 auto 8px' }} />
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 0 }}>
              Tidak ada hasil untuk "{search}"
            </p>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: '4px 0 0' }}>
              Coba kata kunci lain, atau hubungi support di atas.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFaq.map((f, i) => (
              <FaqItem key={f.q} item={f}
                open={openIdx === i}
                onToggle={() => setOpenIdx(o => o === i ? null : i)} />
            ))}
          </div>
        )}
      </GradientPanel>

      {/* Panduan Penggunaan */}
      <GradientPanel>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={14} style={{ color: '#A5B4FC' }} />
          <h3 style={{
            color: '#fff', fontSize: 13, fontWeight: 700,
            margin: 0, textTransform: 'uppercase', letterSpacing: 0.5,
          }}>Panduan Penggunaan</h3>
        </div>
        <p style={{
          color: 'rgba(255,255,255,0.7)', fontSize: 12,
          margin: '0 0 12px', lineHeight: 1.5,
        }}>
          Ringkasan fungsi tiap menu di dashboard Owner.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PANDUAN.map(p => <PanduanCard key={p.title} item={p} />)}
        </div>
      </GradientPanel>
    </div>
  );
}

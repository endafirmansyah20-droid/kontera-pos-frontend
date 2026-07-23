import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, ShoppingCart, Package, Wallet, Wallet2,
  BarChart2, BarChart3, Users, Settings, LogOut, Smartphone, Menu, X,
  Calculator, Wrench, Building2, ChevronRight, Store, CreditCard,
  Moon, Sun, Lock
} from 'lucide-react';
import api from '../services/api';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

// Nav untuk superadmin
const SUPER_NAV = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard'     },
  { to: '/client',        icon: Building2,       label: 'Client'        },
  { to: '/subscriptions', icon: CreditCard,      label: 'Langganan',    badge: 'sub_pending' },
  { to: '/pengaturan',    icon: Settings,        label: 'Pengaturan'    },
];

// Nav untuk owner
const OWNER_NAV = [
  { to: '/owner',           icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/owner/cabang',    icon: Building2,       label: 'Cabang'     },
  { to: '/owner/karyawan',  icon: BarChart2,       label: 'Karyawan'   },
  { to: '/owner/penjualan', icon: BarChart3,       label: 'Penjualan'  },
  { to: '/owner/service',   icon: Wrench,          label: 'Service HP' },
  { to: '/keuangan',        icon: Wallet2,         label: 'Keuangan'   },
  { to: '/pengaturan',      icon: Settings,        label: 'Pengaturan' },
];

// Nav untuk admin & karyawan
const navItems = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard',  adminOnly: true },
  { to: '/transaksi',   icon: ShoppingCart,    label: 'Transaksi' },
  { to: '/stok',        icon: Package,         label: 'Stok',       badge: 'low_stock' },
  { to: '/service',     icon: Wrench,          label: 'Service HP' },
  { to: '/saldo',       icon: Wallet,          label: 'Saldo'     },
  { to: '/closing-kas', icon: Calculator,      label: 'Closing'   },
  { to: '/keuangan',    icon: Wallet2,         label: 'Keuangan'  },
  { to: '/laporan',     icon: BarChart3,       label: 'Laporan',   adminOnly: true },
  { to: '/pelanggan',   icon: Users,           label: 'Pelanggan' },
  { to: '/pengaturan',  icon: Settings,        label: 'Pengaturan', adminOnly: true },
];

const BOTTOM_NAV_KEYS = ['/dashboard', '/transaksi', '/stok', '/saldo', '/owner'];

export default function Sidebar({ lowStockCount = 0 }) {
  const { user, logout, isAdmin, isSuperAdmin, isOwner, cabang, darkMode, toggleDarkMode } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingPayment, setPendingPayment] = useState(0);

  // Ambil jumlah pembayaran pending untuk superadmin
  // Auto-close drawer & modal saat navigasi — cegah overlay tersangkut
  useEffect(() => {
    setDrawerOpen(false);
    setShowChangePw(false);
  }, [location.pathname]);

  // Tutup drawer/modal dengan tombol Escape
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        setShowChangePw(false);
      }
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, []);

  useEffect(() => {
    if (!isSuperAdmin) return;
    api.get('/owner/subscriptions')
      .then(r => {
        const pending = (r.data.data || []).filter(s => s.status === 'nonaktif').length;
        setPendingPayment(pending);
      })
      .catch(() => {});
  }, [isSuperAdmin]);

  const handleLogout = () => { logout(); navigate('/login'); };

  // Ganti password sendiri — bisa diakses semua role dari sidebar
  const [showChangePw, setShowChangePw] = useState(false);
  const [changePwForm, setChangePwForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPw, setChangingPw]     = useState(false);

  const handleChangeMyPassword = async () => {
    if (!changePwForm.oldPassword || !changePwForm.newPassword) return toast.error('Semua field wajib diisi');
    if (changePwForm.newPassword.length < 6) return toast.error('Password baru minimal 6 karakter');
    if (changePwForm.newPassword !== changePwForm.confirmPassword) return toast.error('Konfirmasi password tidak cocok');
    setChangingPw(true);
    try {
      await authAPI.changeMyPassword(changePwForm.oldPassword, changePwForm.newPassword);
      toast.success('Password berhasil diubah!');
      setShowChangePw(false);
      setChangePwForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Password lama salah'); }
    finally { setChangingPw(false); }
  };

  const getBadgeCount = (badge) => {
    if (badge === 'low_stock') return lowStockCount;
    if (badge === 'sub_pending') return pendingPayment;
    return 0;
  };

  const activeNav = isSuperAdmin
    ? SUPER_NAV
    : isOwner
      ? OWNER_NAV
      : navItems.filter(item => {
          if (item.adminOnly) return isAdmin;
          return true;
        });

  const mainItems = isSuperAdmin
    ? SUPER_NAV.slice(0, 4)
    : isOwner
      ? OWNER_NAV.slice(0, 4)
      : activeNav.filter(item => BOTTOM_NAV_KEYS.includes(item.to));

  const moreItems = isSuperAdmin
    ? []
    : isOwner
      ? OWNER_NAV.slice(4)
      : activeNav.filter(item => !BOTTOM_NAV_KEYS.includes(item.to));
  const isMoreActive = moreItems.some(item => location.pathname === item.to);

  const roleLabel = isSuperAdmin
    ? '⭐ Super Admin'
    : isOwner
      ? '🏪 Owner'
      : cabang
        ? `📍 ${cabang.nama}`
        : 'Management System';

  const roleColor = isSuperAdmin
    ? 'text-amber-500'
    : isOwner
      ? 'text-green-500'
      : 'text-primary-500';

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 fixed inset-y-0 left-0 z-30 shadow-lg" style={{background:'#8b1a6b'}}>
        <div className="flex flex-col h-full">
          <div className="px-5 py-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-glow">
                <img src="/logo-kontera.png" alt="KonterA" className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="font-bold text-white text-sm leading-tight">KonterA</p>
                <p className={`text-xs font-semibold ${roleColor}`}>{roleLabel}</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {activeNav.map(({ to, icon: Icon, label, badge }) => {
              const count = badge ? getBadgeCount(badge) : 0;
              return (
                <NavLink key={to} to={to} end
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                  <Icon size={18} />
                  <span className="flex-1">{label}</span>
                  {count > 0 && (
                    <span className="badge badge-red text-xs">{count > 99 ? '99+' : count}</span>
                  )}
                </NavLink>
              );
            })}
          </nav>
          <div className="px-3 py-4 border-t border-white/10">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2" style={{background:'rgba(255,255,255,0.10)'}}>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <p className="text-xs text-violet-300 capitalize">{user?.role}</p>
              </div>
            </div>
            <button onClick={toggleDarkMode} className="sidebar-link w-full mb-1">
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            {!isAdmin && !isOwner && !isSuperAdmin && (
              <button onClick={() => setShowChangePw(true)} className="sidebar-link w-full mb-1">
                <Lock size={18} /><span>Ganti Password</span>
              </button>
            )}
            <button onClick={handleLogout} className="sidebar-link w-full" style={{color:'#fca5a5'}}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(239,68,68,0.15)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <LogOut size={18} /><span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-slate-100 shadow-sm"
           style={{ paddingTop: 'var(--safe-top)' }}>
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden">
              <img src="/logo-kontera.png" alt="KonterA" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-slate-800 text-sm">KonterA</span>
          </div>
          <span className="text-xs font-semibold text-violet-300/60 uppercase tracking-wider">
            {activeNav.find(i => i.to === location.pathname)?.label || ''}
          </span>
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            {/* Badge total notifikasi di mobile */}
            {(lowStockCount + pendingPayment) > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {lowStockCount + pendingPayment > 9 ? '9+' : lowStockCount + pendingPayment}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Spacer */}
      <div className="lg:hidden h-14" />

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav lg:hidden">
        <div className="flex items-stretch px-1 pt-1">
          {mainItems.map(({ to, icon: Icon, label, badge }) => {
            const isActive = location.pathname === to;
            const count = badge ? getBadgeCount(badge) : 0;
            return (
              <NavLink key={to} to={to} end className={`bottom-nav-item ${isActive ? 'active' : ''}`}>
                <div className="relative">
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  {count > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </div>
                <span>{label}</span>
                {isActive && <span className="active-dot" />}
              </NavLink>
            );
          })}
          {(moreItems.length > 0 || isOwner) && (
            <button className={`bottom-nav-item ${isMoreActive || drawerOpen ? 'active' : ''}`}
              onClick={() => setDrawerOpen(v => !v)}>
              <Menu size={22} strokeWidth={isMoreActive || drawerOpen ? 2.5 : 1.8} />
              <span>Lainnya</span>
              {(isMoreActive || drawerOpen) && <span className="active-dot" />}
            </button>
          )}
        </div>
      </nav>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="relative bg-white rounded-t-2xl shadow-2xl animate-slide-up"
               style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-bold">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
                  <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
                </div>
              </div>
              <button onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <X size={16} />
              </button>
            </div>
            <div className="px-3 py-3 space-y-0.5">
              {moreItems.map(({ to, icon: Icon, label, badge }) => {
                const isActive = location.pathname === to;
                const count = badge ? getBadgeCount(badge) : 0;
                return (
                  <NavLink key={to} to={to} onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${
                      isActive ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-50'
                    }`}>
                    <Icon size={20} />
                    <span className="flex-1 text-sm font-semibold">{label}</span>
                    {count > 0 && (
                      <span className="badge badge-red text-xs">{count}</span>
                    )}
                    <ChevronRight size={16} className="opacity-40" />
                  </NavLink>
                );
              })}
            </div>
            <div className="px-3 pb-2 pt-1 border-t border-slate-100 mx-3 mt-1">
              <button onClick={toggleDarkMode}
                className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                <span className="text-sm font-semibold">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
              {!isAdmin && !isOwner && !isSuperAdmin && (
                <button onClick={() => { setShowChangePw(true); setDrawerOpen(false); }}
                  className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl text-slate-600 hover:bg-amber-50 hover:text-amber-600 transition-all">
                  <Lock size={20} />
                  <span className="text-sm font-semibold">Ganti Password</span>
                </button>
              )}
              <button onClick={handleLogout}
                className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl text-red-500 hover:bg-red-50 transition-all">
                <LogOut size={20} />
                <span className="text-sm font-semibold">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ganti Password — semua role */}
      {showChangePw && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lock size={18} className="text-primary-600" />
                <h3 className="font-bold text-slate-800">Ganti Password</h3>
              </div>
              <button onClick={() => { setShowChangePw(false); setChangePwForm({ oldPassword: '', newPassword: '', confirmPassword: '' }); }}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
                <X size={14} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Password Lama *</label>
                <input type="password" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  placeholder="Password yang sekarang"
                  value={changePwForm.oldPassword} onChange={e => setChangePwForm(f => ({ ...f, oldPassword: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Password Baru *</label>
                <input type="password" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  placeholder="Min. 6 karakter"
                  value={changePwForm.newPassword} onChange={e => setChangePwForm(f => ({ ...f, newPassword: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Konfirmasi Password Baru *</label>
                <input type="password" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  placeholder="Ulangi password baru"
                  value={changePwForm.confirmPassword} onChange={e => setChangePwForm(f => ({ ...f, confirmPassword: e.target.value }))} />
              </div>
              {changePwForm.newPassword && changePwForm.confirmPassword && changePwForm.newPassword !== changePwForm.confirmPassword && (
                <p className="text-xs text-red-500">⚠️ Password tidak cocok</p>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setShowChangePw(false); setChangePwForm({ oldPassword: '', newPassword: '', confirmPassword: '' }); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50">
                Batal
              </button>
              <button onClick={handleChangeMyPassword} disabled={changingPw}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold disabled:opacity-70">
                {changingPw ? 'Menyimpan...' : 'Simpan Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

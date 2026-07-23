import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PwaInstallProvider } from './context/PwaInstallContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OwnerDashboardPage from './pages/OwnerDashboardPage';
import OwnerCabangPage from './pages/OwnerCabangPage';
import OwnerKaryawanPage from './pages/OwnerKaryawanPage';
import OwnerPenjualanPage from './pages/OwnerPenjualanPage';
import OwnerServicePage from './pages/OwnerServicePage';
import DashboardPage from './pages/DashboardPage';
import TransaksiPage from './pages/TransaksiPage';
import StokPage from './pages/StokPage';
import KeuanganPage from './pages/KeuanganPage';
import { LaporanPage, PelangganPage, PengaturanPage } from './pages/OtherPages';
import ServicePage from './pages/ServicePage';
import CabangPage from './pages/CabangPage';
import { Loader } from './components/UI';
import SaldoPage from './pages/SaldoPage';
import ClosingKasPage from './pages/ClosingKasPage';
import SubscriptionPage from './pages/SubscriptionPage';
import OnboardingPage from './pages/OnboardingPage';
import LandingPage from './pages/LandingPage';

function OwnerRoute({ children }) {
  const { user, isOwner, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader size="lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isOwner) return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}

function ProtectedRoute({ children }) {
  const { user, isOwner, isSuperAdmin, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader size="lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isOwner) return <Navigate to="/owner" replace />;
  if (isSuperAdmin) return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}

function AdminRoute({ children }) {
  const { user, isAdmin, isOwner, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (isOwner) return <Navigate to="/owner" replace />;
  if (!isAdmin) return <Navigate to="/transaksi" replace />;
  return <Layout>{children}</Layout>;
}

function SuperAdminRoute({ children }) {
  const { user, isSuperAdmin, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isSuperAdmin) return <Navigate to="/transaksi" replace />;
  return <Layout>{children}</Layout>;
}

function AnyAuthRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader size="lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

// Inner gate: blokir SuperAdmin dari halaman operasional toko (laporan/keuangan)
function NoSuperAdmin({ children }) {
  const { isSuperAdmin } = useAuth();
  if (isSuperAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function DefaultRedirect() {
  const { user, isAdmin, isSuperAdmin, isOwner, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader size="lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (isSuperAdmin) return <Navigate to="/dashboard" replace />;
  if (isOwner) return <Navigate to="/owner" replace />;
  return <Navigate to={isAdmin ? "/dashboard" : "/transaksi"} replace />;
}

function PublicRoute({ children }) {
  const { user, isSuperAdmin, isOwner, loading } = useAuth();
  // Jangan tampilkan Loader di halaman publik (login/register) karena akan
  // unmount children → state error login hilang. Cukup tunggu loading selesai
  // dengan tetap render children, redirect hanya saat user sudah ada.
  if (loading) return children;
  if (user) {
    if (isSuperAdmin) return <Navigate to="/dashboard" replace />;
    if (isOwner) return <Navigate to="/owner" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

// Landing page: tamu → tampilkan marketing page, user login → redirect ke dashboard sesuai role
function LandingRoute({ children }) {
  const { user, isSuperAdmin, isOwner, loading } = useAuth();
  if (loading) return children;
  if (user) {
    if (isSuperAdmin) return <Navigate to="/dashboard" replace />;
    if (isOwner) return <Navigate to="/owner" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"         element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/daftar"        element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/onboarding"    element={<OnboardingPage />} />
      <Route path="/owner"         element={<OwnerRoute><OwnerDashboardPage /></OwnerRoute>} />
      <Route path="/owner/cabang"  element={<OwnerRoute><OwnerCabangPage /></OwnerRoute>} />
      <Route path="/owner/karyawan" element={<OwnerRoute><OwnerKaryawanPage /></OwnerRoute>} />
      <Route path="/owner/penjualan" element={<OwnerRoute><OwnerPenjualanPage /></OwnerRoute>} />
      <Route path="/owner/service"   element={<OwnerRoute><OwnerServicePage /></OwnerRoute>} />
      <Route path="/pengaturan"    element={<AnyAuthRoute><PengaturanPage /></AnyAuthRoute>} />
      <Route path="/dashboard"     element={<AdminRoute><DashboardPage /></AdminRoute>} />
      <Route path="/transaksi"     element={<ProtectedRoute><TransaksiPage /></ProtectedRoute>} />
      <Route path="/stok"          element={<ProtectedRoute><StokPage /></ProtectedRoute>} />
      <Route path="/saldo"         element={<ProtectedRoute><SaldoPage /></ProtectedRoute>} />
      <Route path="/keuangan"      element={<AnyAuthRoute><NoSuperAdmin><KeuanganPage /></NoSuperAdmin></AnyAuthRoute>} />
      <Route path="/laporan"       element={<AdminRoute><NoSuperAdmin><LaporanPage /></NoSuperAdmin></AdminRoute>} />
      <Route path="/service"       element={<ProtectedRoute><ServicePage /></ProtectedRoute>} />
      <Route path="/pelanggan"     element={<ProtectedRoute><PelangganPage /></ProtectedRoute>} />
      <Route path="/client"        element={<SuperAdminRoute><CabangPage /></SuperAdminRoute>} />
      <Route path="/closing-kas"   element={<ProtectedRoute><ClosingKasPage /></ProtectedRoute>} />
      {/* ── BARU: Panel Langganan / Konfirmasi Pembayaran (superadmin) ── */}
      <Route path="/subscriptions" element={<SuperAdminRoute><SubscriptionPage /></SuperAdminRoute>} />
      <Route path="/"  element={<LandingRoute><LandingPage /></LandingRoute>} />
      <Route path="*"  element={<DefaultRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
    <BrowserRouter>
      <PwaInstallProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: { borderRadius: '12px', fontSize: '13px', fontWeight: 500, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' },
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error: { duration: 5000, iconTheme: { primary: '#ef4444', secondary: '#fff' } }
            }}
          />
        </AuthProvider>
      </PwaInstallProvider>
    </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

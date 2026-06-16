# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — dev server (CRA, port 3000). Proxies `/api` → `http://localhost:5000` (see `package.json` → `proxy`), so the backend must be running locally on 5000.
- `npm run build` — production build into `build/`.
- `./build.sh` — production deploy step on the server. Runs `npm run build` then copies `public/member.html` and `public/investor.html` into `build/` because they are stand-alone HTML pages outside the React app and CRA does not copy them by default. Any new top-level HTML page needs to be added here too.
- No test runner, linter, or type checker is wired up.

The hardcoded `cd /home/galaxy/frontend` in `build.sh` is the server install path; it is not a dev path.

## Stack

- React 18 + CRA (`react-scripts` 5), JavaScript (no TypeScript).
- React Router v6, Axios, Tailwind (with `darkMode: 'class'`), `lucide-react` icons, `recharts`, `react-hot-toast`, `react-to-print`.
- `socket.io-client` is in `dependencies` but not currently imported anywhere in `src/` — treat as latent.

## Architecture

The app is a multi-tenant POS frontend for cellphone counters (Indonesian — UI strings, comments, and domain terms are in Bahasa Indonesia). It is a thin client over a REST backend; all business logic lives server-side.

### Routing and role gating (`src/App.jsx`)

Every route is wrapped in one of five guards that read `useAuth()` and either render `<Layout>{children}</Layout>` or `<Navigate>`. The role hierarchy and default landings are:

- `superadmin` → `/cabang` (multi-branch management, subscription approvals)
- `owner` → `/owner` (owner dashboard across own branches; cannot see operational pages)
- `admin` → `/dashboard`
- regular employee (`role !== 'admin'`) → `/transaksi`

Guards: `SuperAdminRoute`, `OwnerRoute`, `AdminRoute`, `ProtectedRoute` (employee+), `AnyAuthRoute`, plus `PublicRoute` for `/login` and `/daftar`. `DefaultRedirect` handles `/` and `*` based on role. When adding a route, pick the guard that matches the lowest role that should reach it — do not invent a new guard pattern.

Note `PublicRoute` intentionally renders `children` (not a `<Loader>`) while `loading`, so login error state isn't unmounted between attempts. Preserve that behavior.

### Auth (`src/context/AuthContext.jsx`)

JWT is stored in `localStorage` under `token`. `AuthProvider` calls `authAPI.getMe()` on mount to hydrate `user`. The context also owns `darkMode` (persisted to `localStorage`, toggles `class="dark"` on `<html>`). Derived role booleans (`isAdmin`, `isSuperAdmin`, `isOwner`) are computed here — read them from `useAuth()` rather than checking `user.role` in components. Note `isAdmin` is true for both `admin` and `superadmin`.

### API layer (`src/services/api.js`)

Single axios instance with `baseURL: '/api'`. Request interceptor injects `Bearer <token>`. Response interceptor: on `401`, clears the token and hard-redirects to `/login` via `window.location.href` (this bypasses React Router — components do not need to handle 401 themselves).

All endpoints are organized into namespaced objects exported from this file: `authAPI`, `productAPI`, `transactionAPI`, `dashboardAPI`, `financeAPI`, `customerAPI`, `reportAPI`, `backupAPI`, `brankasAPI`, `rewardAPI`, `pointAPI`, `cabangAPI`, `settingsAPI`, `saldoAPI`, `closingKasAPI`, `pembelianAPI`, `serviceAPI`. Add new endpoints to the matching namespace rather than calling `api.get/post` directly from a page.

### Pages

Page components live in `src/pages/` and are large (most are 500–1900 lines, all logic + JSX inline). Notable:

- `pages/OtherPages.jsx` bundles three exported pages — `LaporanPage`, `PelangganPage`, `PengaturanPage` — in one file. Don't be surprised by the size; the file is intentionally a grab-bag. `*.bak` files alongside (`KeuanganPage.jsx.bak`, `OtherPages.jsx.bak`) are stale snapshots, ignore them.
- `TransaksiPage`, `StokPage`, `ServicePage`, `KeuanganPage`, `DashboardPage`, `ClosingKasPage`, `SaldoPage`, `OwnerDashboardPage` are each self-contained features.

### Shared components (`src/components/`)

Only three files: `Layout.jsx`, `Sidebar.jsx`, `UI.jsx`. `UI.jsx` is the design-system grab-bag — `Modal`, `StatCard`, `PageHeader`, `EmptyState`, `Loader`, `SearchInput`, `ConfirmDialog`, `RupiahInput`, etc. Import from here before building a new primitive.

`Modal` uses `ReactDOM.createPortal` to `document.body` with inline styles (not Tailwind classes) so it escapes any parent stacking context. Don't refactor it to Tailwind without preserving the portal.

`Layout` polls `productAPI.getLowStock()` on mount and every 10 min (skipped for `owner`); a dismiss is remembered per-session in `sessionStorage.lowStockDismissed`. `Sidebar` polls subscription pending count for superadmin.

### Styling

Tailwind with custom palette (`primary`, `success`, `danger`, `warning`, `surface`) and fonts (`Plus Jakarta Sans`, `JetBrains Mono`) in `tailwind.config.js`. Reusable component classes (`.card`, `.btn`, `.btn-primary`, `.input`, `.label`, `.badge-*`, `.table*`, `.sidebar-link`) are defined in `src/index.css` under `@layer components` — prefer these over re-implementing styles inline. Dark mode is class-based (`html.dark`), toggled by `AuthContext.toggleDarkMode`.

`input, select, textarea { font-size: 16px !important }` is set globally to prevent iOS Safari zoom-on-focus. Don't override.

### Helpers (`src/utils/helpers.js`)

Locale-aware Indonesian formatters: `formatRupiah`, `formatNumber`, `formatDate`, `formatDateTime`, `formatInputRupiah` / `parseInputRupiah` (for live-formatted IDR inputs), plus `todayRange()` / `thisMonthRange()` returning `{ startDate, endDate }` as `YYYY-MM-DD`. Label/color maps (`CATEGORY_LABELS`, `PAYMENT_LABELS`, `FINANCE_TYPE_LABELS`, `CATEGORY_COLORS`, `PAYMENT_COLORS`) are the single source of truth for enum display — extend these rather than hardcoding strings in pages.

## Domain glossary

UI and code use Indonesian terms; English equivalents for reference:

- **cabang** = branch/outlet  · **pengaturan** = settings  · **pelanggan** = customer
- **transaksi** = transaction/sale  · **stok** = stock  · **keuangan** = finance/bookkeeping
- **laporan** = report  · **saldo** = balance (e-wallet/bank float)  · **brankas** = safe/vault
- **closing kas** = end-of-day cash reconciliation  · **hutang/piutang** = debt/receivable
- **service HP** = phone repair  · **pembelian** = purchase order (stock-in)  · **langganan** = subscription
- Product categories: **pulsa**, **kartu_perdana**, **paket_data**, **token_listrik**, **ewallet**, **aksesoris**, **game**, **jasa_pasang** (anti-gores install), **jasa_transfer**, **jasa_lainnya**
- Payment methods: **cash** (tunai), **qris**, **transfer**, **hutang**

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bell, RefreshCw, Filter, CreditCard, Package, Ban, Wrench,
  Coins, Calculator, Inbox,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationAPI } from '../services/api';
import {
  SEVERITY_COLORS, severityIcon, formatRelativeID,
} from '../components/Layout';
import { formatDateTime } from '../utils/helpers';

const HERO_GRADIENT = 'linear-gradient(120deg, #26215C 0%, #3C3489 50%, #7F77DD 100%)';

// PENTING: value harus PERSIS sama dengan field `type` dari backend
// (owner/notifications). Cek ownerController.getOwnerNotifications.
const CATEGORIES = [
  ['',                    'Semua',        Bell],
  ['subscription',        'Subscription', CreditCard],
  ['low_stock',           'Stok',         Package],
  ['void_besar',          'Void',         Ban],
  ['service_pending',     'Service',      Wrench],
  ['piutang_jatuh_tempo', 'Piutang',      Coins],
  ['closing_selisih',     'Closing',      Calculator],
];

// Rank severity untuk sorting: danger > warning > info
const SEV_RANK = { danger: 0, warning: 1, info: 2 };
function severityRank(s) {
  return s in SEV_RANK ? SEV_RANK[s] : 3;
}

function GradientPanel({ children, style = {}, className = '' }) {
  return (
    <div className={className} style={{
      background: HERO_GRADIENT, borderRadius: 12, padding: 16,
      boxShadow: '0 10px 28px -8px rgba(38,33,92,0.35), inset 0 1px 0 rgba(255,255,255,0.10)',
      ...style,
    }}>{children}</div>
  );
}

function CategoryTabs({ value, onChange, counts }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap min-w-0 max-w-full">
      {CATEGORIES.map(([key, label, Icon]) => {
        const active = value === key;
        const n = counts[key] || 0;
        return (
          <button key={key || 'all'} type="button" onClick={() => onChange(key)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 999,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: active ? '#7F77DD' : 'rgba(255,255,255,0.06)',
              border: active ? '0.5px solid #7F77DD' : '0.5px solid rgba(255,255,255,0.15)',
              color: active ? '#fff' : 'rgba(255,255,255,0.7)',
              whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'background 0.15s',
            }}>
            <Icon size={13} /> {label}
            {n > 0 && (
              <span style={{
                background: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                color: '#fff',
                borderRadius: 999,
                padding: '1px 7px',
                fontSize: 10, fontWeight: 700,
                lineHeight: 1.4,
              }}>{n}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function NotifCard({ item }) {
  const sev  = SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.info;
  const Icon = severityIcon(item.severity);
  const cabangNama = item.meta?.cabangNama;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '0.5px solid rgba(255,255,255,0.08)',
      borderLeft: `3px solid ${sev.fg}`,
      borderRadius: 10, padding: 14,
      display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: sev.bg, color: sev.fg,
        border: `1px solid ${sev.ring}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={16} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p style={{
            color: '#fff', fontSize: 13, fontWeight: 700,
            margin: 0, lineHeight: 1.35,
          }}>{item.title || '—'}</p>
          <span style={{
            color: 'rgba(255,255,255,0.5)', fontSize: 11,
            whiteSpace: 'nowrap',
          }}>{formatRelativeID(item.createdAt)}</span>
        </div>
        {item.message && (
          <p style={{
            color: 'rgba(255,255,255,0.75)', fontSize: 12,
            margin: '4px 0 0', lineHeight: 1.5,
          }}>{item.message}</p>
        )}
        <div className="mt-2 flex items-center gap-2 flex-wrap" style={{
          fontSize: 10, color: 'rgba(255,255,255,0.55)',
        }}>
          {item.type && (
            <span style={{
              padding: '1px 7px', borderRadius: 999,
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              textTransform: 'capitalize',
            }}>{item.type}</span>
          )}
          {cabangNama && (
            <span style={{
              padding: '1px 7px', borderRadius: 999,
              background: 'rgba(96,165,250,0.12)',
              border: '0.5px solid rgba(96,165,250,0.28)',
              color: '#93C5FD',
            }}>{cabangNama}</span>
          )}
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>
            {formatDateTime(item.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ filter }) {
  const label = CATEGORIES.find(c => c[0] === filter)?.[1] || 'Semua';
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px dashed rgba(255,255,255,0.12)',
      borderRadius: 12, padding: '40px 20px',
      textAlign: 'center',
    }}>
      <Inbox size={28} style={{ color: 'rgba(255,255,255,0.35)', margin: '0 auto 10px' }} />
      <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, margin: 0 }}>
        Belum ada notifikasi
      </p>
      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, margin: '4px 0 0' }}>
        {filter
          ? <>Tidak ada notifikasi kategori <b style={{ color: '#fff' }}>{label}</b>.</>
          : 'Semua tenang di sini. Notifikasi baru akan muncul di sini.'}
      </p>
    </div>
  );
}

export default function OwnerNotifikasiPage() {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('');

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const r = await notificationAPI.getAll();
      const data = Array.isArray(r.data?.data) ? r.data.data
                 : Array.isArray(r.data)       ? r.data
                 : [];
      setItems(data);
    } catch {
      if (!silent) toast.error('Gagal memuat notifikasi');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Tandai semua dibaca saat halaman dibuka
  useEffect(() => {
    localStorage.setItem('ownerNotifLastSeenAt', new Date().toISOString());
  }, []);

  const counts = useMemo(() => {
    const c = { '': items.length };
    items.forEach(n => {
      const t = n.type || 'lainnya';
      c[t] = (c[t] || 0) + 1;
    });
    return c;
  }, [items]);

  const visible = useMemo(() => {
    const filtered = filter ? items.filter(n => n.type === filter) : items;
    // Urut by severity dulu, lalu createdAt DESC
    return [...filtered].sort((a, b) => {
      const s = severityRank(a.severity) - severityRank(b.severity);
      if (s !== 0) return s;
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  }, [items, filter]);

  return (
    <div className="space-y-4">
      <GradientPanel>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Bell size={16} style={{ color: '#fff' }} />
              </div>
              <div className="min-w-0">
                <h2 style={{
                  color: '#fff', fontSize: 16, fontWeight: 700,
                  margin: 0, lineHeight: 1.2,
                }}>Notifikasi</h2>
                <p style={{
                  color: 'rgba(255,255,255,0.65)', fontSize: 12,
                  margin: '2px 0 0',
                }}>
                  {items.length} notifikasi · diurutkan berdasarkan tingkat kepentingan
                </p>
              </div>
            </div>
          </div>
          <button type="button" onClick={() => load()} disabled={loading}
            style={{
              padding: '8px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.08)',
              border: '0.5px solid rgba(255,255,255,0.15)',
              color: '#fff', fontSize: 12, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1,
            }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Muat ulang</span>
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <Filter size={13} style={{ color: 'rgba(255,255,255,0.6)' }} />
          <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginRight: 4 }}>
            Kategori:
          </span>
          <div className="min-w-0" style={{ flex: 1 }}>
            <CategoryTabs value={filter} onChange={setFilter} counts={counts} />
          </div>
        </div>
      </GradientPanel>

      <GradientPanel>
        {loading ? (
          <div style={{ padding: '40px 0', display: 'flex', justifyContent: 'center' }}>
            <div className="animate-spin" style={{
              width: 24, height: 24, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.2)',
              borderTopColor: '#fff',
            }} />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div className="space-y-2">
            {visible.map((n, i) => (
              <NotifCard key={n.id || n._id || i} item={n} />
            ))}
          </div>
        )}
      </GradientPanel>
    </div>
  );
}

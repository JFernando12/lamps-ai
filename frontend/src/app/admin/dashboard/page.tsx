"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import {
  Package,
  TrendingUp,
  Users,
  DollarSign,
  ChevronDown,
  Search,
  RefreshCw,
  MapPin,
  Phone,
  Download,
  ExternalLink,
  ChevronUp,
} from 'lucide-react';
import clsx from 'clsx';

interface ShippingInfo {
  full_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  phone: string;
}

interface Order {
  order_id: string;
  user_email: string;
  product_name: string;
  unit_price: string;
  quantity: number;
  status: string;
  created_at: string;
  shipping: ShippingInfo;
  tracking_number?: string;
  photo_id?: string;
  preview_id?: string;
  photo_url?: string;
}

interface Stats {
  total_photos_uploaded: number;
  total_previews_generated: number;
  total_orders: number;
  paid_orders: number;
  total_revenue_mxn: number;
  conversion_rate_pct: number;
}

const STATUSES = [
  'pending_payment',
  'paid',
  'in_process',
  'shipped',
  'delivered',
  'payment_failed',
  'cancelled',
];

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pendiente de pago',
  paid: 'Pagado',
  in_process: 'En producción',
  shipped: 'Enviado',
  delivered: 'Entregado',
  payment_failed: 'Pago fallido',
  cancelled: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  pending_payment: 'text-yellow-400 bg-yellow-400/10',
  paid: 'text-green-400 bg-green-400/10',
  in_process: 'text-amber-400 bg-amber-400/10',
  shipped: 'text-blue-400 bg-blue-400/10',
  delivered: 'text-green-500 bg-green-500/10',
  payment_failed: 'text-red-400 bg-red-400/10',
  cancelled: 'text-red-400 bg-red-400/10',
};

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [o, s] = await Promise.allSettled([
        api.get<Order[]>('/api/admin/orders'),
        api.get<Stats>('/api/admin/stats'),
      ]);
      if (o.status === 'fulfilled') setOrders(o.value);
      else console.error('Error loading orders:', o.reason);
      if (s.status === 'fulfilled') setStats(s.value);
      else console.error('Error loading stats:', s.reason);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || !user.is_admin) {
      router.push('/admin/login');
      return;
    }
    load();
  }, [user, authLoading, router]);

  const updateStatus = async (
    orderId: string,
    newStatus: string,
    tracking?: string,
  ) => {
    setUpdatingId(orderId);
    try {
      await api.patch(`/api/admin/orders/${orderId}`, {
        status: newStatus,
        ...(tracking ? { tracking_number: tracking } : {}),
      });
      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === orderId
            ? {
                ...o,
                status: newStatus,
                ...(tracking ? { tracking_number: tracking } : {}),
              }
            : o,
        ),
      );
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = orders.filter((o) => {
    const matchStatus = filterStatus === 'all' || o.status === filterStatus;
    const matchSearch =
      !search ||
      o.user_email.includes(search) ||
      o.shipping?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.order_id.includes(search);
    return matchStatus && matchSearch;
  });

  if (authLoading || loading)
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center pt-14">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </main>
    );

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pt-20 pb-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">
              Dashboard de pedidos
            </h1>
            <p className="text-white/40 text-xs mt-0.5 sm:text-sm">
              Panel de administración
            </p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 border border-white/10 hover:border-white/30 px-3 py-2 rounded-xl text-xs sm:text-sm transition-colors"
          >
            <RefreshCw size={14} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {[
              {
                label: 'Fotos subidas',
                value: stats.total_photos_uploaded,
                icon: <Users size={14} className="text-amber-400" />,
              },
              {
                label: 'Conversión',
                value: `${stats.conversion_rate_pct}%`,
                icon: <TrendingUp size={14} className="text-green-400" />,
              },
              {
                label: 'Total pedidos',
                value: stats.total_orders,
                icon: <Package size={14} className="text-blue-400" />,
              },
              {
                label: 'Pedidos pagados',
                value: stats.paid_orders,
                icon: <Package size={14} className="text-green-400" />,
              },
              {
                label: 'Ingresos (MXN)',
                value: `$${stats.total_revenue_mxn.toLocaleString()}`,
                icon: <DollarSign size={14} className="text-amber-400" />,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white/[0.03] border border-white/10 rounded-2xl p-3 sm:p-4"
              >
                <div className="flex items-center gap-1.5 text-white/40 text-[10px] sm:text-xs mb-1.5">
                  {stat.icon}
                  {stat.label}
                </div>
                <p className="font-bold text-lg sm:text-xl">{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              type="text"
              placeholder="Buscar por email, nombre o ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-amber-500/40"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/40"
          >
            <option value="all">Todos los estados</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {/* ── MOBILE: Cards ───────────────────────────────────────── */}
        <div className="flex flex-col gap-4 lg:hidden">
          {filtered.length === 0 && (
            <p className="text-center py-10 text-white/30 text-sm">
              No se encontraron pedidos
            </p>
          )}
          {filtered.map((order) => (
            <OrderCard
              key={order.order_id}
              order={order}
              updating={updatingId === order.order_id}
              onStatusChange={(newStatus, tracking) =>
                updateStatus(order.order_id, newStatus, tracking)
              }
            />
          ))}
        </div>

        {/* ── DESKTOP: Table ──────────────────────────────────────── */}
        <div className="hidden lg:block bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10">
                <tr className="text-white/40 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Pedido</th>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">Foto</th>
                  <th className="text-left px-4 py-3">Envío</th>
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-white/30">
                      No se encontraron pedidos
                    </td>
                  </tr>
                )}
                {filtered.map((order) => (
                  <DesktopRow
                    key={order.order_id}
                    order={order}
                    updating={updatingId === order.order_id}
                    onStatusChange={(newStatus, tracking) =>
                      updateStatus(order.order_id, newStatus, tracking)
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ─── Desktop row ──────────────────────────────────────────────────── */
function DesktopRow({
  order,
  updating,
  onStatusChange,
}: {
  order: Order;
  updating: boolean;
  onStatusChange: (status: string, tracking?: string) => void;
}) {
  const [shippingOpen, setShippingOpen] = useState(false);

  return (
    <>
      <tr className="hover:bg-white/[0.02] transition-colors">
        <td className="px-4 py-3 font-mono text-xs text-white/50">
          {order.order_id.slice(0, 8)}…
        </td>
        <td className="px-4 py-3">
          <p className="font-medium">{order.shipping?.full_name}</p>
          <p className="text-white/40 text-xs">{order.user_email}</p>
        </td>
        <td className="px-4 py-3">
          <PreviewThumb url={order.photo_url} />
        </td>
        <td className="px-4 py-3">
          <button
            onClick={() => setShippingOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-white/50 hover:text-amber-400 transition-colors"
          >
            <MapPin size={12} />
            {order.shipping?.city}, {order.shipping?.state}
            {shippingOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </td>
        <td className="px-4 py-3 text-white/50 text-xs">
          {new Date(order.created_at).toLocaleDateString('es-MX')}
        </td>
        <td className="px-4 py-3 font-semibold">${order.unit_price} MXN</td>
        <td className="px-4 py-3">
          <span
            className={clsx(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
              STATUS_COLORS[order.status] ?? 'text-white/50 bg-white/5',
            )}
          >
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
          {order.tracking_number && (
            <p className="text-[10px] text-white/30 mt-0.5 font-mono">
              {order.tracking_number}
            </p>
          )}
        </td>
        <td className="px-4 py-3">
          <StatusDropdown
            current={order.status}
            disabled={updating}
            onChange={onStatusChange}
          />
        </td>
      </tr>
      {shippingOpen && (
        <tr className="bg-white/[0.015]">
          <td colSpan={8} className="px-6 py-3">
            <ShippingDetails shipping={order.shipping} />
          </td>
        </tr>
      )}
    </>
  );
}

/* ─── Mobile card ──────────────────────────────────────────────────── */
function OrderCard({
  order,
  updating,
  onStatusChange,
}: {
  order: Order;
  updating: boolean;
  onStatusChange: (status: string, tracking?: string) => void;
}) {
  const [shippingOpen, setShippingOpen] = useState(false);

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
      {/* Top row: preview + meta */}
      <div className="flex gap-3">
        <PreviewThumb url={order.photo_url} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">
                {order.shipping?.full_name}
              </p>
              <p className="text-white/40 text-xs truncate">
                {order.user_email}
              </p>
            </div>
            <span
              className={clsx(
                'shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium',
                STATUS_COLORS[order.status] ?? 'text-white/50 bg-white/5',
              )}
            >
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
            <span className="font-mono">{order.order_id.slice(0, 8)}…</span>
            <span>•</span>
            <span>
              {new Date(order.created_at).toLocaleDateString('es-MX')}
            </span>
          </div>
          <p className="text-amber-400 font-bold text-sm mt-1">
            ${order.unit_price} MXN
          </p>
          {order.tracking_number && (
            <p className="text-[10px] text-white/30 font-mono mt-0.5">
              Rastreo: {order.tracking_number}
            </p>
          )}
        </div>
      </div>

      {/* Shipping toggle */}
      <button
        onClick={() => setShippingOpen((v) => !v)}
        className="flex items-center justify-between w-full border border-white/10 rounded-xl px-3 py-2 text-xs text-white/50 hover:border-amber-400/30 hover:text-white/70 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <MapPin size={12} className="text-amber-400" />
          {order.shipping?.city}, {order.shipping?.state}
        </span>
        {shippingOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {shippingOpen && (
        <div className="rounded-xl bg-white/[0.03] border border-white/10 px-3 py-2.5">
          <ShippingDetails shipping={order.shipping} />
        </div>
      )}

      {/* Actions */}
      <StatusDropdown
        current={order.status}
        disabled={updating}
        onChange={onStatusChange}
      />
    </div>
  );
}

/* ─── Preview thumbnail ────────────────────────────────────────────── */
function PreviewThumb({
  url,
  size = 'sm',
}: {
  url?: string;
  size?: 'sm' | 'lg';
}) {
  const dim = size === 'lg' ? 'w-20 h-20' : 'w-12 h-12';

  if (!url)
    return (
      <div
        className={clsx(
          dim,
          'shrink-0 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center',
        )}
      >
        <Package size={size === 'lg' ? 20 : 14} className="text-white/20" />
      </div>
    );

  return (
    <div className={clsx(dim, 'shrink-0 relative group')}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Preview"
        className="w-full h-full object-cover rounded-xl border border-white/10"
      />
      {/* hover overlay */}
      <div className="absolute inset-0 rounded-xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-white hover:text-amber-400"
          title="Ver imagen"
        >
          <ExternalLink size={size === 'lg' ? 16 : 13} />
        </a>
        <a
          href={url}
          download
          onClick={(e) => e.stopPropagation()}
          className="text-white hover:text-amber-400"
          title="Descargar"
        >
          <Download size={size === 'lg' ? 16 : 13} />
        </a>
      </div>
    </div>
  );
}

/* ─── Shipping details ─────────────────────────────────────────────── */
function ShippingDetails({ shipping }: { shipping: ShippingInfo }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs">
      <p className="text-white/70">
        <span className="text-white/30">Nombre: </span>
        {shipping.full_name}
      </p>
      <p className="text-white/70">
        <span className="text-white/30">Dirección: </span>
        {shipping.address}
      </p>
      <p className="text-white/70">
        <span className="text-white/30">Ciudad: </span>
        {shipping.city}, {shipping.state} {shipping.zip_code}
      </p>
      <p className="text-white/70">
        <span className="text-white/30">País: </span>
        {shipping.country}
      </p>
      <p className="flex items-center gap-1 text-white/70">
        <Phone size={11} className="text-amber-400" />
        {shipping.phone}
      </p>
    </div>
  );
}

function StatusDropdown({
  current,
  disabled,
  onChange,
}: {
  current: string;
  disabled: boolean;
  onChange: (status: string, tracking?: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="flex items-center gap-1.5 border border-white/10 hover:border-amber-400/30 px-3 py-1.5 rounded-lg text-xs transition-colors disabled:opacity-50"
      >
        {disabled ? (
          <div className="w-3 h-3 border border-white/40 border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            Cambiar estado
            <ChevronDown size={12} />
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/10 rounded-xl py-1 z-20 min-w-40 shadow-2xl">
          {STATUSES.filter((s) => s !== current).map((s) => (
            <button
              key={s}
              onClick={async () => {
                setOpen(false);
                let tracking: string | undefined;
                if (s === "shipped") {
                  tracking = window.prompt("Número de rastreo (opcional):") ?? undefined;
                }
                onChange(s, tracking);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors"
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

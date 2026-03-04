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
} from "lucide-react";
import clsx from "clsx";

interface Order {
  order_id: string;
  user_email: string;
  product_name: string;
  unit_price: string;
  quantity: number;
  status: string;
  created_at: string;
  shipping: { full_name: string; city: string; state: string };
  tracking_number?: string;
  render_url?: string;
}

interface Stats {
  total_previews_generated: number;
  previews_converted_to_order: number;
  total_orders: number;
  paid_orders: number;
  total_revenue_mxn: number;
  conversion_rate_pct: number;
}

const STATUSES = [
  "pending_payment",
  "paid",
  "in_process",
  "shipped",
  "delivered",
  "payment_failed",
  "cancelled",
];

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Pendiente de pago",
  paid: "Pagado",
  in_process: "En producción",
  shipped: "Enviado",
  delivered: "Entregado",
  payment_failed: "Pago fallido",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "text-yellow-400 bg-yellow-400/10",
  paid: "text-green-400 bg-green-400/10",
  in_process: "text-amber-400 bg-amber-400/10",
  shipped: "text-blue-400 bg-blue-400/10",
  delivered: "text-green-500 bg-green-500/10",
  payment_failed: "text-red-400 bg-red-400/10",
  cancelled: "text-red-400 bg-red-400/10",
};

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [o, s] = await Promise.allSettled([
        api.get<Order[]>("/api/admin/orders"),
        api.get<Stats>("/api/admin/stats"),
      ]);
      if (o.status === "fulfilled") setOrders(o.value);
      else console.error("Error loading orders:", o.reason);
      if (s.status === "fulfilled") setStats(s.value);
      else console.error("Error loading stats:", s.reason);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || !user.is_admin) {
      router.push("/admin/login");
      return;
    }
    load();
  }, [user, authLoading, router]);

  const updateStatus = async (orderId: string, newStatus: string, tracking?: string) => {
    setUpdatingId(orderId);
    try {
      await api.patch(`/api/admin/orders/${orderId}`, {
        status: newStatus,
        ...(tracking ? { tracking_number: tracking } : {}),
      });
      setOrders((prev) =>
        prev.map((o) =>
          o.order_id === orderId
            ? { ...o, status: newStatus, ...(tracking ? { tracking_number: tracking } : {}) }
            : o
        )
      );
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = orders.filter((o) => {
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Dashboard de pedidos</h1>
            <p className="text-white/40 text-sm mt-1">Panel de administración</p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 border border-white/10 hover:border-white/30 px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <RefreshCw size={15} />
            Actualizar
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {[
              {
                label: "Previews generados",
                value: stats.total_previews_generated,
                icon: <Users size={16} className="text-amber-400" />,
              },
              {
                label: "Conversión",
                value: `${stats.conversion_rate_pct}%`,
                icon: <TrendingUp size={16} className="text-green-400" />,
              },
              {
                label: "Total pedidos",
                value: stats.total_orders,
                icon: <Package size={16} className="text-blue-400" />,
              },
              {
                label: "Pedidos pagados",
                value: stats.paid_orders,
                icon: <Package size={16} className="text-green-400" />,
              },
              {
                label: "Ingresos (MXN)",
                value: `$${stats.total_revenue_mxn.toLocaleString()}`,
                icon: <DollarSign size={16} className="text-amber-400" />,
              },
              {
                label: "Previews → Pedido",
                value: stats.previews_converted_to_order,
                icon: <TrendingUp size={16} className="text-amber-400" />,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white/[0.03] border border-white/10 rounded-2xl p-4"
              >
                <div className="flex items-center gap-2 text-white/40 text-xs mb-2">
                  {stat.icon}
                  {stat.label}
                </div>
                <p className="font-bold text-xl">{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
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

        {/* Orders table */}
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10">
                <tr className="text-white/40 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Pedido</th>
                  <th className="text-left px-4 py-3">Cliente</th>
                  <th className="text-left px-4 py-3">Preview</th>
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Total</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-white/30">
                      No se encontraron pedidos
                    </td>
                  </tr>
                )}
                {filtered.map((order) => (
                  <tr
                    key={order.order_id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-white/50">
                      {order.order_id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{order.shipping?.full_name}</p>
                      <p className="text-white/40 text-xs">{order.user_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {order.render_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={order.render_url}
                          alt="Preview"
                          className="w-12 h-12 object-cover rounded-lg border border-white/10"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
                          <Package size={14} className="text-white/20" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/50 text-xs">
                      {new Date(order.created_at).toLocaleDateString("es-MX")}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      ${order.unit_price} MXN
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                          STATUS_COLORS[order.status] ?? "text-white/50 bg-white/5"
                        )}
                      >
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusDropdown
                        current={order.status}
                        disabled={updatingId === order.order_id}
                        onChange={(newStatus, tracking) =>
                          updateStatus(order.order_id, newStatus, tracking)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
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

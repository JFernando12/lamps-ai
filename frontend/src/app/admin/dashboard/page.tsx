"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { RefreshCw } from 'lucide-react';
import { StatsGrid } from './components/StatsGrid';
import { OrderFilters } from './components/OrderFilters';
import { OrderCard } from './components/OrderCard';
import { DesktopRow } from './components/DesktopRow';
import type { Order, Stats } from './components/types';

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
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
    const matchType = filterType === 'all' || o.type === filterType;
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      o.user_email?.includes(q) ||
      o.whatsapp_phone?.includes(q) ||
      o.shipping?.full_name?.toLowerCase().includes(q) ||
      o.order_id.toLowerCase().includes(q);
    return matchStatus && matchType && matchSearch;
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
        {stats && <StatsGrid stats={stats} />}

        {/* Filters */}
        <OrderFilters
          search={search}
          onSearch={setSearch}
          filterStatus={filterStatus}
          onFilterStatus={setFilterStatus}
          filterType={filterType}
          onFilterType={setFilterType}
        />

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
        <div className="hidden lg:block bg-white/2 border border-white/10 rounded-2xl overflow-hidden">
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


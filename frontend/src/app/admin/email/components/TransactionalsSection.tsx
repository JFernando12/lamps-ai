'use client';

import { useState, useEffect } from 'react';
import { Search, Send, Truck, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { EmailOrder } from './types';

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pago pendiente',
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
  delivered: 'text-emerald-400 bg-emerald-400/10',
  payment_failed: 'text-red-400 bg-red-400/10',
  cancelled: 'text-red-400/70 bg-red-400/5',
};

type ActionState = 'idle' | 'loading' | 'done' | 'error';

export function TransactionalsSection() {
  const [orders, setOrders] = useState<EmailOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Per-order action state
  const [confirmState, setConfirmState] = useState<Record<string, ActionState>>({});
  const [trackState, setTrackState] = useState<Record<string, ActionState>>({});
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({});
  const [openTracking, setOpenTracking] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<EmailOrder[]>('/api/admin/orders')
      .then((data) => {
        const eligible = data.filter(
          (o) => o.user_email && !o.user_email.startsWith('guest_') && o.user_email.includes('@'),
        );
        setOrders(eligible);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return (
      o.user_email.toLowerCase().includes(q) ||
      o.shipping.full_name.toLowerCase().includes(q) ||
      o.order_id.toLowerCase().includes(q)
    );
  });

  const sendConfirmation = async (order_id: string) => {
    setConfirmState((s) => ({ ...s, [order_id]: 'loading' }));
    try {
      await api.post(`/api/admin/email/orders/${order_id}/confirmation`, {});
      setConfirmState((s) => ({ ...s, [order_id]: 'done' }));
    } catch {
      setConfirmState((s) => ({ ...s, [order_id]: 'error' }));
    }
  };

  const sendTracking = async (order_id: string) => {
    const tracking = trackingInputs[order_id]?.trim();
    if (!tracking) return;
    setTrackState((s) => ({ ...s, [order_id]: 'loading' }));
    try {
      await api.post(`/api/admin/email/orders/${order_id}/tracking`, { tracking_number: tracking });
      setTrackState((s) => ({ ...s, [order_id]: 'done' }));
      setOpenTracking(null);
    } catch {
      setTrackState((s) => ({ ...s, [order_id]: 'error' }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold">Emails transaccionales</h2>
        <p className="text-sm text-white/40 mt-1">
          Envía confirmaciones de pedido y guías de rastreo a clientes individuales
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por email, nombre u orden…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md bg-white/4 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/25"
        />
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-white/30 text-sm">
          {search ? 'Sin resultados para esa búsqueda' : 'No hay pedidos con email registrado'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((order) => {
            const confirmSt = confirmState[order.order_id] ?? 'idle';
            const trackSt = trackState[order.order_id] ?? 'idle';
            const isOpen = openTracking === order.order_id;

            return (
              <div
                key={order.order_id}
                className="rounded-2xl border border-white/8 bg-white/2 p-4 space-y-3"
              >
                {/* Order info row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{order.shipping.full_name}</p>
                    <p className="text-xs text-white/40 mt-0.5 truncate">{order.user_email}</p>
                    <p className="text-xs text-white/25 mt-0.5 font-mono">
                      {order.order_id.slice(0, 16)}…
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[order.status] ?? 'text-white/40 bg-white/5'}`}
                    >
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                    <span className="text-xs text-white/25">
                      {new Date(order.created_at).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {/* Confirmation */}
                  <button
                    onClick={() => sendConfirmation(order.order_id)}
                    disabled={confirmSt !== 'idle'}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                      confirmSt === 'done'
                        ? 'border-green-500/30 bg-green-500/10 text-green-400'
                        : confirmSt === 'error'
                        ? 'border-red-500/30 bg-red-500/10 text-red-400'
                        : 'border-white/10 bg-white/4 text-white/60 hover:text-white hover:border-white/20'
                    } disabled:cursor-not-allowed`}
                  >
                    {confirmSt === 'loading' ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : confirmSt === 'done' ? (
                      <CheckCircle2 size={12} />
                    ) : confirmSt === 'error' ? (
                      <AlertCircle size={12} />
                    ) : (
                      <Send size={12} />
                    )}
                    {confirmSt === 'done' ? 'Enviado' : confirmSt === 'error' ? 'Error' : 'Confirmación'}
                  </button>

                  {/* Tracking toggle */}
                  <button
                    onClick={() => setOpenTracking(isOpen ? null : order.order_id)}
                    disabled={trackSt === 'done'}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                      trackSt === 'done'
                        ? 'border-green-500/30 bg-green-500/10 text-green-400'
                        : trackSt === 'error'
                        ? 'border-red-500/30 bg-red-500/10 text-red-400'
                        : isOpen
                        ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                        : 'border-white/10 bg-white/4 text-white/60 hover:text-white hover:border-white/20'
                    } disabled:cursor-not-allowed`}
                  >
                    {trackSt === 'done' ? (
                      <CheckCircle2 size={12} />
                    ) : trackSt === 'error' ? (
                      <AlertCircle size={12} />
                    ) : (
                      <Truck size={12} />
                    )}
                    {trackSt === 'done' ? 'Rastreo enviado' : trackSt === 'error' ? 'Error' : 'Rastreo'}
                  </button>
                </div>

                {/* Inline tracking form */}
                {isOpen && trackSt !== 'done' && (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Número de guía…"
                      value={trackingInputs[order.order_id] ?? ''}
                      onChange={(e) =>
                        setTrackingInputs((t) => ({ ...t, [order.order_id]: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === 'Enter' && sendTracking(order.order_id)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-blue-500/40"
                    />
                    <button
                      onClick={() => sendTracking(order.order_id)}
                      disabled={!trackingInputs[order.order_id]?.trim() || trackSt === 'loading'}
                      className="px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm hover:bg-blue-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    >
                      {trackSt === 'loading' ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Send size={13} />
                      )}
                      Enviar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

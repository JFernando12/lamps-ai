"use client";

import { useEffect, useState, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { getEvent } from '@/lib/pixelEvents';
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Package,
  Truck,
  AlertCircle,
  Sparkles,
  MapPin,
  Lock,
} from 'lucide-react';
import Link from 'next/link';

const PRODUCT_CATALOG: Record<string, string> = {
  rgb: 'Lámpara acrílica LED RGB',
  madera: 'Lámpara base de madera',
};

interface OrderItem {
  product_id: string;
  quantity: number;
  photo_id?: string;
  engraving_text?: string;
  spotify_url?: string;
}

interface Order {
  order_id: string;
  status: string;
  product_name?: string;
  quantity?: number;
  unit_price?: string;
  total_amount?: string;
  items?: OrderItem[];
  shipping: {
    full_name: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
    phone: string;
  };
  created_at: string;
  tracking_number?: string;
  mp_payment_id?: string;
  mp_init_point?: string;
}

const STATUS_INFO: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  pending_payment: {
    label: 'Pendiente de pago',
    icon: <Clock size={20} />,
    color: 'text-yellow-400',
  },
  paid: {
    label: 'Pago confirmado',
    icon: <CheckCircle2 size={20} />,
    color: 'text-green-400',
  },
  in_process: {
    label: 'En producción',
    icon: <Sparkles size={20} />,
    color: 'text-amber-400',
  },
  shipped: {
    label: 'Enviado',
    icon: <Truck size={20} />,
    color: 'text-blue-400',
  },
  delivered: {
    label: 'Entregado',
    icon: <CheckCircle2 size={20} />,
    color: 'text-green-400',
  },
  payment_failed: {
    label: 'Pago fallido',
    icon: <AlertCircle size={20} />,
    color: 'text-red-400',
  },
  cancelled: {
    label: 'Cancelado',
    icon: <AlertCircle size={20} />,
    color: 'text-red-400',
  },
};

const STATUS_STEPS = ['paid', 'in_process', 'shipped', 'delivered'];

export default function OrderStatusPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center pt-14">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </main>
      }
    >
      <OrderStatusContent />
    </Suspense>
  );
}

function OrderStatusContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get('status');

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const hasFiredPurchase = useRef(false);

  useEffect(() => {
    const paymentId = searchParams.get('payment_id');

    const load = async () => {
      try {
        // Sync payment status for any MercadoPago return (success, failure, pending)
        if (paymentId) {
          try {
            await api.post(
              `/api/orders/${id}/sync-payment?payment_id=${paymentId}`,
              {},
            );
          } catch {
            // Sync failure (e.g. expired session) is non-fatal — load order anyway
          }
        }
        const order = await api.get<Order>(`/api/orders/${id}`);
        setOrder(order);

        // Fetch presigned photo URLs for all items that have a photo
        if (order.items) {
          const urls: Record<string, string> = {};
          await Promise.all(
            order.items
              .filter((it) => it.photo_id)
              .map(async (it) => {
                try {
                  const { url } = await api.getPhotoUrl(it.photo_id!);
                  urls[it.photo_id!] = url;
                } catch {
                  // non-fatal: photo just won't display
                }
              }),
          );
          setPhotoUrls(urls);
        }

        const orderValue = parseFloat(
          order.total_amount ?? order.unit_price ?? '0',
        );
        const orderName = order.items?.[0]
          ? (PRODUCT_CATALOG[order.items[0].product_id] ??
            order.items[0].product_id)
          : (order.product_name ?? 'Lámpara');
        if (paymentStatus === 'success' && !hasFiredPurchase.current) {
          hasFiredPurchase.current = true;
          getEvent('Purchase').track({
            value: orderValue,
            orderId: order.order_id,
            contentName: orderName,
          });
        }
        if (paymentStatus === 'failure') {
          getEvent('PaymentFailed').track({ value: orderValue });
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, paymentStatus, searchParams]);

  if (loading)
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center pt-14">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </main>
    );

  if (error || !order)
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center pt-14 px-4">
        <AlertCircle size={48} className="text-red-400 mb-4" />
        <h1 className="text-xl font-bold mb-2">Pedido no encontrado</h1>
        <p className="text-white/40 text-sm mb-6">{error}</p>
        <Link href="/" className="text-amber-400 hover:text-amber-300">
          Volver al inicio
        </Link>
      </main>
    );

  const statusInfo = STATUS_INFO[order.status] ?? STATUS_INFO.pending_payment;
  const currentStepIndex = STATUS_STEPS.indexOf(order.status);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pt-16 md:pt-20 pb-16 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* MercadoPago return banners */}
        {paymentStatus === 'success' && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 size={20} className="text-green-400" />
            <p className="text-green-300 font-medium">
              ¡Pago recibido! Tu lámpara está en producción.
            </p>
          </div>
        )}
        {paymentStatus === 'failure' && order.status !== 'paid' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 font-medium">
                Tu pago no fue procesado.
              </p>
              <p className="text-white/50 text-sm mt-0.5">
                Puedes intentarlo de nuevo o contactarnos por{' '}
                <a
                  href="https://wa.me/527551155510"
                  className="text-amber-400 underline"
                >
                  WhatsApp
                </a>
                .
              </p>
            </div>
          </div>
        )}
        {paymentStatus === 'pending' && order.status !== 'paid' && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex items-start gap-3">
            <Clock size={20} className="text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-300 font-medium">
                Tu pago está siendo verificado.
              </p>
              <p className="text-white/50 text-sm mt-0.5">
                Recibirás una confirmación en tu correo en breve.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-white/40 text-sm mb-1">Pedido</p>
              <p className="font-mono text-sm text-white/70">
                {order.order_id.slice(0, 8)}…
              </p>
              <p className="text-white/30 text-xs mt-1">
                {new Date(order.created_at).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            <div
              className={`flex items-center gap-2 font-semibold ${statusInfo.color}`}
            >
              {statusInfo.icon}
              {statusInfo.label}
            </div>
          </div>

          {/* Progress bar */}
          {currentStepIndex >= 0 && (
            <div className="mb-6">
              <div className="flex justify-between text-xs text-white/30 mb-2">
                {STATUS_STEPS.map((s) => (
                  <span
                    key={s}
                    className={
                      STATUS_STEPS.indexOf(s) <= currentStepIndex
                        ? 'text-amber-400'
                        : ''
                    }
                  >
                    {STATUS_INFO[s]?.label ?? s}
                  </span>
                ))}
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{
                    width: `${((currentStepIndex + 1) / STATUS_STEPS.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Products */}
          <div className="space-y-2 mb-4">
            {(order.items ?? []).length > 0 ? (
              order.items!.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 bg-white/3 rounded-xl p-4"
                >
                  {item.photo_id && photoUrls[item.photo_id] ? (
                    <img
                      src={photoUrls[item.photo_id]}
                      alt="Tu foto"
                      className="w-14 h-14 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <Package size={18} className="text-amber-400 shrink-0" />
                  )}
                  <div>
                    <p className="font-medium">
                      {PRODUCT_CATALOG[item.product_id] ?? item.product_id}
                    </p>
                    <p className="text-white/40 text-sm">×{item.quantity}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-3 bg-white/3 rounded-xl p-4">
                <Package size={18} className="text-amber-400" />
                <div>
                  <p className="font-medium">{order.product_name}</p>
                  <p className="text-white/40 text-sm">
                    ×{order.quantity} — ${order.unit_price} MXN
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Shipping */}
          <div className="flex items-start gap-3 bg-white/3 rounded-xl p-4">
            <MapPin size={18} className="text-amber-400 mt-0.5" />
            <div className="text-sm text-white/60 space-y-0.5">
              <p className="font-medium text-white">
                {order.shipping.full_name}
              </p>
              <p>{order.shipping.address}</p>
              <p>
                {order.shipping.city}, {order.shipping.state}{' '}
                {order.shipping.zip_code}
              </p>
              <p>{order.shipping.country}</p>
              {order.tracking_number && (
                <p className="text-amber-400 mt-2 font-medium">
                  Tracking: {order.tracking_number}
                </p>
              )}
            </div>
          </div>
        </div>

        {(order.status === 'pending_payment' ||
          order.status === 'payment_failed') &&
          order.mp_init_point && (
            <a
              href={order.mp_init_point}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl font-bold text-[15px] transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ backgroundColor: '#FBD100', color: '#183C73' }}
            >
              <CreditCard size={17} />
              <span>
                Pagar con{' '}
                <span style={{ color: '#009EE3', fontWeight: 800 }}>
                  Mercado Pago
                </span>
              </span>
            </a>
          )}

        <Link
          href="/mi-cuenta/pedidos"
          className="block text-center text-white/40 hover:text-white text-sm transition-colors"
        >
          Ver todos mis pedidos
        </Link>
      </div>
    </main>
  );
}

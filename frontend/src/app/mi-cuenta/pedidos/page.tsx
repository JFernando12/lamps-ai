"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import {
  Package,
  Clock,
  CheckCircle2,
  Truck,
  Sparkles,
  AlertCircle,
  ChevronRight,
} from "lucide-react";

interface Order {
  order_id: string;
  status: string;
  product_name: string;
  unit_price: string;
  quantity: number;
  created_at: string;
  render_url?: string;
}

const STATUS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending_payment: { label: "Pendiente de pago", icon: <Clock size={14} />, color: "text-yellow-400 bg-yellow-400/10" },
  paid: { label: "Pago confirmado", icon: <CheckCircle2 size={14} />, color: "text-green-400 bg-green-400/10" },
  in_process: { label: "En producción", icon: <Sparkles size={14} />, color: "text-amber-400 bg-amber-400/10" },
  shipped: { label: "Enviado", icon: <Truck size={14} />, color: "text-blue-400 bg-blue-400/10" },
  delivered: { label: "Entregado", icon: <CheckCircle2 size={14} />, color: "text-green-400 bg-green-400/10" },
  payment_failed: { label: "Pago fallido", icon: <AlertCircle size={14} />, color: "text-red-400 bg-red-400/10" },
  cancelled: { label: "Cancelado", icon: <AlertCircle size={14} />, color: "text-red-400 bg-red-400/10" },
};

export default function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    api
      .get<Order[]>("/api/orders/mine")
      .then(setOrders)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || loading)
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center pt-14">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </main>
    );

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pt-16 md:pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Mis pedidos</h1>
            <p className="text-white/40 text-sm mt-1">Hola, {user?.name} 👋</p>
          </div>
          <Link
            href="/"
            className="text-amber-400 hover:text-amber-300 text-sm transition-colors"
          >
            ← Volver al inicio
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-20 text-white/30">
            <Package size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-medium text-lg">Aún no tienes pedidos</p>
            <p className="text-sm mb-6">¡Genera tu preview y pide tu lámpara!</p>
            <Link
              href="/#preview"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold px-6 py-3 rounded-xl transition-colors"
            >
              <Sparkles size={16} />
              Ir al generador
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const s = STATUS[order.status] ?? STATUS.pending_payment;
              return (
                <Link
                  key={order.order_id}
                  href={`/pedido/${order.order_id}`}
                  className="flex items-center gap-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-amber-400/20 rounded-2xl p-4 transition-all group"
                >
                  {/* Render thumbnail */}
                  <div className="w-16 h-16 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                    {order.render_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={order.render_url}
                        alt="Lámpara"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package size={20} className="text-white/20" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{order.product_name}</p>
                    <p className="text-white/40 text-sm">
                      {new Date(order.created_at).toLocaleDateString("es-MX")} · $
                      {order.unit_price} MXN
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}
                    >
                      {s.icon}
                      {s.label}
                    </span>
                  </div>

                  <ChevronRight
                    size={18}
                    className="text-white/20 group-hover:text-amber-400 transition-colors shrink-0"
                  />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

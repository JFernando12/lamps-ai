"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { RefreshCw, CheckCircle, XCircle, ExternalLink, Clock } from "lucide-react";
import type { PendingTransfer } from "../dashboard/components/types";

export default function TransferenciasPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [transfers, setTransfers] = useState<PendingTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<{ transfers: PendingTransfer[] }>(
        "/api/admin/payments/pending-transfers"
      );
      setTransfers(data.transfers ?? []);
    } catch (e) {
      console.error(e);
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

  const review = async (paymentId: string, approved: boolean) => {
    const note = approved
      ? undefined
      : window.prompt("Motivo del rechazo (opcional):") ?? undefined;

    setProcessingId(paymentId);
    try {
      await api.post(
        `/api/admin/payments/${paymentId}/review?approved=${approved}${note ? `&note=${encodeURIComponent(note)}` : ""}`,
        {}
      );
      setTransfers((prev) => prev.filter((t) => t.payment_id !== paymentId));
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingId(null);
    }
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center pt-14">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pt-20 pb-16 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Transferencias pendientes</h1>
            <p className="text-white/40 text-xs mt-0.5">
              Verifica el comprobante y aprueba o rechaza cada pago
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

        {/* Empty state */}
        {transfers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-white/30">
            <CheckCircle size={40} className="text-green-500/40" />
            <p className="text-sm">Sin transferencias pendientes</p>
          </div>
        )}

        {/* Transfer cards */}
        <div className="flex flex-col gap-4">
          {transfers.map((t) => {
            const busy = processingId === t.payment_id;
            return (
              <div
                key={t.payment_id}
                className="bg-white/3 border border-white/10 rounded-2xl p-5 flex flex-col gap-4"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Clock size={13} className="text-amber-400" />
                      <span className="text-xs text-amber-400 font-medium">Por verificar</span>
                    </div>
                    <p className="font-bold text-lg text-amber-400">
                      ${t.amount.toFixed(0)} MXN
                    </p>
                    <p className="text-white/60 text-sm">{t.concept}</p>
                  </div>
                  <div className="text-right text-xs text-white/40">
                    <p className="font-mono">{t.payment_id}</p>
                    <p className="mt-0.5">
                      {new Date(t.created_at).toLocaleString("es-MX")}
                    </p>
                  </div>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-white/40 text-xs mb-0.5">WhatsApp</p>
                    <p className="text-white/80">{t.whatsapp_phone}</p>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs mb-0.5">Pedido</p>
                    <p className="font-mono text-white/80">{t.order_id}</p>
                  </div>
                </div>

                {/* Proof image */}
                {t.proof_url && (
                  <div className="relative rounded-xl overflow-hidden border border-white/10 bg-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={t.proof_url}
                      alt="Comprobante"
                      className="w-full max-h-64 object-contain"
                    />
                    <a
                      href={t.proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 hover:bg-black/80 px-2 py-1 rounded-lg text-xs transition-colors"
                    >
                      <ExternalLink size={11} />
                      Ver original
                    </a>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    disabled={busy}
                    onClick={() => review(t.payment_id, true)}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {busy ? (
                      <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle size={15} />
                        Aprobar
                      </>
                    )}
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => review(t.payment_id, false)}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {busy ? (
                      <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <XCircle size={15} />
                        Rechazar
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

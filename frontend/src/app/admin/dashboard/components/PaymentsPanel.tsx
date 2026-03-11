'use client';

import clsx from 'clsx';
import type { Payment } from './types';

const METHOD_LABELS: Record<string, string> = {
  mercadopago: 'MercadoPago',
  transfer: 'Transferencia',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  approved: 'text-green-400 bg-green-400/10',
  pending: 'text-yellow-400 bg-yellow-400/10',
  pending_verification: 'text-amber-400 bg-amber-400/10',
  rejected: 'text-red-400 bg-red-400/10',
  expired: 'text-white/30 bg-white/5',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  approved: 'Aprobado',
  pending: 'Pendiente',
  pending_verification: 'Por verificar',
  rejected: 'Rechazado',
  expired: 'Expirado',
};

export function PaymentsPanel({
  payments,
  paidTotal,
}: {
  payments: Payment[];
  paidTotal?: number;
}) {
  if (!payments || payments.length === 0) {
    return <p className="text-white/30 text-xs italic">Sin pagos registrados</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {payments.map((p) => (
        <div
          key={p.payment_id}
          className="flex items-center justify-between gap-2 text-xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-white/40">{METHOD_LABELS[p.method] ?? p.method}</span>
            <span className="text-white/20">·</span>
            <span className="text-white/60 truncate">{p.concept}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-semibold text-amber-400">${p.amount.toFixed(0)}</span>
            <span
              className={clsx(
                'px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                PAYMENT_STATUS_COLORS[p.status] ?? 'text-white/40 bg-white/5',
              )}
            >
              {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
            </span>
          </div>
        </div>
      ))}
      {paidTotal !== undefined && (
        <div className="flex justify-between text-xs pt-1 border-t border-white/10 mt-0.5">
          <span className="text-white/40">Total aprobado</span>
          <span className="font-bold text-green-400">${paidTotal.toFixed(0)} MXN</span>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import {
  MapPin,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import clsx from 'clsx';
import { PreviewThumb } from './PreviewThumb';
import { DesignPreview } from './DesignPreview';
import { PaymentsPanel } from './PaymentsPanel';
import { ShippingDetails } from './ShippingDetails';
import { StatusDropdown } from './StatusDropdown';
import { STATUS_COLORS, STATUS_LABELS } from './types';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';
import type { Order } from './types';

export function OrderCard({
  order,
  updating,
  onStatusChange,
  onDelete,
}: {
  order: Order;
  updating: boolean;
  onStatusChange: (status: string, tracking?: string) => void;
  onDelete: () => void;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const isWhatsapp = order.type === 'whatsapp';

  const clientName = order.shipping?.full_name ?? '—';
  const clientContact = isWhatsapp ? order.whatsapp_phone : order.user_email;
  const cityState =
    [order.shipping?.city, order.shipping?.state].filter(Boolean).join(', ') ||
    '—';
  const price = isWhatsapp
    ? order.paid_total != null
      ? `$${order.paid_total.toFixed(0)}`
      : '—'
    : `$${order.total_amount}`;

  return (
    <div className="bg-white/3 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
      {/* Top row: preview + meta */}
      <div className="flex gap-3">
        {isWhatsapp ? (
          <DesignPreview
            designUrl={order.design_url}
            designStatus={order.design_status}
            designApproved={order.design_approved}
            size="lg"
          />
        ) : (
          <PreviewThumb url={order.photo_url} size="lg" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                {isWhatsapp ? (
                  <WhatsAppIcon size={11} className="text-green-400 shrink-0" />
                ) : (
                  <ShoppingCart size={11} className="text-blue-400 shrink-0" />
                )}
                <p className="font-semibold text-sm truncate">{clientName}</p>
              </div>
              <p className="text-white/40 text-xs truncate">{clientContact}</p>
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
            <span className="font-mono">{order.order_id}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/40">
            <span>
              {new Date(order.created_at).toLocaleDateString('es-MX')}
            </span>
          </div>
          <p className="text-amber-400 font-bold text-sm mt-1">{price} MXN</p>
          {order.tracking_number && (
            <p className="text-[10px] text-white/30 font-mono mt-0.5">
              Rastreo: {order.tracking_number}
            </p>
          )}
        </div>
      </div>

      {/* Detail toggle */}
      <button
        onClick={() => setDetailOpen((v) => !v)}
        className="flex items-center justify-between w-full border border-white/10 rounded-xl px-3 py-2 text-xs text-white/50 hover:border-amber-400/30 hover:text-white/70 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <MapPin size={12} className="text-amber-400" />
          {cityState}
        </span>
        {detailOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {detailOpen && (
        <div className="rounded-xl bg-white/3 border border-white/10 px-3 py-2.5 flex flex-col gap-3">
          {order.shipping ? (
            <ShippingDetails shipping={order.shipping} />
          ) : isWhatsapp ? (
            <p className="text-white/30 text-xs italic">
              Sin dirección registrada
            </p>
          ) : null}
          {isWhatsapp && (
            <div className="border-t border-white/10 pt-2">
              <PaymentsPanel
                payments={order.payments ?? []}
                paidTotal={order.paid_total}
              />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <StatusDropdown
            current={order.status}
            orderType={order.type}
            disabled={updating}
            onChange={onStatusChange}
          />
        </div>
        <button
          onClick={onDelete}
          className="p-2 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-400/10 border border-white/10 hover:border-red-400/30 transition-colors"
          title="Eliminar pedido"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}

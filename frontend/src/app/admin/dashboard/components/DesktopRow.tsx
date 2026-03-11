'use client';

import { useState } from 'react';
import {
  MapPin,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  ShoppingCart,
} from 'lucide-react';
import clsx from 'clsx';
import { PreviewThumb } from './PreviewThumb';
import { DesignPreview } from './DesignPreview';
import { PaymentsPanel } from './PaymentsPanel';
import { ShippingDetails } from './ShippingDetails';
// cityState now unified — no conditional needed
import { StatusDropdown } from './StatusDropdown';
import { STATUS_COLORS, STATUS_LABELS } from './types';
import type { Order } from './types';

export function DesktopRow({
  order,
  updating,
  onStatusChange,
}: {
  order: Order;
  updating: boolean;
  onStatusChange: (status: string, tracking?: string) => void;
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
    <>
      <tr className="hover:bg-white/2 transition-colors">
        {/* Order ID + type badge */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            {isWhatsapp ? (
              <MessageCircle size={11} className="text-green-400 shrink-0" />
            ) : (
              <ShoppingCart size={11} className="text-blue-400 shrink-0" />
            )}
            <span className="font-mono text-xs text-white/50">
              {order.order_id}
            </span>
          </div>
        </td>

        {/* Client */}
        <td className="px-4 py-3">
          <p className="font-medium text-sm">{clientName}</p>
          <p className="text-white/40 text-xs">{clientContact}</p>
        </td>

        {/* Visual (photo or design) */}
        <td className="px-4 py-3">
          {isWhatsapp ? (
            <DesignPreview
              designUrl={order.design_url}
              designStatus={order.design_status}
              designApproved={order.design_approved}
            />
          ) : (
            <PreviewThumb url={order.photo_url} />
          )}
        </td>

        {/* Location */}
        <td className="px-4 py-3">
          <button
            onClick={() => setDetailOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-white/50 hover:text-amber-400 transition-colors"
          >
            <MapPin size={12} />
            {cityState}
            {detailOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </td>

        {/* Date */}
        <td className="px-4 py-3 text-white/50 text-xs">
          {new Date(order.created_at).toLocaleDateString('es-MX')}
        </td>

        {/* Price */}
        <td className="px-4 py-3 font-semibold">{price} MXN</td>

        {/* Status */}
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

        {/* Actions */}
        <td className="px-4 py-3">
          <StatusDropdown
            current={order.status}
            orderType={order.type}
            disabled={updating}
            onChange={onStatusChange}
          />
        </td>
      </tr>

      {/* Expanded detail row */}
      {detailOpen && (
        <tr className="bg-white/1.5">
          <td colSpan={8} className="px-6 py-4">
            {isWhatsapp ? (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wide mb-2">
                    Envío
                  </p>
                  {order.shipping ? (
                    <ShippingDetails shipping={order.shipping} />
                  ) : (
                    <p className="text-white/30 text-xs italic">
                      Sin dirección registrada
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wide mb-2">
                    Pagos
                  </p>
                  <PaymentsPanel
                    payments={order.payments ?? []}
                    paidTotal={order.paid_total}
                  />
                </div>
              </div>
            ) : (
              <ShippingDetails shipping={order.shipping!} />
            )}
          </td>
        </tr>
      )}
    </>
  );
}

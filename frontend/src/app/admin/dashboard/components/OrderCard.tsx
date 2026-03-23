'use client';

import { useState } from 'react';
import {
  ShoppingCart,
  Trash2,
  PenLine,
  Music,
  ChevronDown,
  MapPin,
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

const PRODUCT_LABELS: Record<string, string> = {
  rgb: 'Lámpara RGB',
  madera: 'Lámpara Madera',
};

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
  const shortId =
    order.order_id.length > 16
      ? `…${order.order_id.slice(-10)}`
      : order.order_id;

  return (
    <div
      className={clsx(
        'rounded-2xl overflow-hidden border transition-colors',
        detailOpen
          ? 'border-amber-500/25 bg-amber-500/3'
          : 'border-white/10 bg-white/3',
      )}
    >
      {/* Clickable header */}
      <button
        type="button"
        onClick={() => setDetailOpen((v) => !v)}
        className="w-full text-left p-4 active:bg-white/5 transition-colors"
      >
        <div className="flex gap-3 items-start">
          <div className="shrink-0">
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
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  {isWhatsapp ? (
                    <WhatsAppIcon
                      size={10}
                      className="text-green-400 shrink-0"
                    />
                  ) : (
                    <ShoppingCart
                      size={10}
                      className="text-blue-400 shrink-0"
                    />
                  )}
                  <p className="font-semibold text-sm truncate">{clientName}</p>
                </div>
                <p className="text-white/40 text-xs truncate">
                  {clientContact}
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
            <p className="text-[10px] text-white/25 font-mono mt-1.5">
              {new Date(order.created_at).toLocaleDateString('es-MX')}
              <span className="text-white/15"> · </span>
              {shortId}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <p className="text-amber-400 font-bold text-sm">{price} MXN</p>
              {order.product_id && (
                <span className="text-[10px] font-semibold bg-amber-400/10 text-amber-400 border border-amber-400/20 px-2 py-0.5 rounded-full">
                  {PRODUCT_LABELS[order.product_id] ?? order.product_id}
                </span>
              )}
            </div>
            {(order.engraving_text || order.spotify_url) && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {order.engraving_text && (
                  <span className="flex items-center gap-1 text-[10px] bg-white/5 text-white/45 border border-white/10 px-2 py-0.5 rounded-full">
                    <PenLine size={9} />
                    grabado
                  </span>
                )}
                {order.spotify_url && (
                  <span className="flex items-center gap-1 text-[10px] bg-green-400/10 text-green-400/70 border border-green-400/20 px-2 py-0.5 rounded-full">
                    <Music size={9} />
                    spotify
                  </span>
                )}
              </div>
            )}
          </div>
          <ChevronDown
            size={16}
            className={clsx(
              'self-center shrink-0 text-white/20 transition-transform mt-1',
              detailOpen && 'rotate-180 text-amber-400',
            )}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 pt-3 border-t border-white/[0.07] text-xs text-white/35">
          <span className="flex items-center gap-1">
            <MapPin size={10} className="text-white/20" />
            {cityState}
          </span>
          {order.tracking_number && (
            <span className="font-mono text-[10px]">
              Rastreo: {order.tracking_number}
            </span>
          )}
        </div>
      </button>

      {/* Detail panel */}
      {detailOpen && (
        <div className="flex flex-col gap-4 px-4 pb-4 border-t border-white/[0.07]">
          {(order.engraving_text || order.spotify_url) && (
            <div className="pt-4">
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-3">
                Personalización
              </p>
              <div className="flex flex-col gap-3">
                {order.engraving_text && (
                  <div className="flex items-start gap-2">
                    <PenLine
                      size={13}
                      className="text-amber-400/80 shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="text-[10px] text-white/25 mb-0.5">
                        Texto grabado
                      </p>
                      <p className="text-sm text-white/85">
                        "{order.engraving_text}"
                      </p>
                    </div>
                  </div>
                )}
                {order.spotify_url && (
                  <div className="flex items-start gap-2">
                    <Music
                      size={13}
                      className="text-green-400/70 shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="text-[10px] text-white/25 mb-0.5">
                        Código Spotify
                      </p>
                      <p className="text-sm text-white/85">
                        {order.spotify_url}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {order.shipping ? (
            <div
              className={clsx(
                !(order.engraving_text || order.spotify_url) && 'pt-4',
              )}
            >
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-3">
                Dirección de envío
              </p>
              <ShippingDetails shipping={order.shipping} />
            </div>
          ) : (
            <p className="text-white/30 text-xs italic pt-4">
              Sin dirección registrada
            </p>
          )}
          {isWhatsapp && (
            <div className="border-t border-white/[0.07] pt-4">
              <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-3">
                Pagos
              </p>
              <PaymentsPanel
                payments={order.payments ?? []}
                paidTotal={order.paid_total}
              />
            </div>
          )}
        </div>
      )}

      {/* Actions bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-white/[0.07] bg-white/1.5">
        <div className="flex-1">
          <StatusDropdown
            current={order.status}
            orderType={order.type}
            disabled={updating}
            onChange={onStatusChange}
          />
        </div>
        <button
          type="button"
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

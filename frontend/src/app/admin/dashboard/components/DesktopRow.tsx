'use client';

import { useState } from 'react';
import {
  ChevronRight,
  MessageCircle,
  ShoppingCart,
  Trash2,
  PenLine,
  Music,
  MapPin,
} from 'lucide-react';
import clsx from 'clsx';
import { PreviewThumb } from './PreviewThumb';
import { DesignPreview } from './DesignPreview';
import { PaymentsPanel } from './PaymentsPanel';
import { ShippingDetails } from './ShippingDetails';
import { StatusDropdown } from './StatusDropdown';
import { STATUS_COLORS, STATUS_LABELS } from './types';
import type { Order } from './types';

const PRODUCT_LABELS: Record<string, string> = {
  rgb: 'Lámpara RGB',
  madera: 'Lámpara Madera',
};

export function DesktopRow({
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
  const displayId =
    order.order_id.length > 18
      ? `…${order.order_id.slice(-10)}`
      : order.order_id;

  return (
    <>
      <tr
        onClick={() => setDetailOpen((v) => !v)}
        className={clsx(
          'cursor-pointer transition-colors select-none',
          detailOpen ? 'bg-amber-500/4' : 'hover:bg-white/2.5',
        )}
      >
        {/* 1 — Pedido: chevron + ID + fecha */}
        <td className="px-4 py-3.5">
          <div className="flex items-start gap-2">
            <ChevronRight
              size={13}
              className={clsx(
                'shrink-0 mt-0.5 text-white/20 transition-transform',
                detailOpen && 'rotate-90 text-amber-400',
              )}
            />
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                {isWhatsapp ? (
                  <MessageCircle
                    size={10}
                    className="text-green-400 shrink-0"
                  />
                ) : (
                  <ShoppingCart size={10} className="text-blue-400 shrink-0" />
                )}
                <span className="font-mono text-xs text-white/50">
                  {displayId}
                </span>
              </div>
              <p className="text-[10px] text-white/25">
                {new Date(order.created_at).toLocaleDateString('es-MX')}
              </p>
            </div>
          </div>
        </td>

        {/* 2 — Cliente */}
        <td className="px-4 py-3.5">
          <p className="font-medium text-sm">{clientName}</p>
          <p className="text-white/40 text-xs truncate max-w-48">
            {clientContact}
          </p>
        </td>

        {/* 3 — Producto: thumbnail + product label */}
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            {isWhatsapp ? (
              <DesignPreview
                designUrl={order.design_url}
                designStatus={order.design_status}
                designApproved={order.design_approved}
              />
            ) : (
              <PreviewThumb url={order.photo_url} />
            )}
            {order.product_id && (
              <div>
                <p className="text-[9px] text-white/25 uppercase tracking-wide mb-0.5">
                  Tipo
                </p>
                <p className="text-xs font-semibold text-amber-400 leading-tight">
                  {PRODUCT_LABELS[order.product_id] ?? order.product_id}
                </p>
              </div>
            )}
          </div>
        </td>

        {/* 4 — Envío */}
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-1 text-xs text-white/50">
            <MapPin size={11} className="text-white/25 shrink-0" />
            {cityState}
          </div>
        </td>

        {/* 5 — Total + personalización chips */}
        <td className="px-4 py-3.5">
          <p className="font-semibold text-sm whitespace-nowrap">{price} MXN</p>
          {(order.engraving_text || order.spotify_url) && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {order.engraving_text && (
                <span
                  title={`Grabado: ${order.engraving_text}`}
                  className="flex items-center gap-0.5 text-[9px] bg-white/5 text-white/35 border border-white/10 px-1.5 py-0.5 rounded cursor-help"
                >
                  <PenLine size={8} /> grabado
                </span>
              )}
              {order.spotify_url && (
                <span
                  title={`Spotify: ${order.spotify_url}`}
                  className="flex items-center gap-0.5 text-[9px] bg-green-400/10 text-green-400/60 border border-green-400/20 px-1.5 py-0.5 rounded cursor-help"
                >
                  <Music size={8} /> spotify
                </span>
              )}
            </div>
          )}
        </td>

        {/* 6 — Estado */}
        <td className="px-4 py-3.5">
          <span
            className={clsx(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
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

        {/* 7 — Acciones — stopPropagation para no colapsar la fila */}
        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <StatusDropdown
              current={order.status}
              orderType={order.type}
              disabled={updating}
              onChange={onStatusChange}
            />
            <button
              type="button"
              onClick={onDelete}
              className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors"
              title="Eliminar pedido"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>

      {/* Detail panel */}
      {detailOpen && (
        <tr className="bg-amber-500/2.5">
          <td colSpan={7} className="px-8 py-5 border-b border-amber-500/10">
            <div
              className={clsx(
                'grid gap-8',
                isWhatsapp ? 'grid-cols-3' : 'grid-cols-2',
              )}
            >
              {/* Envío */}
              <div>
                <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-3">
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

              {/* Producto + personalización */}
              <div>
                <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-3">
                  Producto
                </p>
                <div className="flex flex-col gap-3">
                  {order.product_id && (
                    <div>
                      <p className="text-[10px] text-white/25 mb-0.5">
                        Tipo de lámpara
                      </p>
                      <p className="text-sm font-semibold text-amber-400">
                        {PRODUCT_LABELS[order.product_id] ?? order.product_id}
                      </p>
                    </div>
                  )}
                  {order.engraving_text && (
                    <div className="flex items-start gap-2">
                      <PenLine
                        size={13}
                        className="text-amber-400/70 shrink-0 mt-0.5"
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
                  {!order.product_id &&
                    !order.engraving_text &&
                    !order.spotify_url && (
                      <p className="text-xs text-white/25 italic">
                        Sin información de producto
                      </p>
                    )}
                </div>
              </div>

              {/* Pagos (solo WA) */}
              {isWhatsapp && (
                <div>
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
          </td>
        </tr>
      )}
    </>
  );
}

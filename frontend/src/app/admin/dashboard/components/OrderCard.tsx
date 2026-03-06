'use client';

import { useState } from 'react';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import { PreviewThumb } from './PreviewThumb';
import { ShippingDetails } from './ShippingDetails';
import { StatusDropdown } from './StatusDropdown';
import { STATUS_COLORS, STATUS_LABELS } from './types';
import type { Order } from './types';

export function OrderCard({
  order,
  updating,
  onStatusChange,
}: {
  order: Order;
  updating: boolean;
  onStatusChange: (status: string, tracking?: string) => void;
}) {
  const [shippingOpen, setShippingOpen] = useState(false);

  return (
    <div className="bg-white/3 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
      {/* Top row: preview + meta */}
      <div className="flex gap-3">
        <PreviewThumb url={order.photo_url} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{order.shipping?.full_name}</p>
              <p className="text-white/40 text-xs truncate">{order.user_email}</p>
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
            <span className="font-mono">{order.order_id.slice(0, 8)}…</span>
            <span>•</span>
            <span>{new Date(order.created_at).toLocaleDateString('es-MX')}</span>
          </div>
          <p className="text-amber-400 font-bold text-sm mt-1">${order.unit_price} MXN</p>
          {order.tracking_number && (
            <p className="text-[10px] text-white/30 font-mono mt-0.5">Rastreo: {order.tracking_number}</p>
          )}
        </div>
      </div>

      {/* Shipping toggle */}
      <button
        onClick={() => setShippingOpen((v) => !v)}
        className="flex items-center justify-between w-full border border-white/10 rounded-xl px-3 py-2 text-xs text-white/50 hover:border-amber-400/30 hover:text-white/70 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <MapPin size={12} className="text-amber-400" />
          {order.shipping?.city}, {order.shipping?.state}
        </span>
        {shippingOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {shippingOpen && (
        <div className="rounded-xl bg-white/3 border border-white/10 px-3 py-2.5">
          <ShippingDetails shipping={order.shipping} />
        </div>
      )}

      {/* Actions */}
      <StatusDropdown current={order.status} disabled={updating} onChange={onStatusChange} />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';
import { PreviewThumb } from './PreviewThumb';
import { ShippingDetails } from './ShippingDetails';
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
  const [shippingOpen, setShippingOpen] = useState(false);

  return (
    <>
      <tr className="hover:bg-white/2 transition-colors">
        <td className="px-4 py-3 font-mono text-xs text-white/50">{order.order_id.slice(0, 8)}…</td>
        <td className="px-4 py-3">
          <p className="font-medium">{order.shipping?.full_name}</p>
          <p className="text-white/40 text-xs">{order.user_email}</p>
        </td>
        <td className="px-4 py-3">
          <PreviewThumb url={order.photo_url} />
        </td>
        <td className="px-4 py-3">
          <button
            onClick={() => setShippingOpen((v) => !v)}
            className="flex items-center gap-1 text-xs text-white/50 hover:text-amber-400 transition-colors"
          >
            <MapPin size={12} />
            {order.shipping?.city}, {order.shipping?.state}
            {shippingOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </td>
        <td className="px-4 py-3 text-white/50 text-xs">
          {new Date(order.created_at).toLocaleDateString('es-MX')}
        </td>
        <td className="px-4 py-3 font-semibold">${order.unit_price} MXN</td>
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
            <p className="text-[10px] text-white/30 mt-0.5 font-mono">{order.tracking_number}</p>
          )}
        </td>
        <td className="px-4 py-3">
          <StatusDropdown current={order.status} disabled={updating} onChange={onStatusChange} />
        </td>
      </tr>
      {shippingOpen && (
        <tr className="bg-white/1.5">
          <td colSpan={8} className="px-6 py-3">
            <ShippingDetails shipping={order.shipping} />
          </td>
        </tr>
      )}
    </>
  );
}

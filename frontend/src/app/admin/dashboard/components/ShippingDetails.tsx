import { Phone } from 'lucide-react';
import type { ShippingInfo } from './types';

export function ShippingDetails({ shipping }: { shipping: ShippingInfo }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs">
      <p className="text-white/70">
        <span className="text-white/30">Nombre: </span>
        {shipping.full_name}
      </p>
      <p className="text-white/70">
        <span className="text-white/30">Dirección: </span>
        {shipping.address}
      </p>
      <p className="text-white/70">
        <span className="text-white/30">Ciudad: </span>
        {shipping.city}, {shipping.state} {shipping.zip_code}
      </p>
      <p className="text-white/70">
        <span className="text-white/30">País: </span>
        {shipping.country}
      </p>
      <p className="flex items-center gap-1 text-white/70">
        <Phone size={11} className="text-amber-400" />
        {shipping.phone}
      </p>
    </div>
  );
}

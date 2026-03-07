import { CreditCard, Lock, MapPin, Package } from 'lucide-react';
import { ShippingForm, User, CartItemState, PRODUCTS } from './types';

const PRODUCT_IMAGES: Record<string, string> = {
  rgb: '/gallery/lampara-1-v2.jpg',
  madera: '/gallery/lampara-madera-1.jpg',
};

interface Props {
  items: CartItemState[];
  shipping: ShippingForm;
  user: User | null;
  error: string | null;
  loading: boolean;
  onPlaceOrder: () => void;
  onBack: () => void;
}

export function PaymentStep({
  items,
  shipping,
  user,
  error,
  loading,
  onPlaceOrder,
  onBack,
}: Props) {
  const total = items.reduce(
    (sum, it) => sum + PRODUCTS[it.productId].price * it.quantity,
    0,
  );

  return (
    <div className="space-y-5">
      <h2 className="font-bold text-xl">Resumen y pago</h2>

      {/* ── Items ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        {items.map((item, idx) => {
          const product = PRODUCTS[item.productId];
          const thumb =
            item.localPhotoPreview ?? PRODUCT_IMAGES[item.productId];
          return (
            <div
              key={item.localId}
              className="flex gap-3 p-3 rounded-2xl border border-white/8 bg-white/3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumb}
                alt={product.name}
                className="w-14 h-14 object-cover rounded-xl shrink-0 border border-white/8"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-sm leading-tight">
                    {product.name}
                  </p>
                  <span className="text-amber-400 font-bold text-sm shrink-0">
                    ${(product.price * item.quantity).toLocaleString()}
                  </span>
                </div>
                <p className="text-white/35 text-xs mt-0.5">
                  {product.tagline}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {item.quantity > 1 && (
                    <span className="text-[11px] bg-white/8 text-white/60 px-2 py-0.5 rounded-full">
                      × {item.quantity}
                    </span>
                  )}
                  {item.engravingText && (
                    <span className="text-[11px] bg-white/8 text-white/60 px-2 py-0.5 rounded-full truncate max-w-35">
                      "{item.engravingText}"
                    </span>
                  )}
                  {item.spotifyUrl && (
                    <span className="text-[11px] bg-white/8 text-white/60 px-2 py-0.5 rounded-full">
                      Spotify ♫
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Shipping summary ────────────────────────────────────── */}
      <div className="flex gap-3 p-3 rounded-2xl border border-white/8 bg-white/3">
        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
          <MapPin size={14} className="text-white/40" />
        </div>
        <div className="min-w-0">
          <p className="text-white/40 text-xs mb-0.5">Envío a</p>
          <p className="text-sm font-medium truncate">{shipping.full_name}</p>
          <p className="text-white/50 text-xs truncate">{shipping.address}</p>
          <p className="text-white/50 text-xs">
            {shipping.city}, {shipping.state} {shipping.zip_code}
          </p>
        </div>
      </div>

      {/* ── Total ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1">
        <div>
          <span className="text-white/60 text-sm">Total</span>
          <p className="text-green-400/70 text-xs mt-0.5">Envío gratis</p>
        </div>
        <span className="text-2xl font-extrabold text-amber-400">
          ${total.toLocaleString()}{' '}
          <span className="text-sm font-normal text-amber-400/60">MXN</span>
        </span>
      </div>

      {/* ── Security note ───────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-1.5 text-white/25 text-xs">
        <Lock size={11} />
        Pago seguro con MercadoPago · SSL encriptado
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={onPlaceOrder}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-black font-bold py-4 rounded-xl text-base transition-all disabled:opacity-50"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <CreditCard size={18} />
            Pagar ${total.toLocaleString()} MXN
          </>
        )}
      </button>

      <button
        onClick={onBack}
        className="w-full text-white/35 hover:text-white text-sm py-2 transition-colors"
      >
        ← Volver a datos de envío
      </button>
    </div>
  );
}

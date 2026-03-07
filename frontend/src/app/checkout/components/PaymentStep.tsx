import { CreditCard, Lock } from 'lucide-react';
import { ShippingForm, User, CartItemState, PRODUCTS } from './types';

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
    <div className="space-y-6">
      <h2 className="font-semibold text-lg flex items-center gap-2">
        <CreditCard size={18} className="text-amber-400" />
        Resumen y pago
      </h2>

      <div className="bg-white/3 border border-white/10 rounded-xl p-4 space-y-3">
        {/* Items list */}
        {items.map((item, idx) => {
          const product = PRODUCTS[item.productId];
          return (
            <div
              key={item.localId}
              className="flex gap-3 pb-3 border-b border-white/8 last:border-b-0 last:pb-0"
            >
              {item.localPhotoPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.localPhotoPreview}
                  alt={`Lámpara ${idx + 1}`}
                  className="w-12 h-12 object-cover rounded-lg border border-amber-500/20 shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{product.name}</p>
                <p className="text-white/40 text-xs mt-0.5">
                  {product.tagline}
                </p>
                {item.engravingText && (
                  <p className="text-white/35 text-xs mt-0.5">
                    &ldquo;{item.engravingText}&rdquo;
                  </p>
                )}
                {item.spotifyUrl && (
                  <p className="text-white/35 text-xs mt-0.5">
                    Código Spotify incluido
                  </p>
                )}
              </div>
              <span className="text-amber-400 font-semibold text-sm shrink-0">
                ${product.price * item.quantity}
              </span>
            </div>
          );
        })}

        {/* Shipping row */}
        <p className="text-white/40 text-xs pt-1">
          Envío a: {shipping.city}, {shipping.state}
        </p>

        {user && <p className="text-white/40 text-xs">Cuenta: {user.email}</p>}

        {/* Total */}
        <div className="border-t border-white/10 pt-3 flex justify-between font-bold text-lg">
          <span>Total</span>
          <span className="text-amber-400">${total} MXN</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-white/40 text-xs">
        <Lock size={13} />
        Pago seguro con MercadoPago · SSL encriptado
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={onPlaceOrder}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 rounded-xl text-lg transition-all hover:scale-[1.02] disabled:opacity-50"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <CreditCard size={20} />
            Pagar ${total} MXN con MercadoPago
          </>
        )}
      </button>

      <button
        onClick={onBack}
        className="w-full text-white/40 hover:text-white text-sm py-2 transition-colors"
      >
        ← Volver
      </button>
    </div>
  );
}

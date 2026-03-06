import { CreditCard, Lock, Package } from 'lucide-react';
import { ShippingForm, User } from './types';

interface Props {
  previewRenderUrl: string | null;
  localPhotoPreview: string | null;
  shipping: ShippingForm;
  engravingText: string;
  spotifyUrl: string;
  user: User | null;
  error: string | null;
  loading: boolean;
  onPlaceOrder: () => void;
  onBack: () => void;
}

export function PaymentStep({
  previewRenderUrl,
  localPhotoPreview,
  shipping,
  engravingText,
  spotifyUrl,
  user,
  error,
  loading,
  onPlaceOrder,
  onBack,
}: Props) {
  return (
    <div className="space-y-6">
      <h2 className="font-semibold text-lg flex items-center gap-2">
        <CreditCard size={18} className="text-amber-400" />
        Resumen y pago
      </h2>

      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-3">
        {(previewRenderUrl || localPhotoPreview) && (
          <div className="flex gap-3 pb-3 border-b border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewRenderUrl ?? localPhotoPreview!}
              alt="Tu foto"
              className="w-14 h-14 object-cover rounded-lg border border-amber-500/20 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Lámpara personalizada LED</p>
              <p className="text-white/40 text-xs mt-0.5">
                Diseño con tu foto · grabado láser
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Package size={18} className="text-amber-400" />
          <span className="font-medium">Lámpara acrílica LED personalizada</span>
        </div>
        <div className="text-white/50 text-sm pl-7 space-y-1">
          <p>
            Envío a: {shipping.city}, {shipping.state}
          </p>
          {engravingText && <p>Texto: &ldquo;{engravingText}&rdquo;</p>}
          {spotifyUrl && <p>Código Spotify incluido</p>}
          {user && <p>Cuenta: {user.email}</p>}
        </div>
        <div className="border-t border-white/10 pt-3 flex justify-between font-bold text-lg">
          <span>Total</span>
          <span className="text-amber-400">$799 MXN</span>
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
            Pagar con MercadoPago
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

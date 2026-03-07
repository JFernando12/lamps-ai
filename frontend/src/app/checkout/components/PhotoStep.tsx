import { useRef, useEffect } from 'react';
import { Package, Plus } from 'lucide-react';
import clsx from 'clsx';
import { CartItemState, ProductId } from './types';
import { LampItemForm } from './LampItemForm';

interface Props {
  items: CartItemState[];
  onProductChange: (localId: string, productId: ProductId) => void;
  onQuantityChange: (localId: string, quantity: number) => void;
  onPhotoUploaded: (localId: string, photoId: string) => void;
  onPreviewChange: (localId: string, preview: string | null) => void;
  onEngravingChange: (localId: string, text: string) => void;
  onSpotifyChange: (localId: string, url: string) => void;
  onAddItem: () => void;
  onRemoveItem: (localId: string) => void;
  // Account (optional)
  isLoggedIn: boolean;
  accountMode: 'login' | 'register';
  setAccountMode: (v: 'login' | 'register') => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  error: string | null;
  loading: boolean;
  onContinue: () => void;
}

export function PhotoStep({
  items,
  onProductChange,
  onQuantityChange,
  onPhotoUploaded,
  onPreviewChange,
  onEngravingChange,
  onSpotifyChange,
  onAddItem,
  onRemoveItem,
  isLoggedIn,
  accountMode,
  setAccountMode,
  email,
  setEmail,
  password,
  setPassword,
  error,
  loading,
  onContinue,
}: Props) {
  const newItemRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(items.length);

  // Scroll to the newly added item
  useEffect(() => {
    if (items.length > prevCountRef.current) {
      newItemRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
    prevCountRef.current = items.length;
  }, [items.length]);

  const hasAtLeastOnePhoto = items.some((it) => it.photoId !== null);

  return (
    <div className="space-y-5">
      <h2 className="font-bold text-xl">
        Personaliza tu{items.length > 1 ? 's lámparas' : ' lámpara'}
      </h2>

      {/* Item forms */}
      <div className="space-y-6">
        {items.map((item, idx) => (
          <div
            key={item.localId}
            className={idx > 0 ? 'mt-2' : undefined}
            ref={
              idx === items.length - 1 && items.length > 1
                ? newItemRef
                : undefined
            }
          >
            <LampItemForm
              item={item}
              itemIndex={idx}
              canRemove={items.length > 1}
              onProductChange={onProductChange}
              onQuantityChange={onQuantityChange}
              onPhotoUploaded={onPhotoUploaded}
              onPreviewChange={onPreviewChange}
              onEngravingChange={onEngravingChange}
              onSpotifyChange={onSpotifyChange}
              onRemove={onRemoveItem}
            />
          </div>
        ))}
      </div>

      {/* Add another lamp — non-invasive */}
      <button
        type="button"
        onClick={onAddItem}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/15 text-white/40 hover:text-white/70 hover:border-white/30 transition-all text-sm"
      >
        <Plus size={15} />
        Agregar otra lámpara
      </button>

      {/* Optional account section */}
      {!isLoggedIn && (
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 text-white/40 text-xs">
            <Package size={13} className="text-amber-400/70 shrink-0" />
            <p>Opcional — crea una cuenta para rastrear tu pedido.</p>
          </div>

          <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
            {(['register', 'login'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setAccountMode(m)}
                className={clsx(
                  'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                  accountMode === m
                    ? 'bg-amber-500 text-black'
                    : 'text-white/50 hover:text-white',
                )}
              >
                {m === 'register' ? 'Crear cuenta' : 'Ya tengo cuenta'}
              </button>
            ))}
          </div>

          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/60 transition-colors text-sm"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/60 transition-colors text-sm"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      )}

      <button
        type="button"
        disabled={!hasAtLeastOnePhoto || loading}
        onClick={onContinue}
        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed mt-2"
      >
        {loading ? 'Cargando…' : 'Continuar'}
      </button>
    </div>
  );
}

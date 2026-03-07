"use client";

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { getStoredAttribution, getFbpCookie } from '@/lib/utm';
import { getEvent, genEventId } from '@/lib/pixelEvents';
import {
  Step,
  ShippingForm,
  EMPTY_SHIPPING,
  ProductId,
  PRODUCTS,
  CartItemState,
} from './components/types';

import { StepIndicator } from './components/StepIndicator';
import { PhotoStep } from './components/PhotoStep';
import { DetailsStep } from './components/DetailsStep';
import { PaymentStep } from './components/PaymentStep';

function CheckoutContent() {
  const params = useSearchParams();
  const { user, login, register, loading: authLoading } = useAuth();
  const urlCartId = params.get('cart_id') ?? '';
  const initialProductId = (params.get('product') ?? 'rgb') as ProductId;

  const [checkoutEventId] = useState<string>(() => genEventId('ic'));

  const [items, setItems] = useState<CartItemState[]>(() => [
    {
      localId: '1',
      photoId: null,
      localPhotoPreview: null,
      engravingText: '',
      spotifyUrl: '',
      productId: initialProductId,
      quantity: 1,
    },
  ]);

  const [step, setStep] = useState<Step>('photo');
  const [shipping, setShipping] = useState<ShippingForm>(EMPTY_SHIPPING);
  const [accountMode, setAccountMode] = useState<'login' | 'register'>(
    'register',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cartId, setCartId] = useState<string | null>(null);

  // ── Item updaters ──────────────────────────────────────────────────────
  const updateItem = useCallback(
    (localId: string, patch: Partial<CartItemState>) => {
      setItems((prev) =>
        prev.map((it) => (it.localId === localId ? { ...it, ...patch } : it)),
      );
    },
    [],
  );

  const handleAddItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        localId: String(Date.now()),
        photoId: null,
        localPhotoPreview: null,
        engravingText: '',
        spotifyUrl: '',
        productId: 'rgb',
        quantity: 1,
      },
    ]);
  }, []);

  const handleRemoveItem = useCallback((localId: string) => {
    setItems((prev) => prev.filter((it) => it.localId !== localId));
  }, []);

  // ── Server-side cart draft ─────────────────────────────────────────────
  const saveDraftToServer = useCallback(
    async (
      opts: { emailOverride?: string; itemsOverride?: CartItemState[] } = {},
    ) => {
      const emailToUse = opts.emailOverride ?? email;
      if (!emailToUse || !emailToUse.includes('@')) return;
      const itemsToUse = opts.itemsOverride ?? items;
      try {
        const {
          utm_source,
          utm_medium,
          utm_campaign,
          utm_content,
          utm_term,
          fbclid,
        } = getStoredAttribution() ?? {};
        const fbp = getFbpCookie();
        const r = await api.saveCart({
          email: emailToUse,
          cart_id: cartId ?? undefined,
          items: itemsToUse.map((it) => ({
            photo_id: it.photoId ?? undefined,
            engraving_text: it.engravingText || undefined,
            spotify_url: it.spotifyUrl || undefined,
            product_id: it.productId,
            quantity: it.quantity,
          })),
          utm_source: utm_source ?? undefined,
          utm_medium: utm_medium ?? undefined,
          utm_campaign: utm_campaign ?? undefined,
          utm_content: utm_content ?? undefined,
          utm_term: utm_term ?? undefined,
          fbclid: fbclid ?? undefined,
          fbp: fbp ?? undefined,
        });
        setCartId((prev) => prev ?? r.cart_id);
      } catch {
        /* non-critical */
      }
    },
    [cartId, email, items],
  );

  // Restore cart from recovery email link (?cart_id=xxx)
  useEffect(() => {
    if (!urlCartId) return;
    api
      .getCart(urlCartId)
      .then(async (cart) => {
        setCartId(urlCartId);
        if (cart.email) setEmail(cart.email);
        if (cart.items?.length) {
          const restored: CartItemState[] = await Promise.all(
            cart.items.map(async (ci, idx) => {
              let preview: string | null = null;
              if (ci.photo_id) {
                try {
                  const { url } = await api.getPhotoUrl(ci.photo_id);
                  preview = url;
                } catch {
                  /* non-critical */
                }
              }
              return {
                localId: String(idx + 1),
                photoId: ci.photo_id ?? null,
                localPhotoPreview: preview,
                engravingText: ci.engraving_text ?? '',
                spotifyUrl: ci.spotify_url ?? '',
                productId: (ci.product_id as ProductId) ?? 'rgb',
                quantity: ci.quantity ?? 1,
              };
            }),
          );
          if (restored.length) setItems(restored);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync logged-in user email so the cart gets saved with their identity
  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user?.email, email]);

  const handlePhotoUploaded = useCallback(
    (localId: string, photoId: string) => {
      setItems((prev) => {
        const updated = prev.map((it) =>
          it.localId === localId ? { ...it, photoId } : it,
        );
        saveDraftToServer({ itemsOverride: updated }).catch(() => {});
        return updated;
      });
    },
    [saveDraftToServer],
  );

  useEffect(() => {
    getEvent('InitiateCheckout').track({
      value: items.reduce(
        (s, it) => s + it.quantity * PRODUCTS[it.productId].price,
        0,
      ),
      eventId: checkoutEventId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePhotoNext = async () => {
    // Auth is optional: only attempt if both email and password are filled
    if (!user && email.trim() && password.trim()) {
      setLoading(true);
      setError(null);
      try {
        if (accountMode === 'register') {
          await register(email.trim(), password, email.split('@')[0]);
          getEvent('CompleteRegistration').track();
        } else {
          await login(email.trim(), password);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error de autenticación');
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    // Save cart draft (non-blocking)
    if (email.trim()) saveDraftToServer({ emailOverride: email.trim() });
    setStep('details');
  };

  const handleDetailsNext = async (e: React.FormEvent) => {
    e.preventDefault();
    const required = [
      'full_name',
      'address',
      'city',
      'state',
      'zip_code',
      'phone',
    ] as const;
    for (const key of required) {
      if (!shipping[key].trim()) {
        setError(`El campo "${key.replace('_', ' ')}" es obligatorio`);
        return;
      }
    }
    setError(null);
    getEvent('AddShippingInfo').track({
      value: items.reduce(
        (s, it) => s + it.quantity * PRODUCTS[it.productId].price,
        0,
      ),
    });
    setStep('payment');
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    setError(null);

    // Register only if user provided a real email and isn't logged in yet
    if (!user && email.trim()) {
      const guestPwd =
        Math.random().toString(36).slice(2, 10) +
        Math.random().toString(36).slice(2, 10);
      const guestName = email.split('@')[0];
      try {
        await register(email.trim(), guestPwd, guestName);
      } catch (e: unknown) {
        const msg = (e instanceof Error ? e.message : '').toLowerCase();
        if (msg.includes('already') || msg.includes('409')) {
          setError(
            'Ya existe una cuenta con ese correo. Por favor inicia sesión en el primer paso.',
          );
        } else {
          setError(
            e instanceof Error ? e.message : 'Error al procesar tu pedido',
          );
        }
        setLoading(false);
        return;
      }
    }

    // Ensure cart exists before creating order
    let finalCartId = cartId;
    if (!finalCartId) {
      try {
        const {
          utm_source,
          utm_medium,
          utm_campaign,
          utm_content,
          utm_term,
          fbclid,
        } = getStoredAttribution() ?? {};
        const fbp = getFbpCookie();
        const r = await api.saveCart({
          email: email.trim() || user?.email || undefined,
          items: items.map((it) => ({
            photo_id: it.photoId ?? undefined,
            engraving_text: it.engravingText || undefined,
            spotify_url: it.spotifyUrl || undefined,
            product_id: it.productId,
            quantity: it.quantity,
          })),
          utm_source: utm_source ?? undefined,
          utm_medium: utm_medium ?? undefined,
          utm_campaign: utm_campaign ?? undefined,
          utm_content: utm_content ?? undefined,
          utm_term: utm_term ?? undefined,
          fbclid: fbclid ?? undefined,
          fbp: fbp ?? undefined,
        });
        finalCartId = r.cart_id;
        setCartId(finalCartId);
      } catch {
        setError('Error al preparar el pedido. Inténtalo de nuevo.');
        setLoading(false);
        return;
      }
    }

    try {
      const result = await api.post<{
        order_id: string;
        mp_sandbox_init_point: string;
        mp_init_point: string;
      }>('/api/orders/', {
        cart_id: finalCartId,
        shipping,
        checkout_event_id: checkoutEventId,
      });
      const isDev = process.env.NODE_ENV === 'development';
      getEvent('AddPaymentInfo').track({
        value: items.reduce(
          (s, it) => s + it.quantity * PRODUCTS[it.productId].price,
          0,
        ),
        eventId: `api_${result.order_id}`,
      });
      if (cartId) api.convertCart(cartId).catch(() => {});
      window.location.href = isDev
        ? result.mp_sandbox_init_point
        : result.mp_init_point;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear el pedido');
      setLoading(false);
    }
  };;

  const steps: { id: Step; label: string }[] = [
    { id: 'photo' as Step, label: 'Foto' },
    { id: 'details', label: 'Datos de envío' },
    { id: 'payment', label: 'Pago' },
  ];

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center pt-14">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pt-14 md:pt-20 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-5 text-center">
          Finaliza tu pedido
        </h1>

        <StepIndicator steps={steps} currentStep={step} onStepClick={setStep} />

        <div className="bg-white/3 border border-white/10 rounded-2xl p-5 md:p-8">
          {step === 'photo' && (
            <PhotoStep
              items={items}
              onProductChange={(localId, productId) =>
                updateItem(localId, { productId })
              }
              onQuantityChange={(localId, quantity) =>
                updateItem(localId, { quantity })
              }
              onPhotoUploaded={handlePhotoUploaded}
              onPreviewChange={(localId, preview) =>
                updateItem(localId, { localPhotoPreview: preview })
              }
              onEngravingChange={(localId, text) =>
                updateItem(localId, { engravingText: text })
              }
              onSpotifyChange={(localId, url) =>
                updateItem(localId, { spotifyUrl: url })
              }
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
              isLoggedIn={!!user}
              accountMode={accountMode}
              setAccountMode={setAccountMode}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              error={error}
              loading={loading}
              onContinue={handlePhotoNext}
            />
          )}

          {step === 'details' && (
            <DetailsStep
              shipping={shipping}
              onShippingChange={setShipping}
              error={error}
              loading={loading}
              onSubmit={handleDetailsNext}
              onBack={() => setStep('photo')}
            />
          )}

          {step === 'payment' && (
            <PaymentStep
              items={items}
              shipping={shipping}
              user={user}
              error={error}
              loading={loading}
              onPlaceOrder={handlePlaceOrder}
              onBack={() => setStep('details')}
            />
          )}
        </div>
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutContent />
    </Suspense>
  );
}


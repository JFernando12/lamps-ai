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
  ProductConfig,
  getProduct,
} from './components/types';

import { StepIndicator } from './components/StepIndicator';
import { PhotoStep } from './components/PhotoStep';
import { DetailsStep } from './components/DetailsStep';
import { PaymentStep } from './components/PaymentStep';

function CheckoutContent() {
  const params = useSearchParams();
  const { user, login, register, loading: authLoading } = useAuth();
  const urlCartId = params.get('cart') ?? '';
  const product: ProductConfig = getProduct(params.get('product'));

  // Stable event_id for InitiateCheckout — generated once on mount so the
  // backend CAPI call and browser pixel event share the same ID (dedup).
  const [checkoutEventId] = useState<string>(() => genEventId('ic'));

  const [photoId, setPhotoId] = useState<string | null>(null);
  const [localPhotoPreview, setLocalPhotoPreview] = useState<string | null>(
    null,
  );
  const [step, setStep] = useState<Step>('photo');
  const [shipping, setShipping] = useState<ShippingForm>(EMPTY_SHIPPING);
  const [accountMode, setAccountMode] = useState<'login' | 'register'>(
    'register',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engravingText, setEngravingText] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');
  // Cart draft (server-side abandoned cart recovery)
  const [cartId, setCartId] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Server-side cart draft helpers
  // -------------------------------------------------------------------------
  const saveDraftToServer = useCallback(
    async (
      opts: {
        emailOverride?: string;
        photoIdOverride?: string;
      } = {},
    ) => {
      const emailToUse = opts.emailOverride ?? email;
      if (!emailToUse || !emailToUse.includes('@')) return;
      const pidToUse = opts.photoIdOverride ?? photoId;
      try {
        const { utm_source, utm_medium, utm_campaign, fbclid } =
          getStoredAttribution() ?? {};
        const fbp = getFbpCookie();
        const r = await api.saveCart({
          email: emailToUse,
          cart_id: cartId ?? undefined,
          photo_id: pidToUse ?? undefined,
          engraving_text: engravingText || undefined,
          spotify_url: spotifyUrl || undefined,
          product_id: product.id,
          utm_source: utm_source ?? undefined,
          utm_medium: utm_medium ?? undefined,
          utm_campaign: utm_campaign ?? undefined,
          fbclid: fbclid ?? undefined,
          fbp: fbp ?? undefined,
        });
        setCartId((prev) => prev ?? r.cart_id);
      } catch {
        /* non-critical */
      }
    },
    [cartId, email, photoId, engravingText, spotifyUrl, product.id],
  );

  // Restore cart from recovery email link (?cart=xxx)
  useEffect(() => {
    if (!urlCartId) return;
    api
      .getCart(urlCartId)
      .then((cart) => {
        setCartId(urlCartId);
        if (cart.email) setEmail(cart.email);
        if (cart.photo_id) setPhotoId(cart.photo_id);
        if (cart.engraving_text) setEngravingText(cart.engraving_text);
        if (cart.spotify_url) setSpotifyUrl(cart.spotify_url);
        if (cart.photo_id) setStep('details');
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync logged-in user email so the cart gets saved with their identity
  useEffect(() => {
    if (user?.email && !email) setEmail(user.email);
  }, [user?.email, email]);

  const handlePhotoUploaded = useCallback(
    (id: string) => {
      setPhotoId(id);
      saveDraftToServer({ photoIdOverride: id });
    },
    [saveDraftToServer],
  );

  useEffect(() => {
    getEvent('InitiateCheckout').track({
      value: product.price,
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
        return; // stay on photo step
      }
      setLoading(false);
    }
    // Save cart draft for abandoned-cart recovery (non-blocking)
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
    getEvent('AddShippingInfo').track({ value: product.price });
    setStep('payment');
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    setError(null);

    // Auto-register before placing order: use provided email or a random guest identity.
    if (!user) {
      const guestEmail =
        email.trim() ||
        `guest_${Math.random().toString(36).slice(2)}@lamps-ai.mx`;
      const guestPwd =
        Math.random().toString(36).slice(2, 10) +
        Math.random().toString(36).slice(2, 10);
      const guestName = email.trim() ? email.split('@')[0] : 'Invitado';
      try {
        await register(guestEmail, guestPwd, guestName);
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

    try {
      const attribution = getStoredAttribution();
      const fbp = getFbpCookie();

      const result = await api.post<{
        order_id: string;
        mp_sandbox_init_point: string;
        mp_init_point: string;
      }>('/api/orders/', {
        photo_id: photoId,
        ...(engravingText.trim()
          ? { engraving_text: engravingText.trim() }
          : {}),
        ...(spotifyUrl.trim() ? { spotify_url: spotifyUrl.trim() } : {}),
        product_name: product.name,
        unit_price: product.price,
        shipping,
        // Attribution data for internal reporting + CAPI deduplication
        checkout_event_id: checkoutEventId,
        ...(attribution?.utm_source
          ? { utm_source: attribution.utm_source }
          : {}),
        ...(attribution?.utm_medium
          ? { utm_medium: attribution.utm_medium }
          : {}),
        ...(attribution?.utm_campaign
          ? { utm_campaign: attribution.utm_campaign }
          : {}),
        ...(attribution?.utm_content
          ? { utm_content: attribution.utm_content }
          : {}),
        ...(attribution?.utm_term ? { utm_term: attribution.utm_term } : {}),
        ...(attribution?.fbclid ? { fbclid: attribution.fbclid } : {}),
        ...(fbp ? { fbp } : {}),
      });
      const isDev = process.env.NODE_ENV === 'development';
      getEvent('AddPaymentInfo').track({
        value: product.price,
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
  };

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

  const photoUrl = localPhotoPreview;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pt-14 md:pt-20 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-5 text-center">
          Finaliza tu pedido
        </h1>

        <StepIndicator steps={steps} currentStep={step} onStepClick={setStep} />

        {photoUrl && step === 'payment' && (
          <div className="flex items-center gap-4 bg-white/3 border border-white/10 rounded-2xl p-4 mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt="Tu foto"
              className="w-16 h-16 object-cover rounded-xl border border-amber-500/20 shrink-0"
            />
            <div>
              <p className="font-semibold text-sm">{product.name}</p>
              <p className="text-white/40 text-sm">
                ×1 — ${product.price} MXN · envío gratis
              </p>
            </div>
            <div className="ml-auto text-amber-400 font-bold text-lg">
              ${product.price}
            </div>
          </div>
        )}

        <div className="bg-white/3 border border-white/10 rounded-2xl p-5 md:p-8">
          {step === 'photo' && (
            <PhotoStep
              localPhotoPreview={localPhotoPreview}
              onLocalPreviewChange={setLocalPhotoPreview}
              onPhotoUploaded={handlePhotoUploaded}
              photoId={photoId}
              engravingText={engravingText}
              setEngravingText={setEngravingText}
              spotifyUrl={spotifyUrl}
              setSpotifyUrl={setSpotifyUrl}
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
              product={product}
              localPhotoPreview={localPhotoPreview}
              shipping={shipping}
              engravingText={engravingText}
              spotifyUrl={spotifyUrl}
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


"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { getStoredAttribution, getFbpCookie } from '@/lib/utm';
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

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function genEventId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2);
  return `${prefix}_${rand}`;
}

function CheckoutContent() {
  const params = useSearchParams();
  const { user, login, register, loading: authLoading } = useAuth();
  const urlPreviewId = params.get('preview_id') ?? '';
  const product: ProductConfig = getProduct(params.get('product'));

  // Stable event_id for InitiateCheckout — generated once on mount so the
  // backend CAPI call and browser pixel event share the same ID (dedup).
  const [checkoutEventId] = useState<string>(() => genEventId('ic'));

  const [photoId, setPhotoId] = useState<string | null>(null);
  const [localPhotoPreview, setLocalPhotoPreview] = useState<string | null>(
    null,
  );
  const [step, setStep] = useState<Step>(urlPreviewId ? 'details' : 'photo');
  const [shipping, setShipping] = useState<ShippingForm>(EMPTY_SHIPPING);
  const [accountMode, setAccountMode] = useState<'login' | 'register'>(
    'register',
  );
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewRenderUrl, setPreviewRenderUrl] = useState<string | null>(null);
  const [engravingText, setEngravingText] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');

  useEffect(() => {
    if (!urlPreviewId) return;
    api
      .getPreview(urlPreviewId)
      .then((r) => setPreviewRenderUrl(r.render_url ?? null))
      .catch(() => {});
  }, [urlPreviewId]);

  useEffect(() => {
    window.fbq?.(
      'track',
      'InitiateCheckout',
      { value: product.price, currency: 'MXN', num_items: 1 },
      { eventID: checkoutEventId },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!user) {
      setLoading(true);
      setError(null);
      try {
        if (accountMode === 'register') {
          await register(email, password, name);
          window.fbq?.(
            'track',
            'CompleteRegistration',
            {},
            { eventID: genEventId('reg') },
          );
        } else {
          await login(email, password);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error de autenticación');
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    window.fbq?.(
      'track',
      'AddShippingInfo',
      { value: product.price, currency: 'MXN' },
      { eventID: genEventId('si') },
    );
    setStep('payment');
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const attribution = getStoredAttribution();
      const fbp = getFbpCookie();

      const result = await api.post<{
        order_id: string;
        mp_sandbox_init_point: string;
        mp_init_point: string;
      }>('/api/orders/', {
        ...(urlPreviewId
          ? { preview_id: urlPreviewId }
          : { photo_id: photoId }),
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
      window.fbq?.(
        'track',
        'AddPaymentInfo',
        { value: product.price, currency: 'MXN' },
        { eventID: `api_${result.order_id}` },
      );
      window.location.href = isDev
        ? result.mp_sandbox_init_point
        : result.mp_init_point;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear el pedido');
      setLoading(false);
    }
  };

  const steps: { id: Step; label: string }[] = [
    ...(!urlPreviewId ? [{ id: 'photo' as Step, label: 'Foto' }] : []),
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

  const photoUrl = previewRenderUrl ?? localPhotoPreview;

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
              onPhotoUploaded={setPhotoId}
              photoId={photoId}
              engravingText={engravingText}
              setEngravingText={setEngravingText}
              spotifyUrl={spotifyUrl}
              setSpotifyUrl={setSpotifyUrl}
              onContinue={() => setStep('details')}
            />
          )}

          {step === 'details' && (
            <DetailsStep
              shipping={shipping}
              onShippingChange={setShipping}
              user={user}
              accountMode={accountMode}
              setAccountMode={setAccountMode}
              email={email}
              setEmail={setEmail}
              name={name}
              setName={setName}
              password={password}
              setPassword={setPassword}
              error={error}
              loading={loading}
              urlPreviewId={urlPreviewId}
              onSubmit={handleDetailsNext}
              onBack={() => setStep('photo')}
            />
          )}

          {step === 'payment' && (
            <PaymentStep
              product={product}
              previewRenderUrl={previewRenderUrl}
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


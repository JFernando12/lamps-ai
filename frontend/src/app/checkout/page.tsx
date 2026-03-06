"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import {
  Lock,
  Package,
  MapPin,
  CreditCard,
  ChevronRight,
  Upload,
  Type,
  Music,
} from 'lucide-react';
import clsx from 'clsx';

type Step = 'photo' | 'details' | 'payment';

interface ShippingForm {
  full_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  phone: string;
}

const EMPTY_SHIPPING: ShippingForm = {
  full_name: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  country: 'México',
  phone: '',
};

function CheckoutContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, login, register, loading: authLoading } = useAuth();
  const urlPreviewId = params.get('preview_id') ?? '';

  // currentPreviewId: from URL params (stage 2 — AI preview flow)
  // photoId: set after customer uploads their photo (stage 1 — direct upload flow)
  const [photoId, setPhotoId] = useState<string | null>(null);
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

  // Photo upload state (stage 1 flow)
  const [localPhotoPreview, setLocalPhotoPreview] = useState<string | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Customization options
  const [engravingText, setEngravingText] = useState('');
  const [spotifyUrl, setSpotifyUrl] = useState('');

  // Fetch render thumbnail when coming with a URL preview_id (stage 2 flow)
  useEffect(() => {
    if (!urlPreviewId) return;
    api
      .getPreview(urlPreviewId)
      .then((r) => setPreviewRenderUrl(r.render_url ?? null))
      .catch(() => {});
  }, [urlPreviewId]);

  // If user logs in while on details step, no redirect needed — form just hides account section

  // Meta Pixel: user reached checkout
  useEffect(() => {
    (window as { fbq?: (...args: unknown[]) => void }).fbq?.(
      'track',
      'InitiateCheckout',
      { value: 799, currency: 'MXN', num_items: 1 },
    );
  }, []);

  const handlePhotoFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor sube una imagen (JPG, PNG, WEBP).');
      return;
    }
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = (e) => setLocalPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setUploading(true);
    try {
      const result = await api.uploadPhoto(file);
      setPhotoId(result.photo_id);
      (window as { fbq?: (...args: unknown[]) => void }).fbq?.(
        'trackCustom',
        'PhotoUploaded',
      );
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : 'Error subiendo la foto');
    } finally {
      setUploading(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handlePhotoFile(file);
    },
    [handlePhotoFile],
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handlePhotoFile(file);
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
    if (!user) {
      setLoading(true);
      setError(null);
      try {
        if (accountMode === 'register') {
          await register(email, password, name);
          (window as { fbq?: (...args: unknown[]) => void }).fbq?.(
            'track',
            'CompleteRegistration',
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
    (window as { fbq?: (...args: unknown[]) => void }).fbq?.(
      'track',
      'AddShippingInfo',
      { value: 799, currency: 'MXN' },
    );
    setStep('payment');
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    setError(null);
    try {
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
        shipping,
      });
      const isDev = process.env.NODE_ENV === 'development';
      (window as { fbq?: (...args: unknown[]) => void }).fbq?.(
        'track',
        'AddPaymentInfo',
        { value: 799, currency: 'MXN' },
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

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pt-14 md:pt-20 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <h1 className="text-2xl md:text-3xl font-bold mb-5 text-center">
          Finaliza tu pedido
        </h1>

        {/* Step indicator */}
        <div className="flex items-center justify-center mb-8 gap-1.5">
          {steps.map((s, i) => {
            const currentIdx = steps.findIndex((x) => x.id === step);
            const isCompleted = currentIdx > i;
            const isCurrent = step === s.id;
            const canGoBack = isCompleted;
            return (
              <div key={s.id} className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={!canGoBack}
                  onClick={() => canGoBack && setStep(s.id)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                    isCurrent
                      ? 'bg-amber-500 text-black'
                      : isCompleted
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 cursor-pointer'
                        : 'bg-white/5 text-white/40 cursor-default',
                  )}
                >
                  {s.label}
                </button>
                {i < steps.length - 1 && (
                  <ChevronRight size={14} className="text-white/20 shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Compact order summary — shows photo thumbnail once available */}
        {(previewRenderUrl || localPhotoPreview) && step === 'payment' && (
          <div className="flex items-center gap-4 bg-white/[0.03] border border-white/10 rounded-2xl p-4 mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewRenderUrl ?? localPhotoPreview!}
              alt="Tu foto"
              className="w-16 h-16 object-cover rounded-xl border border-amber-500/20 shrink-0"
            />
            <div>
              <p className="font-semibold text-sm">Lámpara personalizada LED</p>
              <p className="text-white/40 text-sm">
                ×1 — $799 MXN · envío gratis
              </p>
            </div>
            <div className="ml-auto text-amber-400 font-bold text-lg">$799</div>
          </div>
        )}

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 md:p-8">
          {/* ─ STEP 0: PHOTO ─ */}
          {step === 'photo' && (
            <div className="space-y-4">
              <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">
                <Upload size={18} className="text-amber-400" />
                Sube tu foto
              </h2>
              <p className="text-white/50 text-sm mb-4">
                Usa una foto nítida con el sujeto bien visible. Cuanto mejor la
                foto, mejor el grabado.
              </p>

              {/* Hidden inputs */}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileChange}
              />
              <input
                id="checkout-camera-input"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onFileChange}
              />

              {/* Drop / tap zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={clsx(
                  'relative border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all flex flex-col items-center justify-center min-h-48 text-center touch-manipulation',
                  dragging
                    ? 'border-amber-400 bg-amber-400/5'
                    : 'border-white/20 hover:border-amber-400/50 active:border-amber-400/50',
                )}
              >
                {localPhotoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={localPhotoPreview}
                    alt="Tu foto"
                    className="max-h-48 object-contain rounded-xl"
                  />
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
                      <Upload size={26} className="text-amber-400" />
                    </div>
                    <p className="font-semibold mb-1">
                      <span className="hidden md:inline">
                        Arrastra tu foto aquí
                      </span>
                      <span className="md:hidden">
                        Toca para elegir tu foto
                      </span>
                    </p>
                    <p className="text-white/40 text-sm hidden md:block">
                      o haz clic para buscarla
                    </p>
                    <p className="text-white/25 text-xs mt-2">
                      JPG, PNG, WEBP · Máx 10 MB
                    </p>
                  </>
                )}

                {uploading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-2xl gap-3">
                    <div className="w-7 h-7 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-amber-400 text-sm font-medium">
                      Subiendo tu foto…
                    </p>
                  </div>
                )}
              </div>

              {/* Mobile camera button */}
              {!localPhotoPreview && !uploading && (
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById('checkout-camera-input')?.click()
                  }
                  className="md:hidden w-full flex items-center justify-center gap-2 border border-white/10 hover:border-amber-400/30 text-white/60 py-3 rounded-xl text-sm transition-colors touch-manipulation"
                >
                  📷 Abrir cámara
                </button>
              )}

              {uploadError && (
                <p className="text-red-400 text-sm text-center">
                  {uploadError}
                </p>
              )}

              <p className="text-center text-white/30 text-xs">
                Tu foto se procesa de forma segura y no se comparte con nadie
              </p>

              {/* Optional customizations */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-white/30 text-xs">
                    personalizaciones opcionales
                  </span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Engraving text */}
                <div>
                  <label className="flex items-center gap-2 text-white/60 text-sm mb-1.5">
                    <Type size={14} className="text-amber-400" />
                    Texto grabado
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    placeholder="Ej: Para siempre juntos · 14/02/2025"
                    value={engravingText}
                    onChange={(e) => setEngravingText(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/60 transition-colors text-sm"
                  />
                  <p className="text-white/25 text-xs mt-1.5">
                    Se graba entre la imagen y la base. Máx 40 caracteres.
                    Opcional.
                  </p>
                </div>

                {/* Spotify code */}
                <div>
                  <label className="flex items-center gap-2 text-white/60 text-sm mb-1.5">
                    <Music size={14} className="text-amber-400" />
                    Código Spotify
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Perfect – Ed Sheeran"
                    value={spotifyUrl}
                    onChange={(e) => setSpotifyUrl(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/60 transition-colors text-sm"
                  />
                  <p className="text-white/25 text-xs mt-1.5">
                    Pon el nombre de la canción o pega el link de Spotify.
                    Grabaremos el código en el acrílico para que cualquiera lo
                    escanee. Opcional.
                  </p>
                </div>
              </div>

              {/* Continuar button — only active once photo is uploaded */}
              <button
                type="button"
                disabled={!photoId || uploading}
                onClick={() => setStep('details')}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed mt-2"
              >
                Continuar
              </button>
            </div>
          )}

          {/* ─ STEP 1: DETAILS (shipping + account) ─ */}
          {step === 'details' && (
            <form onSubmit={handleDetailsNext} className="space-y-4">
              <h2 className="font-semibold text-lg mb-1 flex items-center gap-2">
                <MapPin size={18} className="text-amber-400" />
                Datos de envío
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                <Field
                  label="Nombre completo"
                  value={shipping.full_name}
                  onChange={(v) => setShipping({ ...shipping, full_name: v })}
                />
                <Field
                  label="Teléfono"
                  type="tel"
                  value={shipping.phone}
                  onChange={(v) => setShipping({ ...shipping, phone: v })}
                />
              </div>
              <Field
                label="Dirección / calle y número"
                value={shipping.address}
                onChange={(v) => setShipping({ ...shipping, address: v })}
              />
              <div className="grid md:grid-cols-3 gap-4">
                <Field
                  label="Ciudad"
                  value={shipping.city}
                  onChange={(v) => setShipping({ ...shipping, city: v })}
                />
                <Field
                  label="Estado"
                  value={shipping.state}
                  onChange={(v) => setShipping({ ...shipping, state: v })}
                />
                <Field
                  label="Código postal"
                  value={shipping.zip_code}
                  onChange={(v) => setShipping({ ...shipping, zip_code: v })}
                />
              </div>
              <Field
                label="País"
                value={shipping.country}
                onChange={(v) => setShipping({ ...shipping, country: v })}
              />

              {/* Account section — only shown when not logged in */}
              {!user && (
                <>
                  <div className="flex items-center gap-3 pt-2">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-white/30 text-xs">tu cuenta</span>
                    <div className="flex-1 h-px bg-white/10" />
                  </div>

                  <div className="flex items-center gap-2.5 text-xs text-white/40">
                    <Package size={13} className="text-amber-400 shrink-0" />
                    <p>Aqui podras consultar el estado de tu pedido</p>
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

                  {accountMode === 'register' && (
                    <Field label="Nombre" value={name} onChange={setName} />
                  )}
                  <Field
                    label="Correo electrónico"
                    type="email"
                    value={email}
                    onChange={setEmail}
                  />
                  <Field
                    label="Contraseña"
                    type="password"
                    value={password}
                    onChange={setPassword}
                  />
                </>
              )}

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50 mt-2"
              >
                {loading ? 'Cargando…' : 'Continuar'}
              </button>

              {!urlPreviewId && (
                <button
                  type="button"
                  onClick={() => setStep('photo')}
                  className="w-full text-white/40 hover:text-white text-sm py-2 transition-colors"
                >
                  ← Cambiar foto
                </button>
              )}
            </form>
          )}

          {/* ─ STEP 3: PAYMENT ─ */}
          {step === 'payment' && (
            <div className="space-y-6">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <CreditCard size={18} className="text-amber-400" />
                Resumen y pago
              </h2>

              {/* Order summary */}
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
                      <p className="font-medium text-sm">
                        Lámpara personalizada LED
                      </p>
                      <p className="text-white/40 text-xs mt-0.5">
                        Diseño con tu foto · grabado láser
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Package size={18} className="text-amber-400" />
                  <span className="font-medium">
                    Lámpara acrílica LED personalizada
                  </span>
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

              {/* Trust badges */}
              <div className="flex items-center gap-2 text-white/40 text-xs">
                <Lock size={13} />
                Pago seguro con MercadoPago · SSL encriptado
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                onClick={handlePlaceOrder}
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
                onClick={() => setStep('details')}
                className="w-full text-white/40 hover:text-white text-sm py-2 transition-colors"
              >
                ← Volver
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-white/60 text-sm mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/60 transition-colors"
      />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutContent />
    </Suspense>
  );
}

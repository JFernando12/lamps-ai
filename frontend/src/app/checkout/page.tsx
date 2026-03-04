"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Lock, Package, Users, MapPin, CreditCard, ChevronRight } from "lucide-react";
import clsx from "clsx";

type Step = "shipping" | "account" | "payment";

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
  full_name: "",
  address: "",
  city: "",
  state: "",
  zip_code: "",
  country: "México",
  phone: "",
};

function CheckoutContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, login, register } = useAuth();
  const previewId = params.get('preview_id') ?? '';

  const [step, setStep] = useState<Step>('shipping');
  const [shipping, setShipping] = useState<ShippingForm>(EMPTY_SHIPPING);
  const [accountMode, setAccountMode] = useState<'login' | 'register'>(
    'register',
  );
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If user already logged in, skip account step
  useEffect(() => {
    if (user && step === 'account') setStep('payment');
  }, [user, step]);

  // Meta Pixel: user reached checkout
  useEffect(() => {
    (window as { fbq?: (...args: unknown[]) => void }).fbq?.(
      'track',
      'InitiateCheckout',
      {
        value: 799,
        currency: 'MXN',
        num_items: 1,
      },
    );
  }, []);

  const handleShippingNext = (e: React.FormEvent) => {
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
    setStep(user ? 'payment' : 'account');
    (window as { fbq?: (...args: unknown[]) => void }).fbq?.(
      'track',
      'AddShippingInfo',
      {
        value: 799,
        currency: 'MXN',
      },
    );
  };

  const handleAccountNext = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setStep('payment');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error de autenticación');
    } finally {
      setLoading(false);
    }
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
        preview_id: previewId,
        shipping,
      });
      // Redirect to MercadoPago (use sandbox in dev)
      const isDev = process.env.NODE_ENV === 'development';
      (window as { fbq?: (...args: unknown[]) => void }).fbq?.(
        'track',
        'AddPaymentInfo',
        {
          value: 799,
          currency: 'MXN',
        },
      );
      window.location.href = isDev
        ? result.mp_sandbox_init_point
        : result.mp_init_point;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear el pedido');
      setLoading(false);
    }
  };

  const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
    { id: 'shipping', label: 'Envío', icon: <MapPin size={16} /> },
    { id: 'account', label: 'Cuenta', icon: <Users size={16} /> },
    { id: 'payment', label: 'Pago', icon: <CreditCard size={16} /> },
  ];

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pt-16 md:pt-20 pb-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          Finaliza tu pedido
        </h1>

        {/* Step indicator */}
        <div className="flex items-center justify-center mb-10 gap-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                  step === s.id
                    ? 'bg-amber-500 text-black'
                    : steps.findIndex((x) => x.id === step) > i
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-white/5 text-white/40',
                )}
              >
                {s.icon}
                {s.label}
              </div>
              {i < steps.length - 1 && (
                <ChevronRight size={14} className="text-white/20" />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 md:p-8">
          {/* ─ STEP 1: SHIPPING ─ */}
          {step === 'shipping' && (
            <form onSubmit={handleShippingNext} className="space-y-4">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
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

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl transition-colors mt-2"
              >
                Continuar
              </button>
            </form>
          )}

          {/* ─ STEP 2: ACCOUNT ─ */}
          {step === 'account' && !user && (
            <form onSubmit={handleAccountNext} className="space-y-4">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Users size={18} className="text-amber-400" />
                {accountMode === 'register'
                  ? 'Crea tu cuenta'
                  : 'Inicia sesión'}
              </h2>

              <div className="flex gap-2 p-1 bg-white/5 rounded-xl mb-4">
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

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {loading ? 'Cargando…' : 'Continuar'}
              </button>

              <button
                type="button"
                onClick={() => setStep('shipping')}
                className="w-full text-white/40 hover:text-white text-sm py-2 transition-colors"
              >
                ← Volver
              </button>
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
                onClick={() => setStep(user ? 'shipping' : 'account')}
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

import { MapPin, Package } from 'lucide-react';
import clsx from 'clsx';
import { ShippingForm, User } from './types';
import { Field } from './Field';

interface Props {
  shipping: ShippingForm;
  onShippingChange: (s: ShippingForm) => void;
  user: User | null;
  accountMode: 'login' | 'register';
  setAccountMode: (m: 'login' | 'register') => void;
  email: string;
  setEmail: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  error: string | null;
  loading: boolean;
  urlPreviewId: string;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}

export function DetailsStep({
  shipping,
  onShippingChange,
  user,
  accountMode,
  setAccountMode,
  email,
  setEmail,
  name,
  setName,
  password,
  setPassword,
  error,
  loading,
  urlPreviewId,
  onSubmit,
  onBack,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="font-semibold text-lg mb-1 flex items-center gap-2">
        <MapPin size={18} className="text-amber-400" />
        Datos de envío
      </h2>

      <div className="grid md:grid-cols-2 gap-4">
        <Field
          label="Nombre completo"
          value={shipping.full_name}
          onChange={(v) => onShippingChange({ ...shipping, full_name: v })}
        />
        <Field
          label="Teléfono"
          type="tel"
          value={shipping.phone}
          onChange={(v) => onShippingChange({ ...shipping, phone: v })}
        />
      </div>
      <Field
        label="Dirección / calle y número"
        value={shipping.address}
        onChange={(v) => onShippingChange({ ...shipping, address: v })}
      />
      <div className="grid md:grid-cols-3 gap-4">
        <Field
          label="Ciudad"
          value={shipping.city}
          onChange={(v) => onShippingChange({ ...shipping, city: v })}
        />
        <Field
          label="Estado"
          value={shipping.state}
          onChange={(v) => onShippingChange({ ...shipping, state: v })}
        />
        <Field
          label="Código postal"
          value={shipping.zip_code}
          onChange={(v) => onShippingChange({ ...shipping, zip_code: v })}
        />
      </div>
      <Field
        label="País"
        value={shipping.country}
        onChange={(v) => onShippingChange({ ...shipping, country: v })}
      />

      {!user && (
        <>
          <div className="flex items-center gap-3 pt-2">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs">tu cuenta</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <div className="flex items-center gap-2.5 text-xs text-white/40">
            <Package size={13} className="text-amber-400 shrink-0" />
            <p>Para consultar el estado de tu pedido en cualquier momento.</p>
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
          onClick={onBack}
          className="w-full text-white/40 hover:text-white text-sm py-2 transition-colors"
        >
          ← Cambiar foto
        </button>
      )}
    </form>
  );
}

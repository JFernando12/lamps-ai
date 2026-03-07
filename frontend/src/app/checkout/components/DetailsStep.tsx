import { MapPin } from 'lucide-react';
import { ShippingForm } from './types';
import { Field } from './Field';

interface Props {
  shipping: ShippingForm;
  onShippingChange: (s: ShippingForm) => void;
  error: string | null;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}

export function DetailsStep({
  shipping,
  onShippingChange,
  error,
  loading,
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

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50 mt-2"
      >
        {loading ? 'Cargando…' : 'Continuar'}
      </button>

      <button
        type="button"
        onClick={onBack}
        className="w-full text-white/40 hover:text-white text-sm py-2 transition-colors"
      >
        ← Cambiar foto
      </button>
    </form>
  );
}

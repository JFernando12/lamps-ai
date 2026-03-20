import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { ShippingForm } from './types';
import { Field } from './Field';
import { SelectField } from './SelectField';

const MEXICO_STATES = [
  'Aguascalientes',
  'Baja California',
  'Baja California Sur',
  'Campeche',
  'Chiapas',
  'Chihuahua',
  'Ciudad de México',
  'Coahuila de Zaragoza',
  'Colima',
  'Durango',
  'Estado de México',
  'Guanajuato',
  'Guerrero',
  'Hidalgo',
  'Jalisco',
  'Michoacán de Ocampo',
  'Morelos',
  'Nayarit',
  'Nuevo León',
  'Oaxaca',
  'Puebla',
  'Querétaro',
  'Quintana Roo',
  'San Luis Potosí',
  'Sinaloa',
  'Sonora',
  'Tabasco',
  'Tamaulipas',
  'Tlaxcala',
  'Veracruz de Ignacio de la Llave',
  'Yucatán',
  'Zacatecas',
];

interface FieldErrors {
  zip_code?: string;
  phone?: string;
  state?: string;
}

function validateFields(s: ShippingForm): FieldErrors {
  const errs: FieldErrors = {};
  if (!/^\d{5}$/.test(s.zip_code)) {
    errs.zip_code = 'El código postal debe tener exactamente 5 dígitos';
  }
  const rawPhone = s.phone.replace(/[\s\-().+]/g, '');
  if (!/^\d{10}$/.test(rawPhone)) {
    errs.phone = 'El teléfono debe tener 10 dígitos (sin código de país)';
  }
  if (!s.state) {
    errs.state = 'Selecciona un estado';
  }
  return errs;
}

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function handleSubmit(e: React.FormEvent) {
    const errs = validateFields(shipping);
    if (Object.keys(errs).length > 0) {
      e.preventDefault();
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    onSubmit(e);
  }

  function set<K extends keyof ShippingForm>(key: K, v: ShippingForm[K]) {
    onShippingChange({ ...shipping, [key]: v });
    if (key in fieldErrors) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key as keyof FieldErrors];
        return next;
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} autoComplete="on" className="space-y-4">
      <h2 className="font-semibold text-lg mb-1 flex items-center gap-2">
        <MapPin size={18} className="text-amber-400" />
        Datos de envío
      </h2>

      <div className="grid md:grid-cols-2 gap-4">
        <Field
          label="Nombre completo"
          autoComplete="name"
          value={shipping.full_name}
          onChange={(v) => set('full_name', v)}
        />
        <Field
          label="Teléfono (10 dígitos)"
          type="tel"
          autoComplete="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="Ej. 5512345678"
          value={shipping.phone}
          onChange={(v) => set('phone', v.replace(/\D/g, ''))}
          error={fieldErrors.phone}
        />
      </div>

      <Field
        label="Calle y número exterior / interior"
        autoComplete="street-address"
        placeholder="Ej. Av. Insurgentes Sur 1234, Int. 5"
        value={shipping.address}
        onChange={(v) => set('address', v)}
      />

      <Field
        label="Colonia o fraccionamiento"
        autoComplete="address-line2"
        placeholder="Ej. Del Valle, Narvarte, Polanco…"
        value={shipping.colonia}
        onChange={(v) => set('colonia', v)}
      />

      <div className="grid md:grid-cols-2 gap-4">
        <Field
          label="Ciudad o municipio"
          autoComplete="address-level2"
          value={shipping.city}
          onChange={(v) => set('city', v)}
        />
        <Field
          label="Código postal"
          autoComplete="postal-code"
          inputMode="numeric"
          maxLength={5}
          placeholder="5 dígitos"
          value={shipping.zip_code}
          onChange={(v) => set('zip_code', v.replace(/\D/g, '').slice(0, 5))}
          error={fieldErrors.zip_code}
        />
      </div>

      <SelectField
        label="Estado"
        autoComplete="address-level1"
        value={shipping.state}
        onChange={(v) => set('state', v)}
        options={MEXICO_STATES}
        placeholder="Selecciona tu estado"
        error={fieldErrors.state}
      />

      <Field
        label="País"
        autoComplete="country-name"
        value={shipping.country}
        onChange={() => {}}
        readOnly
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

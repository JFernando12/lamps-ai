'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Save, CheckCircle2 } from 'lucide-react';
import { WhatsAppIcon } from '@/components/WhatsAppIcon';

interface SiteConfig {
  whatsapp_number: string;
  whatsapp_message: string;
}

export default function ConfiguracionPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [config, setConfig] = useState<SiteConfig>({
    whatsapp_number: '',
    whatsapp_message: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.is_admin) {
      router.push('/admin/login');
      return;
    }
    api
      .get<SiteConfig>('/api/admin/config')
      .then((data) => setConfig(data))
      .catch(() => setError('No se pudo cargar la configuración.'))
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await api.patch<SiteConfig>('/api/admin/config', config);
      setConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Error al guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const waPreview = config.whatsapp_number
    ? `https://wa.me/${config.whatsapp_number}${config.whatsapp_message ? `?text=${encodeURIComponent(config.whatsapp_message)}` : ''}`
    : '';

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#0a0a0a] text-white px-4 py-8">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-bold">Configuración</h1>
          <p className="text-white/40 text-sm mt-1">
            Ajustes generales del sitio.
          </p>
        </div>

        {/* WhatsApp card */}
        <div className="bg-[#111] border border-white/8 rounded-2xl p-5 space-y-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#25D366]/15 rounded-lg flex items-center justify-center">
              <WhatsAppIcon size={16} className="text-[#25D366]" />
            </div>
            <div>
              <p className="font-semibold text-sm">WhatsApp</p>
              <p className="text-white/35 text-xs">Botón flotante y enlaces de contacto</p>
            </div>
          </div>

          {/* Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/60 uppercase tracking-widest">
              Número
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm select-none">
                +
              </span>
              <input
                type="tel"
                value={config.whatsapp_number}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    whatsapp_number: e.target.value.replace(/\D/g, ''),
                  }))
                }
                placeholder="527551008874"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-6 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/60 transition-colors"
              />
            </div>
            <p className="text-white/30 text-xs">
              Código de país + número sin espacios ni guiones (ej: 527551008874)
            </p>
          </div>

          {/* Default message */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/60 uppercase tracking-widest">
              Mensaje por defecto (chat flotante)
            </label>
            <textarea
              value={config.whatsapp_message}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  whatsapp_message: e.target.value,
                }))
              }
              rows={3}
              placeholder="Hola, me das información de las lámparas personalizadas"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-400/60 transition-colors resize-none"
            />
            <p className="text-white/30 text-xs">
              Se pre-llena cuando el usuario abre el chat desde el botón flotante. Déjalo vacío para no enviar mensaje.
            </p>
          </div>

          {/* Preview */}
          {waPreview && (
            <div className="bg-white/3 border border-white/8 rounded-xl p-3">
              <p className="text-white/30 text-xs mb-1 uppercase tracking-widest">Vista previa del enlace</p>
              <p className="text-white/50 text-xs break-all font-mono">{waPreview}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !config.whatsapp_number}
            className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>

          {saved && (
            <div className="flex items-center gap-1.5 text-green-400 text-sm">
              <CheckCircle2 size={16} />
              Guardado
            </div>
          )}
        </div>

        {error && (
          <p className="mt-3 text-red-400 text-sm">{error}</p>
        )}
      </div>
    </div>
  );
}

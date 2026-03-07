'use client';

import { useState } from 'react';
import { CheckCircle2, AlertCircle, Link2, Copy, ExternalLink } from 'lucide-react';
import type { AdsConfig } from './types';
import { UtmBuilder } from './UtmBuilder';

interface Props {
  config: AdsConfig;
}

export function ConfigPanel({ config }: Props) {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '');
  const catalogUrl = `${apiUrl}/api/catalog/feed`;
  const [copiedCatalog, setCopiedCatalog] = useState(false);

  const copyCatalog = async () => {
    try {
      await navigator.clipboard.writeText(catalogUrl);
      setCopiedCatalog(true);
      setTimeout(() => setCopiedCatalog(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="space-y-5">
      {/* Status cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pixel */}
        <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-white/80">Meta Pixel ID</h3>
            {config.pixel_id ? (
              <CheckCircle2 size={15} className="text-green-400" />
            ) : (
              <AlertCircle size={15} className="text-red-400" />
            )}
          </div>
          {config.pixel_id ? (
            <>
              <p className="font-mono text-amber-400 font-bold text-lg mb-1">
                {config.pixel_id}
              </p>
              <p className="text-green-400 text-xs">Configurado</p>
            </>
          ) : (
            <p className="text-red-400 text-xs">
              No configurado — agrega{' '}
              <code className="bg-white/5 px-1 rounded">META_PIXEL_ID</code> al backend
            </p>
          )}
        </div>

        {/* CAPI */}
        <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-white/80">Conversions API (CAPI)</h3>
            {config.capi_configured ? (
              <CheckCircle2 size={15} className="text-green-400" />
            ) : (
              <AlertCircle size={15} className="text-red-400" />
            )}
          </div>
          {config.capi_configured ? (
            <>
              <p className="text-green-400 text-sm font-semibold mb-1">Activa</p>
              <p className="text-white/40 text-xs">
                Graph API {config.api_version} · Token configurado en backend
              </p>
            </>
          ) : (
            <p className="text-red-400 text-xs">
              Inactiva — agrega{' '}
              <code className="bg-white/5 px-1 rounded">META_ACCESS_TOKEN</code> al backend
            </p>
          )}
        </div>
      </div>

      {/* CAPI setup instructions (shown when not configured) */}
      {!config.capi_configured && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
          <h3 className="font-semibold text-sm text-amber-400 mb-3">
            Cómo activar la Conversions API
          </h3>
          <ol className="space-y-2 text-white/60 text-sm list-decimal list-inside">
            <li>
              Ve a <span className="text-white/80">Meta Business Manager</span> → Configuración
              de la empresa → Usuarios del sistema
            </li>
            <li>
              Crea un <span className="text-white/80">Usuario del sistema</span> con rol Admin
            </li>
            <li>
              Genera un token con permisos:{' '}
              <code className="text-amber-300 bg-white/5 px-1 rounded">ads_management</code> y{' '}
              <code className="text-amber-300 bg-white/5 px-1 rounded">business_management</code>
            </li>
            <li>
              Agrega en tu backend:{' '}
              <code className="text-amber-300 bg-white/5 px-1 rounded">META_ACCESS_TOKEN=…</code>
            </li>
          </ol>
        </div>
      )}

      {/* Domain verification */}
      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <h3 className="font-semibold text-sm text-white/80 mb-2">
          Verificación de dominio Facebook
        </h3>
        <p className="text-white/40 text-xs mb-3">
          Requerida para activar Pixel Events Manager y Dynamic Ads en thedreamgiftmx.com
        </p>
        <ol className="space-y-1.5 text-white/50 text-xs list-decimal list-inside">
          <li>
            Ve a Meta Business Manager → Brand Safety →{' '}
            <span className="text-white/70">Dominios</span>
          </li>
          <li>
            Agrega <code className="text-amber-300 bg-white/5 px-1 rounded">thedreamgiftmx.com</code>
          </li>
          <li>
            Selecciona el método <span className="text-white/70">Meta tag</span> y copia el código
          </li>
          <li>
            En el frontend agrega:{' '}
            <code className="text-amber-300 bg-white/5 px-1 rounded">
              NEXT_PUBLIC_FACEBOOK_DOMAIN_VERIFICATION=código
            </code>
          </li>
        </ol>
      </div>

      {/* Catalog feed */}
      <div className="bg-white/3 border border-white/10 rounded-2xl p-5">
        <h3 className="font-semibold text-sm text-white/80 mb-1 flex items-center gap-2">
          <Link2 size={14} className="text-blue-400" />
          Feed de catálogo — Dynamic Ads
        </h3>
        <p className="text-white/40 text-xs mb-3">
          Usa esta URL en Meta Commerce Manager para activar Dynamic Ads con retargeting de
          producto
        </p>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
          <code className="text-amber-300 text-xs flex-1 break-all">{catalogUrl}</code>
          <button
            onClick={copyCatalog}
            className="shrink-0 text-white/40 hover:text-white transition-colors"
            title="Copiar URL"
          >
            {copiedCatalog ? (
              <CheckCircle2 size={14} className="text-green-400" />
            ) : (
              <Copy size={14} />
            )}
          </button>
          <a
            href={catalogUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-white/40 hover:text-white transition-colors"
            title="Abrir feed"
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* UTM builder */}
      <UtmBuilder />
    </div>
  );
}

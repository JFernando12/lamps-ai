'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import type { Campaign } from './types';

const STATUS_META = {
  sent: { label: 'Enviado', icon: <CheckCircle2 size={13} />, cls: 'text-green-400' },
  partial: { label: 'Parcial', icon: <AlertTriangle size={13} />, cls: 'text-yellow-400' },
  failed: { label: 'Error', icon: <AlertCircle size={13} />, cls: 'text-red-400' },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CampaignsHistory() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    api
      .get<Campaign[]>('/api/admin/email/campaigns')
      .then(setCampaigns)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Historial de campañas</h2>
          <p className="text-sm text-white/40 mt-1">
            Registro de todos los envíos realizados
          </p>
        </div>
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={loading}
          className="p-2 rounded-xl border border-white/8 text-white/40 hover:text-white hover:border-white/20 transition-colors disabled:opacity-40"
          title="Actualizar"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 text-white/30 text-sm">
          Aún no has enviado ninguna campaña
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const meta = STATUS_META[c.status] ?? STATUS_META.sent;
            return (
              <div
                key={c.campaign_id}
                className="rounded-xl border border-white/8 bg-white/3 px-5 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-white truncate">{c.subject}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {c.segment} · {c.product_filter}{' '}
                      <span className="mx-1 text-white/20">·</span>
                      {fmtDate(c.created_at)}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1.5 text-xs shrink-0 ${meta.cls}`}>
                    {meta.icon}
                    {meta.label}
                  </div>
                </div>
                <div className="mt-3 flex gap-6 text-xs text-white/50">
                  <span>
                    <span className="text-white font-medium">{c.total_recipients}</span>{' '}
                    destinatarios
                  </span>
                  <span>
                    <span className="text-green-400 font-medium">{c.sent}</span> enviados
                  </span>
                  {c.failed > 0 && (
                    <span>
                      <span className="text-red-400 font-medium">{c.failed}</span> fallidos
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

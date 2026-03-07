'use client';

import { useEffect, useState } from 'react';
import { Users, ShoppingBag, ShoppingCart, Send, Mail, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api';
import type { AudiencePreview, Campaign } from './types';

interface Props {
  onNavigate: (section: 'overview' | 'campaign' | 'transactionals' | 'history') => void;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function OverviewSection({ onNavigate }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<AudiencePreview>('/api/admin/email/audience?segment=all'),
      api.get<AudiencePreview>('/api/admin/email/audience?segment=customers'),
      api.get<AudiencePreview>('/api/admin/email/audience?segment=abandoned_carts'),
      api.get<Campaign[]>('/api/admin/email/campaigns'),
    ])
      .then(([all, customers, abandoned, camps]) => {
        setCounts({ all: all.count, customers: customers.count, abandoned: abandoned.count });
        setCampaigns(camps);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const thisMonthCampaigns = campaigns.filter((c) => {
    const d = new Date(c.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const totalSentThisMonth = thisMonthCampaigns.reduce((s, c) => s + c.sent, 0);

  const stats = [
    {
      label: 'Audiencia total',
      value: counts.all,
      icon: <Users size={18} />,
      color: 'text-amber-400',
      bg: 'bg-amber-400/8',
    },
    {
      label: 'Clientes con pedido',
      value: counts.customers,
      icon: <ShoppingBag size={18} />,
      color: 'text-blue-400',
      bg: 'bg-blue-400/8',
    },
    {
      label: 'Carritos abandonados',
      value: counts.abandoned,
      icon: <ShoppingCart size={18} />,
      color: 'text-purple-400',
      bg: 'bg-purple-400/8',
    },
    {
      label: 'Enviados este mes',
      value: totalSentThisMonth,
      icon: <Send size={18} />,
      color: 'text-green-400',
      bg: 'bg-green-400/8',
    },
  ];

  const quickActions = [
    {
      id: 'campaign' as const,
      label: 'Nueva campaña',
      desc: 'Envía un email a toda tu audiencia o segmento',
      icon: <Send size={20} />,
      color: 'text-amber-400',
      hover: 'hover:border-amber-500/30 hover:bg-amber-500/5',
    },
    {
      id: 'transactionals' as const,
      label: 'Transaccionales',
      desc: 'Confirmación de pedido y guía de rastreo',
      icon: <Mail size={20} />,
      color: 'text-blue-400',
      hover: 'hover:border-blue-500/30 hover:bg-blue-500/5',
    },
    {
      id: 'history' as const,
      label: 'Ver historial',
      desc: `${campaigns.length} campañas enviadas`,
      icon: <TrendingUp size={20} />,
      color: 'text-purple-400',
      hover: 'hover:border-purple-500/30 hover:bg-purple-500/5',
    },
  ];

  return (
    <div className="space-y-10 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold">Overview</h2>
        <p className="text-sm text-white/40 mt-1">
          Resumen de tu audiencia y actividad de email marketing
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-white/8 bg-white/2 p-5 space-y-3"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg} ${s.color}`}>
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-bold">
                {loading ? <span className="text-white/20">…</span> : (s.value ?? 0)}
              </p>
              <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <p className="text-xs text-white/30 uppercase tracking-widest mb-4">Acciones rápidas</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map((a) => (
            <button
              key={a.id}
              onClick={() => onNavigate(a.id)}
              className={`rounded-2xl border border-white/8 bg-white/2 p-5 text-left transition-colors ${a.hover}`}
            >
              <div className={`mb-3 ${a.color}`}>{a.icon}</div>
              <p className="font-semibold text-sm text-white">{a.label}</p>
              <p className="text-xs text-white/40 mt-1">{a.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent campaigns */}
      {campaigns.length > 0 && (
        <div>
          <p className="text-xs text-white/30 uppercase tracking-widest mb-4">
            Campañas recientes
          </p>
          <div className="space-y-2">
            {campaigns.slice(0, 5).map((c) => (
              <div
                key={c.campaign_id}
                className="flex items-center justify-between rounded-xl border border-white/8 bg-white/2 px-4 py-3 gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{c.subject}</p>
                  <p className="text-xs text-white/35 mt-0.5">
                    {c.segment} · {fmtDate(c.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <span className="text-green-400">{c.sent} enviados</span>
                  {c.failed > 0 && (
                    <span className="text-red-400">{c.failed} fallidos</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {campaigns.length > 5 && (
            <button
              onClick={() => onNavigate('history')}
              className="mt-3 text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Ver todos ({campaigns.length}) →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

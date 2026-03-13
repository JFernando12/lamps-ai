'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { RefreshCw, TrendingUp, Settings, Radio } from 'lucide-react';
import { AttributionPanel } from './components/AttributionPanel';
import { ConfigPanel } from './components/ConfigPanel';
import { EventsPanel } from './components/EventsPanel';
import type { AdsAttribution, AdsConfig, PixelEvent } from './components/types';
import { PIXEL_EVENTS } from '@/lib/pixelEvents';

type Tab = 'attribution' | 'config' | 'events';

export default function AdsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('attribution');
  const [attribution, setAttribution] = useState<AdsAttribution | null>(null);
  const [config, setConfig] = useState<AdsConfig | null>(null);
  const [events, setEvents] = useState<PixelEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [attr, cfg, evts] = await Promise.allSettled([
        api.get<AdsAttribution>('/api/admin/ads/attribution'),
        api.get<AdsConfig>('/api/admin/ads/config'),
        api.get<PixelEvent[]>('/api/admin/ads/events'),
      ]);
      if (attr.status === 'fulfilled') setAttribution(attr.value);
      else console.error('Error loading attribution:', attr.reason);
      if (cfg.status === 'fulfilled') setConfig(cfg.value);
      else console.error('Error loading ads config:', cfg.reason);
      if (evts.status === 'fulfilled') setEvents(evts.value);
      else console.error('Error loading pixel events:', evts.reason);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || !user.is_admin) {
      router.push('/admin/login');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  if (authLoading || loading)
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center pt-14">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </main>
    );

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white pt-6 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Panel de Ads</h1>
            <p className="text-white/40 text-xs mt-0.5 sm:text-sm">
              Atribución interna · Pixel · Configuración
            </p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 border border-white/10 hover:border-white/30 px-3 py-2 rounded-xl text-xs sm:text-sm transition-colors"
          >
            <RefreshCw size={14} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/3 border border-white/10 rounded-2xl p-1 mb-6">
          <button
            onClick={() => setTab('attribution')}
            className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              tab === 'attribution'
                ? 'bg-amber-500 text-black'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <TrendingUp size={14} />
            <span>Atribución</span>
          </button>
          <button
            onClick={() => setTab('config')}
            className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              tab === 'config'
                ? 'bg-amber-500 text-black'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Settings size={14} />
            <span className="hidden xs:inline">Configuración</span>
            <span className="xs:hidden">Config</span>
          </button>
          <button
            onClick={() => setTab('events')}
            className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              tab === 'events'
                ? 'bg-amber-500 text-black'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Radio size={14} />
            <span>Eventos</span>
          </button>
        </div>

        {/* Tab content */}
        {tab === 'attribution' && attribution && (
          <AttributionPanel data={attribution} />
        )}
        {tab === 'config' && config && <ConfigPanel config={config} />}
        {tab === 'events' && (
          <EventsPanel backendEvents={events} frontendEvents={PIXEL_EVENTS} />
        )}
      </div>
    </main>
  );
}

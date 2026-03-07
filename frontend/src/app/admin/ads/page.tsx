'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { RefreshCw, TrendingUp, Settings } from 'lucide-react';
import { AttributionPanel } from './components/AttributionPanel';
import { ConfigPanel } from './components/ConfigPanel';
import type { AdsAttribution, AdsConfig } from './components/types';

type Tab = 'attribution' | 'config';

export default function AdsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('attribution');
  const [attribution, setAttribution] = useState<AdsAttribution | null>(null);
  const [config, setConfig] = useState<AdsConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [attr, cfg] = await Promise.allSettled([
        api.get<AdsAttribution>('/api/admin/ads/attribution'),
        api.get<AdsConfig>('/api/admin/ads/config'),
      ]);
      if (attr.status === 'fulfilled') setAttribution(attr.value);
      else console.error('Error loading attribution:', attr.reason);
      if (cfg.status === 'fulfilled') setConfig(cfg.value);
      else console.error('Error loading ads config:', cfg.reason);
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
    <main className="min-h-screen bg-[#0a0a0a] text-white pt-20 pb-16 px-4">
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
        <div className="flex gap-1 bg-white/3 border border-white/10 rounded-2xl p-1 mb-6 w-fit">
          <button
            onClick={() => setTab('attribution')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === 'attribution'
                ? 'bg-amber-500 text-black'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <TrendingUp size={14} />
            Atribución
          </button>
          <button
            onClick={() => setTab('config')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === 'config'
                ? 'bg-amber-500 text-black'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Settings size={14} />
            Configuración
          </button>
        </div>

        {/* Tab content */}
        {tab === 'attribution' && attribution && (
          <AttributionPanel data={attribution} />
        )}
        {tab === 'config' && config && <ConfigPanel config={config} />}
      </div>
    </main>
  );
}

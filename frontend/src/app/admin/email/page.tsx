'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Send, Mail, History } from 'lucide-react';
import { OverviewSection } from './components/OverviewSection';
import { CampaignWizard } from './components/CampaignWizard';
import { TransactionalsSection } from './components/TransactionalsSection';
import { CampaignsHistory } from './components/CampaignsHistory';

type Section = 'overview' | 'campaign' | 'transactionals' | 'history';

const NAV: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'campaign', label: 'Nueva campaña', icon: Send },
  { id: 'transactionals', label: 'Transaccionales', icon: Mail },
  { id: 'history', label: 'Historial', icon: History },
];

export default function EmailMarketingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [section, setSection] = useState<Section>('overview');

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user?.is_admin) router.push('/admin/login');
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex h-[calc(100vh-56px)] items-center justify-center bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px-64px)] lg:h-[calc(100vh-56px)] overflow-hidden bg-[#0a0a0a] text-white">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-white/8 py-6 px-3 gap-1">
        <p className="text-[10px] text-white/25 uppercase tracking-widest px-3 mb-3">
          Email marketing
        </p>
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              section === id
                ? 'bg-amber-500/10 text-amber-400 font-medium'
                : 'text-white/45 hover:text-white hover:bg-white/4'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </aside>

      {/* ── Mobile tab bar + content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile tabs */}
        <div className="lg:hidden flex gap-1 px-3 py-2.5 border-b border-white/8 shrink-0">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`flex flex-1 items-center justify-center gap-1 py-2 rounded-lg text-[11px] border transition-colors ${
                section === id
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                  : 'border-white/8 text-white/45 hover:text-white'
              }`}
            >
              <Icon size={13} />
              <span className="hidden xs:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {section === 'overview' && (
            <OverviewSection onNavigate={setSection} />
          )}
          {section === 'campaign' && <CampaignWizard />}
          {section === 'transactionals' && <TransactionalsSection />}
          {section === 'history' && <CampaignsHistory />}
        </div>
      </div>
    </div>
  );
}


'use client';

import type { EmailTemplate, SegmentType } from './types';
import { Users, ShoppingBag, ShoppingCart, AlertCircle, Clock } from 'lucide-react';

const SEGMENT_OPTIONS: {
  value: SegmentType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: 'all', label: 'Todos', icon: <Users size={14} /> },
  { value: 'customers', label: 'Con pedido', icon: <ShoppingBag size={14} /> },
  {
    value: 'abandoned_carts',
    label: 'Carrito abandonado',
    icon: <ShoppingCart size={14} />,
  },
  { value: 'rejected', label: 'Pago fallido', icon: <AlertCircle size={14} /> },
  { value: 'pending', label: 'Pago pendiente', icon: <Clock size={14} /> },
];

const PRODUCT_OPTIONS = [
  { value: 'all', label: 'Todos los productos' },
  { value: 'rgb', label: 'Lámpara RGB' },
  { value: 'madera', label: 'Lámpara Madera' },
];

interface Props {
  templates: EmailTemplate[];
  selected: EmailTemplate | null;
  segment: SegmentType;
  productFilter: string;
  audienceCount: number | null;
  loadingAudience: boolean;
  onSelectTemplate: (t: EmailTemplate) => void;
  onSegmentChange: (s: SegmentType) => void;
  onProductFilterChange: (p: string) => void;
}

export function ComposePanel({
  templates,
  selected,
  segment,
  productFilter,
  audienceCount,
  loadingAudience,
  onSelectTemplate,
  onSegmentChange,
  onProductFilterChange,
}: Props) {
  const byCategory = (cat: string) => templates.filter((t) => t.category === cat);

  const catLabel: Record<string, string> = {
    transactional: 'Transaccionales',
    recovery: 'Recuperación',
    campaign: 'Campañas',
  };

  return (
    <div className="space-y-6">
      {/* Template selector */}
      <div>
        <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Plantilla</p>
        {(['transactional', 'recovery', 'campaign'] as const).map((cat) => (
          <div key={cat} className="mb-4">
            <p className="text-xs text-white/30 mb-2">{catLabel[cat]}</p>
            <div className="space-y-1.5">
              {byCategory(cat).map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSelectTemplate(t)}
                  className={`w-full text-left px-3.5 py-3 rounded-xl border text-sm transition-colors ${
                    selected?.id === t.id
                      ? 'border-amber-500 bg-amber-500/10 text-white'
                      : 'border-white/8 bg-white/3 text-white/70 hover:text-white hover:border-white/20'
                  }`}
                >
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-white/40 mt-0.5">{t.description}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Segment */}
      <div>
        <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Audiencia</p>
        <div className="flex flex-wrap gap-1.5">
          {SEGMENT_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => onSegmentChange(s.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                segment === s.value
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                  : 'border-white/8 text-white/50 hover:text-white hover:border-white/20'
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product filter */}
      <div>
        <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Producto</p>
        <div className="flex flex-wrap gap-1.5">
          {PRODUCT_OPTIONS.map((p) => (
            <button
              key={p.value}
              onClick={() => onProductFilterChange(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                productFilter === p.value
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                  : 'border-white/8 text-white/50 hover:text-white hover:border-white/20'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Audience count */}
      <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-sm">
        {loadingAudience ? (
          <span className="text-white/40 text-xs">Calculando…</span>
        ) : (
          <span>
            <span className="text-amber-400 font-bold text-lg">{audienceCount ?? '—'}</span>{' '}
            <span className="text-white/50">destinatarios</span>
          </span>
        )}
      </div>
    </div>
  );
}

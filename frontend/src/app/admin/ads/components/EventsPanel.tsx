import { CheckCircle2, Server, Monitor, Link2 } from 'lucide-react';
import type { PixelEvent } from './types';
import type { PixelEventDef } from '@/lib/pixelEvents';

// ── Funnel stage grouping for browser events ──────────────────

const FUNNEL: Array<{
  label: string;
  color: string;
  border: string;
  events: string[];
}> = [
  {
    label: 'Descubrimiento',
    color: 'text-blue-400',
    border: 'border-blue-400/30',
    events: ['PageView', 'ViewContent'],
  },
  {
    label: 'Intención',
    color: 'text-amber-400',
    border: 'border-amber-400/30',
    events: ['AddToCart', 'InitiateCheckout'],
  },
  {
    label: 'Checkout',
    color: 'text-purple-400',
    border: 'border-purple-400/30',
    events: ['PhotoUploaded', 'CompleteRegistration', 'AddShippingInfo', 'AddPaymentInfo'],
  },
  {
    label: 'Conversión',
    color: 'text-green-400',
    border: 'border-green-400/30',
    events: ['Purchase', 'PaymentFailed', 'Contact'],
  },
];

// ── Sub-components ────────────────────────────────────────────

function TypeBadge({ type }: { type: 'standard' | 'custom' }) {
  return type === 'standard' ? (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border text-blue-400 border-blue-400/30 bg-blue-400/8">
      std
    </span>
  ) : (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border text-purple-400 border-purple-400/30 bg-purple-400/8">
      custom
    </span>
  );
}

function Chip({
  active,
  activeLabel,
  inactiveLabel,
  activeClass,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  activeClass: string;
}) {
  return active ? (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${activeClass}`}>
      <CheckCircle2 size={9} />
      {activeLabel}
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border text-white/20 border-white/8">
      {inactiveLabel}
    </span>
  );
}

// ── Main panel ───────────────────────────────────────────────

interface Props {
  backendEvents: PixelEvent[];
  frontendEvents: PixelEventDef[];
}

export function EventsPanel({ backendEvents, frontendEvents }: Props) {
  const feMap = Object.fromEntries(frontendEvents.map((e) => [e.name, e]));
  const totalWithCapi = frontendEvents.filter((e) => e.hasCapi).length;
  const totalWithEventId = frontendEvents.filter((e) => e.hasEventId).length;

  return (
    <div className="space-y-8">

      {/* ── Top summary ──────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-white/3 border border-white/10 rounded-xl px-4 py-2.5">
          <Monitor size={13} className="text-blue-400" />
          <span className="text-white/50 text-xs">Browser pixel</span>
          <span className="font-bold text-sm">{frontendEvents.length} eventos</span>
        </div>
        <div className="flex items-center gap-2 bg-white/3 border border-white/10 rounded-xl px-4 py-2.5">
          <Server size={13} className="text-green-400" />
          <span className="text-white/50 text-xs">CAPI servidor</span>
          <span className="font-bold text-sm text-green-400">{backendEvents.length} eventos</span>
        </div>
        <div className="flex items-center gap-2 bg-white/3 border border-white/10 rounded-xl px-4 py-2.5">
          <Link2 size={13} className="text-amber-400" />
          <span className="text-white/50 text-xs">Deduplicados</span>
          <span className="font-bold text-sm text-amber-400">{totalWithCapi} eventos</span>
        </div>
        <div className="flex items-center gap-2 bg-white/3 border border-white/10 rounded-xl px-4 py-2.5">
          <CheckCircle2 size={13} className="text-white/40" />
          <span className="text-white/50 text-xs">Con event_id</span>
          <span className="font-bold text-sm">{totalWithEventId}</span>
        </div>
      </div>

      {/* ── Backend: CAPI events ─────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Server size={15} className="text-green-400" />
          <h2 className="font-semibold text-sm text-white/80">Servidor → CAPI</h2>
          <span className="text-white/25 text-xs">pago aprobado / checkout iniciado</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {backendEvents.map((ev) => (
            <div
              key={ev.event_name}
              className="bg-white/3 border border-white/10 rounded-2xl p-5 flex flex-col gap-3"
            >
              {/* Name + type */}
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white/95">{ev.event_name}</span>
                <TypeBadge type={ev.type} />
              </div>

              {/* Route */}
              <div className="flex items-start gap-2">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0 mt-0.5">
                  POST
                </span>
                <code className="text-white/50 text-xs leading-relaxed break-all">
                  {ev.route.replace(/^POST\s+/, '')}
                </code>
              </div>

              {/* Dedup indicator */}
              {ev.has_event_id && (
                <div className="flex items-center gap-1.5 text-amber-400/70 text-xs">
                  <Link2 size={11} />
                  <span>Deduplicación activa con browser pixel</span>
                </div>
              )}

              {/* Notes */}
              {ev.notes && (
                <p className="text-white/30 text-[11px] leading-relaxed">{ev.notes}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Frontend: browser pixel events ───────────────── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Monitor size={15} className="text-blue-400" />
          <h2 className="font-semibold text-sm text-white/80">Navegador → browser pixel</h2>
          <span className="text-white/25 text-xs">fbq() por etapa del funnel</span>
        </div>

        <div className="bg-white/3 border border-white/10 rounded-2xl overflow-hidden">
          {FUNNEL.map((stage, si) => {
            const stageEvents = stage.events
              .map((name) => feMap[name])
              .filter(Boolean) as PixelEventDef[];
            if (!stageEvents.length) return null;
            return (
              <div key={stage.label} className={si > 0 ? 'border-t border-white/8' : ''}>
                {/* Stage header */}
                <div className={`flex items-center gap-2 px-5 py-2 bg-white/2 border-l-2 ${stage.border}`}>
                  <span className={`text-[11px] font-semibold uppercase tracking-wider ${stage.color}`}>
                    {stage.label}
                  </span>
                  <span className="text-white/20 text-[10px]">{stageEvents.length} evento{stageEvents.length !== 1 ? 's' : ''}</span>
                </div>

                {/* Events in this stage */}
                {stageEvents.map((ev, i) => (
                  <div
                    key={ev.name}
                    className={`flex items-start gap-4 px-5 py-3 hover:bg-white/2 transition-colors ${
                      i < stageEvents.length - 1 ? 'border-b border-white/5' : ''
                    }`}
                  >
                    {/* Event name + type + file */}
                    <div className="min-w-40 shrink-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-mono font-semibold text-white/90 text-xs">
                          {ev.name}
                        </span>
                        <TypeBadge type={ev.type} />
                      </div>
                      <p className="text-white/20 text-[10px] font-mono truncate">{ev.file}</p>
                    </div>

                    {/* Trigger — main column */}
                    <p className="flex-1 text-white/55 text-xs leading-relaxed">
                      {ev.trigger}
                    </p>

                    {/* Chips */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Chip
                        active={ev.hasEventId}
                        activeLabel="event_id"
                        inactiveLabel="event_id"
                        activeClass="text-amber-400 border-amber-400/30 bg-amber-400/8"
                      />
                      <Chip
                        active={ev.hasCapi}
                        activeLabel="→ CAPI"
                        inactiveLabel="solo pixel"
                        activeClass="text-green-400 border-green-400/30 bg-green-400/8"
                      />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}



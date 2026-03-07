'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Send, Check, Users, Tag } from 'lucide-react';
import { api } from '@/lib/api';
import { EditorPanel } from './EditorPanel';
import type { EmailTemplate, SegmentType, AudiencePreview, SendCampaignPayload } from './types';

const STEPS = ['Plantilla', 'Audiencia', 'Mensaje', 'Confirmar'];

const SEGMENT_OPTIONS: { value: SegmentType; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'customers', label: 'Con pedido' },
  { value: 'abandoned_carts', label: 'Carrito abandonado' },
  { value: 'payment_failed', label: 'Pago fallido' },
  { value: 'pending_payment', label: 'Pago pendiente' },
];

const PRODUCT_OPTIONS = [
  { value: 'all', label: 'Todos los productos' },
  { value: 'rgb', label: 'Lámpara RGB' },
  { value: 'madera', label: 'Lámpara Madera' },
];

const CAT_LABELS: Record<string, string> = {
  campaign: 'Campaña',
  recovery: 'Recuperación',
  transactional: 'Transaccional',
};

const CAT_COLORS: Record<string, string> = {
  campaign: 'text-amber-400 bg-amber-400/10',
  recovery: 'text-blue-400 bg-blue-400/10',
  transactional: 'text-purple-400 bg-purple-400/10',
};

// ── Step indicator ─────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                i < current
                  ? 'border-amber-500 bg-amber-500 text-black'
                  : i === current
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                  : 'border-white/15 bg-transparent text-white/25'
              }`}
            >
              {i < current ? <Check size={13} /> : i + 1}
            </div>
            <span
              className={`text-[11px] whitespace-nowrap ${
                i === current ? 'text-white' : 'text-white/30'
              }`}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`w-12 sm:w-20 h-px -mt-3.5 transition-colors ${
                i < current ? 'bg-amber-500' : 'bg-white/10'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function CampaignWizard() {
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [catFilter, setCatFilter] = useState<'all' | 'campaign' | 'recovery'>('all');

  // Step 0 — template
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

  // Step 1 — audience
  const [segment, setSegment] = useState<SegmentType>('all');
  const [productFilter, setProductFilter] = useState('all');
  const [audience, setAudience] = useState<AudiencePreview | null>(null);
  const [loadingAudience, setLoadingAudience] = useState(false);

  // Step 2 — message
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');

  // Step 3 — send
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load templates (filter out transactionals — those live in the transactionals section)
  useEffect(() => {
    api
      .get<EmailTemplate[]>('/api/admin/email/templates')
      .then((ts) => setTemplates(ts.filter((t) => t.category !== 'transactional')))
      .catch(() => {})
      .finally(() => setLoadingTemplates(false));
  }, []);

  // Refresh audience count when segment or product changes
  useEffect(() => {
    if (step !== 1) return;
    setLoadingAudience(true);
    const params = new URLSearchParams({ segment });
    if (productFilter !== 'all') params.set('product_filter', productFilter);
    api
      .get<AudiencePreview>(`/api/admin/email/audience?${params}`)
      .then(setAudience)
      .catch(() => setAudience(null))
      .finally(() => setLoadingAudience(false));
  }, [segment, productFilter, step]);

  const handleSelectTemplate = (t: EmailTemplate) => {
    setSelectedTemplate(t);
    setSubject(t.subject);
    setTitle(t.title);
    setBodyHtml(t.body_html);
    setCtaText(t.cta_text);
    setCtaUrl(t.cta_url_template);
  };

  const canAdvance = [
    selectedTemplate !== null,          // step 0
    true,                               // step 1
    subject.trim() !== '' && bodyHtml.trim() !== '', // step 2
    true,                               // step 3
  ][step];

  const handleSend = async () => {
    if (!selectedTemplate) return;
    setSending(true);
    setError(null);
    try {
      const payload: SendCampaignPayload = {
        template_id: selectedTemplate.id,
        segment,
        product_filter: productFilter === 'all' ? null : productFilter,
        subject,
        title,
        body_html: bodyHtml,
        cta_text: ctaText || null,
        cta_url_template: ctaUrl || null,
      };
      const res = await api.post<{ sent: number; failed: number }>('/api/admin/email/campaigns/send', payload);
      setResult({ sent: res.sent, failed: res.failed });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al enviar');
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setStep(0);
    setSelectedTemplate(null);
    setSegment('all');
    setProductFilter('all');
    setSubject('');
    setTitle('');
    setBodyHtml('');
    setCtaText('');
    setCtaUrl('');
    setResult(null);
    setError(null);
  };

  // ── Result screen ────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-6">
        <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
          <Check size={28} className="text-green-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold">¡Campaña enviada!</h3>
          <p className="text-white/50 mt-2 text-sm">
            {result.sent} emails enviados correctamente
            {result.failed > 0 && (
              <span className="text-yellow-400"> · {result.failed} fallidos</span>
            )}
          </p>
        </div>
        <button
          onClick={handleReset}
          className="px-6 py-2.5 rounded-xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 transition-colors"
        >
          Crear nueva campaña
        </button>
      </div>
    );
  }

  const visibleTemplates = templates.filter(
    (t) => catFilter === 'all' || t.category === catFilter,
  );

  return (
    <div className="max-w-3xl space-y-2">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold">Nueva campaña</h2>
        <p className="text-sm text-white/40 mt-1">
          Envía un email a tu audiencia en 4 pasos
        </p>
      </div>

      <StepIndicator current={step} />

      {/* ── STEP 0 — Template ── */}
      {step === 0 && (
        <div className="space-y-5">
          {/* Category filter */}
          <div className="flex gap-2">
            {(['all', 'campaign', 'recovery'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                  catFilter === cat
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : 'border-white/8 text-white/40 hover:text-white'
                }`}
              >
                {cat === 'all' ? 'Todas' : CAT_LABELS[cat]}
              </button>
            ))}
          </div>

          {loadingTemplates ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visibleTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTemplate(t)}
                  className={`text-left rounded-2xl border p-5 transition-colors ${
                    selectedTemplate?.id === t.id
                      ? 'border-amber-500 bg-amber-500/8'
                      : 'border-white/8 bg-white/2 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="font-semibold text-sm text-white">{t.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-medium ${CAT_COLORS[t.category]}`}>
                      {CAT_LABELS[t.category]}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed">{t.description}</p>
                  {t.subject && (
                    <p className="text-xs text-white/25 mt-3 truncate">
                      <span className="text-white/20">Asunto: </span>{t.subject}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 1 — Audience ── */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Segmento</p>
            <div className="flex flex-wrap gap-2">
              {SEGMENT_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSegment(s.value)}
                  className={`px-4 py-2 rounded-xl text-sm border transition-colors ${
                    segment === s.value
                      ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                      : 'border-white/8 text-white/50 hover:text-white hover:border-white/20'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Producto</p>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setProductFilter(p.value)}
                  className={`px-4 py-2 rounded-xl text-sm border transition-colors ${
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

          {/* Audience preview */}
          <div className="rounded-2xl border border-white/8 bg-white/2 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-amber-400" />
              <span className="text-sm font-medium">Destinatarios</span>
            </div>
            {loadingAudience ? (
              <div className="flex items-center gap-2 text-white/40 text-sm">
                <div className="w-4 h-4 border-2 border-white/20 border-t-amber-400 rounded-full animate-spin" />
                Calculando…
              </div>
            ) : audience ? (
              <div className="space-y-3">
                <p>
                  <span className="text-3xl font-bold text-amber-400">{audience.count}</span>{' '}
                  <span className="text-white/50 text-sm">destinatarios</span>
                </p>
                {audience.sample.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {audience.sample.slice(0, 4).map((r) => (
                      <div key={r.email} className="flex justify-between text-xs">
                        <span className="text-white/60 truncate">{r.email}</span>
                        <span className="text-white/25 shrink-0 ml-3">{r.status ?? '—'}</span>
                      </div>
                    ))}
                    {audience.count > 4 && (
                      <p className="text-xs text-white/25">+{audience.count - 4} más…</p>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── STEP 2 — Message ── */}
      {step === 2 && (
        <EditorPanel
          template={selectedTemplate}
          subject={subject}
          title={title}
          bodyHtml={bodyHtml}
          ctaText={ctaText}
          ctaUrl={ctaUrl}
          onSubjectChange={setSubject}
          onTitleChange={setTitle}
          onBodyChange={setBodyHtml}
          onCtaTextChange={setCtaText}
          onCtaUrlChange={setCtaUrl}
        />
      )}

      {/* ── STEP 3 — Confirm ── */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/8 bg-white/2 p-6 space-y-4">
            <p className="text-xs text-white/30 uppercase tracking-widest">Resumen</p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Plantilla</span>
                <span className="text-white font-medium">{selectedTemplate?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Segmento</span>
                <span className="text-white font-medium capitalize">{segment.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Producto</span>
                <span className="text-white font-medium capitalize">{productFilter}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Destinatarios</span>
                <span className="text-amber-400 font-bold">{audience?.count ?? 0}</span>
              </div>
              <div className="border-t border-white/8 pt-3">
                <span className="text-white/50 block mb-1">Asunto</span>
                <span className="text-white">{subject}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={sending || audience?.count === 0}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-amber-500 text-black font-bold text-sm hover:bg-amber-400 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Enviando…
              </>
            ) : (
              <>
                <Send size={16} />
                Enviar a {audience?.count ?? 0} destinatarios
              </>
            )}
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-8 border-t border-white/8 mt-8">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white border border-white/8 hover:border-white/20 transition-colors disabled:opacity-0 disabled:pointer-events-none"
        >
          <ChevronLeft size={15} />
          Anterior
        </button>
        {step < 3 && (
          <button
            onClick={() => setStep((s) => Math.min(3, s + 1))}
            disabled={!canAdvance}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium bg-amber-500 text-black hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            Siguiente
            <ChevronRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

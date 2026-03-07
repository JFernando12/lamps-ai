'use client';

import type { EmailTemplate } from './types';

interface Props {
  template: EmailTemplate | null;
  subject: string;
  title: string;
  bodyHtml: string;
  ctaText: string;
  ctaUrl: string;
  onSubjectChange: (v: string) => void;
  onTitleChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onCtaTextChange: (v: string) => void;
  onCtaUrlChange: (v: string) => void;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-xs text-white/50">{label}</label>
        {hint && <span className="text-[11px] text-white/25">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const inputCls =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-amber-500/50';

export function EditorPanel({
  template,
  subject,
  title,
  bodyHtml,
  ctaText,
  ctaUrl,
  onSubjectChange,
  onTitleChange,
  onBodyChange,
  onCtaTextChange,
  onCtaUrlChange,
}: Props) {
  if (!template) {
    return (
      <div className="flex items-center justify-center h-64 text-white/30 text-sm">
        Selecciona una plantilla para comenzar
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Field label="Asunto del email">
        <input
          className={inputCls}
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder="Ej: ¡Tu pedido ha sido enviado! 🚚"
        />
      </Field>

      <Field label="Título principal">
        <input
          className={inputCls}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Visible como encabezado del email"
        />
      </Field>

      <Field label="Cuerpo del mensaje" hint="Puedes usar HTML básico (<p>, <strong>, <br>)">
        <textarea
          className={`${inputCls} min-h-35 resize-y leading-relaxed`}
          value={bodyHtml}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="<p>Tu mensaje aquí...</p>"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Texto del botón CTA">
          <input
            className={inputCls}
            value={ctaText}
            onChange={(e) => onCtaTextChange(e.target.value)}
            placeholder="Ver mi pedido →"
          />
        </Field>
        <Field label="URL del botón" hint="Usa {order_id}, {cart_id}">
          <input
            className={inputCls}
            value={ctaUrl}
            onChange={(e) => onCtaUrlChange(e.target.value)}
            placeholder="https://…"
          />
        </Field>
      </div>

      {/* Variables reference */}
      <p className="text-[11px] text-white/25 leading-relaxed">
        Variables disponibles en cuerpo y URL:{' '}
        <code className="text-white/40">{'{tracking_number}'}</code>{' '}
        <code className="text-white/40">{'{order_id}'}</code>{' '}
        <code className="text-white/40">{'{cart_id}'}</code>
      </p>
    </div>
  );
}

/**
 * Registro central de eventos Meta Pixel (browser).
 *
 * Cada evento es una entrada en PIXEL_EVENTS con:
 *   name       - string exacto que usa Meta
 *   type       - "standard" | "custom"
 *   trigger    - cuándo se dispara (documentación)
 *   file       - archivo donde vive el track() correspondiente
 *   hasEventId - si el evento incluye un event_id para deduplicación CAPI
 *   hasCapi    - si existe un envío CAPI equivalente en el backend
 *   track      - función que dispara el fbq() correspondiente
 *
 * Uso:
 *   import { getEvent } from '@/lib/pixelEvents';
 *   getEvent('Purchase').track({ orderId, value, contentName });
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

// ── Helpers ───────────────────────────────────────────────────

export function genEventId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2);
  return `${prefix}_${rand}`;
}

// ── Track functions ───────────────────────────────────────────

function _trackPageView(_data?: Record<string, unknown>): void {
  window.fbq?.('track', 'PageView');
}

function _trackViewContent(_data?: Record<string, unknown>): void {
  window.fbq?.('track', 'ViewContent', {
    content_ids: ['rgb', 'madera'],
    content_type: 'product',
    value: 597,
    currency: 'MXN',
  });
}

function _trackAddToCart(data?: Record<string, unknown>): void {
  window.fbq?.('track', 'AddToCart', {
    content_ids: [data?.contentId ?? ''],
    content_type: 'product',
    value: data?.value ?? 0,
    currency: 'MXN',
  });
}

function _trackInitiateCheckout(data?: Record<string, unknown>): void {
  window.fbq?.(
    'track',
    'InitiateCheckout',
    { value: data?.value ?? 0, currency: 'MXN', num_items: 1 },
    { eventID: (data?.eventId as string) ?? genEventId('ic') },
  );
}

function _trackPhotoUploaded(_data?: Record<string, unknown>): void {
  window.fbq?.(
    'trackCustom',
    'PhotoUploaded',
    {},
    { eventID: genEventId('photo') },
  );
}

function _trackCompleteRegistration(_data?: Record<string, unknown>): void {
  window.fbq?.(
    'track',
    'CompleteRegistration',
    {},
    { eventID: genEventId('reg') },
  );
}

function _trackAddShippingInfo(data?: Record<string, unknown>): void {
  window.fbq?.(
    'track',
    'AddShippingInfo',
    { value: data?.value ?? 0, currency: 'MXN' },
    { eventID: genEventId('si') },
  );
}

function _trackAddPaymentInfo(data?: Record<string, unknown>): void {
  window.fbq?.(
    'track',
    'AddPaymentInfo',
    { value: data?.value ?? 0, currency: 'MXN' },
    { eventID: (data?.eventId as string) ?? genEventId('pi') },
  );
}

function _trackPurchase(data?: Record<string, unknown>): void {
  window.fbq?.(
    'track',
    'Purchase',
    {
      value: data?.value ?? 0,
      currency: 'MXN',
      content_name: data?.contentName ?? '',
      content_ids: [data?.orderId ?? ''],
      content_type: 'product',
    },
    { eventID: data?.orderId as string },
  );
}

function _trackPaymentFailed(data?: Record<string, unknown>): void {
  window.fbq?.('trackCustom', 'PaymentFailed', {
    value: data?.value ?? 0,
    currency: 'MXN',
  });
}

function _trackContact(_data?: Record<string, unknown>): void {
  window.fbq?.('track', 'Contact');
}

// ── Registry ──────────────────────────────────────────────────

export type TrackFn = (data?: Record<string, unknown>) => void;

export interface PixelEventDef {
  name: string;
  type: 'standard' | 'custom';
  trigger: string;
  file: string;
  hasEventId: boolean;
  hasCapi: boolean;
  notes: string;
  track: TrackFn;
}

export const PIXEL_EVENTS: PixelEventDef[] = [
  {
    name: 'PageView',
    type: 'standard',
    trigger: 'Cada cambio de página (global)',
    file: 'app/layout.tsx',
    hasEventId: false,
    hasCapi: false,
    notes: 'Disparado desde el script inline de layout, no via getEvent().',
    track: _trackPageView,
  },
  {
    name: 'ViewContent',
    type: 'standard',
    trigger: 'ProductSection entra al viewport (IntersectionObserver)',
    file: 'components/home/ProductSection.tsx',
    hasEventId: false,
    hasCapi: false,
    notes: '',
    track: _trackViewContent,
  },
  {
    name: 'AddToCart',
    type: 'standard',
    trigger: "Click en 'Comprar ahora' en ProductSection",
    file: 'components/home/ProductSection.tsx',
    hasEventId: false,
    hasCapi: false,
    notes: 'Requiere { contentId, value }.',
    track: _trackAddToCart,
  },
  {
    name: 'InitiateCheckout',
    type: 'standard',
    trigger: 'Al cargar la página /checkout',
    file: 'app/checkout/page.tsx',
    hasEventId: true,
    hasCapi: true,
    notes: 'Requiere { value, eventId }. El eventId se comparte con el backend para deduplicación CAPI.',
    track: _trackInitiateCheckout,
  },
  {
    name: 'PhotoUploaded',
    type: 'custom',
    trigger: 'Foto subida exitosamente en el checkout',
    file: 'app/checkout/components/PhotoStep.tsx',
    hasEventId: true,
    hasCapi: false,
    notes: '',
    track: _trackPhotoUploaded,
  },
  {
    name: 'CompleteRegistration',
    type: 'standard',
    trigger: 'Usuario se registra durante el checkout',
    file: 'app/checkout/page.tsx',
    hasEventId: true,
    hasCapi: false,
    notes: '',
    track: _trackCompleteRegistration,
  },
  {
    name: 'AddShippingInfo',
    type: 'standard',
    trigger: 'Datos de envío confirmados (paso 2)',
    file: 'app/checkout/page.tsx',
    hasEventId: true,
    hasCapi: false,
    notes: 'Requiere { value }.',
    track: _trackAddShippingInfo,
  },
  {
    name: 'AddPaymentInfo',
    type: 'standard',
    trigger: 'Justo antes de redirect a MercadoPago',
    file: 'app/checkout/page.tsx',
    hasEventId: true,
    hasCapi: false,
    notes: 'Requiere { value, eventId }. El eventId es api_{order_id}.',
    track: _trackAddPaymentInfo,
  },
  {
    name: 'Purchase',
    type: 'standard',
    trigger: '/pedido/:id con ?status=success (browser) + pago aprobado (servidor)',
    file: 'app/pedido/[id]/page.tsx',
    hasEventId: true,
    hasCapi: true,
    notes: 'Requiere { value, orderId, contentName }. El eventId es el order_id para deduplicación CAPI.',
    track: _trackPurchase,
  },
  {
    name: 'PaymentFailed',
    type: 'custom',
    trigger: '/pedido/:id con ?status=failure',
    file: 'app/pedido/[id]/page.tsx',
    hasEventId: false,
    hasCapi: false,
    notes: 'Requiere { value }.',
    track: _trackPaymentFailed,
  },
  {
    name: 'Contact',
    type: 'standard',
    trigger: 'Click en botón de WhatsApp (flotante o FAQ)',
    file: 'components/WhatsAppButton.tsx',
    hasEventId: false,
    hasCapi: false,
    notes: '',
    track: _trackContact,
  },
];

const _INDEX: Record<string, PixelEventDef> = Object.fromEntries(
  PIXEL_EVENTS.map((e) => [e.name, e]),
);

/** Busca un evento por su nombre Meta. Lanza error si no está registrado. */
export function getEvent(name: string): PixelEventDef {
  const ev = _INDEX[name];
  if (!ev) throw new Error(`Pixel event not registered: ${name}`);
  return ev;
}

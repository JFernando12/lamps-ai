/**
 * UTM + Facebook click ID attribution capture.
 *
 * Reads UTM params and fbclid from the URL on landing and persists them in
 * localStorage with a 30-day TTL (last-touch model). At checkout, the stored
 * attribution is read and sent to the backend so every order has a source.
 */

const ATTRIBUTION_KEY = 'tdg_attr';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  captured_at: number;
}

const UTM_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
] as const;

/**
 * Call on every page load (via UtmTracker component).
 * Overwrites stored attribution only when tracking params are present in the URL.
 */
export function captureAttribution(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  const hasTracking = UTM_PARAMS.some((k) => params.has(k));
  if (!hasTracking) return;

  const attrs: Attribution = { captured_at: Date.now() };
  if (params.get('utm_source')) attrs.utm_source = params.get('utm_source')!;
  if (params.get('utm_medium')) attrs.utm_medium = params.get('utm_medium')!;
  if (params.get('utm_campaign')) attrs.utm_campaign = params.get('utm_campaign')!;
  if (params.get('utm_content')) attrs.utm_content = params.get('utm_content')!;
  if (params.get('utm_term')) attrs.utm_term = params.get('utm_term')!;
  if (params.get('fbclid')) attrs.fbclid = params.get('fbclid')!;

  try {
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attrs));
  } catch {
    // localStorage unavailable (private mode, storage full) — silently ignore
  }
}

/** Returns stored attribution, null if expired or not present. */
export function getStoredAttribution(): Attribution | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return null;
    const attrs: Attribution = JSON.parse(raw);
    if (Date.now() - attrs.captured_at > TTL_MS) {
      localStorage.removeItem(ATTRIBUTION_KEY);
      return null;
    }
    return attrs;
  } catch {
    return null;
  }
}

/** Reads the _fbp cookie set by the Meta Pixel (used for CAPI match rate). */
export function getFbpCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(/_fbp=([^;]+)/);
  return match ? match[1] : undefined;
}

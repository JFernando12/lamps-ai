export interface FunnelSource {
  source: string;
  initiated: number;
  paid: number;
  revenue: number;
  cvr_pct: number;
}

export interface Campaign {
  utm_source: string;
  utm_campaign: string;
  utm_content: string;
  initiated: number;
  paid: number;
  revenue: number;
  cvr_pct: number;
}

export interface AdsSummary {
  total_attributed_orders: number;
  total_attributed_revenue: number;
  total_initiated: number;
}

export interface AdsAttribution {
  funnel_by_source: FunnelSource[];
  by_campaign: Campaign[];
  summary: AdsSummary;
}

export interface AdsConfig {
  pixel_id: string | null;
  capi_configured: boolean;
  api_version: string;
}

/** Evento CAPI enviado desde el backend (perspectiva del servidor). */
export interface PixelEvent {
  event_name: string;
  type: 'standard' | 'custom';
  route: string;
  has_event_id: boolean;
  notes: string;
  enabled: boolean;
}

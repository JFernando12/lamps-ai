export type SegmentType =
  | 'all'
  | 'customers'
  | 'abandoned_carts'
  | 'rejected'
  | 'pending';

export type TemplateCat = 'transactional' | 'recovery' | 'campaign';

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  title: string;
  body_html: string;
  cta_text: string;
  cta_url_template: string;
  category: TemplateCat;
}

export interface AudiencePreview {
  count: number;
  sample: {
    email: string;
    name: string;
    order_id: string | null;
    cart_id: string | null;
    product_id: string;
    status: string | null;
  }[];
}

export interface Campaign {
  campaign_id: string;
  template_id: string;
  segment: SegmentType;
  product_filter: string;
  subject: string;
  title: string;
  total_recipients: number;
  sent: number;
  failed: number;
  created_at: string;
  status: 'sent' | 'partial' | 'failed';
}

export interface SendCampaignPayload {
  template_id: string;
  segment: SegmentType;
  product_filter?: string | null;
  subject: string;
  title: string;
  body_html: string;
  cta_text?: string | null;
  cta_url_template?: string | null;
  recipient_override?: string[] | null;
}

export interface EmailOrder {
  order_id: string;
  user_email: string;
  status: string;
  created_at: string;
  tracking_number?: string;
  shipping: { full_name: string };
  items: { product_id: string; quantity: number }[];
  total_amount?: string;
}

export interface ShippingInfo {
  full_name: string;
  address: string;
  colonia: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  phone: string;
}

export interface Payment {
  payment_id: string;
  method: 'mercadopago' | 'transfer';
  concept: string;
  amount: number;
  status:
    | 'pending'
    | 'pending_verification'
    | 'approved'
    | 'rejected'
    | 'expired';
  proof_url?: string;
}

export interface Order {
  order_id: string;
  type: 'checkout' | 'whatsapp';
  status: string;
  created_at: string;
  tracking_number?: string;

  // checkout-specific
  user_email?: string;
  total_amount?: string;
  quantity?: number;
  shipping?: ShippingInfo;
  photo_id?: string;
  photo_url?: string;

  // whatsapp-specific
  whatsapp_phone?: string;
  product_id?: string;
  design_id?: string;
  design_url?: string;
  design_status?: string;
  design_approved?: boolean;
  payments?: Payment[];
  paid_total?: number;
  email?: string;

  // personalización
  engraving_text?: string;
  spotify_url?: string;
}

export interface Stats {
  total_photos_uploaded: number;
  total_orders: number;
  paid_orders: number;
  total_revenue_mxn: number;
  conversion_rate_pct: number;
}

export interface PendingTransfer {
  payment_id: string;
  order_id: string;
  amount: number;
  concept: string;
  proof_url: string;
  whatsapp_phone: string;
  created_at: string;
}

export const STATUSES = [
  'pending',
  'approved',
  'in_process',
  'shipped',
  'delivered',
  'rejected',
  'cancelled',
];

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente de pago',
  approved: 'Pagado',
  in_process: 'En producción',
  shipped: 'Enviado',
  delivered: 'Entregado',
  rejected: 'Pago fallido',
  cancelled: 'Cancelado',
};

export const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-400/10',
  approved: 'text-green-400 bg-green-400/10',
  in_process: 'text-amber-400 bg-amber-400/10',
  shipped: 'text-blue-400 bg-blue-400/10',
  delivered: 'text-green-500 bg-green-500/10',
  rejected: 'text-red-400 bg-red-400/10',
  cancelled: 'text-red-400 bg-red-400/10',
};

// Statuses shown in the admin dropdown per order type
export const CHECKOUT_STATUSES = [
  'pending',
  'approved',
  'in_process',
  'shipped',
  'delivered',
  'rejected',
  'cancelled',
];
export const WHATSAPP_STATUSES = [
  'pending',
  'in_process',
  'shipped',
  'delivered',
  'cancelled',
];

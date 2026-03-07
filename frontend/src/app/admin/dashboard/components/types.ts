export interface ShippingInfo {
  full_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  phone: string;
}

export interface Order {
  order_id: string;
  user_email: string;
  product_name: string;
  unit_price: string;
  quantity: number;
  status: string;
  created_at: string;
  shipping: ShippingInfo;
  tracking_number?: string;
  photo_id?: string;
  photo_url?: string;
}

export interface Stats {
  total_photos_uploaded: number;
  total_orders: number;
  paid_orders: number;
  total_revenue_mxn: number;
  conversion_rate_pct: number;
}

export const STATUSES = [
  'pending_payment',
  'paid',
  'in_process',
  'shipped',
  'delivered',
  'payment_failed',
  'cancelled',
];

export const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Pendiente de pago',
  paid: 'Pagado',
  in_process: 'En producción',
  shipped: 'Enviado',
  delivered: 'Entregado',
  payment_failed: 'Pago fallido',
  cancelled: 'Cancelado',
};

export const STATUS_COLORS: Record<string, string> = {
  pending_payment: 'text-yellow-400 bg-yellow-400/10',
  paid: 'text-green-400 bg-green-400/10',
  in_process: 'text-amber-400 bg-amber-400/10',
  shipped: 'text-blue-400 bg-blue-400/10',
  delivered: 'text-green-500 bg-green-500/10',
  payment_failed: 'text-red-400 bg-red-400/10',
  cancelled: 'text-red-400 bg-red-400/10',
};

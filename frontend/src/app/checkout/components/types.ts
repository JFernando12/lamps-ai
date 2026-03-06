export type Step = 'photo' | 'details' | 'payment';

export interface ShippingForm {
  full_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  phone: string;
}

export const EMPTY_SHIPPING: ShippingForm = {
  full_name: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  country: 'México',
  phone: '',
};

export interface User {
  email: string;
  name: string;
  is_admin: boolean;
}

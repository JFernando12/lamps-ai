export type Step = 'photo' | 'details' | 'payment';

export interface CartItemState {
  localId: string;
  photoId: string | null;
  localPhotoPreview: string | null;
  engravingText: string;
  spotifyUrl: string;
  productId: ProductId;
  quantity: number;
}

export type ProductId = 'rgb' | 'madera';

export interface ProductConfig {
  id: ProductId;
  name: string;
  price: number;
  originalPrice: number;
  tagline: string;
  badge: string;
  features: string[];
}

export const PRODUCTS: Record<ProductId, ProductConfig> = {
  rgb: {
    id: 'rgb',
    name: 'Lámpara acrílica LED RGB',
    price: 597,
    originalPrice: 999,
    tagline: '16 colores · control remoto incluido',
    badge: 'Más popular',
    features: [
      'Acrílico transparente de 5 mm',
      '16 colores RGB con control remoto',
      'Diseño grabado con láser de precisión',
      'Tamaño 20×15 cm · Cable USB incluido',
      'Envío gratis a todo México',
    ],
  },
  madera: {
    id: 'madera',
    name: 'Lámpara base de madera',
    price: 719,
    originalPrice: 1199,
    tagline: 'Base de madera natural · luz cálida',
    badge: 'Edición premium',
    features: [
      'Base de madera natural maciza',
      'Luz cálida 3000K — ambiente perfecto',
      'Diseño grabado con láser de precisión',
      'Tamaño 20×15 cm · Cable USB incluido',
      'Envío gratis a todo México',
    ],
  },
};

export function getProduct(id: string | null): ProductConfig {
  if (id === 'madera') return PRODUCTS.madera;
  return PRODUCTS.rgb;
}

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

// Provisional mock contract. The Catalog document does not yet define response fields.
export interface Product {
  id: string;
  name: string;
  price: number;
  currency: 'VND';
  stock: number;
  nutrition_complete: boolean;
  allergens_verified: boolean;
}

export interface ProductPage {
  items: Product[];
  page: number;
  size: number;
  total: number;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

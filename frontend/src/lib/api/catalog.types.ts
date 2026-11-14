// Catalog response implemented by the local PostgreSQL API.
export interface Category {
  id: number;
  name: string;
  slug: string;
}
export interface Allergen {
  code: string;
  name: string;
  kind: 'contains' | 'may_contain';
}
export interface Nutrition {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sugar_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
  source: string;
}
/** Real product photo; the first one is the primary image. */
export interface ProductImage {
  id: number;
  url: string;
}
export interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  stock: number;
  nutrition_complete: boolean;
  allergens_verified: boolean;
  /** An admin confirmed the allergen list (otherwise it is sample data derived from ingredients). */
  allergens_reviewed: boolean;
  description: string | null;
  category: Category | null;
  serving_size: number | null;
  serving_unit: string | null;
  nutrition: Nutrition | null;
  allergens: Allergen[] | null;
  /** Missing in older responses and fixtures: treat as no photo. */
  images?: ProductImage[];
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

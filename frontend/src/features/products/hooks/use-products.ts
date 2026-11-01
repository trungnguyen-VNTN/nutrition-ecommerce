import { useQuery } from '@tanstack/react-query';
import { getProducts } from '../api/products';
import type { ProductFilters } from '../api/filters';

export function useProducts(filters: ProductFilters | null) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: ({ signal }) => {
      if (!filters) throw new Error('Invalid filters');
      return getProducts(filters, signal);
    },
    enabled: filters !== null,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

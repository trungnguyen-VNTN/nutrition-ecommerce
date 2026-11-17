/** Portions offered: three common amounts plus the label's own serving. */
export function portionOptions(servingSize: number) {
  return [...new Set([30, 50, 100, servingSize])].sort((a, b) => a - b);
}

/** Scales a per-serving value to another amount; no rounding before the multiply. */
export const scaleTo = (value: number, amount: number, servingSize: number) =>
  (value * amount) / servingSize;

/** FDC id inside the stored source text, e.g. "USDA FoodData Central, SR Legacy, FDC ID 169705". */
export function fdcId(source: string) {
  return /FDC ID (\d{4,9})/.exec(source)?.[1] ?? null;
}

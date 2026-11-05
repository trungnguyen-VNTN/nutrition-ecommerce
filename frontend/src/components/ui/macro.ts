export type Macro = 'energy' | 'protein' | 'carb' | 'fat' | 'fiber';

// Fixed macro colours (ui-guidelines §1): tint background + coloured dot, ink text.
export const macroTint: Record<Macro, string> = {
  energy: 'bg-sunken',
  protein: 'bg-protein-tint',
  carb: 'bg-carb-tint',
  fat: 'bg-fat-tint',
  fiber: 'bg-fiber-tint',
};
export const macroDot: Record<Macro, string> = {
  energy: 'bg-ink',
  protein: 'bg-protein',
  carb: 'bg-carb',
  fat: 'bg-fat',
  fiber: 'bg-fiber',
};

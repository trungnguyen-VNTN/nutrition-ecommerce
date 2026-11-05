import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { messages } from '@/app/messages.vi';
import type { Product } from '@/lib/api/catalog.types';
import { readyNutrition } from '@/lib/nutrition';
import { renderApp } from '@/test/render';
import { AllergenBadge } from '../allergen-badge';
import { Donut } from '../donut';
import { MacroBar } from '../macro-bar';
import { NutritionLabel } from '../nutrition-label';
import { ProductCard } from '../product-card';

const complete: Product = {
  id: 'oats',
  name: 'Yến mạch',
  price: 68000,
  currency: 'VND',
  stock: 5,
  nutrition_complete: true,
  allergens_verified: true,
  description: null,
  category: { id: 1, name: 'Ngũ cốc', slug: 'ngu-coc' },
  serving_size: 100,
  serving_unit: 'g',
  nutrition: {
    calories: 389,
    protein_g: 17,
    carbs_g: 66,
    fat_g: 7,
    sugar_g: null,
    fiber_g: 10,
    sodium_mg: null,
    source: 'test',
  },
  allergens: [],
};
// Numbers exist but the API says they are not complete: the UI must not show them.
const stale: Product = { ...complete, nutrition_complete: false };
const noServing: Product = { ...complete, serving_size: null };
const unverified: Product = { ...complete, allergens_verified: false };

describe('fail-closed nutrition', () => {
  it.each([
    ['incomplete flag', stale],
    ['missing serving', noServing],
    ['missing nutrition', { ...complete, nutrition: null }],
  ])('readyNutrition rejects %s', (_, product) => {
    expect(readyNutrition(product)).toBeNull();
  });

  it.each([
    ['MacroBar', MacroBar],
    ['NutritionLabel', NutritionLabel],
    ['Donut', Donut],
  ] as const)('%s shows text instead of numbers when incomplete', (_, View) => {
    const { container } = render(<View product={stale} />);
    expect(screen.getByText(messages.nutritionMissing)).toBeVisible();
    expect(container).not.toHaveTextContent(/\d/);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('labels null nutrient values in text, never as 0', () => {
    render(<NutritionLabel product={complete} />);
    const table = screen.getByRole('table');
    for (const label of [
      messages.nutritionLabels.sugar_g,
      messages.nutritionLabels.sodium_mg,
    ]) {
      const row = within(table).getByRole('row', {
        name: new RegExp(label.replace(/[()]/g, '\\$&')),
      });
      expect(row).toHaveTextContent(messages.missingValue);
      expect(row).not.toHaveTextContent(/\b0\b/);
    }
    expect(
      within(table).getByRole('row', {
        name: new RegExp(
          messages.nutritionLabels.protein_g.replace(/[()]/g, '\\$&'),
        ),
      }),
    ).toHaveTextContent('17');
  });

  it('summarises the energy split for screen readers', () => {
    render(<Donut product={complete} />);
    const chart = screen.getByRole('img');
    expect(chart).toHaveAccessibleName(/Năng lượng 389 kcal/);
    expect(chart).toHaveAccessibleName(/Protein \d+%/);
    expect(screen.getByText(messages.energySplit)).toBeVisible();
  });

  it('macro bar repeats every gram value as text', () => {
    render(<MacroBar product={complete} />);
    expect(screen.getByText('17 g')).toBeVisible();
    expect(screen.getByText('66 g')).toBeVisible();
    expect(screen.getByText('7 g')).toBeVisible();
  });

  it('product card hides numbers when nutrition is not complete', () => {
    renderApp(<ProductCard product={stale} index={0} />);
    expect(screen.getByText(messages.nutritionMissing)).toBeVisible();
    expect(screen.queryByText(/kcal/)).not.toBeInTheDocument();
    expect(screen.queryByText(/protein/)).not.toBeInTheDocument();
  });

  it('product card shows energy and protein when complete', () => {
    renderApp(<ProductCard product={complete} index={0} />);
    expect(screen.getByText('389 kcal')).toBeVisible();
    expect(screen.getByText('17g protein')).toBeVisible();
    expect(screen.getByText(messages.allergensVerified)).toBeVisible();
  });
});

describe('fail-closed allergens', () => {
  it('reads "no allergens" only when verified', () => {
    const { rerender } = render(<AllergenBadge product={complete} />);
    expect(screen.getByText(messages.noAllergens)).toBeVisible();
    rerender(<AllergenBadge product={unverified} />);
    expect(screen.getByText(messages.allergensMissing)).toBeVisible();
    expect(screen.queryByText(messages.noAllergens)).not.toBeInTheDocument();
    rerender(<AllergenBadge product={{ ...complete, allergens: null }} />);
    expect(screen.getByText(messages.allergensMissing)).toBeVisible();
  });

  it('product card never implies "no allergens" for unverified data', () => {
    renderApp(<ProductCard product={unverified} index={0} />);
    expect(screen.getByText(messages.allergensMissing)).toBeVisible();
    expect(
      screen.queryByText(messages.allergensVerified),
    ).not.toBeInTheDocument();
  });
});

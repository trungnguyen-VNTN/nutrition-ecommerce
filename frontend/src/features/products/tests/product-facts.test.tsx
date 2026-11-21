import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ReadyNutrition } from '@/lib/nutrition';
import { PortionCard, SourceCard } from '../product-facts';
import { fdcId, portionOptions, scaleTo } from '../portion';

const almonds: ReadyNutrition = {
  servingSize: 100,
  servingUnit: 'g',
  nutrition: {
    calories: 579,
    protein_g: 21.2,
    carbs_g: 21.6,
    fat_g: 49.9,
    sugar_g: 4.35,
    fiber_g: 12.5,
    sodium_mg: 1,
    source: 'USDA FoodData Central, SR Legacy, FDC ID 170567',
  },
};

const values = () =>
  Object.fromEntries(
    within(
      screen.getByRole('group', { name: 'Chọn khẩu phần' }).parentElement!
        .parentElement!,
    )
      .getAllByRole('term')
      .map((term) => [term.textContent, term.nextElementSibling?.textContent]),
  );

describe('portion maths', () => {
  it('offers common amounts plus the label serving, in order', () => {
    expect(portionOptions(100)).toEqual([30, 50, 100]);
    expect(portionOptions(40)).toEqual([30, 40, 50, 100]);
  });

  it('scales proportionally without early rounding', () => {
    expect(scaleTo(579, 30, 100)).toBeCloseTo(173.7);
    expect(scaleTo(21.2, 30, 100)).toBeCloseTo(6.36);
  });
});

describe('PortionCard', () => {
  it('starts at the label serving and recomputes for another portion', async () => {
    render(<PortionCard ready={almonds} />);
    expect(screen.getByRole('button', { name: '100 g' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(values()['kcal']).toBe('579');

    await userEvent.click(screen.getByRole('button', { name: '30 g' }));
    expect(values()).toMatchObject({
      kcal: '173,7',
      'g protein': '6,4',
      'g chất xơ': '3,8',
    });
  });

  it('leaves out a missing value instead of showing 0', () => {
    render(
      <PortionCard
        ready={{
          ...almonds,
          nutrition: { ...almonds.nutrition, fiber_g: null },
        }}
      />,
    );
    expect(screen.queryByText('g chất xơ')).not.toBeInTheDocument();
  });

  it('is not offered for servings that are not a weight or volume', () => {
    const { container } = render(
      <PortionCard
        ready={{ ...almonds, servingUnit: 'quả', servingSize: 1 }}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('SourceCard', () => {
  it('links the FDC record when the source names one', () => {
    expect(fdcId(almonds.nutrition.source)).toBe('170567');
    render(<SourceCard source={almonds.nutrition.source} />);
    expect(
      screen.getByRole('link', { name: /Xem bản gốc trên USDA/ }),
    ).toHaveAttribute(
      'href',
      'https://fdc.nal.usda.gov/food-details/170567/nutrients',
    );
  });

  it('shows the plain source text without a link otherwise', () => {
    render(<SourceCard source="test-fixture" />);
    expect(screen.getByText('test-fixture')).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

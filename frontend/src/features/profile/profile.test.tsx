import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/mocks/server';
import { renderApp } from '@/test/render';
import { ProfilePage } from './profile-page';
import { SuggestionsPage } from './suggestions-page';
import { toDraft, validate } from './profile-form';

vi.mock('@/features/auth/session', () => ({
  useSession: () => ({ sub: 'test-sub' }),
  accessToken: async () => null,
  signOut: vi.fn(),
}));

const saved = {
  birth_year: 1995,
  sex: 'MALE',
  height_cm: 180,
  weight_kg: 80,
  activity: 'MODERATE',
  goal: 'MAINTAIN',
  excluded_allergens: ['milk'],
  pregnant_or_breastfeeding: false,
  medical_condition: false,
  updated_at: '2026-11-21T08:00:00Z',
};
const targets = {
  eligible: true,
  ineligible: null,
  age: 31,
  bmi: 24.7,
  resting_calories: 1780,
  daily_calories: 2760,
  calories: 2760,
  protein_g: 80,
  carbs_g: 403,
  fat_g: 92,
};
const refused = {
  ...targets,
  eligible: false,
  ineligible: 'MEDICAL',
  bmi: 24.7,
  resting_calories: null,
  daily_calories: null,
  calories: null,
  protein_g: null,
  carbs_g: null,
  fat_g: null,
};
const amounts = (calories: number, protein: number) => ({
  calories,
  protein_g: protein,
  carbs_g: 0,
  fat_g: 0,
});
const lunch = {
  eligible: true,
  ineligible: null,
  meal: 'LUNCH',
  target: amounts(1035, 30),
  items: [
    {
      product: { id: 1, name: 'Ức gà' },
      grams: 70,
      role: 'protein',
      amounts: amounts(115.5, 21.7),
    },
    {
      product: { id: 3, name: 'Gạo lứt' },
      grams: 200,
      role: 'tinh bột',
      amounts: amounts(740, 15.8),
    },
  ],
  total: amounts(855.5, 37.5),
  calories_pct: 83,
  protein_pct: 125,
};

describe('profile form rules', () => {
  it('requires valid body data and consent every time', () => {
    const errors = validate(
      { ...toDraft(null), birthYear: '1890', heightCm: '90', weightKg: '' },
      2026,
    );
    expect(Object.keys(errors).sort()).toEqual(
      ['birthYear', 'consent', 'heightCm', 'sex', 'weightKg'].sort(),
    );
    const draft = { ...toDraft(saved as never), consent: true };
    expect(validate(draft, 2026)).toEqual({});
    expect(toDraft(saved as never).consent).toBe(false);
  });
});

describe('nutrition profile page', () => {
  it('blocks saving without consent, then saves and shows the targets', async () => {
    const bodies: unknown[] = [];
    let stored: Record<string, unknown> | null = null;
    server.use(
      http.get('*/api/me/profile', () =>
        stored
          ? HttpResponse.json(stored)
          : new HttpResponse(null, { status: 404 }),
      ),
      http.put('*/api/me/profile', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        bodies.push(body);
        stored = { ...body, updated_at: '2026-11-21T08:00:00Z' };
        return HttpResponse.json(stored);
      }),
      http.get('*/api/me/targets', () => HttpResponse.json(targets)),
    );
    renderApp(<ProfilePage />);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Năm sinh'), '1995');
    await user.selectOptions(
      screen.getByLabelText(/Giới tính sinh học/),
      'MALE',
    );
    await user.type(screen.getByLabelText('Chiều cao (cm)'), '180');
    await user.type(screen.getByLabelText('Cân nặng (kg)'), '80');
    await user.click(screen.getByRole('radio', { name: /Vận động vừa/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Sữa' }));
    // Pregnancy only applies to the female formula.
    expect(screen.queryByRole('checkbox', { name: /mang thai/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }));
    expect(screen.getByText('Cần đồng ý để lưu hồ sơ.')).toBeInTheDocument();
    expect(bodies).toEqual([]);

    await user.click(screen.getByRole('checkbox', { name: /Tôi đồng ý/ }));
    await user.click(screen.getByRole('button', { name: 'Lưu hồ sơ' }));
    expect(await screen.findByText('2.760')).toBeInTheDocument();
    expect(bodies).toEqual([
      {
        birth_year: 1995,
        sex: 'MALE',
        height_cm: 180,
        weight_kg: 80,
        activity: 'MODERATE',
        goal: 'MAINTAIN',
        excluded_allergens: ['milk'],
        pregnant_or_breastfeeding: false,
        medical_condition: false,
        consent: true,
      },
    ]);
    const macros = screen.getByRole('list', { name: 'Chất đa lượng mỗi ngày' });
    expect(within(macros).getByText(/Protein 80 g/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Xem gợi ý bữa ăn/ }),
    ).toHaveAttribute('href', '/suggestions');
    expect(
      screen.getAllByText(/không phải lời khuyên y tế/).length,
    ).toBeGreaterThan(0);
  });

  it('shows no personal targets when the estimate does not apply', async () => {
    server.use(
      http.get('*/api/me/profile', () =>
        HttpResponse.json({ ...saved, medical_condition: true }),
      ),
      http.get('*/api/me/targets', () => HttpResponse.json(refused)),
    );
    renderApp(<ProfilePage />);
    expect(
      await screen.findByText(/theo hướng dẫn của bác sĩ/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/kcal mỗi ngày/)).toBeNull();
    expect(screen.queryByRole('link', { name: /Xem gợi ý/ })).toBeNull();
  });

  it('deletes the profile only after confirmation', async () => {
    let deleted = 0;
    server.use(
      http.get('*/api/me/profile', () =>
        deleted
          ? new HttpResponse(null, { status: 404 })
          : HttpResponse.json(saved),
      ),
      http.get('*/api/me/targets', () => HttpResponse.json(targets)),
      http.delete('*/api/me/profile', () => {
        deleted++;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderApp(<ProfilePage />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Xóa hồ sơ' }));
    expect(deleted).toBe(0);
    await user.click(screen.getByRole('button', { name: 'Xác nhận xóa' }));
    expect(
      await screen.findByRole('button', { name: 'Lưu hồ sơ' }),
    ).toBeInTheDocument();
    expect(deleted).toBe(1);
    expect(screen.getByLabelText('Năm sinh')).toHaveValue(null);
  });
});

describe('suggestions page', () => {
  it('asks for a profile first', async () => {
    server.use(
      http.get(
        '*/api/me/profile',
        () => new HttpResponse(null, { status: 404 }),
      ),
    );
    renderApp(<SuggestionsPage />);
    expect(
      await screen.findByText('Bạn chưa có hồ sơ dinh dưỡng.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tạo hồ sơ' })).toHaveAttribute(
      'href',
      '/profile',
    );
  });

  it('shows the server meal with amounts and switches meals', async () => {
    const meals: (string | null)[] = [];
    server.use(
      http.get('*/api/me/profile', () => HttpResponse.json(saved)),
      http.get('*/api/me/recommendations', ({ request }) => {
        const meal = new URL(request.url).searchParams.get('meal');
        meals.push(meal);
        return HttpResponse.json({ ...lunch, meal });
      }),
    );
    renderApp(<SuggestionsPage />, '/suggestions');
    const list = await screen.findByRole('list', { name: 'Món gợi ý' });
    expect(within(list).getByRole('link', { name: 'Ức gà' })).toHaveAttribute(
      'href',
      '/products/1',
    );
    expect(within(list).getByText('70 g')).toBeInTheDocument();
    expect(screen.getByText('83%')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Phân tích bữa ăn/ }),
    ).toHaveAttribute('href', '/meal-analyzer?items=1:70,3:200');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Bữa tối' }));
    expect(
      await screen.findByRole('heading', { name: 'Bữa tối' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bữa tối' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(meals).toEqual(['LUNCH', 'DINNER']);
  });

  it('gives no personal suggestions to ineligible profiles', async () => {
    server.use(
      http.get('*/api/me/profile', () => HttpResponse.json(saved)),
      http.get('*/api/me/recommendations', () =>
        HttpResponse.json({
          ...lunch,
          eligible: false,
          ineligible: 'AGE',
          target: null,
          items: [],
          total: null,
          calories_pct: null,
          protein_pct: null,
        }),
      ),
    );
    renderApp(<SuggestionsPage />);
    expect(await screen.findByText(/từ 18 đến 65 tuổi/)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Món gợi ý' })).toBeNull();
  });
});

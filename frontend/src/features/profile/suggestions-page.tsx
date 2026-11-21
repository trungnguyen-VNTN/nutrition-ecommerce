import { useQuery } from '@tanstack/react-query';
import { Calculator, UserCircle } from '@phosphor-icons/react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Note } from '@/components/ui/note';
import { Skeleton } from '@/components/ui/skeleton';
import { SignInRequired } from '@/features/auth/auth-page';
import { useSession } from '@/features/auth/session';
import { formatItems } from '@/features/meal/meal-api';
import { apiErrorMessage } from '@/lib/api/client';
import { formatAmount } from '@/lib/nutrition';
import {
  getProfile,
  getRecommendation,
  ineligibleReasons,
  mealOptions,
  type Meal,
  type Recommendation,
} from './profile-api';
import { medicalNote } from './profile-form';

const isMeal = (value: string | null): value is Meal =>
  mealOptions.some((option) => option.value === value);

// One meal toward the caller's targets (D32); the server picks products and computes every number.
export function SuggestionsPage() {
  const identity = useSession();
  const [params, setParams] = useSearchParams();
  const raw = params.get('meal');
  const meal: Meal = isMeal(raw) ? raw : 'LUNCH';
  const profile = useQuery({
    queryKey: ['profile', identity?.sub],
    queryFn: ({ signal }) => getProfile(signal),
    enabled: !!identity,
    retry: false,
  });
  const recommendation = useQuery({
    queryKey: ['recommendation', identity?.sub, meal, profile.data?.updated_at],
    queryFn: ({ signal }) => getRecommendation(meal, signal),
    enabled: !!profile.data,
    retry: false,
  });

  return (
    <section className="space-y-6 md:space-y-8">
      <header className="max-w-copy space-y-3">
        <p className="eyebrow">Dành cho bạn</p>
        <h1 className="text-3xl font-extrabold md:text-4xl">Gợi ý cho bạn</h1>
        <p className="text-ink-muted">
          Một bữa gồm món giàu protein, rau hoặc trái cây và tinh bột, chọn từ
          sản phẩm còn hàng có đủ dữ liệu dinh dưỡng và không chứa allergen bạn
          cần tránh.
        </p>
        {profile.data && (
          <Link
            to="/profile"
            className="inline-flex min-h-touch items-center text-sm font-semibold underline underline-offset-4"
          >
            Sửa hồ sơ dinh dưỡng
          </Link>
        )}
      </header>
      {!identity ? (
        <SignInRequired />
      ) : profile.isPending ? (
        <Skeleton className="h-72 rounded-card" />
      ) : profile.isError ? (
        <ErrorState
          description={apiErrorMessage(profile.error)}
          error={profile.error}
          onRetry={() => void profile.refetch()}
        />
      ) : !profile.data ? (
        <EmptyState
          icon={<UserCircle />}
          title="Bạn chưa có hồ sơ dinh dưỡng."
          description="Tạo hồ sơ để hệ thống ước tính mục tiêu mỗi ngày và gợi ý bữa ăn phù hợp."
          action={
            <Button asChild>
              <Link to="/profile">Tạo hồ sơ</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          <div
            role="group"
            aria-label="Chọn bữa"
            className="flex flex-wrap gap-2"
          >
            {mealOptions.map((option) => (
              <Button
                key={option.value}
                variant={option.value === meal ? 'primary' : 'outline'}
                aria-pressed={option.value === meal}
                onClick={() => {
                  const copy = new URLSearchParams(params);
                  copy.set('meal', option.value);
                  setParams(copy, { replace: true });
                }}
              >
                {option.label}
              </Button>
            ))}
          </div>
          <Card
            className="space-y-5"
            aria-live="polite"
            aria-busy={recommendation.isFetching}
          >
            {recommendation.isError ? (
              <ErrorState
                description={apiErrorMessage(recommendation.error)}
                error={recommendation.error}
                onRetry={() => void recommendation.refetch()}
              />
            ) : !recommendation.data ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            ) : (
              <MealView recommendation={recommendation.data} />
            )}
          </Card>
          <Note tone="medical">{medicalNote}</Note>
        </div>
      )}
    </section>
  );
}

const label = (meal: Meal) =>
  mealOptions.find((option) => option.value === meal)?.label;

export function MealView({
  recommendation,
}: {
  recommendation: Recommendation;
}) {
  if (!recommendation.eligible)
    return (
      <Note tone="medical" role="status">
        {recommendation.ineligible
          ? ineligibleReasons[recommendation.ineligible]
          : null}{' '}
        Vì vậy hệ thống không đưa ra gợi ý cá nhân; hãy hỏi bác sĩ hoặc chuyên
        gia dinh dưỡng.
      </Note>
    );
  const { target, total, items } = recommendation;
  if (!items.length || !target || !total)
    return (
      <EmptyState
        title="Chưa tìm được món phù hợp."
        description="Hiện không có sản phẩm còn hàng đủ dữ liệu dinh dưỡng và không chứa allergen bạn tránh. Hãy thử bữa khác hoặc xem lại hồ sơ."
        action={
          <Button asChild variant="outline">
            <Link to="/profile">Xem hồ sơ</Link>
          </Button>
        }
      />
    );
  const analyzer = `/meal-analyzer?items=${formatItems(
    items.map((item) => ({
      productId: Number(item.product.id),
      grams: item.grams,
    })),
  )}`;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-bold">{label(recommendation.meal)}</h2>
        <p className="text-sm text-ink-muted tabular-nums">
          Mục tiêu bữa: {formatAmount(target.calories)} kcal ·{' '}
          {formatAmount(target.protein_g)} g protein
        </p>
      </div>
      <ul aria-label="Món gợi ý" className="divide-y divide-line">
        {items.map((item) => (
          <li
            key={item.product.id}
            className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-3"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                {item.role}
              </p>
              <Link
                to={`/products/${item.product.id}`}
                className="inline-flex min-h-touch items-center font-semibold text-ink underline underline-offset-4"
              >
                {item.product.name}
              </Link>
            </div>
            <p className="text-sm tabular-nums">
              <strong>{formatAmount(item.grams)} g</strong>
              <span className="text-ink-muted">
                {' '}
                · {formatAmount(item.amounts.calories)} kcal ·{' '}
                {formatAmount(item.amounts.protein_g)} g protein
              </span>
            </p>
          </li>
        ))}
      </ul>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Progress
          label="Năng lượng"
          value={`${formatAmount(total.calories)} / ${formatAmount(target.calories)} kcal`}
          pct={recommendation.calories_pct}
        />
        <Progress
          label="Protein"
          value={`${formatAmount(total.protein_g)} / ${formatAmount(target.protein_g)} g`}
          pct={recommendation.protein_pct}
        />
      </dl>
      <Button asChild variant="outline">
        <Link to={analyzer}>
          <Calculator aria-hidden="true" />
          Mở trong Phân tích bữa ăn
        </Link>
      </Button>
    </div>
  );
}

function Progress({
  label,
  value,
  pct,
}: {
  label: string;
  value: string;
  pct: number | null;
}) {
  const width = Math.min(100, Math.max(0, pct ?? 0));
  return (
    <div className="space-y-1.5 rounded-control border border-line p-3">
      <dt className="flex justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="tabular-nums">{pct === null ? '—' : `${pct}%`}</span>
      </dt>
      <dd className="space-y-1.5">
        <span
          aria-hidden="true"
          className="block h-2 overflow-hidden rounded-pill bg-sunken"
        >
          <span
            className="block h-full rounded-pill bg-brand"
            style={{ width: `${width}%` }}
          />
        </span>
        <span className="text-xs text-ink-muted tabular-nums">{value}</span>
      </dd>
    </div>
  );
}

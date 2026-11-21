import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  ArrowUpRight,
  Barbell,
  Lightning,
  ShieldCheck,
  Sparkle,
} from '@phosphor-icons/react';
import accountBanner800 from '@/assets/banners/banner-tai-khoan-800.webp';
import accountBanner1600 from '@/assets/banners/banner-tai-khoan-1600.webp';
import { Button } from '@/components/ui/button';
import { ProductCard, ProductCardSkeleton } from '@/components/product-card';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage } from '@/lib/api/client';
import { useSession } from '@/features/auth/session';
import { getProducts, getCategories } from '@/features/products/api/products';
import { BannerCarousel } from './banner-carousel';
import { Collections } from './collections';

// Goal shortcuts are plain links into the real catalog filters.
const goals = [
  {
    to: '/products?minProtein=15',
    title: 'Ưu tiên protein',
    text: 'Từ 15g protein mỗi khẩu phần.',
    tone: 'bg-protein-tint',
    Glyph: Barbell,
  },
  {
    to: '/products?maxCalories=150',
    title: 'Năng lượng vừa phải',
    text: 'Không quá 150 kcal mỗi khẩu phần.',
    tone: 'bg-lime-soft',
    Glyph: Lightning,
  },
  {
    to: '/products',
    title: 'Loại trừ allergen',
    text: 'Chọn thành phần cần tránh trong bộ lọc.',
    tone: 'bg-fat-tint',
    Glyph: ShieldCheck,
  },
] as const;

function SectionHead({
  eyebrow,
  title,
  to,
  link,
}: {
  eyebrow: string;
  title: string;
  to: string;
  link: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-bold">{title}</h2>
      </div>
      <Link
        to={to}
        className="inline-flex min-h-touch items-center gap-2 text-sm font-semibold text-brand underline underline-offset-4"
      >
        {link}
        <ArrowRight />
      </Link>
    </div>
  );
}

export function HomePage() {
  const identity = useSession();
  const query = useQuery({
    queryKey: ['products', { page: 0 }],
    queryFn: ({ signal }) => getProducts({ page: 0 }, signal),
    retry: false,
  });
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: ({ signal }) => getCategories(signal),
    retry: false,
  });
  return (
    <div className="space-y-12 md:space-y-16">
      <section className="space-y-6" aria-labelledby="home-title">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <h1
            id="home-title"
            className="text-4xl font-extrabold lg:text-display"
          >
            Hiểu thực phẩm.
            <br />
            <span className="text-ink-muted">Chọn điều phù hợp.</span>
          </h1>
          <div className="flex max-w-md flex-col items-start gap-4">
            <p className="text-ink-muted">
              Mỗi sản phẩm có nhãn dinh dưỡng theo khẩu phần, nguồn số liệu và
              trạng thái allergen. Thiếu dữ liệu thì ghi là thiếu, không đoán.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild variant="sticker">
                <Link to="/products">
                  Khám phá sản phẩm <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/chat">
                  <Sparkle />
                  Hỏi trợ lý AI
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <BannerCarousel />
      </section>

      <section className="space-y-6">
        <SectionHead
          eyebrow="Mua theo mục tiêu"
          title="Mục tiêu của bạn, bộ lọc của bạn"
          to="/products"
          link="Mở bộ lọc"
        />
        <div className="grid gap-4 md:grid-cols-3">
          {goals.map(({ to, title, text, tone, Glyph }) => (
            <Link
              key={title}
              to={to}
              className={`control-transition relative flex min-h-44 flex-col justify-end gap-2 rounded-card border border-transparent p-6 hover:border-ink ${tone}`}
            >
              <Glyph className="icon absolute top-5 right-5 text-4xl" />
              <span className="font-display text-2xl font-bold">{title}</span>
              <span className="text-sm">{text}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionHead
          eyebrow="Bộ sưu tập"
          title="Chọn nhanh theo nhóm"
          to="/products"
          link="Xem tất cả"
        />
        <Collections categories={categories.data} />
        {categories.isPending ? (
          <Skeleton className="h-11" />
        ) : categories.isError ? (
          <ErrorState
            description="Chưa tải được danh mục."
            error={categories.error}
            onRetry={() => void categories.refetch()}
          />
        ) : categories.data.length === 0 ? (
          <p className="text-ink-muted">
            Danh mục đang được cập nhật. Bạn vẫn có thể xem tất cả sản phẩm.
          </p>
        ) : (
          <nav aria-label="Tất cả danh mục">
            <ul className="flex flex-wrap gap-2">
              {categories.data.map((category) => (
                <li key={category.id}>
                  <Link
                    className="control-transition inline-flex min-h-touch items-center gap-2 rounded-pill border border-line bg-surface px-4 text-sm font-semibold hover:border-ink"
                    to={`/products?categoryId=${category.id}`}
                  >
                    {category.name}
                    <ArrowUpRight className="icon text-brand" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </section>

      <section className="space-y-6">
        <SectionHead
          eyebrow="Chọn cùng thông tin"
          title="Sản phẩm trong cửa hàng"
          to="/products"
          link="Xem danh sách"
        />
        {query.isPending ? (
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-6 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            description={apiErrorMessage(query.error)}
            error={query.error}
            onRetry={() => void query.refetch()}
          />
        ) : query.data.items.length === 0 ? (
          <p className="text-ink-muted">Chưa có sản phẩm đang bán.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 sm:gap-6 md:grid-cols-4">
            {query.data.items.slice(0, 4).map((product, index) => (
              <li key={product.id}>
                <ProductCard product={product} index={index} headingLevel={3} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {!identity && (
        <Link to="/register" className="account-banner">
          <img
            src={accountBanner800}
            srcSet={`${accountBanner800} 800w, ${accountBanner1600} 1600w`}
            sizes="(min-width: 1240px) 1176px, 100vw"
            alt=""
            loading="lazy"
            className="account-banner-image"
          />
          <span className="account-banner-copy">
            <span className="font-display text-2xl font-extrabold md:text-3xl">
              Lần đầu ghé? <span className="text-lime">Tạo tài khoản.</span>
            </span>
            <span className="text-sm text-cream/80">
              Lưu giỏ hàng, đặt hàng và theo dõi đơn ở một nơi.
            </span>
          </span>
          <span className="account-banner-cta">
            Đăng ký <ArrowRight aria-hidden="true" />
          </span>
        </Link>
      )}

      <section className="grid gap-6 rounded-sheet bg-brand p-6 text-cream md:grid-cols-[2fr_1fr] md:items-center md:p-10">
        <div className="space-y-4">
          <p className="text-sm font-semibold text-lime">
            Trợ lý dinh dưỡng AI
          </p>
          <h2 className="text-3xl font-bold">Bắt đầu bằng một câu hỏi.</h2>
          <p className="max-w-copy">
            Bạn muốn tìm thực phẩm giàu protein hoặc loại trừ một allergen? Trợ
            lý giúp tra cứu sản phẩm dựa trên dữ liệu có trong cửa hàng.
          </p>
          <p className="text-xs">
            Thông tin tham khảo, không phải tư vấn y tế.
          </p>
        </div>
        <div className="space-y-4">
          <p className="rounded-card border border-cream/40 p-4 text-sm">
            “Tìm sản phẩm có ít nhất 10g protein mỗi khẩu phần.”
          </p>
          <Button asChild variant="outline">
            <Link to="/chat">
              Bắt đầu tra cứu <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

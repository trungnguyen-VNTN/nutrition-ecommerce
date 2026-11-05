import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  ArrowUpRight,
  Barbell,
  Leaf,
  Lightning,
  ShieldCheck,
  Sparkle,
} from '@phosphor-icons/react';
import heroImage from '@/assets/food-editorial.webp';
import { Button } from '@/components/ui/button';
import { ProductCard, ProductCardSkeleton } from '@/components/product-card';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage } from '@/lib/api/client';
import { getProducts, getCategories } from '@/features/products/api/products';

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

const promises = [
  'Dinh dưỡng theo từng khẩu phần',
  'Allergen ghi rõ trạng thái xác minh',
  'Không đoán khi thiếu dữ liệu',
];

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
      <section
        className="grid items-center gap-8 md:grid-cols-[3fr_2fr] md:gap-12"
        aria-label="Trang chủ"
      >
        <div className="flex flex-col items-start gap-6">
          <p className="inline-flex items-center gap-2 rounded-pill border border-line-strong px-3 py-1 text-xs font-semibold">
            <Leaf weight="fill" className="icon text-brand" />
            Thực phẩm minh bạch · Lựa chọn mỗi ngày
          </p>
          <h1 className="text-4xl font-extrabold lg:text-display">
            Hiểu thực phẩm.
            <br />
            Chọn điều phù hợp.
          </h1>
          <p className="max-w-copy text-lg text-ink-muted">
            Mua sắm cùng thông tin dinh dưỡng rõ ràng. Khám phá thành phần, khẩu
            phần và allergen trước khi chọn món cho bạn.
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
        <figure className="hero-arch relative">
          <img
            src={heroImage}
            width="1200"
            height="800"
            alt="Bát ngũ cốc cùng rau xanh và các loại hạt — minh họa thực phẩm"
            fetchPriority="high"
            className="size-full object-cover"
          />
          <figcaption className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-pill bg-surface px-3 py-1 text-xs whitespace-nowrap">
            Ảnh minh họa AI · không phải sản phẩm
          </figcaption>
        </figure>
      </section>

      <ul className="flex flex-wrap justify-center gap-x-8 gap-y-2 rounded-card bg-brand px-4 py-4 text-sm font-semibold text-lime">
        {promises.map((promise) => (
          <li key={promise} className="flex items-center gap-2">
            <Leaf weight="fill" className="icon" />
            {promise}
          </li>
        ))}
      </ul>

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
          eyebrow="Bắt đầu từ điều bạn thích"
          title="Khám phá theo danh mục"
          to="/products"
          link="Xem tất cả"
        />
        {categories.isPending ? (
          <Skeleton className="h-16" />
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
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {categories.data.map((category) => (
              <Link
                className="control-transition flex min-h-16 items-center justify-between gap-3 rounded-card border border-line bg-surface p-4 font-semibold hover:border-ink"
                key={category.id}
                to={`/products?categoryId=${category.id}`}
              >
                <span>{category.name}</span>
                <ArrowUpRight className="icon text-brand" />
              </Link>
            ))}
          </div>
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

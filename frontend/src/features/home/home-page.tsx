import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product-card';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { apiErrorMessage } from '@/lib/api/client';
import { getProducts, getCategories } from '@/features/products/api/products';

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
    <div className="space-y-12">
      <section className="hero" aria-label="Trang chủ">
        <div className="hero-copy">
          <p className="eyebrow">THỰC PHẨM MINH BẠCH · LỰA CHỌN MỖI NGÀY</p>
          <h1 className="hero-title">
            Hiểu thực phẩm.
            <br />
            Chọn điều phù hợp.
          </h1>
          <p className="max-w-copy text-neutral-700">
            Mua sắm cùng thông tin dinh dưỡng rõ ràng. Khám phá thành phần, khẩu
            phần và allergen trước khi chọn món cho bạn.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/products">
                Khám phá sản phẩm <span aria-hidden="true">↗</span>
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/chat">Hỏi trợ lý AI</Link>
            </Button>
          </div>
        </div>
        <figure className="hero-image">
          <img
            src="/images/food-editorial.webp"
            width="1200"
            height="800"
            alt="Bát ngũ cốc cùng rau xanh và các loại hạt — minh họa thực phẩm"
            fetchPriority="high"
          />
          <figcaption>Ảnh minh họa AI · không phải sản phẩm</figcaption>
        </figure>
      </section>
      <div className="benefit-strip">
        {[
          ['01', 'Dinh dưỡng rõ ràng', 'Đọc số liệu theo từng khẩu phần.'],
          [
            '02',
            'Allergen minh bạch',
            'Phân biệt dữ liệu đã và chưa xác minh.',
          ],
          ['03', 'Tra cứu cùng AI', 'Tìm sản phẩm từ thông tin cửa hàng.'],
        ].map(([number, title, text]) => (
          <div key={number}>
            <span className="benefit-number" aria-hidden="true">
              {number}
            </span>
            <div>
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-neutral-700">{text}</p>
            </div>
          </div>
        ))}
      </div>
      <section className="space-y-6">
        <div className="section-heading">
          <div>
            <p className="eyebrow">BẮT ĐẦU TỪ ĐIỀU BẠN THÍCH</p>
            <h2 className="mt-2 text-2xl font-semibold">
              Khám phá theo danh mục
            </h2>
          </div>
          <Link
            to="/products"
            className="inline-flex min-h-touch items-center text-sm font-semibold text-primary-700"
          >
            Xem tất cả →
          </Link>
        </div>
        {categories.isPending ? (
          <Skeleton className="h-16" />
        ) : categories.isError ? (
          <ErrorState
            description="Chưa tải được danh mục."
            onRetry={() => void categories.refetch()}
          />
        ) : categories.data.length === 0 ? (
          <p>
            Danh mục đang được cập nhật. Bạn vẫn có thể xem tất cả sản phẩm.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.data.map((category) => (
              <Link
                className="category-link"
                key={category.id}
                to={`/products?categoryId=${category.id}`}
              >
                <span>{category.name}</span>
                <span aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        )}
      </section>
      <section className="space-y-6">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CHỌN CÙNG THÔNG TIN</p>
            <h2 className="mt-2 text-2xl font-semibold">
              Sản phẩm trong cửa hàng
            </h2>
          </div>
          <Button asChild variant="ghost">
            <Link to="/products">Xem danh sách →</Link>
          </Button>
        </div>
        {query.isPending ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="aspect-[3/4]" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            description={apiErrorMessage(query.error)}
            onRetry={() => void query.refetch()}
          />
        ) : query.data.items.length === 0 ? (
          <p>Chưa có sản phẩm đang bán.</p>
        ) : (
          <ul className="home-products grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {query.data.items.slice(0, 4).map((product, index) => (
              <li key={product.id}>
                <ProductCard product={product} index={index} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="ai-teaser">
        <div className="space-y-4">
          <p className="text-sm">TRỢ LÝ DINH DƯỠNG AI</p>
          <h2 className="text-3xl font-semibold">Bắt đầu bằng một câu hỏi.</h2>
          <p>
            Bạn muốn tìm thực phẩm giàu protein hoặc loại trừ một allergen? Trợ
            lý giúp tra cứu sản phẩm dựa trên dữ liệu có trong cửa hàng.
          </p>
          <p className="text-xs">
            Thông tin tham khảo, không phải tư vấn y tế.
          </p>
        </div>
        <div className="space-y-4">
          <p className="rounded-card border border-primary-500 p-4 text-sm">
            “Tìm sản phẩm có ít nhất 10g protein mỗi khẩu phần.”
          </p>
          <Button asChild variant="secondary">
            <Link to="/chat">Bắt đầu tra cứu →</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

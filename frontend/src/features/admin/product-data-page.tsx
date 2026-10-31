import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/features/auth/session';
import { SignInRequired } from '@/features/auth/auth-page';
import { apiErrorMessage, requestJson } from '@/lib/api/client';
import {
  nutrientFields,
  nutrientLabels,
  nutritionPayload,
  productDataSchema,
  type ProductData,
} from './product-data';

const control =
  'mt-2 block min-h-touch w-full rounded-control border border-neutral-200 bg-neutral-50 px-3';
export function ProductDataPage() {
  const { id = '' } = useParams();
  const identity = useSession();
  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <p className="text-sm font-semibold text-primary-700">
          Quản trị · Minh bạch dữ liệu
        </p>
        <h1 className="text-3xl font-semibold">Dữ liệu sản phẩm</h1>
        <p className="max-w-copy text-neutral-700">
          Cập nhật theo nguồn đã kiểm chứng. Các ô chưa có dữ liệu cần để trống,
          không thay bằng số 0.
        </p>
      </header>
      <Link to="/admin" className="text-primary-700 underline">
        Về quản trị
      </Link>
      {!identity ? (
        <SignInRequired />
      ) : !identity.admin ? (
        <p role="alert">Bạn không có quyền quản trị.</p>
      ) : (
        <ProductDataEditor id={id} />
      )}
    </section>
  );
}
function ProductDataEditor({ id }: { id: string }) {
  const cache = useQueryClient();
  const queryKey = ['admin-data', id];
  const query = useQuery({
    queryKey,
    queryFn: async () =>
      productDataSchema.parse(
        await requestJson(`admin/products/${encodeURIComponent(id)}/data`),
      ),
    retry: false,
  });
  const save = useMutation({
    mutationFn: ({
      section,
      body,
    }: {
      section: 'nutrition' | 'allergens';
      body: object;
    }) =>
      requestJson(`admin/products/${encodeURIComponent(id)}/${section}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey });
      await cache.invalidateQueries({ queryKey: ['product'] });
      await cache.invalidateQueries({ queryKey: ['products'] });
    },
  });
  if (query.isPending) return <Skeleton className="h-16" />;
  if (query.isError)
    return (
      <ErrorState
        description={apiErrorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    );
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold">{query.data.name}</h2>
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <NutritionForm
          key={`nutrition-${query.dataUpdatedAt}`}
          data={query.data}
          busy={save.isPending}
          onSave={(body) => save.mutate({ section: 'nutrition', body })}
        />
        <AllergensForm
          key={`allergens-${query.dataUpdatedAt}`}
          data={query.data}
          busy={save.isPending}
          onSave={(body) => save.mutate({ section: 'allergens', body })}
        />
      </div>
      {save.isError && <p role="alert">{apiErrorMessage(save.error)}</p>}
      {save.isSuccess && <p role="status">Đã lưu dữ liệu.</p>}
    </div>
  );
}
function NutritionForm({
  data,
  busy,
  onSave,
}: {
  data: ProductData;
  busy: boolean;
  onSave: (body: object) => void;
}) {
  return (
    <form
      className="min-w-0 space-y-4 rounded-card border border-neutral-200 p-4 md:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(nutritionPayload(new FormData(event.currentTarget)));
      }}
    >
      <h3 className="text-xl font-semibold">Dinh dưỡng theo khẩu phần</h3>
      <p>
        {data.nutrition_complete
          ? 'Có dữ liệu dinh dưỡng'
          : 'Chưa có dữ liệu dinh dưỡng đầy đủ'}
        . Để trống khi chưa biết; không nhập 0 thay cho dữ liệu thiếu.
      </p>
      <label className="block">
        Khẩu phần
        <input
          className={control}
          name="serving_size"
          type="number"
          min="0.01"
          max="99999999.99"
          step="0.01"
          defaultValue={data.serving_size ?? ''}
        />
      </label>
      <div>
        <label htmlFor="serving-unit">Đơn vị</label>
        <select
          className={control}
          id="serving-unit"
          name="serving_unit"
          defaultValue={data.serving_unit ?? ''}
        >
          <option value="">Chưa xác định</option>
          <option value="g">g</option>
          <option value="ml">ml</option>
          <option value="unit">đơn vị</option>
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {nutrientFields.map((field) => (
          <label key={field}>
            {nutrientLabels[field]}
            <input
              className={control}
              name={field}
              type="number"
              min="0"
              max={field === 'sodium_mg' ? '99999999.99' : '999999.99'}
              step="0.01"
              defaultValue={data.nutrition?.[field] ?? ''}
            />
          </label>
        ))}
      </div>
      <label className="block">
        Nguồn dữ liệu
        <input
          className={control}
          name="source"
          required
          maxLength={500}
          defaultValue={data.nutrition?.source ?? ''}
        />
      </label>
      <Button type="submit" loading={busy}>
        Lưu dinh dưỡng
      </Button>
    </form>
  );
}
function AllergensForm({
  data,
  busy,
  onSave,
}: {
  data: ProductData;
  busy: boolean;
  onSave: (body: object) => void;
}) {
  return (
    <form
      className="min-w-0 space-y-4 rounded-card border border-neutral-200 p-4 md:p-6"
      onSubmit={(event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        onSave({
          verified: values.get('verified') === 'on',
          items: data.available_allergens.flatMap((allergen) => {
            const kind = values.get(allergen.code);
            return kind ? [{ code: allergen.code, kind }] : [];
          }),
        });
      }}
    >
      <h3 className="text-xl font-semibold">Allergen</h3>
      <p>
        {data.allergens_verified
          ? 'Allergen đã xác minh'
          : 'Chưa xác minh allergen'}
        . Chỉ đánh dấu đã xác minh sau khi kiểm tra nguồn dữ liệu.
      </p>
      {data.available_allergens.map((allergen) => (
        <div key={allergen.code}>
          <label htmlFor={`allergen-${allergen.code}`}>{allergen.name}</label>
          <select
            className={control}
            id={`allergen-${allergen.code}`}
            name={allergen.code}
            defaultValue={
              data.allergens.find((item) => item.code === allergen.code)
                ?.kind ?? ''
            }
          >
            <option value="">Không ghi nhận</option>
            <option value="contains">Có chứa</option>
            <option value="may_contain">Có thể chứa</option>
          </select>
        </div>
      ))}
      <label className="flex min-h-touch items-center gap-3">
        <input
          type="checkbox"
          name="verified"
          defaultChecked={data.allergens_verified}
        />
        Tôi đã xác minh danh sách allergen
      </label>
      <Button type="submit" loading={busy}>
        Lưu allergen
      </Button>
    </form>
  );
}

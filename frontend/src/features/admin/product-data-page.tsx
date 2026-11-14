import { messages } from '@/app/messages.vi';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';
import { Note } from '@/components/ui/note';
import { Tag } from '@/components/ui/tag';
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

export function ProductDataPage() {
  const { id = '' } = useParams();
  const identity = useSession();
  return (
    <section className="space-y-6">
      <header className="space-y-3">
        <Link
          to="/admin"
          className="inline-flex min-h-touch items-center gap-2 text-sm font-semibold text-brand underline underline-offset-4"
        >
          <ArrowLeft /> Về quản trị
        </Link>
        <p className="eyebrow">Quản trị · Minh bạch dữ liệu</p>
        <h1 className="text-4xl font-extrabold">Dữ liệu sản phẩm</h1>
        <p className="max-w-copy text-ink-muted">
          Cập nhật theo nguồn đã kiểm chứng. Các ô chưa có dữ liệu cần để trống,
          không thay bằng số 0.
        </p>
      </header>
      {!identity ? (
        <SignInRequired />
      ) : !identity.admin ? (
        <Note tone="error" role="alert">
          Bạn không có quyền quản trị.
        </Note>
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
  if (query.isPending)
    return (
      <div className="grid items-start gap-6 md:grid-cols-2">
        <Skeleton className="h-96 rounded-card" />
        <Skeleton className="h-96 rounded-card" />
      </div>
    );
  if (query.isError)
    return (
      <ErrorState
        description={apiErrorMessage(query.error)}
        error={query.error}
        onRetry={() => void query.refetch()}
      />
    );
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">{query.data.name}</h2>
      {save.isError && (
        <Note tone="error" role="alert">
          {apiErrorMessage(save.error)}
        </Note>
      )}
      {save.isSuccess && (
        <Note tone="success" role="status">
          Đã lưu dữ liệu.
        </Note>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-2">
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
    <Card
      as="form"
      className="min-w-0 space-y-4"
      onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSave(nutritionPayload(new FormData(event.currentTarget)));
      }}
    >
      <h3 className="text-xl font-bold">Dinh dưỡng theo khẩu phần</h3>
      {data.nutrition_complete ? (
        <Tag tone="success" icon={<CheckCircle />}>
          Có dữ liệu dinh dưỡng
        </Tag>
      ) : (
        <Tag tone="warning" dashed icon={<WarningCircle />}>
          Chưa có dữ liệu dinh dưỡng đầy đủ
        </Tag>
      )}
      <p className="text-sm text-ink-muted">
        Để trống khi chưa biết; không nhập 0 thay cho dữ liệu thiếu.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Khẩu phần">
          {(control) => (
            <Input
              {...control}
              name="serving_size"
              type="number"
              min="0.01"
              max="99999999.99"
              step="0.01"
              defaultValue={data.serving_size ?? ''}
            />
          )}
        </Field>
        <Field label="Đơn vị">
          {(control) => (
            <Select
              {...control}
              name="serving_unit"
              defaultValue={data.serving_unit ?? ''}
            >
              <option value="">Chưa xác định</option>
              <option value="g">g</option>
              <option value="ml">ml</option>
              <option value="unit">đơn vị</option>
            </Select>
          )}
        </Field>
        {nutrientFields.map((field) => (
          <Field key={field} label={nutrientLabels[field]}>
            {(control) => (
              <Input
                {...control}
                name={field}
                type="number"
                min="0"
                max={field === 'sodium_mg' ? '99999999.99' : '999999.99'}
                step="0.01"
                defaultValue={data.nutrition?.[field] ?? ''}
              />
            )}
          </Field>
        ))}
      </div>
      <Field label="Nguồn dữ liệu" required>
        {(control) => (
          <Input
            {...control}
            name="source"
            maxLength={500}
            defaultValue={data.nutrition?.source ?? ''}
          />
        )}
      </Field>
      <Button type="submit" loading={busy}>
        Lưu dinh dưỡng
      </Button>
    </Card>
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
    <Card
      as="form"
      className="min-w-0 space-y-4"
      onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
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
      <h3 className="text-xl font-bold">Allergen</h3>
      {data.allergens_verified && data.allergens_reviewed ? (
        <Tag tone="success" icon={<CheckCircle />}>
          {messages.allergensVerified}
        </Tag>
      ) : data.allergens_verified ? (
        <Tag tone="warning" dashed icon={<WarningCircle />}>
          {messages.allergensSample}: chưa có người xác nhận
        </Tag>
      ) : (
        <Tag tone="warning" dashed icon={<WarningCircle />}>
          Chưa xác minh allergen
        </Tag>
      )}
      <p className="text-sm text-ink-muted">
        Chỉ đánh dấu đã xác minh sau khi đối chiếu nhãn bao bì. Lưu với ô đã
        đánh dấu sẽ ghi nhận bạn đã xác nhận.
      </p>
      {data.available_allergens.map((allergen) => (
        <Field key={allergen.code} label={allergen.name}>
          {(control) => (
            <Select
              {...control}
              name={allergen.code}
              defaultValue={
                data.allergens.find((item) => item.code === allergen.code)
                  ?.kind ?? ''
              }
            >
              <option value="">Không ghi nhận</option>
              <option value="contains">Có chứa</option>
              <option value="may_contain">Có thể chứa</option>
            </Select>
          )}
        </Field>
      ))}
      <label className="flex min-h-touch items-center gap-3 text-sm font-semibold">
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
    </Card>
  );
}

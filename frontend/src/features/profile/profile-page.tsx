import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Trash } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field, Input, Select } from '@/components/ui/field';
import { Note } from '@/components/ui/note';
import { Pill } from '@/components/ui/pill';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast-context';
import { SignInRequired } from '@/features/auth/auth-page';
import { useSession } from '@/features/auth/session';
import { allergenOptions } from '@/features/products/api/filters';
import { apiErrorMessage } from '@/lib/api/client';
import {
  activityOptions,
  deleteProfile,
  getProfile,
  getTargets,
  goalOptions,
  ineligibleReasons,
  saveProfile,
  sexOptions,
  type Profile,
  type ProfileInput,
  type Targets,
} from './profile-api';
import {
  medicalNote,
  toDraft,
  validate,
  type Draft,
  type Errors,
} from './profile-form';

// Nutrition profile and estimated daily targets (D32). Body data stays on the server, never in the AI prompt.
export function ProfilePage() {
  const identity = useSession();
  const profile = useQuery({
    queryKey: ['profile', identity?.sub],
    queryFn: ({ signal }) => getProfile(signal),
    enabled: !!identity,
    retry: false,
  });
  return (
    <section className="space-y-6 md:space-y-8">
      <header className="max-w-copy space-y-3">
        <p className="eyebrow">Tài khoản của bạn</p>
        <h1 className="text-3xl font-extrabold md:text-4xl">
          Hồ sơ dinh dưỡng
        </h1>
        <p className="text-ink-muted">
          Nhập vài thông tin cơ thể để ước tính năng lượng và chất đa lượng mỗi
          ngày, rồi xem gợi ý bữa ăn từ sản phẩm trong cửa hàng.
        </p>
      </header>
      {!identity ? (
        <SignInRequired />
      ) : profile.isPending ? (
        <div aria-busy="true" className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <Skeleton className="h-[36rem] rounded-card" />
          <Skeleton className="h-64 rounded-card" />
        </div>
      ) : profile.isError ? (
        <ErrorState
          description={apiErrorMessage(profile.error)}
          error={profile.error}
          onRetry={() => void profile.refetch()}
        />
      ) : (
        <ProfileForm
          key={profile.data?.updated_at ?? 'new'}
          profile={profile.data}
        />
      )}
    </section>
  );
}

function ProfileForm({ profile }: { profile: Profile | null }) {
  const client = useQueryClient();
  const toast = useToast();
  const [draft, setDraft] = useState(() => toDraft(profile));
  const [errors, setErrors] = useState<Errors>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const targets = useQuery({
    queryKey: ['targets', profile?.updated_at],
    queryFn: ({ signal }) => getTargets(signal),
    enabled: profile !== null,
    retry: false,
  });
  const save = useMutation({
    mutationFn: (input: ProfileInput) => saveProfile(input),
    onSuccess: (saved) => {
      client.setQueriesData({ queryKey: ['profile'] }, saved);
      void client.invalidateQueries({ queryKey: ['recommendation'] });
      toast('Đã lưu hồ sơ dinh dưỡng.');
    },
  });
  const remove = useMutation({
    mutationFn: deleteProfile,
    onSuccess: () => {
      client.setQueriesData({ queryKey: ['profile'] }, null);
      void client.invalidateQueries({ queryKey: ['recommendation'] });
      toast('Đã xóa hồ sơ dinh dưỡng.');
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const found = validate(draft);
    setErrors(found);
    if (Object.keys(found).length) {
      const first = Object.keys(found)[0];
      document.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus();
      return;
    }
    save.mutate({
      birth_year: Number(draft.birthYear),
      sex: draft.sex as ProfileInput['sex'],
      height_cm: Number(draft.heightCm),
      weight_kg: Number(draft.weightKg),
      activity: draft.activity as ProfileInput['activity'],
      goal: draft.goal as ProfileInput['goal'],
      excluded_allergens: draft.excludedAllergens,
      pregnant_or_breastfeeding: draft.sex === 'FEMALE' && draft.pregnant,
      medical_condition: draft.medical,
      consent: true,
    });
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
      <Card className="space-y-6">
        <form
          noValidate
          onSubmit={submit}
          className="space-y-6"
          aria-label="Hồ sơ dinh dưỡng"
        >
          <fieldset className="space-y-4">
            <legend className="text-xl font-bold">Thông tin cơ thể</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Năm sinh" required error={errors.birthYear}>
                {(control) => (
                  <Input
                    {...control}
                    data-field="birthYear"
                    type="number"
                    inputMode="numeric"
                    autoComplete="bday-year"
                    min={1900}
                    value={draft.birthYear}
                    onChange={(event) => set('birthYear', event.target.value)}
                  />
                )}
              </Field>
              <Field
                label="Giới tính sinh học"
                required
                hint="Dùng trong công thức năng lượng nghỉ."
                error={errors.sex}
              >
                {(control) => (
                  <Select
                    {...control}
                    data-field="sex"
                    value={draft.sex}
                    onChange={(event) => set('sex', event.target.value)}
                  >
                    <option value="">Chọn…</option>
                    {sexOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Chiều cao (cm)" required error={errors.heightCm}>
                {(control) => (
                  <Input
                    {...control}
                    data-field="heightCm"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={draft.heightCm}
                    onChange={(event) => set('heightCm', event.target.value)}
                  />
                )}
              </Field>
              <Field label="Cân nặng (kg)" required error={errors.weightKg}>
                {(control) => (
                  <Input
                    {...control}
                    data-field="weightKg"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={draft.weightKg}
                    onChange={(event) => set('weightKg', event.target.value)}
                  />
                )}
              </Field>
            </div>
          </fieldset>

          <Choice
            legend="Mức vận động"
            name="activity"
            options={activityOptions}
            value={draft.activity}
            onChange={(value) => set('activity', value)}
          />
          <Choice
            legend="Mục tiêu"
            name="goal"
            options={goalOptions}
            value={draft.goal}
            onChange={(value) => set('goal', value)}
          />

          <fieldset className="space-y-3">
            <legend className="font-semibold">Allergen cần tránh</legend>
            <p className="text-sm text-ink-muted">
              Gợi ý sẽ loại các sản phẩm chứa hoặc chưa xác minh những allergen
              này.
            </p>
            <div className="flex flex-wrap gap-2">
              {allergenOptions.map((option) => (
                <label
                  key={option.code}
                  className="control-transition flex min-h-touch cursor-pointer items-center gap-2 rounded-control border border-line-strong px-3 text-sm has-checked:border-ink has-checked:bg-lime"
                >
                  <input
                    type="checkbox"
                    checked={draft.excludedAllergens.includes(option.code)}
                    onChange={(event) =>
                      set(
                        'excludedAllergens',
                        event.target.checked
                          ? [...draft.excludedAllergens, option.code]
                          : draft.excludedAllergens.filter(
                              (code) => code !== option.code,
                            ),
                      )
                    }
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="font-semibold">Tình trạng đặc biệt</legend>
            {draft.sex === 'FEMALE' && (
              <Check
                checked={draft.pregnant}
                onChange={(value) => set('pregnant', value)}
                label="Đang mang thai hoặc cho con bú"
              />
            )}
            <Check
              checked={draft.medical}
              onChange={(value) => set('medical', value)}
              label="Có bệnh cần chế độ ăn có giám sát (ví dụ tiểu đường, bệnh thận)"
            />
            <p className="text-sm text-ink-muted">
              Khi chọn, hệ thống không đưa ra mục tiêu cá nhân mà khuyên bạn gặp
              chuyên gia.
            </p>
          </fieldset>

          <div className="space-y-1">
            <Check
              checked={draft.consent}
              onChange={(value) => set('consent', value)}
              label="Tôi đồng ý lưu các thông tin trên chỉ để ước tính dinh dưỡng. Tôi có thể xóa hồ sơ bất cứ lúc nào."
              field="consent"
              invalid={!!errors.consent}
            />
            {errors.consent && (
              <p id="consent-error" className="text-sm font-medium text-danger">
                {errors.consent}
              </p>
            )}
          </div>

          {save.isError && (
            <Note tone="error" role="alert">
              {apiErrorMessage(save.error)}
            </Note>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={save.isPending}
              aria-busy={save.isPending}
            >
              {save.isPending
                ? 'Đang lưu…'
                : profile
                  ? 'Cập nhật hồ sơ'
                  : 'Lưu hồ sơ'}
            </Button>
          </div>
        </form>

        {profile && (
          <div className="space-y-3 border-t border-line pt-5">
            <h2 className="font-semibold">Xóa hồ sơ</h2>
            <p className="text-sm text-ink-muted">
              Xóa toàn bộ thông tin cơ thể đã lưu. Không thể hoàn tác.
            </p>
            {remove.isError && (
              <Note tone="error">{apiErrorMessage(remove.error)}</Note>
            )}
            {confirmDelete ? (
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="destructive"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate()}
                >
                  <Trash aria-hidden="true" />
                  {remove.isPending ? 'Đang xóa…' : 'Xác nhận xóa'}
                </Button>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Hủy
                </Button>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setConfirmDelete(true)}>
                <Trash aria-hidden="true" />
                Xóa hồ sơ
              </Button>
            )}
          </div>
        )}
      </Card>

      <Card className="space-y-5 lg:sticky lg:top-24" aria-live="polite">
        <h2 className="text-xl font-bold">Mục tiêu mỗi ngày</h2>
        {!profile ? (
          <p className="text-sm text-ink-muted">
            Lưu hồ sơ để xem năng lượng và chất đa lượng ước tính.
          </p>
        ) : targets.isError ? (
          <ErrorState
            description={apiErrorMessage(targets.error)}
            error={targets.error}
            onRetry={() => void targets.refetch()}
          />
        ) : !targets.data ? (
          <div aria-busy="true" className="space-y-3">
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-24" />
          </div>
        ) : (
          <TargetsView targets={targets.data} />
        )}
        <Note tone="medical">{medicalNote}</Note>
      </Card>
    </div>
  );
}

export function TargetsView({ targets }: { targets: Targets }) {
  if (!targets.eligible)
    return (
      <Note tone="medical" role="status">
        {targets.ineligible ? ineligibleReasons[targets.ineligible] : null} Vì
        vậy hệ thống không đưa ra mục tiêu hay gợi ý cá nhân; hãy hỏi bác sĩ
        hoặc chuyên gia dinh dưỡng.
      </Note>
    );
  return (
    <div className="space-y-4">
      <p>
        <span className="font-display text-4xl font-extrabold tabular-nums">
          {targets.calories?.toLocaleString('vi-VN')}
        </span>{' '}
        kcal mỗi ngày
      </p>
      <ul aria-label="Chất đa lượng mỗi ngày" className="flex flex-wrap gap-2">
        <li>
          <Pill macro="protein">Protein {targets.protein_g} g</Pill>
        </li>
        <li>
          <Pill macro="carb">Carbohydrate {targets.carbs_g} g</Pill>
        </li>
        <li>
          <Pill macro="fat">Chất béo {targets.fat_g} g</Pill>
        </li>
      </ul>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-ink-muted">Năng lượng nghỉ</dt>
          <dd className="font-semibold tabular-nums">
            {targets.resting_calories} kcal
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">BMI</dt>
          <dd className="font-semibold tabular-nums">
            {targets.bmi?.toLocaleString('vi-VN')}
          </dd>
        </div>
      </dl>
      <Button asChild variant="sticker">
        <Link to="/suggestions">
          Xem gợi ý bữa ăn
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}

function Choice<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: readonly { value: T; label: string; hint: string }[];
  value: string;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-semibold">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="control-transition flex min-h-touch cursor-pointer items-start gap-3 rounded-control border border-line-strong p-3 text-sm has-checked:border-ink has-checked:bg-lime-soft"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="mt-1"
            />
            <span>
              <strong className="block">{option.label}</strong>
              <span className="text-ink-muted">{option.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Check({
  checked,
  onChange,
  label,
  field,
  invalid,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  field?: string;
  invalid?: boolean;
}) {
  return (
    <label className="flex min-h-touch cursor-pointer items-start gap-3 text-sm">
      <input
        type="checkbox"
        data-field={field}
        checked={checked}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid && field ? `${field}-error` : undefined}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1"
      />
      <span>{label}</span>
    </label>
  );
}

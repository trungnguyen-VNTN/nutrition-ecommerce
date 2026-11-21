import { z } from 'zod';
import { ApiError, getJson, requestJson } from '@/lib/api/client';

export const sexOptions = [
  { value: 'FEMALE', label: 'Nữ' },
  { value: 'MALE', label: 'Nam' },
] as const;
export const activityOptions = [
  {
    value: 'SEDENTARY',
    label: 'Ít vận động',
    hint: 'Làm việc văn phòng, hầu như không tập.',
  },
  { value: 'LIGHT', label: 'Vận động nhẹ', hint: 'Tập nhẹ 1–3 buổi mỗi tuần.' },
  { value: 'MODERATE', label: 'Vận động vừa', hint: 'Tập 3–5 buổi mỗi tuần.' },
  {
    value: 'ACTIVE',
    label: 'Vận động nhiều',
    hint: 'Tập nặng 6–7 buổi mỗi tuần.',
  },
] as const;
export const goalOptions = [
  { value: 'LOSE', label: 'Giảm cân', hint: 'Năng lượng thấp hơn khoảng 15%.' },
  {
    value: 'MAINTAIN',
    label: 'Giữ cân',
    hint: 'Năng lượng bằng mức tiêu hao ước tính.',
  },
  {
    value: 'GAIN_MUSCLE',
    label: 'Tăng cơ',
    hint: 'Năng lượng cao hơn khoảng 10%, nhiều protein hơn.',
  },
] as const;
export const mealOptions = [
  { value: 'BREAKFAST', label: 'Bữa sáng' },
  { value: 'LUNCH', label: 'Bữa trưa' },
  { value: 'DINNER', label: 'Bữa tối' },
] as const;

const values = <T extends readonly { value: string }[]>(options: T) =>
  options.map((option) => option.value) as [
    T[number]['value'],
    ...T[number]['value'][],
  ];

export type Sex = (typeof sexOptions)[number]['value'];
export type Activity = (typeof activityOptions)[number]['value'];
export type Goal = (typeof goalOptions)[number]['value'];
export type Meal = (typeof mealOptions)[number]['value'];

const decimal = z.coerce.number().finite();
export const profileSchema = z.object({
  birth_year: z.number().int(),
  sex: z.enum(values(sexOptions)),
  height_cm: decimal,
  weight_kg: decimal,
  activity: z.enum(values(activityOptions)),
  goal: z.enum(values(goalOptions)),
  excluded_allergens: z
    .array(z.string())
    .nullable()
    .transform((v) => v ?? []),
  pregnant_or_breastfeeding: z.boolean(),
  medical_condition: z.boolean(),
  updated_at: z.string().nullable().optional(),
});
export type Profile = z.infer<typeof profileSchema>;
export type ProfileInput = Omit<Profile, 'updated_at'> & { consent: true };

export const ineligibleReasons = {
  AGE: 'Ước tính chỉ dành cho người từ 18 đến 65 tuổi.',
  PREGNANCY:
    'Khi mang thai hoặc cho con bú, nhu cầu dinh dưỡng cần được chuyên gia đánh giá riêng.',
  MEDICAL:
    'Với bệnh cần chế độ ăn có giám sát, hãy theo hướng dẫn của bác sĩ hoặc chuyên gia dinh dưỡng.',
  BMI: 'Chỉ số BMI nằm ngoài khoảng ước tính áp dụng (17–35).',
} as const;
const ineligible = z.enum(['AGE', 'PREGNANCY', 'MEDICAL', 'BMI']).nullable();

const whole = z.number().int().nullable();
export const targetsSchema = z.object({
  eligible: z.boolean(),
  ineligible,
  age: z.number().int(),
  bmi: decimal.nullable(),
  resting_calories: whole,
  daily_calories: whole,
  calories: whole,
  protein_g: whole,
  carbs_g: whole,
  fat_g: whole,
});
export type Targets = z.infer<typeof targetsSchema>;

const amounts = z.object({
  calories: decimal,
  protein_g: decimal,
  carbs_g: decimal,
  fat_g: decimal,
});
export const recommendationSchema = z.object({
  eligible: z.boolean(),
  ineligible,
  meal: z.enum(values(mealOptions)),
  target: amounts.nullable(),
  items: z.array(
    z.object({
      product: z.object({
        id: z.union([z.number(), z.string()]).transform(String),
        name: z.string(),
      }),
      grams: decimal,
      role: z.string(),
      amounts,
    }),
  ),
  total: amounts.nullable(),
  calories_pct: z.number().int().nullable(),
  protein_pct: z.number().int().nullable(),
});
export type Recommendation = z.infer<typeof recommendationSchema>;

/** `null` when the caller has no profile yet (404). */
export async function getProfile(
  signal?: AbortSignal,
): Promise<Profile | null> {
  try {
    return profileSchema.parse(await getJson('me/profile', signal));
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function saveProfile(input: ProfileInput): Promise<Profile> {
  return profileSchema.parse(
    await requestJson('me/profile', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  );
}

export async function deleteProfile(): Promise<void> {
  await requestJson('me/profile', { method: 'DELETE' });
}

export async function getTargets(signal?: AbortSignal): Promise<Targets> {
  return targetsSchema.parse(await getJson('me/targets', signal));
}

export async function getRecommendation(
  meal: Meal,
  signal?: AbortSignal,
): Promise<Recommendation> {
  return recommendationSchema.parse(
    await getJson(`me/recommendations?meal=${meal}`, signal),
  );
}

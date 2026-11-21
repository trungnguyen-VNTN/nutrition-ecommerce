import type { Profile } from './profile-api';

export const medicalNote =
  'Đây là ước tính tham khảo cho người trưởng thành khỏe mạnh, không phải lời khuyên y tế. Hãy hỏi bác sĩ hoặc chuyên gia dinh dưỡng trước khi thay đổi chế độ ăn.';

export type Draft = {
  birthYear: string;
  sex: string;
  heightCm: string;
  weightKg: string;
  activity: string;
  goal: string;
  excludedAllergens: string[];
  pregnant: boolean;
  medical: boolean;
  consent: boolean;
};
export type Errors = Partial<Record<keyof Draft, string>>;

export const toDraft = (profile: Profile | null): Draft => ({
  birthYear: profile ? String(profile.birth_year) : '',
  sex: profile?.sex ?? '',
  heightCm: profile ? String(profile.height_cm) : '',
  weightKg: profile ? String(profile.weight_kg) : '',
  activity: profile?.activity ?? 'LIGHT',
  goal: profile?.goal ?? 'MAINTAIN',
  excludedAllergens: profile?.excluded_allergens ?? [],
  pregnant: profile?.pregnant_or_breastfeeding ?? false,
  medical: profile?.medical_condition ?? false,
  // Consent is asked again on every save.
  consent: false,
});

const inRange = (value: string, min: number, max: number) => {
  const n = Number(value);
  return value.trim() !== '' && Number.isFinite(n) && n >= min && n <= max;
};

export function validate(
  draft: Draft,
  year = new Date().getFullYear(),
): Errors {
  const errors: Errors = {};
  if (
    !inRange(draft.birthYear, 1900, year) ||
    !Number.isInteger(Number(draft.birthYear))
  )
    errors.birthYear = `Nhập năm sinh từ 1900 đến ${year}.`;
  if (!draft.sex) errors.sex = 'Chọn giới tính sinh học.';
  if (!inRange(draft.heightCm, 100, 250))
    errors.heightCm = 'Chiều cao từ 100 đến 250 cm.';
  if (!inRange(draft.weightKg, 30, 300))
    errors.weightKg = 'Cân nặng từ 30 đến 300 kg.';
  if (!draft.consent) errors.consent = 'Cần đồng ý để lưu hồ sơ.';
  return errors;
}

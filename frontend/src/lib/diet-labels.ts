// Diet labels computed by the API from database nutrition values (D26, EU claim thresholds).
export const dietLabelCodes = [
  'HIGH_PROTEIN',
  'LOW_SUGAR',
  'LOW_FAT',
  'LOW_SODIUM',
  'HIGH_FIBER',
  'PLANT_BASED',
] as const;
export type DietLabelCode = (typeof dietLabelCodes)[number];

export const dietLabels: Record<
  DietLabelCode,
  { label: string; description: string }
> = {
  HIGH_PROTEIN: {
    label: 'Giàu protein',
    description:
      'Protein cung cấp ít nhất 20% năng lượng, và có ít nhất 5 g protein trên 100 g.',
  },
  LOW_SUGAR: {
    label: 'Ít đường',
    description: 'Tối đa 5 g đường trên 100 g (đồ uống: 2,5 g trên 100 ml).',
  },
  LOW_FAT: {
    label: 'Ít chất béo',
    description: 'Tối đa 3 g chất béo trên 100 g (đồ uống: 1,5 g trên 100 ml).',
  },
  LOW_SODIUM: {
    label: 'Ít natri',
    description: 'Tối đa 120 mg natri trên 100 g hoặc 100 ml.',
  },
  HIGH_FIBER: {
    label: 'Nhiều chất xơ',
    description:
      'Ít nhất 6 g chất xơ trên 100 g, hoặc 3 g chất xơ trên 100 kcal.',
  },
  PLANT_BASED: {
    label: 'Thuần thực vật',
    description:
      'Không có thành phần từ động vật theo dữ liệu của sản phẩm (không phải chứng nhận thuần chay).',
  },
};

export const dietLabelNote =
  'Nhãn được tính tự động từ số liệu dinh dưỡng, theo ngưỡng claim dinh dưỡng của EU (Quy định 1924/2006). Thiếu dữ liệu thì không gắn nhãn. Chỉ để tham khảo, không phải lời khuyên y tế.';

export const isDietLabel = (value: string): value is DietLabelCode =>
  (dietLabelCodes as readonly string[]).includes(value);

import type { MascotMood } from './leaf-mascot';

export type TourStep = {
  id: string;
  /** `data-tour` value of the control to highlight; the first visible match is used. */
  target?: string;
  mood: MascotMood;
  title: string;
  body: string;
  adminOnly?: boolean;
};

const steps: TourStep[] = [
  {
    id: 'welcome',
    mood: 'wave',
    title: 'Chào bạn, mình là Lá!',
    body: 'Mình sẽ dẫn bạn đi một vòng các chức năng chính, chỉ khoảng một phút. Bạn có thể bỏ qua bất cứ lúc nào.',
  },
  {
    id: 'products',
    target: 'products',
    mood: 'point',
    title: 'Sản phẩm và bộ lọc',
    body: 'Lọc theo calo, protein, nhãn chế độ ăn và loại trừ chất gây dị ứng. Sản phẩm thiếu dữ liệu sẽ bị loại khi bạn lọc, để không ai phải đoán.',
  },
  {
    id: 'product-detail',
    mood: 'idle',
    title: 'Nhãn dinh dưỡng rõ nguồn',
    body: 'Mỗi sản phẩm có nhãn dinh dưỡng theo khẩu phần, nguồn USDA và trạng thái allergen: đã xác minh hay chỉ theo thành phần.',
  },
  {
    id: 'meal-analyzer',
    target: 'meal-analyzer',
    mood: 'point',
    title: 'Phân tích bữa ăn',
    body: 'Chọn vài món và khối lượng để xem tổng năng lượng, protein, carb và chất béo của cả bữa.',
  },
  {
    id: 'chat',
    target: 'chat',
    mood: 'point',
    title: 'Hỏi trợ lý AI',
    body: 'Hỏi bằng tiếng Việt, ví dụ “đồ ăn dưới 200 kcal, không có đậu phộng”. Số liệu luôn lấy từ cửa hàng và trợ lý không tư vấn y tế. Mỗi ngày bạn có 30 câu hỏi.',
  },
  {
    id: 'suggestions',
    target: 'suggestions',
    mood: 'point',
    title: 'Hồ sơ và gợi ý bữa ăn',
    body: 'Tạo hồ sơ dinh dưỡng để biết mục tiêu mỗi ngày, rồi xem gợi ý bữa sáng, trưa, tối từ những sản phẩm hợp với bạn.',
  },
  {
    id: 'cart',
    target: 'cart',
    mood: 'point',
    title: 'Giỏ hàng và đơn hàng',
    body: 'Thanh toán khi nhận hàng hoặc qua VNPAY (môi trường thử nghiệm, không trừ tiền thật), rồi theo dõi đơn ở mục Đơn hàng.',
  },
  {
    id: 'admin',
    target: 'admin',
    mood: 'point',
    adminOnly: true,
    title: 'Trang quản trị',
    body: 'Tài khoản của bạn có quyền quản trị: quản lý sản phẩm, dữ liệu dinh dưỡng, ảnh, đơn hàng và nhật ký thanh toán.',
  },
  {
    id: 'done',
    mood: 'cheer',
    title: 'Sẵn sàng rồi!',
    body: 'Muốn xem lại hướng dẫn này, bấm “Xem lại hướng dẫn” ở cuối trang. Chúc bạn chọn được món hợp với mình.',
  },
];

export function tourSteps(admin: boolean): TourStep[] {
  return steps.filter((step) => admin || !step.adminOnly);
}

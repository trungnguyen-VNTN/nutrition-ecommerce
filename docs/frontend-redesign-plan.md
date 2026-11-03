# Kế hoạch làm lại giao diện frontend (đã duyệt 2026-11-03)

Nhánh: `feat/frontend-redesign` (từ `master` sau PR #17). Mỗi bước kết thúc bằng lint, typecheck, unit test, ảnh chụp 390/1440 + axe + kiểm tra tràn ngang, checklist skill `ui-ux-pro-max`, rồi dừng để duyệt. Tiến độ từng bước ghi ở `docs/PROGRESS.md`.

## Nguồn thiết kế (kết hợp, xem D11 trong `decisions.md`)

| Phần | Nguồn |
| --- | --- |
| Danh sách trang, bố cục | Bản mẫu HTML "Nouri" (`nutrition-commerce-frontend.zip`, không commit) |
| Ngôn ngữ hình ảnh | "Nutrition Label": nền kem, mực xanh đen, một nhấn xanh chanh, màu macro cố định, Bricolage Grotesque + Plus Jakarta Sans, CTA sticker, nhãn dinh dưỡng, thanh macro, donut năng lượng, dock nổi mobile |
| Bộ lọc | Kiểu Nuts.com: nhóm gập/mở, checkbox; mobile là bottom sheet |
| Chi tiết sản phẩm | Kiểu Freja: viên macro dưới tên, mục dinh dưỡng / allergen gập-mở |
| Icon | Phosphor; không emoji |

## Không làm (không có API hoặc trái quy tắc)
Sắp xếp, bản tin, đánh giá sao, phí ship và ghi chú đơn, thống kê doanh thu admin, trang quên mật khẩu, route "đặt hàng thành công" riêng (dùng khối chúc mừng trên `/orders/:id`), chữ tiếng Anh.

## Giữ nguyên
`lib/api`, schema zod, hooks, `features/auth/session.ts`, `app/router.tsx`, mọi hành vi. Test cũ là hợp đồng hành vi; chỉ sửa test khi chữ hiển thị đổi theo thiết kế và phải liệt kê trong báo cáo bước.

## Các bước
1. Nền tảng: tài liệu, font, tokens, theme Tailwind, layout (Header, Dock mobile, Footer, AdminShell).
2. Thành phần dùng chung: Button, Field, Tag, Pill, Qty, Card, Note, Skeleton, EmptyState, ErrorState (có 429), Toast, ProductArt, MacroBar, NutritionLabel, Donut, ProductCard. Test fail-closed.
3. Trang công khai: Home, Products (bottom sheet bộ lọc), Product detail.
4. Auth (đăng nhập, đăng ký, xác minh email), Cart, Checkout, Orders (+ khối chúc mừng).
5. Chat, Admin.

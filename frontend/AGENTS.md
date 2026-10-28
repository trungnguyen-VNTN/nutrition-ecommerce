# Frontend (React) — quy tắc cho Codex

Áp dụng thêm cho `AGENTS.md` gốc. Thiết kế giao diện: đọc `docs/ui-guidelines.md` TRƯỚC khi làm bất kỳ màn hình nào.

## Stack (mặc định, đổi phải ghi vào docs/decisions.md)
- React + TypeScript (strict) + Vite.
- Tailwind CSS + shadcn/ui (Radix). Dùng component có sẵn, không tự viết lại nút, dialog, select, tabs, toast.
- Định tuyến: React Router. Dữ liệu từ server: TanStack Query. Form: React Hook Form + Zod.
- Kiểm thử: Vitest + Testing Library; MSW để mock API; Playwright cho e2e và ảnh chụp; @axe-core/playwright cho accessibility.
- Chất lượng: ESLint, Prettier, `tsc --noEmit`.
- Font tự host bằng `@fontsource/*` (không gọi CDN ngoài, phù hợp CloudFront + S3).
- Không thêm thư viện ngoài danh sách này nếu chưa hỏi.

## Scripts bắt buộc trong package.json
`dev`, `build`, `preview`, `format`, `format:check`, `lint`, `typecheck`, `test`, `test:e2e`, `screenshots`.

## Cấu trúc thư mục
```text
src/
  app/            # router, providers, layout gốc
  features/       # products, cart, orders, chat, admin, auth (mỗi feature: components, hooks, api, tests)
  components/ui/  # component nền (shadcn/ui)
  components/     # component dùng chung (ProductCard, NutritionTable, AllergenBadge, DataStatusBadge...)
  lib/            # api client, auth, format (tiền VND, số), utils
  styles/         # tokens.css, globals.css
  mocks/          # MSW handlers + dữ liệu mẫu
```

## Quy tắc code
- Không `any`. Kiểu response API khai báo một chỗ trong `lib/api`, khớp `docs/api-contract.md`.
- Một component một trách nhiệm; tách logic vào hook; tránh component hơn ~150 dòng.
- Mọi màu, cỡ chữ, khoảng cách lấy từ token (CSS variables / Tailwind theme). KHÔNG hard-code mã màu hay px tùy ý trong component.
- API client: gắn `Authorization: Bearer` từ token Cognito; không bao giờ gửi `userId`; xử lý thống nhất `401` (đăng nhập lại), `403`, `404`, `409`, `429`.
- Token lưu trong bộ nhớ hoặc cơ chế của thư viện Cognito; không log token ra console.
- Cấu hình qua biến `VITE_*` (API base `/api`, user pool id, client id). Không có secret trong frontend.
- Tiền tệ lấy từ API (`currency`), định dạng bằng `Intl.NumberFormat('vi-VN')`. Giao diện bằng tiếng Việt; chuỗi văn bản gom về một chỗ để dễ sửa.
- Ảnh: có `alt`, có kích thước cố định để tránh nhảy layout, lazy-load ngoài vùng nhìn thấy đầu tiên.

## Dữ liệu dinh dưỡng và allergen (nguyên tắc bất biến số 3 trên UI)
- `nutrition_complete = false` => hiển thị "Chưa có dữ liệu dinh dưỡng", tuyệt đối không hiện 0 hay ô trống.
- `allergens_verified = false` => hiển thị "Chưa xác minh allergen", không ngầm hiểu là "không có allergen".
- Allergen luôn có icon + chữ, không chỉ dựa vào màu.
- Khung chat AI: luôn có dòng "Thông tin tham khảo, không phải tư vấn y tế"; xử lý `429` (hết lượt), timeout, lỗi mạng; không giả định streaming.

## Vòng phản hồi thị giác (bắt buộc với mọi thay đổi UI)
1. Có dữ liệu mẫu (MSW) đủ để màn hình có nội dung thật.
2. Chạy `npm run screenshots` (Playwright chụp các trang chính ở 390px và 1440px vào `frontend/.screenshots/`).
3. Mở ảnh, đối chiếu với `docs/ui-guidelines.md` và ảnh trong `docs/design-refs/` (nếu có).
4. Liệt kê chỗ chưa khớp, sửa, chụp lại. Chỉ báo "xong" khi đã làm ít nhất một vòng này.
5. Chạy kiểm tra accessibility (axe) cho các trang chính; không để lỗi mức serious/critical.

## Định nghĩa "xong" cho một màn hình
- Đủ 4 trạng thái: loading (skeleton), empty, error (có nút thử lại), success.
- Responsive: không cuộn ngang ở 390px; không vỡ layout ở 1440px.
- Điều hướng được bằng bàn phím; focus nhìn thấy; tương phản đạt WCAG AA.
- Format, lint, typecheck, test, axe đều xanh.
- Có test cho logic quan trọng (lọc, giỏ hàng, xử lý lỗi API) và ít nhất một test render cho mỗi component dùng chung.

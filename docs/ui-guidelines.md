# Hướng dẫn thiết kế giao diện

> Hướng "Nutrition Label" (chốt 2026-11-03, xem D11 trong `docs/decisions.md` và `docs/frontend-redesign-plan.md`). Muốn đổi: sửa file này và `docs/decisions.md` trước, rồi mới sửa code.
> Mọi màu / cỡ chữ / khoảng cách lấy từ token ở mục 2 (`frontend/src/styles/tokens.css`). Không hard-code giá trị trong component.

## 1. Định hướng
- Tinh thần: một cửa hàng đọc được như nhãn dinh dưỡng. Nền kem, chữ mực xanh đen, một màu nhấn xanh chanh; số liệu là nhân vật chính, dễ quét mắt.
- Chữ ký thị giác: CTA kiểu "sticker" (viền mực, bóng đặc lệch, nhấn xuống khi bấm), nhãn dinh dưỡng viền đậm, thanh macro, donut năng lượng, dock điều hướng nổi trên mobile.
- Mỗi macro có màu cố định trên toàn site: protein cam đỏ, carb vàng, béo tím, xơ xanh. Màu chỉ dùng cho nền, viền, chấm và đoạn biểu đồ, luôn kèm chữ; không dùng màu macro cho chữ nhỏ.
- Tránh: gradient lòe loẹt, bóng mờ nặng, icon lẫn nhiều bộ, emoji làm icon, chữ tiếng Anh trên giao diện.
- Icon: chỉ Phosphor, nét `regular` (đang chọn: `fill`); icon trang trí cạnh chữ ẩn khỏi trình đọc màn hình.
- Điều hướng: dưới 940px là dock nổi dưới cùng (5 mục, icon + chữ, vùng an toàn); từ 940px là hàng menu trong header. Header có ô tìm sản phẩm (API hỗ trợ `q`) và ô "Hỏi AI" dẫn tới `/chat`.
- Bộ lọc: nhóm gập/mở; dưới 940px mở trong bottom sheet.
- Mỗi màn hình có đúng một hành động chính.

## 2. Design tokens

### Màu
| Token | Giá trị | Dùng cho | Tương phản |
| --- | --- | --- | --- |
| `--cream` | `#FAF9F3` | nền trang | |
| `--surface` | `#FFFFFF` | thẻ, ô nhập | |
| `--ink` | `#19392E` | chữ chính, viền sticker | 11.9:1 trên kem |
| `--ink-muted` | `#566A5C` | chữ phụ | 5.5:1 trên kem |
| `--brand` / `--brand-strong` | `#194734` / `#0F3324` | nút chính, footer, liên kết | 10:1 trên kem |
| `--lime` / `--lime-strong` | `#D8ED9D` / `#C3E277` | nhấn duy nhất: nền CTA sticker, huy hiệu, mục đang chọn (chữ `--ink` trên nền này 9.9:1) | |
| `--line` | `#DDE5D8` | đường kẻ trang trí | |
| `--line-strong` | `#75897A` | viền ô nhập, checkbox (≥ 3:1) | |
| `--macro-protein` / `-tint` | `#D9572B` / `#FBE3D8` | protein | 3.9:1 trên trắng (đồ họa) |
| `--macro-carb` / `-tint` | `#A87C06` / `#F8ECC4` | carbohydrate | 3.8:1 |
| `--macro-fat` / `-tint` | `#7B5CC9` / `#EBE4F8` | chất béo | 5.0:1 |
| `--macro-fiber` / `-tint` | `#2F8A4C` / `#DCEFDF` | chất xơ | 4.3:1 |
| `--success` / `-tint` | `#276E2B` / `#E3F1E1` | còn hàng, thành công | 5.9:1 trên kem, 5.4:1 trên tint |
| `--warning` / `-tint` | `#8A4F00` / `#FFF1DC` | dữ liệu thiếu / chưa xác minh, allergen | 5.9:1 |
| `--danger` / `-tint` | `#B3261E` / `#FCE8E6` | lỗi, hết hàng, hủy | 5.6:1 |

### Typography
- Tiêu đề: **Bricolage Grotesque** (600, 700, 800). Thân bài và số liệu: **Plus Jakarta Sans** (400, 500, 600, 700). Tự host bằng `@fontsource/*`, chỉ nạp subset `latin` + `vietnamese`, `font-display: swap`.
- Thang cỡ chữ (px / line-height): 12/16, 14/20, 16/24 (thân bài), 18/28, 20/28, 24/32, 32/38, 44/50, 64/68 (hero desktop). Tiêu đề dùng `letter-spacing` âm nhẹ (-0.02em), `text-wrap: balance`.
- Số liệu, giá: `font-variant-numeric: tabular-nums`. Thân bài tối thiểu 16px trên mobile.

### Khoảng cách, bo góc, bóng, lớp
- Bậc khoảng cách 4px: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Bo góc: 10px (nút, ô nhập), 18px (thẻ), 28px (khối lớn, sheet), 999px (viên).
- Bóng: `--elevation-sticker` (class `shadow-sticker`) = bóng đặc lệch `3px 3px 0 var(--ink)` chỉ cho CTA sticker; `--elevation-float` (class `shadow-float`) cho dock và sheet; thẻ không dùng bóng, dùng viền.
- Z-index: 10 sticky header, 20 dock, 40 sheet/dialog, 60 toast, 100 skip link.
- Container tối đa 1240px; lề 16px (< 640) / 24px / 32px (≥ 940).
- Breakpoint: `sm` 640, **`md` 940 (chính)**, `lg` 1240. Thiết kế mobile-first; không tràn ngang ở 390px.

### Chuyển động
- Token: 120ms (nhấn), 200ms (hover, mở gập), 280ms (sheet vào; ra 180ms). Easing ra `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- Chỉ animate `transform` / `opacity`. Tắt hết khi `prefers-reduced-motion: reduce`.

## 3. Component dùng chung (tạo một lần, dùng lại)
| Component | Yêu cầu chính |
| --- | --- |
| `Button` | primary / secondary / ghost / destructive; trạng thái loading và disabled |
| `ProductCard` | ảnh tỉ lệ cố định, tên (tối đa 2 dòng), giá VND, trạng thái kho, `DataStatusBadge` nếu thiếu dữ liệu |
| `NutritionTable` | bảng theo khẩu phần (`serving_size`, `serving_unit`), căn số bên phải; nếu `nutrition_complete = false` thì thay bằng thông báo "Chưa có dữ liệu dinh dưỡng" |
| `AllergenBadge` | icon + chữ + màu allergen; nếu `allergens_verified = false` hiện "Chưa xác minh allergen" (kiểu cảnh báo, không phải "không có") |
| `DataStatusBadge` | trạng thái dữ liệu chưa đầy đủ |
| `FilterPanel` | tìm theo tên, danh mục, calo tối đa, protein tối thiểu, loại allergen (nhiều lựa chọn); nhóm gập/mở; dưới 940px là bottom sheet |
| `QuantityStepper` | giới hạn theo tồn kho; báo lỗi `409 OUT_OF_STOCK` dễ hiểu |
| `Skeleton`, `EmptyState`, `ErrorState` | dùng cho mọi danh sách / chi tiết |
| `ChatPanel` | bong bóng hội thoại, ô nhập có giới hạn độ dài, trạng thái đang trả lời, thẻ sản phẩm gợi ý, dòng lưu ý không phải tư vấn y tế, xử lý `429` |
| `DataTable` (admin) | sắp xếp, phân trang, hàng loading, hành động theo dòng |
| `MacroBar` | thanh tỉ lệ protein/carb/béo theo gram, màu macro cố định, có chú thích chữ; thiếu dữ liệu thì thay bằng ô nét đứt "Chưa có dữ liệu dinh dưỡng" |
| `NutritionLabel` | khung nhãn dinh dưỡng viền đậm theo khẩu phần; ô thiếu giá trị ghi "Chưa có dữ liệu", không hiện 0 |
| `Donut` | phân bổ năng lượng theo macro (kcal = 4/4/9 × gram), có tóm tắt chữ cho trình đọc màn hình; chỉ vẽ khi đủ dữ liệu |
| `Note` | ghi chú nét đứt cho dữ liệu thiếu / chưa xác minh và lưu ý y tế |
| `Button` sticker | CTA chính: nền xanh chanh, viền mực, bóng đặc lệch, nhấn xuống khi bấm |
| `Toast`, `Dialog` | dùng thành phần của shadcn/ui |

## 4. Màn hình cần có (theo `docs/api-contract.md`)
| Khu vực | Màn hình |
| --- | --- |
| Công khai | Trang chủ (danh mục nổi bật, sản phẩm mới), danh sách sản phẩm + bộ lọc, chi tiết sản phẩm |
| Tài khoản | Đăng nhập, đăng ký, xác thực email, quên mật khẩu (tự làm, **không** dùng hosted UI của Cognito) |
| Mua hàng | Giỏ hàng, xác nhận đặt hàng, đặt hàng thành công, lịch sử đơn, chi tiết đơn (hủy khi `PLACED`) |
| AI | Khung chat tra cứu dinh dưỡng (nút nổi hoặc trang riêng) |
| Admin | Danh mục, sản phẩm (CRUD), nhập dinh dưỡng, nhập / xác nhận allergen, tồn kho, ảnh, danh sách và chuyển trạng thái đơn |

## 5. Bốn trạng thái bắt buộc cho mọi màn hình có dữ liệu
1. **Loading**: skeleton có hình dáng giống nội dung thật, không dùng spinner trơ cho cả trang.
2. **Empty**: có minh họa nhẹ hoặc icon, câu giải thích, và hành động tiếp theo (ví dụ "Xóa bộ lọc").
3. **Error**: thông báo dễ hiểu bằng tiếng Việt (map từ `code` của API), có nút "Thử lại"; không lộ chi tiết kỹ thuật.
4. **Success**: nội dung thật.

## 6. Dữ liệu thiếu và fail-closed trên giao diện
- Thiếu dinh dưỡng / allergen luôn hiển thị minh bạch bằng chữ trong khung **nét đứt** màu `--warning`, không bao giờ để trống hay hiện 0. "Không ghi nhận allergen" chỉ được hiện khi `allergens_verified = true`.
- Khi người dùng lọc theo dinh dưỡng / allergen, danh sách chỉ gồm sản phẩm có dữ liệu đầy đủ (do backend lọc). Nếu kết quả ít hơn mong đợi, có thể hiển thị một dòng giải thích ngắn: "Một số sản phẩm chưa đủ dữ liệu nên không hiển thị khi lọc."

## 7. Accessibility (bắt buộc)
- Tương phản WCAG AA; không truyền đạt thông tin chỉ bằng màu.
- Điều hướng bàn phím đầy đủ, thứ tự focus hợp lý, focus ring nhìn thấy.
- Nhãn cho mọi ô nhập; thông báo lỗi liên kết với ô nhập (`aria-describedby`); vùng thông báo động dùng `aria-live`.
- Vùng bấm tối thiểu 44x44px trên mobile.
- `alt` có nghĩa cho ảnh sản phẩm; ảnh trang trí để `alt=""`.
- Kiểm tra tự động bằng axe trong Playwright; không để lỗi serious/critical.

## 8. Cách kiểm tra "đẹp" một cách khách quan
Sau mỗi thay đổi UI, Codex tự duyệt checklist này trên ảnh chụp (390px và 1440px):
- [ ] Có một điểm nhấn chính rõ ràng trong màn hình?
- [ ] Khoảng cách theo thang 4px, thẳng hàng, không chỗ nào chật hay thưa bất thường?
- [ ] Chỉ dùng token; không có màu / cỡ chữ lạ?
- [ ] Chữ không bị cắt, dấu tiếng Việt hiển thị đúng?
- [ ] Ảnh sản phẩm cùng tỉ lệ, không méo?
- [ ] Đủ 4 trạng thái?
- [ ] Không cuộn ngang ở mobile?
- [ ] Nhất quán với các màn hình đã làm trước đó?

## 9. Ảnh tham chiếu
Đặt ảnh mẫu (Figma export, screenshot trang bạn thích, wireframe vẽ tay) vào `docs/design-refs/` và gọi tên file trong prompt. Xem `docs/design-refs/README.md`.

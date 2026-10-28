# Hướng dẫn thiết kế giao diện

> Mục tiêu: giao diện nhất quán, dễ đọc, đáng tin cậy cho một cửa hàng thực phẩm có dữ liệu dinh dưỡng. Mọi giá trị dưới đây là **mặc định đề xuất**; muốn đổi, sửa file này và `docs/decisions.md` trước rồi mới yêu cầu Codex sửa code.
> Codex: mọi màu / cỡ chữ / khoảng cách phải lấy từ token ở mục 2. Không hard-code giá trị tùy ý trong component.

## 1. Định hướng
- Tinh thần: tươi, sạch, minh bạch. Nhiều khoảng trắng, ảnh sản phẩm là nhân vật chính, số liệu dinh dưỡng dễ quét mắt.
- Tránh: bố cục mặc định "template", gradient lòe loẹt, quá nhiều màu nhấn, bóng đổ nặng, icon lẫn nhiều bộ.
- Ưu tiên: rõ ràng > trang trí. Mỗi màn hình có một hành động chính nổi bật.

## 2. Design tokens

### Màu (khai báo thành CSS variables, ánh xạ vào Tailwind theme)
| Token | Giá trị | Dùng cho |
| --- | --- | --- |
| `--primary-50` | `#F0F7EC` | nền nhẹ, hover |
| `--primary-100` | `#DDEED3` | nền huy hiệu |
| `--primary-500` | `#4C9A2A` | viền, nền lớn (KHÔNG dùng cho chữ nhỏ: tương phản chưa đủ AA) |
| `--primary-600` | `#3C7D21` | nút chính, liên kết, chữ nhấn |
| `--primary-700` | `#2F621A` | hover / active của nút chính |
| `--accent-500` | `#F29A2E` | nhấn phụ (khuyến mãi, nổi bật), dùng tiết kiệm |
| `--neutral-50` | `#FAFAF7` | nền trang |
| `--neutral-100` | `#F3F2EE` | nền thẻ phụ, skeleton |
| `--neutral-200` | `#E5E3DC` | viền |
| `--neutral-500` | `#8A877D` | chữ phụ cỡ lớn, icon |
| `--neutral-700` | `#4A483F` | chữ phụ |
| `--neutral-900` | `#1F1E1A` | chữ chính |
| `--success` | `#2E7D32` | thành công, còn hàng |
| `--warning` | `#B26A00` | cảnh báo, sắp hết hàng |
| `--danger` | `#C62828` | lỗi, hết hàng, xóa |
| `--info` | `#1F6FB2` | thông tin |
| `--allergen-bg` / `--allergen-border` / `--allergen-text` | `#FFF3E0` / `#F29A2E` / `#8A4B00` | nhãn allergen (thống nhất toàn site) |

Ghi chú: kiểm tra lại tương phản thực tế bằng công cụ (WCAG AA: chữ thường >= 4.5:1, chữ lớn >= 3:1) và chỉnh token nếu cần.

### Typography
- Font: **Be Vietnam Pro** (hỗ trợ tiếng Việt đầy đủ), tự host bằng `@fontsource/be-vietnam-pro` (400, 500, 600, 700). Fallback: `system-ui, sans-serif`.
- Thang cỡ chữ (px / line-height): 12/16, 14/20, 16/24 (mặc định thân bài), 18/28, 20/28, 24/32, 30/36, 36/44.
- Tiêu đề trang 30–36 semibold; tiêu đề mục 20–24 semibold; số liệu dinh dưỡng dùng `font-variant-numeric: tabular-nums`.
- Độ dài dòng văn bản tối đa ~70 ký tự.

### Khoảng cách, bo góc, bóng
- Bậc khoảng cách theo 4px: 4, 8, 12, 16, 24, 32, 48, 64.
- Bo góc: 8px (nút, ô nhập), 12px (thẻ), 999px (huy hiệu dạng viên thuốc).
- Bóng: `sm` cho thẻ, `md` cho dropdown / dialog; không dùng bóng nặng hơn.
- Container tối đa 1200px; lề trang 16px (mobile) / 24px (tablet) / 32px (desktop).
- Breakpoint: Tailwind mặc định (sm 640, md 768, lg 1024, xl 1280). Thiết kế mobile-first.

### Chuyển động
- 150–200ms, easing nhẹ; chỉ dùng cho phản hồi (hover, mở dialog, toast). Tôn trọng `prefers-reduced-motion`.

## 3. Component dùng chung (tạo một lần, dùng lại)
| Component | Yêu cầu chính |
| --- | --- |
| `Button` | primary / secondary / ghost / destructive; trạng thái loading và disabled |
| `ProductCard` | ảnh tỉ lệ cố định, tên (tối đa 2 dòng), giá VND, trạng thái kho, `DataStatusBadge` nếu thiếu dữ liệu |
| `NutritionTable` | bảng theo khẩu phần (`serving_size`, `serving_unit`), căn số bên phải; nếu `nutrition_complete = false` thì thay bằng thông báo "Chưa có dữ liệu dinh dưỡng" |
| `AllergenBadge` | icon + chữ + màu allergen; nếu `allergens_verified = false` hiện "Chưa xác minh allergen" (kiểu cảnh báo, không phải "không có") |
| `DataStatusBadge` | trạng thái dữ liệu chưa đầy đủ |
| `FilterPanel` | calo tối đa, protein tối thiểu, chế độ ăn, loại allergen (nhiều lựa chọn), còn hàng; trên mobile là drawer |
| `QuantityStepper` | giới hạn theo tồn kho; báo lỗi `409 OUT_OF_STOCK` dễ hiểu |
| `Skeleton`, `EmptyState`, `ErrorState` | dùng cho mọi danh sách / chi tiết |
| `ChatPanel` | bong bóng hội thoại, ô nhập có giới hạn độ dài, trạng thái đang trả lời, thẻ sản phẩm gợi ý, dòng lưu ý không phải tư vấn y tế, xử lý `429` |
| `DataTable` (admin) | sắp xếp, phân trang, hàng loading, hành động theo dòng |
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
- Thiếu dinh dưỡng / allergen luôn hiển thị minh bạch bằng chữ, không bao giờ để trống hay hiện 0.
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

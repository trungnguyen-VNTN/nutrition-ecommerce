# API contract (bản nháp MVP)

> Bản nháp để Codex hoàn thiện (request/response chi tiết) trước khi code từng giai đoạn. Quyền: `public`, `USER` (đã đăng nhập), `ADMIN`.
> Mọi endpoint dưới `/api`. `userId` **luôn lấy từ JWT**, không bao giờ nằm trong request.

## Quy ước chung

- Xác thực: `Authorization: Bearer <JWT Cognito>`. Thiếu hoặc sai token → `401`. Sai quyền → `403`.
- Định dạng lỗi thống nhất, ví dụ: `{ "code": "OUT_OF_STOCK", "message": "...", "details": {...} }`.
- Phân trang: `page`, `size` (giới hạn `size` tối đa); trả về tổng số.
- Không trả thông tin nội bộ (stack trace, tên bảng) trong lỗi.

## Tài khoản

| Method | Path | Quyền | Mô tả |
| --- | --- | --- | --- |
| GET | /api/me | USER | Trả `sub`, email, nhóm từ JWT; tạo bản ghi `app_users` nếu chưa có |
| GET | /actuator/health | public (nội bộ ALB) | Health check |

## Catalog (công khai)

| Method | Path | Quyền | Mô tả |
| --- | --- | --- | --- |
| GET | /api/categories | public | Danh sách category |
| GET | /api/products | public | Tìm / lọc: `q`, `categoryId`, `maxCalories`, `minProtein`, `diet`, `excludeAllergen` (nhiều giá trị), `inStock`, phân trang |
| GET | /api/products/{id} | public | Chi tiết kèm dinh dưỡng, allergen, ảnh |

Quy tắc lọc: khi có `maxCalories`, `minProtein` hoặc `excludeAllergen`, chỉ trả sản phẩm có `nutrition_complete = true` (và `allergens_verified = true` với `excludeAllergen`).

## Admin catalog

| Method | Path | Quyền | Mô tả |
| --- | --- | --- | --- |
| POST | /api/admin/categories | ADMIN | Tạo category |
| PUT | /api/admin/categories/{id} | ADMIN | Sửa |
| DELETE | /api/admin/categories/{id} | ADMIN | Xóa (từ chối nếu còn sản phẩm) |
| POST | /api/admin/products | ADMIN | Tạo sản phẩm |
| PUT | /api/admin/products/{id} | ADMIN | Sửa sản phẩm |
| PUT | /api/admin/products/{id}/nutrition | ADMIN | Nhập / sửa dinh dưỡng; cập nhật `nutrition_complete` |
| PUT | /api/admin/products/{id}/allergens | ADMIN | Nhập allergen và xác nhận (`allergens_verified`) |
| PATCH | /api/admin/products/{id}/stock | ADMIN | Chỉnh tồn kho (`stock >= 0`) |
| POST | /api/admin/products/{id}/images | ADMIN | Upload ảnh qua backend (giới hạn kích thước, kiểm tra loại tệp, tên file do server sinh) |
| DELETE | /api/admin/products/{id} | ADMIN | Ẩn (`active = false`) thay vì xóa cứng |

## Giỏ hàng

| Method | Path | Quyền | Mô tả |
| --- | --- | --- | --- |
| GET | /api/cart | USER | Giỏ của chính user |
| POST | /api/cart/items | USER | Thêm `{productId, quantity}`; kiểm tra tồn kho |
| PATCH | /api/cart/items/{productId} | USER | Đổi số lượng |
| DELETE | /api/cart/items/{productId} | USER | Xóa khỏi giỏ |

## Đơn hàng

| Method | Path | Quyền | Mô tả |
| --- | --- | --- | --- |
| POST | /api/orders | USER | Đặt hàng từ giỏ trong **một transaction** (tạo đơn, trừ kho có điều kiện, xóa giỏ); thiếu hàng → `409 OUT_OF_STOCK` |
| GET | /api/orders | USER | Đơn của chính user |
| GET | /api/orders/{id} | USER | Chỉ đơn của user; đơn của người khác → `404` |
| POST | /api/orders/{id}/cancel | USER | Hủy khi `PLACED`; hoàn kho |

## Admin đơn hàng

| Method | Path | Quyền | Mô tả |
| --- | --- | --- | --- |
| GET | /api/admin/orders | ADMIN | Danh sách, lọc theo `status`, phân trang |
| GET | /api/admin/orders/{id} | ADMIN | Chi tiết |
| PATCH | /api/admin/orders/{id}/status | ADMIN | Chuyển trạng thái hợp lệ (xem `db-schema.md`); không hợp lệ → `409` |

## AI tra cứu

| Method | Path | Quyền | Mô tả |
| --- | --- | --- | --- |
| POST | /api/chat | USER | `{message}` → `{reply, products?[]}`; giới hạn độ dài `message`; rate limit và quota theo `sub`; vượt quota → `429` |

Tool nội bộ (không phải HTTP endpoint, chỉ đọc, không nhận `userId`): `searchProducts`, `getProduct`, `getNutrition`, `compareProducts` (tùy chọn).

## Việc cần hoàn thiện (Codex, giai đoạn 3 trở đi)

- [ ] Schema request/response cho từng endpoint
- [ ] Mã lỗi và thông điệp thống nhất
- [ ] Giới hạn phân trang, kích thước upload, độ dài `message`

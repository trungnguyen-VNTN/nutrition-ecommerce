# Backend (Spring Boot) — quy tắc cho Codex

Áp dụng thêm cho `AGENTS.md` gốc. Hợp đồng API: `docs/api-contract.md`. Schema: `docs/db-schema.md`. Test bắt buộc: `docs/test-plan.md`.

## Stack
- Java <điền LTS> + Spring Boot, build <Maven|Gradle> (quyết định O5 trong docs/decisions.md; dùng wrapper `mvnw` / `gradlew`).
- PostgreSQL + Flyway (migration trong `src/main/resources/db/migration`, đặt tên `V<n>__<mô_tả>.sql`, không sửa migration đã áp dụng).
- Kiểm thử: JUnit 5, Testcontainers (PostgreSQL thật, không dùng H2), Spring Security Test.
- Chất lượng: Spotless (định dạng) + Checkstyle hoặc tương đương; chạy trong `verify`.

## Cấu trúc gợi ý
```text
com.<org>.nutrition
  config/      # security, cấu hình đọc từ properties (model ID, inference profile ID, quota)
  catalog/     # controller, service, repository, dto
  cart/ orders/ admin/
  ai/          # LlmClient (interface), BedrockLlmClient, MockLlmClient, tools (chỉ đọc)
  common/      # lỗi thống nhất, phân trang, tiện ích
```

## Quy tắc bắt buộc
- Danh tính lấy từ `Authentication`/JWT (`sub`, `cognito:groups`). Không có tham số `userId` nào trong request hoặc tool.
- Phân quyền: `/api/admin/**` chỉ `ADMIN`; truy cập dữ liệu của user khác trả `404` (không lộ sự tồn tại).
- SQL tham số hóa (JPA/JdbcTemplate với tham số). Cấm nối chuỗi vào SQL.
- Trừ kho: `UPDATE products SET stock = stock - :q WHERE id = :id AND stock >= :q` trong transaction; kiểm tra số dòng bị ảnh hưởng, 0 dòng => `409 OUT_OF_STOCK` và rollback toàn bộ. Hoàn kho khi hủy phải idempotent (không hoàn hai lần).
- Lỗi trả về `{ code, message, details }` qua một `@RestControllerAdvice`; không lộ stack trace hay tên bảng.
- Giới hạn: kích thước `size` phân trang, độ dài `message` của chat, kích thước và loại tệp upload (kiểm tra nội dung, không chỉ phần mở rộng; tên file do server sinh).
- Không log token, mật khẩu, nội dung chat nhạy cảm, dữ liệu cá nhân.
- Model ID, inference profile ID, ARN, tên bucket: đọc từ cấu hình, không hard-code.
- AI: tool chỉ đọc; vòng tool loop tối đa 4; `max_tokens` cố định; timeout backend nhỏ hơn timeout CloudFront; mọi test AI chạy được với `MockLlmClient`.

## Test tối thiểu cho mỗi tính năng
- Unit test cho logic nghiệp vụ; integration test với PostgreSQL container cho repository và transaction.
- Test phân quyền (401 / 403 / 404) cho mọi endpoint mới.
- Test đồng thời cho trừ kho; golden test allergen khi đụng đến lọc.
- Chạy `verify` (hoặc `check`) đầy đủ trước khi báo xong.

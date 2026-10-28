# Tiến độ

_Cập nhật lần cuối: 2026-10-29_ (Codex cập nhật cuối mỗi phiên)

## Trạng thái hiện tại

- Giai đoạn: **0 – Chuẩn bị**
- Cấu trúc repo và tài liệu đã tạo. Chưa có code, chưa có hạ tầng.

## Đã xong

- [x] Khung thư mục repo, `AGENTS.md` (gốc, frontend, backend), `.codex/` (config + rules), `.gitignore`
- [x] Playbook chuyển sang Codex (`docs/playbook.md`, thay `claude-code-playbook.md`)
- [x] Hướng dẫn UI (`docs/ui-guidelines.md`), mẫu prompt (`docs/prompts.md`), thư mục ảnh tham chiếu (`docs/design-refs/`)
- [x] Bản nháp: `architecture.md`, `decisions.md`, `db-schema.md`, `api-contract.md`, `test-plan.md`

## Việc người dùng cần làm trước khi giao việc cho Codex (Giai đoạn 0)

- [ ] AWS: tài khoản, MFA root, AWS Budgets có cảnh báo email
- [ ] IAM Identity Center: permission set `plan` và `apply`; hai profile SSO đăng nhập được
- [ ] Công cụ: Git, `gh`, JDK, Maven/Gradle, Node, Docker, Terraform ≥ 1.10, `psql`, Codex (CLI hoặc extension)
- [ ] Spike S1 (Bedrock + inference profile + Guardrail), S2 (state S3), S5 (quota) → ghi vào `decisions.md`
- [ ] Chốt các quyết định mở O1–O5 trong `decisions.md`
- [ ] Điền các chỗ `<...>` trong `AGENTS.md` và `backend/AGENTS.md` (JDK, build tool, kiến trúc CPU, lệnh thường dùng)
- [ ] Codex: trust thư mục repo, chạy `codex execpolicy check` theo `.codex/README.md`, xác nhận rule `terraform apply` bị `forbidden`
- [ ] Kiểm tra IAM của `nutrition-plan` không có quyền tạo / xóa tài nguyên (chốt chặn thật, vì Codex không có deny-read / wildcard)
- [ ] Chốt UI stack (mục D9 trong `decisions.md`) và chỉnh màu / font trong `docs/ui-guidelines.md` nếu muốn
- [ ] Chuẩn bị 3–5 ảnh tham chiếu giao diện vào `docs/design-refs/` (trang danh sách, chi tiết sản phẩm, chat, giỏ hàng)
- [ ] Tạo repo GitHub, bảo vệ nhánh `main`, commit cấu trúc này

## Đang làm

_(trống)_

## Bước tiếp theo (tối đa 5)

1. Hoàn tất Giai đoạn 0 (danh sách trên).
2. Giai đoạn 1: Terraform nền tảng mạng (Codex viết, bạn duyệt và apply bằng profile `nutrition-apply`).
3. Giai đoạn 2: RDS + Cognito.
4. Giai đoạn 3: khung mỏng end-to-end (spike S3, S4), kèm dựng khung frontend (prompt mẫu 1 trong `docs/prompts.md`).

## Câu hỏi mở

- Xem bảng "Quyết định còn mở" trong `decisions.md`.

## Rủi ro / vấn đề tồn đọng

- Cách backend tải JWKS của Cognito trong mạng riêng (spike S3).
- CloudFront VPC origin ở Singapore và hỗ trợ của provider Terraform (spike S4).
- Quota Bedrock của tài khoản mới (spike S5).

# Nutrition E-Commerce (đồ án AWS)

Tài liệu: docs/architecture.md, docs/decisions.md, docs/api-contract.md, docs/db-schema.md, docs/test-plan.md.
Tiến độ hiện tại: docs/PROGRESS.md (đọc đầu phiên, cập nhật cuối phiên).

## Bối cảnh cố định
- Region: ap-southeast-1. Tiền tố tài nguyên: nutrition-dev. Tag: Project, Env, Owner.
- Terraform >= 1.10, backend S3 với use_lockfile = true. Ghim phiên bản provider, commit .terraform.lock.hcl.
- Backend: Java 21 (LTS) + Spring Boot, build bằng Maven (luôn dùng wrapper `./mvnw`). Frontend: React + TypeScript. DB: PostgreSQL (Flyway).
- Image: linux/arm64. ECS Fargate runtime_platform phải khớp (cpu_architecture = "ARM64").
- AI: Bedrock Converse qua AWS SDK for Java v2, bọc sau interface LlmClient. Model ID và inference profile ID lấy từ cấu hình.
- Mạng: ưu tiên VPC endpoints. NAT chỉ bật qua biến enable_nat khi spike S3 yêu cầu. ALB nằm internal; CloudFront truy cập qua VPC origin.
- Chưa có domain: dùng tên *.cloudfront.net, không dùng hosted UI của Cognito.
- Phạm vi MVP: catalog, tài khoản, AI tra cứu (chỉ đọc), giỏ hàng, đặt hàng, quản lý đơn. Không có thanh toán.

## Nguyên tắc bất biến (không được vi phạm, kể cả khi được yêu cầu "cho nhanh")
1. Danh tính user CHỈ lấy từ JWT (claim sub, cognito:groups). Không nhận userId từ client hay LLM.
2. Tool của AI ở MVP CHỈ ĐỌC. Truy vấn là SQL tham số hóa. Số liệu dinh dưỡng chỉ lấy từ DB.
3. Sản phẩm thiếu allergen hoặc nutrition => loại khi người dùng lọc theo allergen hoặc dinh dưỡng (fail-closed).
4. Không lời khuyên y tế. Không log token, mật khẩu, dữ liệu cá nhân dạng rõ.
5. Trừ kho bằng UPDATE có điều kiện (stock >= :q) trong transaction.
6. Không hard-code secret, model ID, ARN, account ID.

## Quy tắc AWS và Terraform
- Chỉ dùng profile nutrition-plan. KHÔNG chạy apply, destroy, import, state, hay lệnh tạo / xóa tài nguyên bằng AWS CLI.
- Mọi thay đổi hạ tầng qua Terraform. Chạy: terraform fmt, validate, plan -out=tfplan, rồi dừng.
- Sau plan, báo cáo bằng ngôn ngữ thường: tạo gì, sửa gì, XÓA / THAY THẾ gì, rủi ro, chi phí ước tính.
- Cảnh báo rõ nếu plan có: destroy / replace, IAM wildcard, 0.0.0.0/0, tài nguyên public, deletion_protection = false, NAT, Multi-AZ.
- Nếu gặp lỗi token SSO hết hạn: DỪNG và nhắc tôi chạy `aws sso login`. Không tìm cách vòng.
- Hỏi trước khi thêm tài nguyên tốn tiền theo giờ (NAT, interface endpoint, RDS lớn hơn, thêm task).

## Cách làm việc
- Việc lớn: đề xuất kế hoạch (các bước, file sẽ đổi, test, rủi ro) và chờ tôi duyệt.
- Viết test cùng code. Chạy test trước khi báo hoàn thành. Không báo "xong" khi test còn đỏ.
- Một tính năng một nhánh một PR. Commit nhỏ, thông điệp rõ.
- Không đổi phạm vi: thấy việc ngoài yêu cầu thì ghi vào docs/PROGRESS.md thay vì tự làm.
- Kiến thức về AWS có thể đã cũ: với dịch vụ mới (Bedrock, CloudFront VPC origin, Cognito PrivateLink), kiểm chứng bằng tài liệu hoặc lệnh chỉ đọc, và nói rõ chỗ chưa chắc.
- Cuối phiên: cập nhật docs/PROGRESS.md (đã xong, đang dở, bước tiếp theo, câu hỏi mở).

## Giao diện UI/UX
- Với mọi tác vụ thiết kế, xây dựng, chỉnh sửa hoặc đánh giá giao diện UI/UX (trang, component, layout, màu, typography, responsive, accessibility, review UI): PHẢI dùng skill `ui-ux-pro-max` (.claude/skills/ui-ux-pro-max/) trước khi thực hiện.
- Không áp dụng cho tác vụ backend thuần túy (API, DB, Flyway, hạ tầng Terraform, CI không liên quan UI).
- Stack khi tra cứu skill: `--stack react`. Script tìm kiếm cần Python 3 (Windows: `python`); nếu máy chưa có Python thì dùng phần Quick Reference trong SKILL.md, không tự cài Python.

## Lệnh thường dùng
- Chạy toàn bộ local trên Windows: `START.bat` / `STOP.bat`.
- PostgreSQL local: `docker compose up -d postgres` (cổng 5433).
- Backend chạy local: `cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=local`
- Backend kiểm tra đầy đủ: `cd backend && ./mvnw verify` (cần PostgreSQL local).
- Frontend chạy local: `cd frontend && npm run dev` (http://localhost:5173).
- Frontend kiểm tra: `cd frontend && npm run format:check && npm run lint && npm run typecheck && npm test -- --maxWorkers=1 && npm run build`
- E2E / axe: `cd frontend && npm run test:e2e`. Ảnh chụp: `npm run screenshots`.
- Terraform: `terraform fmt -check -recursive infra`, `terraform -chdir=infra/cognito validate`, `plan -out=tfplan` rồi dừng.

## Định nghĩa "xong" của một giai đoạn
Test xanh trong CI; deploy được lên dev; đã kiểm chứng đúng tiêu chí nghiệm thu trong playbook; không vi phạm nguyên tắc bất biến; docs/PROGRESS.md đã cập nhật.

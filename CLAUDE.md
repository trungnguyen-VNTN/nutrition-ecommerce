# Nutrition E-Commerce (đồ án AWS)

Tài liệu: docs/architecture.md, docs/decisions.md, docs/api-contract.md, docs/db-schema.md, docs/test-plan.md.
Tiến độ hiện tại: docs/PROGRESS.md (đọc đầu phiên, cập nhật cuối phiên).

## Bối cảnh cố định
- Region: ap-southeast-1. Tiền tố tài nguyên: nutrition-dev. Tag: Project, Env, Owner.
- Terraform >= 1.10, backend S3 với use_lockfile = true. Ghim phiên bản provider, commit .terraform.lock.hcl.
- Backend: Java <điền phiên bản LTS> + Spring Boot, build bằng <Maven|Gradle>. Frontend: React. DB: PostgreSQL (Flyway).
- Image: linux/<arm64|amd64>. ECS Fargate runtime_platform phải khớp.
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

## Lệnh thường dùng
<điền sau khi có backend / frontend: chạy local, test backend, test frontend, docker compose, terraform plan>

## Định nghĩa "xong" của một giai đoạn
Test xanh trong CI; deploy được lên dev; đã kiểm chứng đúng tiêu chí nghiệm thu trong playbook; không vi phạm nguyên tắc bất biến; docs/PROGRESS.md đã cập nhật.

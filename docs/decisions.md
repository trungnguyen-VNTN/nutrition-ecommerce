# Nhật ký quyết định

## Quyết định đã chốt

| # | Chủ đề | Quyết định | Ghi chú / lý do |
| --- | --- | --- | --- |
| D1 | Lớp AI | Bedrock Converse + tool use trong Spring Boot | JWT có sẵn trong request; không phải mở endpoint công khai cho agent |
| D2 | Mạng | Ưu tiên VPC endpoints, bổ sung outbound khi cần | NAT bật qua biến `enable_nat` nếu spike S3 yêu cầu |
| D3 | IaC | Terraform ≥ 1.10, state S3 với `use_lockfile = true` | Không dùng DynamoDB khóa state |
| D4 | Danh tính dev | IAM Identity Center (SSO), hai profile `nutrition-plan` và `nutrition-apply` | Codex chỉ dùng profile plan |
| D5 | Region | ap-southeast-1 (Singapore) | WAF / ACM của CloudFront (nếu thêm) ở us-east-1 |
| D6 | Phạm vi MVP | Catalog, tài khoản, AI tra cứu, giỏ hàng, đặt hàng, quản lý đơn | Bỏ profile dinh dưỡng, engine, meal plan, event, USDA |
| D7 | Domain | Để sau | Dùng internal ALB + CloudFront VPC origin; truy cập qua `*.cloudfront.net` |
| D8 | Công cụ lập trình AI | Codex, sandbox `workspace-write`, phê duyệt `on-request`, mạng tắt mặc định | Quy tắc ở `AGENTS.md`; lệnh nguy hiểm bị chặn ở `.codex/rules`; không chặn được đọc file bằng cấu hình nên dựa vào luật trong `AGENTS.md` và IAM của profile plan |
| D9 | UI stack (mặc định đề xuất) | React + TypeScript + Vite, Tailwind, shadcn/ui, TanStack Query, React Hook Form + Zod, Vitest, Playwright + axe, MSW | Có thể đổi trước Giai đoạn 3; đổi thì cập nhật `frontend/AGENTS.md` và `docs/ui-guidelines.md` |
| D10 | Kiểm tra UI | Vòng phản hồi bằng ảnh chụp Playwright (390px và 1440px) + axe | Bắt buộc với mọi thay đổi UI (`frontend/AGENTS.md`) |

## Quyết định còn mở

| # | Chủ đề | Lựa chọn | Quyết khi nào | Trạng thái |
| --- | --- | --- | --- | --- |
| O1 | Model và inference profile | in-region hay global; model cụ thể | Sau spike S1 | Chưa quyết |
| O2 | Kiến trúc CPU của image | arm64 hay amd64 | Trước giai đoạn 3 | Chưa quyết |
| O3 | Số AZ cho endpoint ở dev; bật NAT? | 1 AZ, NAT hay không | Sau spike S3 và so sánh chi phí | Chưa quyết |
| O4 | Permission set `apply` | Tùy chỉnh (khuyến nghị) hay AdministratorAccess trên sandbox | Giai đoạn 0 | Chưa quyết |
| O5 | JDK và build tool | Phiên bản LTS; Maven hay Gradle | Giai đoạn 0 | Chưa quyết |
| O6 | Rủi ro HTTP nội bộ CloudFront → ALB nếu S4 thất bại | Chấp nhận (kèm biện pháp giảm) hay đổi hướng | Sau spike S4 | Chưa quyết |
| O7 | Môi trường | Chỉ `dev` hay thêm `prod` | Giai đoạn 7 | Chưa quyết |

## Spike

| Spike | Câu hỏi | Khi nào | Kết quả | Ngày | Hành động tiếp theo |
| --- | --- | --- | --- | --- | --- |
| S1 | Converse + inference profile + Guardrail + contextual grounding chạy được ở Singapore? | GĐ 0 | _chưa làm_ | | |
| S2 | State S3 + `use_lockfile` chạy được? | GĐ 0 | _chưa làm_ | | |
| S3 | Backend trong private subnet tải được JWKS của Cognito (qua endpoint `cognito-idp`)? | GĐ 3 | _chưa làm_ | | Nếu thất bại: bật NAT một AZ |
| S4 | CloudFront VPC origin → internal ALB hoạt động ở Singapore; provider hỗ trợ? | GĐ 3 | _chưa làm_ | | Nếu thất bại: ALB công khai + prefix list CloudFront + header bí mật |
| S5 | Quota Bedrock đủ cho demo? | GĐ 0 | _chưa làm_ | | Nếu thiếu: xin tăng sớm |

## Cách dùng file này

- Khi đổi quyết định: cập nhật file này **trước**, rồi mới yêu cầu Codex sửa code.
- Ghi kết quả spike kèm ngày và bằng chứng (lệnh đã chạy, kết quả ngắn gọn).

# Nhật ký quyết định

## Quyết định đã chốt

| # | Chủ đề | Quyết định | Ghi chú / lý do |
| --- | --- | --- | --- |
| D1 | Lớp AI | Bedrock Converse + tool use trong Spring Boot | JWT có sẵn trong request; không phải mở endpoint công khai cho agent |
| D2 | Mạng | Rút gọn (2026-11-01): không dùng interface VPC endpoint riêng | Thay lựa chọn ưu tiên VPC endpoints trước đây; đường ra Internet của ECS xem O3 |
| D3 | IaC | Terraform ≥ 1.10, state S3 với `use_lockfile = true` | Không dùng DynamoDB khóa state |
| D4 | Danh tính dev | IAM Identity Center (SSO), hai profile `nutrition-plan` và `nutrition-apply` | Codex chỉ dùng profile plan |
| D5 | Region | ap-southeast-1 (Singapore) | WAF / ACM của CloudFront (nếu thêm) ở us-east-1 |
| D6 | Phạm vi MVP | Catalog, tài khoản, AI tra cứu, giỏ hàng, đặt hàng, quản lý đơn | Bỏ profile dinh dưỡng, engine, meal plan, event, USDA |
| D7 | Domain | Để sau | Chốt 2026-11-01: ALB công khai sau CloudFront (SG chỉ nhận prefix list CloudFront + header bí mật), không dùng VPC origin; truy cập qua `*.cloudfront.net` |
| D8 | Công cụ lập trình AI | Codex, sandbox `workspace-write`, phê duyệt `on-request`, mạng tắt mặc định | Quy tắc ở `AGENTS.md`; lệnh nguy hiểm bị chặn ở `.codex/rules`; không chặn được đọc file bằng cấu hình nên dựa vào luật trong `AGENTS.md` và IAM của profile plan |
| D9 | UI stack (mặc định đề xuất) | React + TypeScript + Vite, Tailwind, shadcn/ui, TanStack Query, React Hook Form + Zod, Vitest, Playwright + axe, MSW | Có thể đổi trước Giai đoạn 3; đổi thì cập nhật `frontend/AGENTS.md` và `docs/ui-guidelines.md` |
| D10 | Kiểm tra UI | Vòng phản hồi bằng ảnh chụp Playwright (390px và 1440px) + axe | Bắt buộc với mọi thay đổi UI (`frontend/AGENTS.md`) |

## Quyết định còn mở

| # | Chủ đề | Lựa chọn | Quyết khi nào | Trạng thái |
| --- | --- | --- | --- | --- |
| O1 | Model và inference profile | in-region hay global; model cụ thể | Sau spike S1 | Chưa quyết |
| O2 | Kiến trúc CPU của image | linux/arm64 | Trước giai đoạn 3 | Đã chốt |
| O3 | Đường ra Internet của ECS | Task ở public subnet có IP công khai, hay private subnet + NAT một AZ | Trước giai đoạn 3, so sánh chi phí | Chưa quyết |
| O4 | Permission set `apply` | Tùy chỉnh (khuyến nghị) hay AdministratorAccess trên sandbox | Giai đoạn 0 | Chưa quyết |
| O5 | JDK và build tool | Java 21 LTS; Maven, dùng ./mvnw | Giai đoạn 0 | Đã chốt |
| O6 | Rủi ro HTTP CloudFront → ALB công khai khi chưa có domain | Chấp nhận kèm prefix list + header bí mật; bật HTTPS khi có domain | 2026-11-01 | Đã chốt: chấp nhận |
| O7 | Môi trường | Chỉ `dev` hay thêm `prod` | Giai đoạn 7 | Chưa quyết |

## Spike

| Spike | Câu hỏi | Khi nào | Kết quả | Ngày | Hành động tiếp theo |
| --- | --- | --- | --- | --- | --- |
| S1 | Converse + inference profile + Guardrail + contextual grounding chạy được ở Singapore? | GĐ 0 | _chưa làm_ | | |
| S2 | State S3 + `use_lockfile` chạy được? | GĐ 0 | _chưa làm_ | | |
| S3 | Backend trong private subnet tải được JWKS của Cognito (qua endpoint `cognito-idp`)? | GĐ 3 | _không còn cần_ | 2026-11-01 | Bỏ do D2/D7 rút gọn; JWKS đi qua đường ra Internet (O3) |
| S4 | CloudFront VPC origin → internal ALB hoạt động ở Singapore; provider hỗ trợ? | GĐ 3 | _không còn cần_ | 2026-11-01 | Đã chọn thẳng ALB công khai + prefix list CloudFront + header bí mật |
| S5 | Quota Bedrock đủ cho demo? | GĐ 0 | _chưa làm_ | | Nếu thiếu: xin tăng sớm |

## Đề xuất, chờ duyệt — tổ chức Terraform (2026-11-01)

Chuyển `infra/cognito/` thành module `infra/modules/cognito/`, được gọi từ
`infra/envs/dev/`. Giữ nguyên tài nguyên, biến và outputs; chưa di chuyển hoặc
sửa file Terraform trong lượt dọn repo này.

Nếu chưa có state và tài nguyên thì việc đổi cấu trúc ít rủi ro. Nếu đã có state,
địa chỉ tài nguyên sẽ thay đổi khi vào module: cần phương án migration được duyệt
riêng để tránh Terraform đề xuất tạo lại tài nguyên. Chưa xác minh tình trạng state.
Khi được duyệt, cần cập nhật đường dẫn trong CI, README, tài liệu và script liên quan;
đặt cấu hình provider/backend và lockfile tại root môi trường dev phù hợp.

## Cách dùng file này

- 2026-10-29: Hạ tầng rút gọn dùng ALB công khai, bỏ VPC origin và VPC endpoint riêng vì đề bài không bắt buộc mạng riêng (thay thế lựa chọn mạng riêng trước đây). Đã đồng bộ D2, D7, O3, O6, S3, S4 và các tài liệu ngày 2026-11-01.

- Khi đổi quyết định: cập nhật file này **trước**, rồi mới yêu cầu Codex sửa code.
- Ghi kết quả spike kèm ngày và bằng chứng (lệnh đã chạy, kết quả ngắn gọn).

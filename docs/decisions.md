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
| D9 | UI stack (mặc định đề xuất) | React + TypeScript + Vite, Tailwind, shadcn/ui, TanStack Query, React Hook Form + Zod, Vitest, Playwright + axe, MSW; icon: Phosphor (`@phosphor-icons/react`, bổ sung 2026-11-01 theo skill ui-ux-pro-max) | Có thể đổi trước Giai đoạn 3; đổi thì cập nhật `frontend/AGENTS.md` và `docs/ui-guidelines.md` |
| D10 | Kiểm tra UI | Vòng phản hồi bằng ảnh chụp Playwright (390px và 1440px) + axe | Bắt buộc với mọi thay đổi UI (`frontend/AGENTS.md`) |
| D11 | Hướng thiết kế frontend (2026-11-03) | "Nutrition Label": bố cục theo bản mẫu HTML Nouri, ngôn ngữ hình ảnh nền kem / mực xanh đen / nhấn xanh chanh, màu macro cố định, Bricolage Grotesque + Plus Jakarta Sans, CTA sticker, nhãn dinh dưỡng, donut, dock nổi; breakpoint chính 940px | Chi tiết ở `docs/ui-guidelines.md` và `docs/frontend-redesign-plan.md`. Thay font Be Vietnam Pro. Giữ thương hiệu "nutrition." và ô tìm kiếm (API có `q`) |
| D12 | Phần của bản mẫu không làm | Sắp xếp, bản tin, đánh giá sao, phí ship và ghi chú đơn, thống kê doanh thu admin, trang quên mật khẩu, route "đặt hàng thành công" riêng | Không có API hoặc dữ liệu thật; quên mật khẩu cần đổi `session.ts` (ngoài phạm vi). Sau checkout vẫn chuyển sang `/orders/:id`, hiện khối chúc mừng ở đó |
| D13 | Khác biệt với skill ui-ux-pro-max | Giữ thiết kế D11 khi skill khuyên khác: (1) skill gợi ý phong cách "Vibrant & Block-based" cho e-commerce, giữ hướng nhãn dinh dưỡng vì sản phẩm là dữ liệu dinh dưỡng; (2) bóng đặc lệch của CTA sticker là chủ ý thương hiệu, chỉ dùng cho một CTA mỗi màn hình; (3) không làm dark mode vì `ui-guidelines.md` không yêu cầu | Các quy tắc a11y của skill (tương phản, vùng chạm 44px, focus, reduced-motion) vẫn bắt buộc |
| D14 | Dữ liệu sản phẩm khi chạy local (2026-11-06) | 18 sản phẩm với dinh dưỡng từ USDA FoodData Central, nạp vào DB riêng `nutrition_usda` qua profile `usda` | Theo yêu cầu người dùng. Đây là nhập một lần bằng `scripts/usda-import.mjs`, không phải pipeline USDA (D6 vẫn giữ). `nutrition_dev` và dữ liệu giả giữ nguyên cho test. Giá và tồn kho là mẫu. USDA không có dữ liệu allergen nên mọi sản phẩm `allergens_verified = false`; không tự suy đoán. Chưa áp dụng cho production |
| D15 | Đường ra Internet của ECS (chốt O3, 2026-11-10) | Task Fargate ở public subnet, `assign_public_ip = true`; không dùng NAT (`enable_nat` mặc định `false`, chỉ bật khi được duyệt). RDS ở private-db subnet, không có IP công khai | Rẻ nhất: chỉ tính phí IPv4 công khai mỗi task, thay vì NAT tính theo giờ. SG của ECS chỉ nhận từ SG của ALB, nên không truy cập thẳng vào task được. Đi ra Internet để kéo image ECR, gọi Bedrock, tải JWKS Cognito, ghi CloudWatch Logs |
| D16 | Permission set `apply` (chốt O4, 2026-11-10) | Tùy chỉnh: quyền cho các dịch vụ dự án; IAM chỉ trên role / policy tiền tố `nutrition-*`; `iam:PassRole` giới hạn theo tiền tố; mọi role Terraform tạo ra gắn permissions boundary; cấm tạo IAM user và access key | Theo playbook A.2 mục 4. Biến quy tắc "chỉ người dùng apply" thành ràng buộc kỹ thuật; profile `nutrition-plan` vẫn chỉ đọc |
| D17 | Môi trường (chốt O7, 2026-11-10) | Chỉ `dev` | Đủ cho đồ án và demo. Cấu trúc `infra/envs/` vẫn cho phép thêm `prod` sau mà không đổi module |
| D18 | Model AI (chốt tạm O1, 2026-11-10) | Claude Haiku 5.5, gọi qua inference profile APAC cross-region | Rẻ, độ trễ thấp, đủ cho tra cứu bằng tool chỉ đọc. Profile APAC giữ việc xử lý trong châu Á – Thái Bình Dương. Model ID và profile ID vẫn chỉ nằm trong cấu hình. **Chưa kiểm chứng**: có profile APAC cho model này ở ap-southeast-1 không và quota bao nhiêu; xác nhận bằng spike S1/S5, nếu không có thì chốt lại |
| D19 | Tổ chức Terraform (2026-11-10) | Duyệt đề xuất 2026-11-01: hạ tầng viết thành module trong `infra/modules/<tên>/`, root duy nhất ở `infra/envs/dev/` (backend S3, provider, `.terraform.lock.hcl`); `infra/bootstrap/` giữ state local cho bucket state. `infra/cognito/` chuyển thành `infra/modules/cognito/` | Chưa có state và tài nguyên thật nên chuyển không cần migration. Khi chuyển phải cập nhật đường dẫn trong CI, README, CLAUDE.md, AGENTS.md |

## Quyết định còn mở

| # | Chủ đề | Lựa chọn | Quyết khi nào | Trạng thái |
| --- | --- | --- | --- | --- |
| O1 | Model và inference profile | in-region hay global; model cụ thể | Sau spike S1 | Chốt tạm 2026-11-10: Claude Haiku 5.5 qua inference profile APAC cross-region; xác nhận lại bằng spike S1 |
| O2 | Kiến trúc CPU của image | linux/arm64 | Trước giai đoạn 3 | Đã chốt |
| O3 | Đường ra Internet của ECS | Task ở public subnet có IP công khai, hay private subnet + NAT một AZ | Trước giai đoạn 3, so sánh chi phí | Đã chốt 2026-11-10: public subnet có IP công khai, không NAT |
| O4 | Permission set `apply` | Tùy chỉnh (khuyến nghị) hay AdministratorAccess trên sandbox | Giai đoạn 0 | Đã chốt 2026-11-10: tùy chỉnh theo tiền tố `nutrition-*` + permissions boundary |
| O5 | JDK và build tool | Java 21 LTS; Maven, dùng ./mvnw | Giai đoạn 0 | Đã chốt |
| O6 | Rủi ro HTTP CloudFront → ALB công khai khi chưa có domain | Chấp nhận kèm prefix list + header bí mật; bật HTTPS khi có domain | 2026-11-01 | Đã chốt: chấp nhận |
| O7 | Môi trường | Chỉ `dev` hay thêm `prod` | Giai đoạn 7 | Đã chốt 2026-11-10: chỉ `dev` |

Chi tiết các quyết định đã chốt ngày 2026-11-10 nằm ở D15–D19 trong bảng trên.

## Spike

| Spike | Câu hỏi | Khi nào | Kết quả | Ngày | Hành động tiếp theo |
| --- | --- | --- | --- | --- | --- |
| S1 | Converse + inference profile + Guardrail + contextual grounding chạy được ở Singapore? | GĐ 0 | _chưa làm_ | | |
| S2 | State S3 + `use_lockfile` chạy được? | GĐ 0 | _chưa làm_ | | |
| S3 | Backend trong private subnet tải được JWKS của Cognito (qua endpoint `cognito-idp`)? | GĐ 3 | _không còn cần_ | 2026-11-01 | Bỏ do D2/D7 rút gọn; JWKS đi qua đường ra Internet (O3) |
| S4 | CloudFront VPC origin → internal ALB hoạt động ở Singapore; provider hỗ trợ? | GĐ 3 | _không còn cần_ | 2026-11-01 | Đã chọn thẳng ALB công khai + prefix list CloudFront + header bí mật |
| S5 | Quota Bedrock đủ cho demo? | GĐ 0 | _chưa làm_ | | Nếu thiếu: xin tăng sớm |

## Đề xuất tổ chức Terraform (2026-11-01) — đã duyệt 2026-11-10 (D19)

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

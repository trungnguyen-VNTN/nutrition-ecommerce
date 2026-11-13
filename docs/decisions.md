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
| D16 | Permission set `apply` (chốt O4, 2026-11-10) | Tùy chỉnh: quyền cho các dịch vụ dự án; IAM chỉ trên role / policy tiền tố `nutrition-*`; `iam:PassRole` giới hạn theo tiền tố; mọi role Terraform tạo ra gắn permissions boundary; cấm tạo IAM user và access key | Theo playbook A.2 mục 4. Biến quy tắc "chỉ người dùng apply" thành ràng buộc kỹ thuật; profile `nutrition-plan` vẫn chỉ đọc. Policy mẫu: `docs/aws-setup/` |
| D17 | Môi trường (chốt O7, 2026-11-10) | Chỉ `dev` | Đủ cho đồ án và demo. Cấu trúc `infra/envs/` vẫn cho phép thêm `prod` sau mà không đổi module |
| D18 | Model AI (chốt lại 2026-11-13 sau spike S1) | **Claude Haiku 5.5 qua inference profile `global.anthropic.claude-haiku-5-5`** (model `anthropic.claude-haiku-5-5`). Đặt làm mặc định trong `infra/envs/dev/variables.tf`, vẫn chỉ là cấu hình | Ở ap-southeast-1 Haiku 5.5 không có profile `apac.`; phương án APAC duy nhất là Claude 3 Haiku (2024, cũ hơn). Người dùng chọn global. Đánh đổi: request có thể được xử lý ngoài châu Á; chấp nhận vì backend chỉ gửi câu hỏi tìm món ăn, không gửi user ID, đơn hàng hay dữ liệu cá nhân. **Chưa kiểm chứng:** boundary và permission set đang giới hạn `aws:RequestedRegion = ap-southeast-1`; với suy luận cross-Region có thể cần nới điều kiện này nếu AWS đánh giá quyền ở region đích. Kiểm chứng khi có quota (S5) |
| D19 | Tổ chức Terraform (2026-11-10) | Duyệt đề xuất 2026-11-01: hạ tầng viết thành module trong `infra/modules/<tên>/`, root duy nhất ở `infra/envs/dev/` (backend S3, provider, `.terraform.lock.hcl`); `infra/bootstrap/` giữ state local cho bucket state. `infra/cognito/` chuyển thành `infra/modules/cognito/` | Chưa có state và tài nguyên thật nên chuyển không cần migration. Khi chuyển phải cập nhật đường dẫn trong CI, README, CLAUDE.md, AGENTS.md |
| D20 | Chạy theo buổi demo (2026-11-11) | Hạ tầng dev không chạy 24/7. Biến Terraform `app_running` (mặc định `false`): tắt thì RDS dừng (`aws_rds_instance_state`), ALB và ECS service bị xóa, CloudFront bỏ origin `/api/*`; bật thì làm ngược lại. Người dùng chạy `scripts/demo-infra.ps1 up|down` (apply bằng `nutrition-apply`, có bước `yes`). ECR chuyển sang tag mutable để service chạy `:latest`; workflow deploy chỉ cần đẩy image và `UpdateService --force-new-deployment` | Theo yêu cầu người dùng: không muốn trả tiền khi không demo. Tắt ~$4–5/tháng, bật ~$0,09/giờ (ước tính). Đánh đổi: bật mất 10–15 phút; AWS tự bật lại RDS sau 7 ngày dừng nên phải chạy `down` lại; mất tag immutable của ECR (vẫn gắn thêm tag SHA mỗi lần đẩy) Bổ sung 2026-11-12: `aws_rds_instance_state` (provider 6.71) chờ "available" trước khi làm gì, nên dừng được nhưng không bật được RDS đang dừng; `demo-infra.ps1 up` tự gọi `aws rds start-db-instance` (người dùng chạy, quyền `nutrition-apply`, chỉ bật/tắt không tạo/xóa) rồi chờ "available" trước khi apply |
| D21 | Ảnh sản phẩm (2026-11-12) | Upload qua backend (không presigned URL): admin gửi multipart, server kiểm tra JPEG/PNG/WebP bằng magic bytes, tối đa 2 MB và 5 ảnh, sinh tên ngẫu nhiên. Lưu qua interface `ImageStorage`: S3 bucket riêng `nutrition-dev-images-*` trên AWS (CloudFront `/images/*`, OAC, cache dài vì khóa không bao giờ ghi đè), thư mục `.local-run/images` khi chạy local (backend phục vụ `/api/local-images`). Đổi thứ tự bằng nút Lên/Xuống thay vì kéo thả | Theo kế hoạch người dùng duyệt. Không resize ảnh (ảnh 2 MB tải nguyên). Không nhận SVG vì có thể chứa script. Bucket ảnh tách khỏi bucket frontend để workflow deploy `s3 sync --delete` không xóa ảnh |
| D22 | Dữ liệu mẫu trên AWS dev (2026-11-12) | Biến Terraform `load_demo_catalog` (mặc định `true`) đặt `SPRING_FLYWAY_LOCATIONS=classpath:db/migration,classpath:db/usda` cho ECS, nạp 18 sản phẩm USDA của D14 vào RDS | DB trên AWS mới tạo nên trống. Script seed idempotent (`NOT EXISTS`, `ON CONFLICT`): không ghi đè tồn kho, đơn hàng hay sản phẩm admin đã sửa. Thay một phần D14 ("chưa áp dụng cho production") chỉ cho môi trường dev duy nhất (D17); đặt `false` để chạy DB trống |
| D23 | Catalog demo thật hơn (2026-11-12) | 41 sản phẩm, 8 danh mục, dinh dưỡng từ USDA FoodData Central (mỗi mã FDC được đối chiếu mô tả). 38 ảnh từ Wikimedia Commons chỉ CC0 / Public domain (xem `docs/image-credits.md`), đóng gói trong backend và gắn khi khởi động cho sản phẩm chưa có ảnh (`DemoImageSeeder`, qua `ProductImageService`). Allergen dữ liệu mẫu cho thực phẩm một thành phần; thêm `tree_nut`, `sesame` (V6) | Người dùng giao quyền tự quyết để web đẹp và chuyên nghiệp. Chọn ảnh tự do giấy phép để tránh rủi ro bản quyền dù ảnh kém đồng đều hơn ảnh thương mại. Allergen chỉ ghi khi sản phẩm chưa xác minh và chưa có dòng allergen nào (không đè admin); mã lạ làm import dừng để không fail-open. Yến mạch, ca cao, sô cô la đen giữ chưa xác minh vì nguy cơ nhiễm chéo. Thay một phần D14 (\"không tự suy đoán\") cho dữ liệu demo; không phải xác minh của nhà sản xuất |
| D24 | Guardrail và đánh giá AI (2026-11-13) | Bedrock Guardrail (module `guardrail`): cấm chủ đề tư vấn y tế, bộ lọc nội dung HIGH, PROMPT_ATTACK cho đầu vào, danh sách tục tĩu; gắn vào mọi lần Converse khi đã cấu hình model. Bị chặn thì trả câu từ chối cố định. Bộ 30 prompt (`docs/ai-eval.md`) chạy với model thật qua `-Pbedrock-eval`, ngoài CI | Lớp phòng thủ thứ hai: model chỉ trả tool call đã kiểm tra, câu trả lời cố định. **Chưa kiểm chứng:** Guardrail CLASSIC nhận diện tiếng Việt tới đâu (có thể cần STANDARD + cross-Region), và giá Guardrail ở Singapore; xác nhận ở spike S1. Allergen trong schema tool lấy từ bảng `allergens` thay vì danh sách cứng |

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
| S1 | Converse + inference profile + Guardrail + contextual grounding chạy được ở Singapore? | GĐ 0 | _một phần (chỉ đọc, `nutrition-plan`)_: Claude Haiku 5.5 ở ap-southeast-1 **chỉ có profile `global.anthropic.claude-haiku-5-5`**, không có `apac.` (APAC chỉ có Claude 3 Haiku, Claude 3 / 3.5 Sonnet). Profile global định tuyến tới `arn:aws:bedrock:::foundation-model/anthropic.claude-haiku-5-5` và bản ap-southeast-1. `get-foundation-model-availability`: authorized, entitlement và region AVAILABLE, nhưng **agreement NOT_AVAILABLE** (chưa chấp nhận điều khoản). Chưa gọi thử Converse / Guardrail (cần quyền invoke và quota). | 2026-11-13 | Người dùng chấp nhận điều khoản model trên console; chọn lại D18 (global Haiku 5.5 hay APAC Claude 3 Haiku) |
| S2 | State S3 + `use_lockfile` chạy được? | GĐ 0 | _đang làm_: đã viết `infra/bootstrap`, plan đạt (7 tạo) | 2026-11-11 | Người dùng apply bằng `nutrition-apply`, rồi init `envs/dev` với backend S3 |
| S3 | Backend trong private subnet tải được JWKS của Cognito (qua endpoint `cognito-idp`)? | GĐ 3 | _không còn cần_ | 2026-11-01 | Bỏ do D2/D7 rút gọn; JWKS đi qua đường ra Internet (O3) |
| S4 | CloudFront VPC origin → internal ALB hoạt động ở Singapore; provider hỗ trợ? | GĐ 3 | _không còn cần_ | 2026-11-01 | Đã chọn thẳng ALB công khai + prefix list CloudFront + header bí mật |
| S5 | Quota Bedrock đủ cho demo? | GĐ 0 | **Không**: mọi quota Haiku ở ap-southeast-1 đang là **0** (global Haiku 5.5 / 4.5 tokens per minute, Claude 3 Haiku on-demand và cross-region) — tài khoản mới | 2026-11-13 | Người dùng gửi yêu cầu tăng quota trong Service Quotas (ví dụ 10 requests và 20.000 tokens mỗi phút), chờ AWS duyệt |

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

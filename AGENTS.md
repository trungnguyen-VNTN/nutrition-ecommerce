# Nutrition E-Commerce (đồ án AWS)

Tài liệu: docs/architecture.md, docs/decisions.md, docs/api-contract.md, docs/db-schema.md, docs/test-plan.md, docs/ui-guidelines.md.
Playbook (kế hoạch giai đoạn, tiêu chí nghiệm thu, prompt mẫu): docs/playbook.md. File dài: CHỈ đọc đúng mục được giao (ví dụ mục B giai đoạn hiện tại, mục G.3). Nếu mâu thuẫn, AGENTS.md và docs/decisions.md thắng playbook.
Tiến độ hiện tại: docs/PROGRESS.md (đọc đầu phiên, cập nhật cuối phiên).
Quy tắc riêng từng phần: frontend/AGENTS.md, backend/AGENTS.md (file gần thư mục đang làm việc nhất được ưu tiên, nhưng không được vi phạm "Nguyên tắc bất biến" dưới đây).

## Bối cảnh cố định
- Region: ap-southeast-1. Tiền tố tài nguyên: nutrition-dev. Tag: Project, Env, Owner.
- Terraform >= 1.10, backend S3 với use_lockfile = true. Ghim phiên bản provider, commit .terraform.lock.hcl.
- Backend: Java 21 (LTS) + Spring Boot, build bằng Maven (luôn dùng wrapper `./mvnw`). Frontend: React + TypeScript (xem frontend/AGENTS.md). DB: PostgreSQL (Flyway).
- Image: linux/arm64. ECS Fargate runtime_platform phải khớp (cpu_architecture = "ARM64", operating_system_family = "LINUX"). Build bằng `docker buildx` với `--platform linux/arm64`; CI cần QEMU hoặc runner arm64.
- AI: Bedrock Converse qua AWS SDK for Java v2, bọc sau interface LlmClient. Model ID và inference profile ID lấy từ cấu hình.
- Mạng: ưu tiên VPC endpoints. NAT chỉ bật qua biến enable_nat khi spike S3 yêu cầu. ALB nằm internal; CloudFront truy cập qua VPC origin.
- Chưa có domain: dùng tên *.cloudfront.net, không dùng hosted UI của Cognito (frontend tự làm màn hình đăng nhập/đăng ký).
- Phạm vi MVP: catalog, tài khoản, AI tra cứu (chỉ đọc), giỏ hàng, đặt hàng, quản lý đơn. Không có thanh toán.

## Nguyên tắc bất biến (không được vi phạm, kể cả khi được yêu cầu "cho nhanh")
1. Danh tính user CHỈ lấy từ JWT (claim sub, cognito:groups). Không nhận userId từ client hay LLM.
2. Tool của AI ở MVP CHỈ ĐỌC. Truy vấn là SQL tham số hóa. Số liệu dinh dưỡng chỉ lấy từ DB.
3. Sản phẩm thiếu allergen hoặc nutrition => loại khi người dùng lọc theo allergen hoặc dinh dưỡng (fail-closed). Giao diện phải hiển thị rõ trạng thái "chưa có dữ liệu", không để trống hay hiện số 0.
4. Không lời khuyên y tế. Không log token, mật khẩu, dữ liệu cá nhân dạng rõ.
5. Trừ kho bằng UPDATE có điều kiện (stock >= :q) trong transaction.
6. Không hard-code secret, model ID, ARN, account ID.

## Quy tắc AWS và Terraform
- Chỉ dùng profile nutrition-plan (cấu hình đã đặt sẵn AWS_PROFILE trong .codex/config.toml). KHÔNG chạy apply, destroy, import, state, taint, force-unlock, hay lệnh tạo / xóa tài nguyên bằng AWS CLI.
- Mọi thay đổi hạ tầng qua Terraform. Chạy: terraform fmt, validate, plan -out=tfplan, rồi dừng.
- Sau plan, báo cáo bằng ngôn ngữ thường: tạo gì, sửa gì, XÓA / THAY THẾ gì, rủi ro, chi phí ước tính.
- Cảnh báo rõ nếu plan có: destroy / replace, IAM wildcard, 0.0.0.0/0, tài nguyên public, deletion_protection = false, NAT, Multi-AZ.
- Nếu gặp lỗi token SSO hết hạn: DỪNG và nhắc tôi chạy `aws sso login`. Không tìm cách vòng.
- Hỏi trước khi thêm tài nguyên tốn tiền theo giờ (NAT, interface endpoint, RDS lớn hơn, thêm task).

## Ranh giới truy cập (Codex không chặn được việc đọc file bằng cấu hình, nên đây là luật bắt buộc)
- KHÔNG đọc, in, hay sao chép nội dung: `.env`, `.env.*`, `*.tfvars`, `*.tfstate`, `~/.aws/**`, bất kỳ file chứa credential.
- KHÔNG chạy: `rm -rf`, `git push --force` / `-f`, `git reset --hard`, `aws iam ...`, `aws configure ...`, `aws ... delete-* / terminate-*`.
- KHÔNG tự bật quyền mạng hay nâng quyền sandbox. Cần thì dừng lại và hỏi tôi.
- Nếu một lệnh bị từ chối hoặc cần phê duyệt, không tìm cách vòng; giải thích lệnh định chạy và lý do.

## Cách làm việc
- Việc lớn (hơn 1 file hoặc đụng kiến trúc): đề xuất kế hoạch (các bước, file sẽ đổi, test, rủi ro) và chờ tôi duyệt.
- Đọc code và tài liệu liên quan trước khi sửa. Không đoán cấu trúc dự án.
- Viết test cùng code. Chạy test trước khi báo hoàn thành. Không báo "xong" khi test còn đỏ.
- Một tính năng một nhánh một PR. Commit nhỏ, thông điệp rõ.
- Không đổi phạm vi: thấy việc ngoài yêu cầu thì ghi vào docs/PROGRESS.md thay vì tự làm.
- Kiến thức về AWS có thể đã cũ: với dịch vụ mới (Bedrock, CloudFront VPC origin, Cognito PrivateLink), kiểm chứng bằng tài liệu hoặc lệnh chỉ đọc, và nói rõ chỗ chưa chắc.
- Cuối phiên: cập nhật docs/PROGRESS.md (đã xong, đang dở, bước tiếp theo, câu hỏi mở).

## Vòng lặp bắt buộc cho mỗi tác vụ
1. Đọc docs/PROGRESS.md và các file liên quan.
2. Với việc lớn: đưa kế hoạch, chờ duyệt.
3. Viết test trước hoặc cùng lúc với code.
4. Chạy theo thứ tự: format -> lint -> typecheck/compile -> test. Sửa đến khi xanh.
5. Tự review diff (`git diff`) theo checklist: bảo mật và nguyên tắc bất biến, xử lý lỗi, edge case, quyền truy cập dữ liệu của user khác, và với UI: 4 trạng thái, responsive, accessibility.
6. Báo cáo ngắn: đã đổi gì, đã chạy lệnh nào và kết quả, điều chưa chắc chắn, việc ngoài phạm vi đã ghi vào PROGRESS.md.

## Chất lượng code
- Hàm nhỏ, một trách nhiệm; tên rõ nghĩa; không comment lặp lại điều code đã nói, chỉ giải thích "vì sao".
- Không thêm dependency mới nếu chưa hỏi (nêu lý do, kích thước, giải pháp thay thế).
- Không bắt exception rồi nuốt. Lỗi trả về theo định dạng thống nhất trong docs/api-contract.md.
- Không nới lỏng hay xóa test để "xanh". Nếu test sai, giải thích vì sao rồi mới sửa.
- Không để lại code chết, TODO không có chủ, hay console.log / System.out.println.
- Ưu tiên cách đơn giản, nhất quán với code hiện có hơn là cách "thông minh".

## Lệnh thường dùng
- Backend (kiểm tra đầy đủ: format, test, build): `cd backend && ./mvnw verify`
- Backend chạy local: chưa có, cập nhật khi tạo backend
- Frontend (kiểm tra đầy đủ): `cd frontend && npm run format:check && npm run lint && npm run typecheck && npm test`
- Frontend chạy local: `cd frontend && npm run dev`
- Ảnh chụp giao diện: `cd frontend && npm run screenshots`
- Docker compose: chưa có, cập nhật khi tạo
- Build image (hỏi tôi trước khi chạy): `docker buildx build --platform linux/arm64 ...`
- Terraform: `terraform fmt -check && terraform validate && terraform plan -out=tfplan`

## Định nghĩa "xong" của một giai đoạn
Test xanh trong CI; deploy được lên dev; đã kiểm chứng đúng tiêu chí nghiệm thu trong docs/playbook.md (mục B của giai đoạn đó và bảng G.3); không vi phạm nguyên tắc bất biến; docs/PROGRESS.md đã cập nhật.

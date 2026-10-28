# Kiến trúc (MVP)

> Bản này phản ánh các quyết định đã chốt trong `decisions.md`. Mục ghi 🔎 cần kiểm chứng bằng spike hoặc tài liệu hiện hành.

## 1. Phạm vi MVP

Catalog, tài khoản, AI tra cứu (chỉ đọc), giỏ hàng, đặt hàng, quản lý đơn. Không có thanh toán.
Không nằm trong MVP: Nutrition Profile, Recommendation Engine, meal plan, event pipeline, pipeline USDA, `addToCart` qua AI, domain riêng, WAF.

## 2. Sơ đồ khối

```text
Trình duyệt
   │ HTTPS (*.cloudfront.net)
   ▼
CloudFront ──── / , /images/* ──► S3 (React build, ảnh sản phẩm; OAC, không public)
   │
   └─ /api/* ──► VPC origin ──► internal ALB ──► ECS Fargate (Spring Boot)
                                                    │
                                   ┌────────────────┼──────────────────────┐
                                   ▼                ▼                      ▼
                              RDS PostgreSQL   Bedrock Runtime       Cognito (JWKS)
                              (private)        (qua VPC endpoint)    🔎 endpoint hay NAT

Đăng nhập: React ──► Cognito User Pool (không gán domain, không hosted UI) ──► JWT
CI/CD:     GitHub Actions (OIDC) ──► build/test/scan ──► ECR ──► cập nhật ECS
```

## 3. Thành phần

| Lớp | Dịch vụ | Ghi chú |
| --- | --- | --- |
| Edge | CloudFront | `/api/*` tắt cache, chuyển tiếp `Authorization`; `/` và `/images/*` về S3 |
| Frontend | S3 + React | Không public, chỉ CloudFront đọc qua OAC |
| Xác thực | Cognito User Pool | Group `USER`, `ADMIN`; app client public cho SPA |
| Backend | ECS Fargate (Spring Boot) | Private subnet; image trong ECR; `/actuator/health` |
| Cân bằng tải | Internal ALB | Chỉ nhận từ CloudFront VPC origin 🔎 |
| Database | RDS PostgreSQL | 1 AZ cho dev, mã hóa, `deletion_protection`, mật khẩu do RDS quản lý (Secrets Manager) |
| AI | Bedrock Converse + (tùy chọn) Guardrails | Gọi từ Spring Boot; model ID và inference profile ID lấy từ cấu hình |
| Quan sát | CloudWatch Logs, Alarms | Không log token hay dữ liệu cá nhân |
| IaC | Terraform ≥ 1.10 | State S3, `use_lockfile = true` |

## 4. Mạng

- VPC với public subnet (IGW, NAT nếu bật), private-app subnet, private-db subnet.
- ALB cần subnet ở ít nhất hai AZ; DB subnet group cần ít nhất hai AZ. Task ECS và endpoint đặt ở một AZ cho dev.
- VPC endpoints:

| Loại | Service |
| --- | --- |
| Gateway | `s3` |
| Interface | `ecr.api`, `ecr.dkr`, `logs`, `secretsmanager`, `bedrock-runtime` |
| Interface (có điều kiện) | `cognito-idp` (user pool không được gán domain) 🔎 |

- NAT Gateway: tắt mặc định (`enable_nat = false`); chỉ bật nếu spike S3 cho thấy JWKS không đi qua endpoint.
- Security group: ALB chỉ nhận từ VPC origin; ECS chỉ nhận từ ALB; RDS chỉ nhận 5432 từ ECS; endpoint chỉ nhận 443 từ ECS.

## 5. Luồng chính

| Luồng | Đường đi |
| --- | --- |
| Duyệt sản phẩm | Trình duyệt → CloudFront → ALB → ECS → RDS |
| Đăng nhập | React → Cognito → JWT → gửi kèm `Authorization: Bearer` tới `/api/*` |
| Đặt hàng | ECS mở transaction: tạo order, trừ kho có điều kiện, xóa giỏ |
| Ảnh sản phẩm | Admin upload qua backend → S3 → phục vụ qua CloudFront `/images/*` |
| AI tra cứu | React → `/api/chat` → kiểm tra JWT, quota → (Guardrail input) → Converse + tool → SQL tham số hóa → RDS → (Guardrail output) → trả lời |

## 6. AI tra cứu

- Tool chỉ đọc: `searchProducts(filters)`, `getProduct(id)`, `getNutrition(id)`, `compareProducts(ids)` (tùy chọn).
- `searchProducts` lọc theo từ khóa, category, calo tối đa, protein tối thiểu, nhãn chế độ ăn, allergen cần loại, còn hàng. Allergen là tham số do người dùng nêu, không phải dữ liệu hồ sơ.
- Fail-closed: sản phẩm `nutrition_complete = false` hoặc `allergens_verified = false` bị loại khi lọc theo dinh dưỡng / allergen.
- Vòng tool loop tối đa 4 vòng, `max_tokens` cố định, timeout backend nhỏ hơn timeout CloudFront. Không streaming ở MVP.
- Interface `LlmClient` + bản mock để test không cần Bedrock.
- Không tư vấn y tế; số liệu chỉ lấy từ kết quả tool.

## 7. Bảo mật

- Danh tính chỉ từ JWT. Admin API chỉ cho group `ADMIN`.
- IAM tối thiểu, có permissions boundary; không `*` nếu không có lý do được ghi lại.
- Secrets trong Secrets Manager; không đưa vào biến môi trường dạng rõ trong Terraform.
- Mã hóa RDS và S3; `deletion_protection` cho RDS.
- Rate limit và quota cho `/api/chat` theo `sub`.

## 8. Tách quyền AWS

| Profile | Dùng bởi | Quyền |
| --- | --- | --- |
| `nutrition-plan` | Codex | Đọc tài nguyên dự án; đọc/ghi state và file khóa trong bucket state |
| `nutrition-apply` | Chỉ người dùng | Tạo, sửa, xóa tài nguyên dự án (theo tiền tố, có permissions boundary) |
| GitHub OIDC role | CI | Đẩy ECR, cập nhật ECS |

## 9. Hướng mở rộng (ngoài MVP)

Domain + ACM (us-east-1) + WAF; Nutrition Profile và Recommendation Engine; meal plan; pipeline USDA; event pipeline; `addToCart` qua AI có xác nhận; streaming cho `/chat`.

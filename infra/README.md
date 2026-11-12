# Hạ tầng Terraform

Cấu trúc theo D19 (`docs/decisions.md`):

```text
infra/
├── bootstrap/        Bucket S3 lưu state của dev. State của chính nó để local.
├── envs/dev/         Root duy nhất. Backend S3, use_lockfile = true. Gọi các module.
└── modules/
    ├── network/      VPC, 2 public subnet, 2 private-db subnet, IGW, SG (ALB, ECS, RDS). NAT tắt (D15).
    ├── ecr/          Repository image backend, quét khi đẩy, lifecycle giữ 10 image.
    ├── rds/          PostgreSQL 17, db.t4g.micro, 1 AZ, mã hóa, mật khẩu do RDS quản lý.
    ├── cognito/      User pool, SPA client, group ADMIN và USER.
    ├── service/      ALB công khai (chỉ nhận request có header bí mật từ CloudFront), ECS Fargate ARM64,
    │                 role execution / task có boundary, log group.
    ├── frontend/     Bucket S3 riêng tư + CloudFront (OAC); /api/* chuyển về ALB qua HTTP (O6).
    └── github-oidc/  OIDC provider + role deploy cho GitHub Actions, chỉ nhánh master.
```

## Bật / tắt theo buổi demo (D20)

Biến `app_running` (mặc định `false`) quyết định phần tốn tiền theo giờ:

| | `app_running = false` (tắt) | `app_running = true` (bật) |
| --- | --- | --- |
| RDS | **dừng** (giữ dữ liệu) | chạy |
| ALB, ECS service | **không tồn tại** | được tạo, chạy `api_desired_count` task (mặc định 1) |
| CloudFront | chỉ phục vụ frontend; `/api/*` không có origin | `/api/*` chuyển về ALB |
| VPC, ECR, Cognito, S3, IAM | giữ nguyên | giữ nguyên |

Người dùng tự chạy (Terraform hiện plan và hỏi `yes`):

```powershell
.\scripts\demo-infra.ps1 up     # trước buổi demo, khoảng 10–15 phút
.\scripts\demo-infra.ps1 down   # sau buổi demo, khoảng 5–10 phút
```

Lần apply đầu tiên dùng `down`: tạo toàn bộ hạ tầng ở trạng thái tắt.
Dữ liệu RDS, user Cognito, image ECR và frontend giữ nguyên giữa các lần bật.
**AWS tự bật lại RDS đã dừng sau 7 ngày**; nếu nghỉ lâu hơn, chạy `down` lần nữa mỗi tuần
(Budget sẽ báo nếu quên). ECS chạy image `:latest` trong ECR, nên trước lần `up` đầu tiên
workflow deploy phải đẩy ít nhất một image.

Quyền Bedrock của task chỉ được tạo khi đặt `bedrock_model_id` và `bedrock_inference_profile_id`
(sau spike S1), ví dụ trong `infra/envs/dev/dev.auto.tfvars` (git bỏ qua `*.tfvars`).

## Ai chạy gì

- AI agent: `fmt`, `validate`, `plan` bằng profile `nutrition-plan`, rồi dừng.
- Chỉ người dùng chạy `apply` bằng profile `nutrition-apply`, trong một terminal riêng.

## Lần đầu: tạo bucket state (spike S2)

PowerShell, tại gốc repo:

```powershell
aws sso login --sso-session nutrition
$env:TF_VAR_owner = "<tên bạn>"

$env:AWS_PROFILE = "nutrition-plan"
terraform -chdir=infra/bootstrap init
terraform -chdir=infra/bootstrap plan -out=tfplan

# Đọc plan xong, bạn tự apply:
$env:AWS_PROFILE = "nutrition-apply"
terraform -chdir=infra/bootstrap apply tfplan
terraform -chdir=infra/bootstrap output state_bucket
```

`infra/bootstrap/terraform.tfstate` bị git bỏ qua. Giữ một bản sao an toàn; bucket có
`prevent_destroy` nên không bị xóa nhầm.

## Môi trường dev

1. Chép `infra/envs/dev/backend.hcl.example` thành `infra/envs/dev/backend.hcl` (git bỏ qua),
   điền tên bucket từ bước trên.
2. Plan và apply:

```powershell
$env:AWS_PROFILE = "nutrition-plan"
terraform -chdir=infra/envs/dev init "-backend-config=backend.hcl"
terraform -chdir=infra/envs/dev plan -out=tfplan

$env:AWS_PROFILE = "nutrition-apply"
terraform -chdir=infra/envs/dev apply tfplan
```

## Deploy bằng GitHub Actions

Workflow `.github/workflows/deploy.yml` chạy khi có push vào `master` (đổi `backend/` hoặc
`frontend/`) hoặc bấm *Run workflow*. Nó assume role `nutrition-dev-github-deploy` qua OIDC,
không dùng access key:

- **Backend:** build image `linux/arm64` trên runner ARM của GitHub, đẩy lên ECR với tag SHA và
  `latest`; nếu app đang bật thì `update-service --force-new-deployment`, nếu tắt thì chỉ đẩy image.
- **Frontend:** `npm run build` với ID Cognito, `s3 sync` lên bucket frontend (asset cache 1 năm,
  `index.html` luôn kiểm tra lại), invalidation `/index.html`.

Cần các *repository variables* (Settings → Secrets and variables → Actions → Variables). Đây là
cấu hình công khai, không phải secret; giá trị lấy từ `terraform -chdir=infra/envs/dev output`:

| Biến | Lấy từ |
| --- | --- |
| `AWS_DEPLOY_ROLE_ARN` | output `github_deploy_role_arn` |
| `ECR_REPOSITORY` | `nutrition-dev-backend` (tên repo, không kèm registry) |
| `ECS_CLUSTER` | output `ecs_cluster` |
| `ECS_SERVICE` | output `ecs_service` |
| `FRONTEND_BUCKET` | output `frontend_bucket` |
| `CLOUDFRONT_DISTRIBUTION_ID` | output `cloudfront_distribution_id` |
| `VITE_COGNITO_USER_POOL_ID` | output `cognito_user_pool_id` |
| `VITE_COGNITO_CLIENT_ID` | output `cognito_app_client_id` |

Khi chưa có `AWS_DEPLOY_ROLE_ARN`, hai job được bỏ qua (không làm đỏ CI).

## Chi phí ước tính khi đã apply (ap-southeast-1)

| Trạng thái | Gồm | Ước tính |
| --- | --- | --- |
| **Tắt** (`down`) | Lưu trữ RDS 20 GiB + backup, secret của RDS, ECR, S3, CloudFront, CloudWatch Logs; Cognito trong hạn mức miễn phí | **khoảng $4–5 / tháng** |
| **Bật** (`up`), cộng thêm | RDS db.t4g.micro (~$0,026/giờ), ALB (~$0,03/giờ), 1 task Fargate ARM64 0,5 vCPU / 1 GiB kèm IPv4 (~$0,03/giờ) | **khoảng $0,09 / giờ**: buổi demo 4 giờ ~$0,35; quên tắt cả ngày ~$2,1 |
| Để bật 24/7 (so sánh) | | khoảng $60–67 / tháng |

Chưa tính Bedrock (tính theo token).

Số liệu ước tính theo giá công bố mà tôi biết, chưa đối chiếu AWS Pricing Calculator.
Muốn giảm tiền khi không dùng: dừng RDS tạm thời (tự bật lại sau 7 ngày) hoặc destroy dev.

## Điều cần biết khi đọc plan

- `0.0.0.0/0` xuất hiện ở hai chỗ, có chủ ý: route ra Internet của public subnet và
  egress HTTPS (443) của task ECS để gọi ECR, Bedrock, Cognito, CloudWatch (D2, D15).
  Không có ingress nào mở cho Internet; ALB chỉ nhận prefix list của CloudFront.
- RDS: `deletion_protection = true`, `publicly_accessible = false`, `multi_az = false`.
- Tài nguyên public có chủ ý: ALB (internet-facing nhưng SG chỉ nhận prefix list CloudFront, listener trả 403
  nếu thiếu header bí mật) và CloudFront. Task ECS có IP công khai nhưng SG chỉ nhận từ ALB.
- IAM: mọi role có boundary `nutrition-boundary`. `Resource = "*"` chỉ ở `ecr:GetAuthorizationToken` và các
  hành động ECS không hỗ trợ ARN (RegisterTaskDefinition, DescribeTaskDefinition…) trong role deploy.
- Header bí mật sinh bằng `random_password`, chỉ nằm trong state (bucket mã hóa), không có trong code.
- Cognito: `deletion_protection = "ACTIVE"`.

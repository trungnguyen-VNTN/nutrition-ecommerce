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

Service khởi tạo với `api_desired_count = 0` vì ECR chưa có image (playbook: ECR trước ECS).
Sau khi workflow deploy đẩy image đầu tiên, đặt `api_desired_count = 1` rồi plan / apply lại.
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

## Chi phí ước tính khi đã apply (ap-southeast-1)

| Tài nguyên | Ước tính / tháng |
| --- | --- |
| RDS db.t4g.micro chạy 24/7 + 20 GiB gp3 | khoảng $20–23 |
| ALB chạy 24/7 (ít lưu lượng) | khoảng $19–21 |
| ECS Fargate 0,5 vCPU / 1 GiB ARM64, mỗi task chạy 24/7, kèm IPv4 công khai | khoảng $18–21 (bằng 0 khi `api_desired_count = 0`) |
| CloudFront, S3 frontend (lưu lượng demo) | dưới $1 |
| ECR, bucket state, VPC, SG, IGW, CloudWatch Logs | khoảng $1 |
| Cognito (dưới hạn mức miễn phí) | $0 |
| **Tổng** | **khoảng $41–46 khi chưa chạy task, $60–67 khi chạy 1 task** |

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

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
    └── cognito/      User pool, SPA client, group ADMIN và USER.
```

Giai đoạn 3 (ALB, ECS, S3 frontend, CloudFront, role OIDC cho GitHub Actions) sẽ thêm module sau.

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

## Chi phí ước tính khi đã apply (ap-southeast-1, chưa có ECS/ALB/CloudFront)

| Tài nguyên | Ước tính / tháng |
| --- | --- |
| RDS db.t4g.micro chạy 24/7 + 20 GiB gp3 | khoảng $20–23 |
| ECR, bucket state, VPC, SG, IGW | dưới $1 |
| Cognito (dưới hạn mức miễn phí) | $0 |

Số liệu ước tính theo giá công bố mà tôi biết, chưa đối chiếu AWS Pricing Calculator.
Muốn giảm tiền khi không dùng: dừng RDS tạm thời (tự bật lại sau 7 ngày) hoặc destroy dev.

## Điều cần biết khi đọc plan

- `0.0.0.0/0` xuất hiện ở hai chỗ, có chủ ý: route ra Internet của public subnet và
  egress HTTPS (443) của task ECS để gọi ECR, Bedrock, Cognito, CloudWatch (D2, D15).
  Không có ingress nào mở cho Internet; ALB chỉ nhận prefix list của CloudFront.
- RDS: `deletion_protection = true`, `publicly_accessible = false`, `multi_az = false`.
- Cognito: `deletion_protection = "ACTIVE"`.

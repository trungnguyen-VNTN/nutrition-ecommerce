# Thiết lập quyền AWS (Giai đoạn 0)

Hai file JSON trong thư mục này hiện thực D16 trong `docs/decisions.md`:

| File | Dùng ở đâu | Tác dụng |
| --- | --- | --- |
| `nutrition-boundary-policy.json` | IAM → Policies, tên **`nutrition-boundary`** | Trần quyền cho mọi role Terraform tạo ra (task ECS, execution role, role OIDC của GitHub Actions) |
| `nutrition-apply-policy.json` | IAM Identity Center → permission set **`nutrition-apply`** → inline policy | Quyền để người dùng chạy `terraform apply` |

Không có account ID, ARN cụ thể hay secret trong các file này; ARN dùng `*` ở vị trí account.

## Thứ tự làm

1. **Tạo boundary trước** (đăng nhập bằng root hoặc quyền admin, chỉ làm một lần):
   IAM → Policies → Create policy → tab JSON → dán `nutrition-boundary-policy.json`
   → tên đúng là `nutrition-boundary` → Create.
   Permission set `apply` không sửa hay xóa được policy này, nên muốn đổi phải dùng admin.
2. **Permission set `nutrition-plan`**: AWS managed policy `ReadOnlyAccess`.
3. **Permission set `nutrition-apply`**:
   - AWS managed policy `ReadOnlyAccess` (để Terraform đọc trạng thái).
   - Inline policy: dán `nutrition-apply-policy.json`.
   - Session duration: 4 giờ là đủ.
4. Gán cả hai permission set cho user của bạn trên tài khoản AWS.
5. Kiểm tra: IAM → Policies → `nutrition-boundary` → nút **Policy validation** /
   Access Analyzer không báo lỗi; với permission set, Identity Center báo lỗi ngay khi lưu nếu JSON sai.

## Quyền `nutrition-apply` cho phép gì

- Toàn quyền các dịch vụ của dự án **chỉ ở ap-southeast-1**: VPC/EC2, ALB, ECS, ECR, RDS,
  Cognito, Bedrock, CloudWatch, SNS, KMS, Secrets Manager, SSM, autoscaling.
- CloudFront (dịch vụ toàn cầu) và S3 **chỉ với bucket tên `nutrition-*`**.
- IAM chỉ trên role / policy tên `nutrition-*`:
  - Tạo role, gắn policy vào role **chỉ khi role có boundary `nutrition-boundary`**.
  - `iam:PassRole` chỉ cho ECS task (và RDS enhanced monitoring).
  - Tạo service-linked role cho ECS, ELB, RDS, autoscaling; tạo OIDC provider của GitHub Actions.

## Quyền `nutrition-apply` cấm gì

- Tạo IAM user, access key, mật khẩu console (không có credential dài hạn).
- Gỡ boundary khỏi role, sửa hay xóa policy `nutrition-boundary`.
- Mọi hành động ngoài ap-southeast-1, trừ dịch vụ toàn cầu (IAM, STS, CloudFront, S3, Billing).

## Giới hạn đã biết

- Trong ap-southeast-1, quyền dịch vụ vẫn rộng (`ec2:*`, `rds:*`…), nên vẫn có thể tạo tài nguyên tốn tiền
  như NAT hay RDS lớn. Lớp bảo vệ ở đây là Budgets và việc đọc `terraform plan` trước khi apply.
- S3 không bị chặn theo region (vì `ListAllMyBuckets` là toàn cầu); chỉ bị giới hạn theo tên bucket.
- Khi có domain (Giai đoạn 8) cần thêm ACM và WAF ở us-east-1; hiện chưa cho phép.
- Policy được soạn từ tài liệu IAM, **chưa chạy thử trên tài khoản thật**. Nếu `terraform apply`
  báo `AccessDenied`, gửi nguyên câu lỗi (bỏ account ID) để bổ sung đúng quyền thiếu, không chuyển sang AdministratorAccess.

## Ngoại lệ cho Bedrock global cross-Region inference (2026-11-13)

Claude Haiku 5.5 ở ap-southeast-1 chỉ gọi được qua profile `global.` (D18). Với profile global, AWS
kiểm tra quyền với `aws:RequestedRegion = "unspecified"`, nên các điều kiện "chỉ Singapore" trả về
`AccessDeniedException ... with an explicit deny`. Cả hai policy có ngoại lệ **chỉ cho**
`bedrock:InvokeModel` và `bedrock:InvokeModelWithResponseStream`, với region `ap-southeast-1`
hoặc `unspecified`; mọi dịch vụ khác vẫn bị giới hạn ở Singapore.

- `nutrition-apply-policy.json`: `AllowModelInvokeSingaporeOrGlobal`, hai hành động gọi model được
  rút khỏi `DenyOtherRegions` và có lệnh cấm riêng `DenyModelInvokeElsewhere`.
- `nutrition-boundary-policy.json`: `ModelInvokeSingaporeOrGlobal` (để task ECS gọi được model).

Cập nhật trên console bằng root / admin (permission set `apply` không sửa được boundary):
IAM → Policies → `nutrition-boundary` → **Edit** → dán JSON mới → **Save changes** (tạo version mới,
đặt làm mặc định); IAM Identity Center → Permission sets → `nutrition-apply` → **Inline policy** →
**Edit** → dán JSON mới → **Save**, rồi **Update** cho tài khoản nếu được nhắc (re-provision).
Tham khảo: https://docs.aws.amazon.com/bedrock/latest/userguide/global-cross-region-inference.html

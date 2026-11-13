# Runbook vận hành môi trường dev

Mọi lệnh `apply` / thao tác ghi do **người dùng** chạy bằng profile `nutrition-apply` (CLAUDE.md).
Agent chỉ `plan` bằng `nutrition-plan` và đọc trạng thái.

## 1. Bật / tắt cho buổi demo (D20)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\demo-infra.ps1 up     # ~10-15 phút
powershell -ExecutionPolicy Bypass -File .\scripts\demo-infra.ps1 down   # ~5-10 phút
```

- Sau `down`, đợi RDS dừng hẳn (5-10 phút) rồi mới `up`.
- AWS tự bật lại RDS đã dừng sau 7 ngày: chạy `down` lại mỗi tuần nếu nghỉ lâu.

## 2. Nhận cảnh báo (CloudWatch alarms)

Đặt e-mail khi plan / apply (không commit):

```powershell
$env:TF_VAR_alert_email = "<email của bạn>"
powershell -ExecutionPolicy Bypass -File .\scripts\demo-infra.ps1 down   # hoặc up
```

AWS gửi e-mail *AWS Notification - Subscription Confirmation*: bấm **Confirm subscription**.
Cảnh báo gồm: API trả 5xx, không còn task khỏe, CPU / RAM ECS cao (khi app bật), CPU RDS cao, RDS
sắp hết dung lượng, API ghi nhiều dòng `ERROR`. Xem trong CloudWatch → Alarms.

## 3. Sao lưu và thử khôi phục RDS

RDS có backup tự động 7 ngày và snapshot cuối khi bị xóa (`nutrition-dev-postgres-final`).
Diễn tập khôi phục (không ảnh hưởng DB đang dùng):

1. App đang bật (RDS `available`). Console → **Aurora and RDS → Databases →
   `nutrition-dev-postgres` → Actions → Take snapshot**, tên `nutrition-dev-drill-<ngày>`.
2. Khi snapshot `Available`: **Actions → Restore snapshot**, DB identifier
   `nutrition-dev-restore-drill`, instance `db.t4g.micro`, **Single-AZ**, subnet group
   `nutrition-dev-db`, security group `nutrition-dev-rds`, **Public access: No**.
3. Đợi `Available` (~10 phút). Ghi lại thời gian khôi phục vào `docs/PROGRESS.md`.
4. **Xóa bản diễn tập**: Actions → Delete, bỏ chọn final snapshot, không giữ backup tự động.
   (Instance diễn tập tính tiền theo giờ như RDS thật.)
5. Xóa snapshot diễn tập nếu không cần giữ.

## 4. Destroy rồi dựng lại từ code

Mục tiêu: chứng minh hạ tầng dựng lại được hoàn toàn từ Terraform, dữ liệu lấy từ snapshot.

1. Tạo snapshot thủ công như mục 3.1, tên `nutrition-dev-before-rebuild`.
2. Tắt bảo vệ xóa (tạm thời, qua Terraform, đọc plan trước khi apply):
   - RDS: `deletion_protection = false` trong `infra/modules/rds/main.tf`.
   - Cognito: `deletion_protection = "INACTIVE"` trong `infra/modules/cognito/main.tf`
     (xóa user pool làm **mất mọi tài khoản đăng nhập**; bỏ qua Cognito nếu muốn giữ).
   - Bucket ảnh / frontend / ECR phải rỗng mới xóa được, hoặc loại chúng khỏi bài diễn tập.
3. `terraform -chdir=infra/envs/dev destroy` (người dùng chạy, đọc kỹ danh sách xóa).
4. Khôi phục bảo vệ xóa trong code, rồi dựng lại từ snapshot:
   ```powershell
   $env:TF_VAR_restore_snapshot_identifier = "nutrition-dev-before-rebuild"
   powershell -ExecutionPolicy Bypass -File .\scripts\demo-infra.ps1 down
   ```
5. Chạy workflow Deploy (GitHub Actions → *Deploy to AWS dev* → Run workflow) để đẩy lại image và
   frontend, `up`, kiểm tra theo `docs/demo.md`.
6. Bỏ biến `TF_VAR_restore_snapshot_identifier` (Terraform bỏ qua thay đổi biến này sau khi tạo).

Bucket state (`infra/bootstrap`) có `prevent_destroy`, không nằm trong bài diễn tập.

## 5. Khi có sự cố

| Dấu hiệu | Kiểm tra |
| --- | --- |
| Web trắng / lỗi tải trang | CloudFront distribution `Deployed`; workflow Deploy job Frontend xanh |
| `/api` lỗi 5xx | ECS service có task `RUNNING`; log group `/ecs/nutrition-dev-backend` |
| API khởi động lỗi DB | RDS `available`; secret RDS còn hiệu lực |
| Đăng nhập lỗi | Cognito pool ID / client ID trong repository variables khớp output Terraform |
| Tra cứu AI báo chưa sẵn sàng | Quyền / quota Bedrock (xem `docs/ai-eval.md`, D18, S1 / S5) |
| Lệnh AWS báo token hết hạn | `aws sso login --sso-session nutrition` |

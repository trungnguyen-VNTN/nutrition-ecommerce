# Runbook vận hành môi trường dev

Mọi lệnh `apply` / thao tác ghi chạy bằng profile `nutrition-apply`.
Việc thường ngày chỉ `plan` bằng `nutrition-plan` và đọc trạng thái.

## 1. Bật / tắt cho buổi demo (D20)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\demo-infra.ps1 up     # ~10-15 phút
powershell -ExecutionPolicy Bypass -File .\scripts\demo-infra.ps1 down   # ~5-10 phút
powershell -ExecutionPolicy Bypass -File .\scripts\demo-infra.ps1 up -Vnpay -Waf   # thêm VNPAY sandbox và WAF
```

- `-Waf` (D29) tạo AWS WAF trước CloudFront; lần chạy sau bỏ `-Waf` thì WAF bị xóa. Mỗi lần bật / tắt,
  CloudFront mất vài phút để cập nhật.
- Log kiểm toán: CloudTrail và ALB access logs nằm trong bucket `nutrition-dev-logs-<account>`
  (prefix `cloudtrail/`, `alb/`), tự xóa sau 30 ngày.

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
3. Đợi `Available` (~10 phút). Ghi lại thời gian khôi phục vào biên bản bên dưới.
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
   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\demo-infra.ps1 down -Vnpay
   ```
5. Chạy workflow Deploy (GitHub Actions → *Deploy to AWS dev* → Run workflow) để đẩy lại image và
   frontend, `up`, kiểm tra theo `docs/demo.md`.
6. Bỏ biến `TF_VAR_restore_snapshot_identifier` (Terraform bỏ qua thay đổi biến này sau khi tạo).

Bucket state (`infra/bootstrap`) có `prevent_destroy`, không nằm trong bài diễn tập.

### Biên bản diễn tập (điền sau mỗi lần chạy)

Thứ tự khuyên dùng: chạy mục 3 trước (rẻ, không đụng DB đang dùng); mục 4 chỉ chạy khi đã có
snapshot `Available` và chấp nhận mất tài khoản Cognito nếu xóa cả user pool.

| Mục | Mục 3: khôi phục snapshot | Mục 4: destroy rồi dựng lại |
| --- | --- | --- |
| Ngày, người chạy | | |
| Snapshot dùng | | |
| Bắt đầu → `Available` (phút) | | |
| Kiểm tra dữ liệu | Đếm sản phẩm trên bản khôi phục = bản gốc (152)? | `/api/products` trả đủ sản phẩm sau `up`? |
| Kiểm tra ứng dụng | (không áp dụng) | Trang chủ, đăng nhập, đặt hàng COD theo `docs/demo.md` |
| Đã xóa tài nguyên diễn tập | Instance `nutrition-dev-restore-drill`, snapshot diễn tập | Biến `TF_VAR_restore_snapshot_identifier` |
| Sự cố gặp phải, cách xử lý | | |

Ghi chú khi bảo vệ: thời gian từ lúc bắt đầu khôi phục tới khi dùng được chính là **RTO** đo được;
dữ liệu mất tối đa (**RPO**) là khoảng cách tới snapshot dùng để khôi phục; với backup tự động, RDS
còn cho khôi phục tới một thời điểm (point-in-time) gần hiện tại, thường chỉ cách vài phút.

### Diễn tập chuyển AZ (Multi-AZ, D33)

Database có bản dự phòng ở AZ thứ hai. Thử chuyển AZ thật, không mất dữ liệu:

1. App đang bật. Ghi AZ hiện tại: RDS → `nutrition-dev-postgres` → tab **Configuration**, mục *Availability Zone* (ví dụ `ap-southeast-1a`).
2. **Actions → Reboot**, tích **Reboot with failover**, xác nhận. Ghi giờ bấm.
3. Mở web và gọi `/api/products` liên tục; ghi lúc API trả lỗi và lúc trả lại 200. Khoảng đó là thời gian gián đoạn (thường 1–2 phút).
4. Khi RDS về `Available`, AZ chính đã đổi sang AZ kia (ví dụ `ap-southeast-1b`). Địa chỉ database giữ nguyên, ứng dụng tự kết nối lại.

Chỉ dùng tài khoản `nutrition-apply`. Không tốn thêm tiền ngoài giờ chạy bình thường.

## 5. Thanh toán VNPAY sandbox (D27)

Chỉ dùng môi trường **sandbox**: không có tiền thật. Không có khóa thì web chỉ có thanh toán khi nhận hàng.

1. **Đăng ký** tại https://pay.vnpaytest.vn/dev-registration. Địa chỉ website: `https://<cloudfront>`; URL IPN (nếu form hỏi): `https://<cloudfront>/api/payments/vnpay/ipn`. VNPAY gửi email có `TmnCode`, `HashSecret` và thông tin thẻ test.
2. **Chạy local:** thêm `vnpayTmnCode`, `vnpayHashSecret` vào `scripts/local-settings.json` (git bỏ qua) rồi chạy `START.bat`. Local thanh toán được trên cổng sandbox, nhưng **VNPAY không gọi được IPN về localhost**: đơn vẫn ở "Chờ thanh toán" và tự hủy sau khi hết hạn. Luồng đầy đủ kiểm chứng trên AWS.
3. **Bật trên AWS:**
   - Chạy `.scriptsdemo-infra.ps1 up -Vnpay`. Lần đầu sẽ tạo secret `nutrition-dev/vnpay-sandbox` với giá trị rỗng; script tự điền URL quay về từ `app_url`.
   - Vào Secrets Manager (ap-southeast-1), mở secret đó, sửa giá trị thành `{"tmn_code":"...","hash_secret":"..."}`. Terraform không ghi đè giá trị này.
   - Khởi động lại task để nhận khóa: chạy lại workflow deploy, hoặc ECS → Update service → Force new deployment.
   - Mỗi lần `up` / `down` sau đó **vẫn thêm `-Vnpay`**. Bỏ `-Vnpay` là xóa secret.
4. **Kiểm tra:** `GET https://<cloudfront>/api/payments/methods` phải trả `["COD","VNPAY"]`. Đặt một đơn VNPAY, trả bằng thẻ test, rồi xem đơn chuyển "Đã đặt" kèm "Đã thanh toán VNPAY".
5. **Hoàn tiền:** đơn có nhãn "Cần hoàn tiền" (tiền về khi đơn đã hết hạn, hoặc hủy đơn đã trả) thì admin hoàn tay trên cổng quản trị merchant của VNPAY; ứng dụng không có API hoàn tiền tự động.

Không bao giờ log hay commit `HashSecret`. Lộ khóa thì đổi khóa trên cổng VNPAY và cập nhật secret.

## 6. Khi có sự cố

| Dấu hiệu | Kiểm tra |
| --- | --- |
| Web trắng / lỗi tải trang | CloudFront distribution `Deployed`; workflow Deploy job Frontend xanh |
| `/api` lỗi 5xx | ECS service có task `RUNNING`; log group `/ecs/nutrition-dev-backend` |
| API khởi động lỗi DB | RDS `available`; secret RDS còn hiệu lực |
| Đăng nhập lỗi | Cognito pool ID / client ID trong repository variables khớp output Terraform |
| Tra cứu AI báo chưa sẵn sàng | Quyền / quota Bedrock (xem `docs/ai-eval.md`, D18, S1 / S5) |
| Lệnh AWS báo token hết hạn | `aws sso login --sso-session nutrition` |

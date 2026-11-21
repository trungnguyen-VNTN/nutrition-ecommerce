# Hướng dẫn mở và chạy project

Tài liệu này dành cho người mới mở project trên máy Windows. Hướng dẫn đi từ cài công cụ tới chạy được web ở `http://localhost:5173`. Chi tiết kỹ thuật đầy đủ nằm trong [README](../README.md).

## Chọn cách chạy

| Mục đích | Cách chạy | Cần gì |
|---|---|---|
| Chỉ xem giao diện, không cần backend | [Cách 1: frontend với dữ liệu giả](#cách-1-chỉ-xem-giao-diện-dữ-liệu-giả) | Node.js |
| Chạy đầy đủ với dữ liệu USDA thật (khuyên dùng) | [Cách 2: `START.bat`](#cách-2-chạy-đầy-đủ-bằng-startbat) | Node.js, Java 21, Docker Desktop |
| Chạy từng phần trong terminal (để gỡ lỗi) | [Cách 3: chạy thủ công](#cách-3-chạy-thủ-công-từng-phần) | Như cách 2 |
| Demo trên AWS | [Phần AWS](#demo-trên-aws) | AWS CLI, Terraform, quyền SSO |

## 1. Cài công cụ (một lần)

| Công cụ | Phiên bản | Kiểm tra bằng lệnh |
|---|---|---|
| Git | bất kỳ | `git --version` |
| Node.js (kèm npm) | >= 22.12.0 | `node --version` |
| Java (JDK) | 21 | `java -version` |
| Docker Desktop | bản mới | `docker info` |

Không cần cài Maven: project dùng Maven wrapper (`mvnw.cmd`) đi kèm.

## 2. Lấy mã nguồn và cài thư viện frontend (một lần)

```powershell
git clone https://github.com/trungnguyen-VNTN/nutrition-ecommerce.git
cd nutrition-ecommerce\frontend
npm ci
```

Chỉ cần chạy lại `npm ci` khi `package-lock.json` thay đổi, ví dụ sau khi `git pull`. `START.bat` không tự cài thư viện; nếu thiếu, nó báo `Frontend dependencies are missing`.

## Cách 1: chỉ xem giao diện (dữ liệu giả)

Không cần Java, Docker hay database. Web dùng API giả (MSW) ngay trong trình duyệt.

```powershell
cd frontend
npm run dev -- --mode test
```

Mở `http://localhost:5173`. Dữ liệu sản phẩm là dữ liệu mẫu và không có ảnh sản phẩm thật. Cách này hợp để sửa giao diện nhanh.

## Cách 2: chạy đầy đủ bằng `START.bat`

1. Mở Docker Desktop. Nếu chưa mở, `START.bat` sẽ tự mở và chờ tối đa 120 giây.
2. Nhấp đúp `START.bat` ở thư mục gốc project.
3. Chờ dòng chữ xanh `READY: http://localhost:5173`. Trình duyệt sẽ tự mở trang.

`START.bat` tự làm các việc sau:

- Kiểm tra đã có `docker`, `java`, `npm` và thư viện frontend.
- Kiểm tra cổng 8080 và 5173 còn trống.
- Bật PostgreSQL trong Docker (cổng 5433) và tạo database `nutrition_usda` nếu chưa có.
- Chạy backend với dữ liệu USDA (`http://localhost:8080`). Lần đầu có thể mất vài phút để tải thư viện Maven.
- Chạy frontend (`http://localhost:5173`).

Nhật ký chạy nằm trong thư mục `.local-run/`.

**Tắt:** nhấp đúp `STOP.bat`. Dữ liệu trong database được giữ nguyên.

### Bật đăng nhập và thanh toán VNPAY sandbox (tuỳ chọn)

Không có file cấu hình thì vẫn xem được catalog, nhưng **không đăng nhập được**: không có cách bỏ qua đăng nhập. Để bật:

1. Chép `scripts/local-settings.example.json` thành `scripts/local-settings.json`. Git đã bỏ qua file này, không commit nó.
2. Điền các giá trị:
   - `cognitoUserPoolId`, `cognitoClientId`: lấy bằng lệnh `terraform -chdir=infra/envs/dev output`. Đây là cấu hình công khai, không phải bí mật.
   - `vnpayTmnCode`, `vnpayHashSecret`: chỉ khi muốn thử VNPAY **sandbox**. Lấy từ email đăng ký sandbox của VNPAY. Đây là bí mật: không gửi cho ai, không đưa vào code hay ảnh chụp màn hình.
3. Chạy lại `STOP.bat` rồi `START.bat`.

Lúc khởi động, cửa sổ sẽ in `Cognito sign-in enabled` và, nếu có khoá, `VNPAY sandbox enabled`. Không có khoá VNPAY thì chỉ có hình thức thanh toán khi nhận hàng.

Tính năng trợ lý AI cần Bedrock trên AWS và quyền gọi model, nên khi chạy local thường không dùng được.

## Cách 3: chạy thủ công từng phần

Mỗi bước chạy trong một cửa sổ PowerShell riêng, bắt đầu từ thư mục gốc project.

```powershell
# 1. Database
docker compose up -d postgres
docker compose exec postgres createdb -U nutrition_dev nutrition_usda   # chỉ lần đầu

# 2. Backend
cd backend
./mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=usda"

# 3. Frontend (cửa sổ khác)
cd frontend
npm run dev
```

Lệnh `createdb` báo lỗi "already exists" nghĩa là database đã có sẵn, bỏ qua được.

Máy ít RAM: chạy `$env:MAVEN_OPTS = "-Xmx256m -XX:MaxMetaspaceSize=128m -XX:+UseSerialGC"` trước lệnh Maven.

## Các địa chỉ khi chạy local

| Thành phần | Địa chỉ |
|---|---|
| Web | http://localhost:5173 |
| API | http://localhost:8080 |
| Kiểm tra API còn sống | http://localhost:8080/actuator/health |
| PostgreSQL | `localhost:5433`, user `nutrition_dev`, database `nutrition_usda` |

## Chạy kiểm tra trước khi tạo PR

```powershell
# Frontend
cd frontend
npm run format:check; npm run lint; npm run typecheck; npm test -- --maxWorkers=1; npm run build

# Backend (cần PostgreSQL đang chạy)
cd backend
./mvnw.cmd verify
```

Kiểm thử E2E và trợ năng (axe) cần Chromium cho Playwright, chỉ cài một lần:

```powershell
cd frontend
npm exec -- playwright install chromium
npm run test:e2e
```

## Lỗi thường gặp

| Thông báo | Cách xử lý |
|---|---|
| `Port 8080 (hoặc 5173) is already used...` | Một chương trình khác đang dùng cổng. Tắt nó, hoặc chạy `STOP.bat` nếu lần trước chưa tắt. |
| `Missing docker / java / npm.cmd` | Cài công cụ đó, hoặc thêm vào PATH rồi mở lại cửa sổ. |
| `Frontend dependencies are missing` | Chạy `npm ci` trong thư mục `frontend`. |
| `Docker Engine is unavailable` | Mở Docker Desktop và chờ biểu tượng chuyển xanh. |
| `backend exited` / `not ready` | Xem `.local-run\backend.log` và `backend-error.log`. Thường do PostgreSQL chưa chạy hoặc thiếu RAM. |
| Không thấy nút đăng nhập hoạt động | Chưa có `scripts/local-settings.json`, xem [phần đăng nhập](#bật-đăng-nhập-và-thanh-toán-vnpay-sandbox-tuỳ-chọn). |

## Demo trên AWS

Hạ tầng AWS mặc định **tắt** để không tốn tiền. Khi cần demo, chủ dự án chạy (cần đăng nhập `aws sso login --profile nutrition-plan` trước):

```powershell
.\scripts\demo-infra.ps1 up          # bật, khoảng 10-15 phút
.\scripts\demo-infra.ps1 down        # tắt sau khi demo, khoảng 5-10 phút
```

Thêm `-Vnpay` vào **cả lệnh `up` lẫn `down`** nếu muốn giữ thanh toán VNPAY sandbox. Nếu bỏ `-Vnpay` ở lệnh nào thì lệnh đó xoá secret VNPAY (secret này tốn khoảng 0,40 USD mỗi tháng).

Các lệnh trên tạo và xoá tài nguyên tốn tiền theo giờ, nên chỉ người có quyền mới chạy, và nhớ chạy `down` sau khi demo. Chi tiết xem [docs/demo.md](demo.md) và [infra/README.md](../infra/README.md). Mỗi lần merge vào `master`, workflow "Deploy to AWS dev" trên GitHub Actions sẽ chạy deploy.

## Đọc tiếp

- [docs/architecture.md](architecture.md): kiến trúc hệ thống.
- [docs/api-contract.md](api-contract.md): danh sách API.
- [docs/runbook.md](runbook.md): xử lý sự cố khi vận hành.

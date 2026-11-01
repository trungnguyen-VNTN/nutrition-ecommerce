## Mục đích

<!-- Thay đổi này giải quyết việc gì? Liên kết issue nếu có. -->

## Thay đổi chính

-

## Kiểm thử

<!-- Ghi lệnh đã chạy và kết quả. Không đánh dấu nếu chưa chạy. -->

- [ ] Backend: `./mvnw verify`
- [ ] Frontend: `format:check`, `lint`, `typecheck`, `test`, `build`
- [ ] E2E / axe (nếu đổi giao diện): `npm run test:e2e`
- [ ] Ảnh chụp trước / sau (nếu đổi giao diện)

## Hạ tầng (nếu có)

- [ ] Đã chạy `terraform fmt`, `validate`, `plan -out=tfplan` (không apply)
- [ ] Tóm tắt plan: tạo / sửa / **xoá hoặc thay thế**, chi phí ước tính
- [ ] Không có IAM wildcard, `0.0.0.0/0`, tài nguyên public ngoài ý muốn

## Nguyên tắc bất biến

- [ ] Danh tính user chỉ lấy từ JWT, không nhận userId từ client / LLM
- [ ] Tool AI chỉ đọc, SQL tham số hoá, số liệu dinh dưỡng chỉ từ DB
- [ ] Lọc allergen / dinh dưỡng vẫn fail-closed khi thiếu dữ liệu
- [ ] Không log token, mật khẩu, dữ liệu cá nhân; không hard-code secret, model ID, ARN, account ID
- [ ] Trừ kho bằng UPDATE có điều kiện trong transaction
- [ ] Đã cập nhật `docs/PROGRESS.md` nếu cần

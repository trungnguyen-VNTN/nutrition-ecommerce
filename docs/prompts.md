# Mẫu prompt giao việc cho Codex

Prompt theo từng giai đoạn hạ tầng / backend / AI nằm ở `docs/playbook.md`, mục D. File này chứa các mẫu ngắn gọn, thêm phần UI và review.

Nguyên tắc: một tác vụ = một lát cắt có thể kiểm chứng; luôn nêu file cần đọc, ràng buộc, tiêu chí nghiệm thu đo được; việc lớn yêu cầu kế hoạch trước.

## 1. Khởi tạo frontend (tác vụ riêng, chưa làm tính năng)
```text
Mục tiêu: dựng khung frontend theo frontend/AGENTS.md.
Đọc trước: AGENTS.md, frontend/AGENTS.md, docs/ui-guidelines.md, docs/decisions.md.
Làm: Vite + React + TS strict, Tailwind, shadcn/ui, React Router, TanStack Query,
RHF + Zod, Vitest + Testing Library, MSW, Playwright + axe, ESLint, Prettier.
Tạo tokens.css theo mục 2 của ui-guidelines, font Be Vietnam Pro tự host,
Layout gốc (header, footer, container), trang trống cho từng route,
và các scripts bắt buộc (kể cả `screenshots`).
Nghiệm thu: format:check, lint, typecheck, test, build đều xanh; `npm run screenshots`
tạo ảnh 390px và 1440px cho các route.
Trước khi code: đưa kế hoạch ngắn và danh sách dependency sẽ thêm, chờ tôi duyệt.
```

## 2. Một màn hình UI
```text
Mục tiêu: <tên màn hình>.
Đọc trước: AGENTS.md, frontend/AGENTS.md, docs/ui-guidelines.md,
docs/api-contract.md (mục <...>), docs/design-refs/<file>.
Yêu cầu chức năng: <liệt kê>.
Yêu cầu giao diện: đủ 4 trạng thái; dùng component và token có sẵn; hiển thị rõ
sản phẩm thiếu dữ liệu dinh dưỡng / allergen.
Ràng buộc: không thêm dependency; không hard-code màu.
Nghiệm thu: lint + typecheck + test + axe xanh; chạy screenshots, đối chiếu với
ảnh tham chiếu và checklist mục 8 của ui-guidelines, liệt kê chỗ chưa khớp.
Trước khi code: kế hoạch ngắn, chờ tôi duyệt.
```

## 3. Một tính năng backend
```text
Mục tiêu: <tính năng>, ví dụ POST /api/orders.
Đọc trước: AGENTS.md, backend/AGENTS.md, docs/api-contract.md, docs/db-schema.md,
docs/test-plan.md (Giai đoạn <n>).
Nghiệm thu: các mục test tương ứng trong test-plan đều có test và xanh
(kể cả test đồng thời / rollback nếu liên quan); không SQL ghép chuỗi;
không nhận userId từ request.
Trước khi code: kế hoạch (file, migration, test, rủi ro), chờ tôi duyệt.
```

## 4. Review (mở PHIÊN MỚI, không dùng lại phiên đã viết code)
```text
Hãy review diff của nhánh hiện tại so với main như một reviewer khó tính.
Tập trung: vi phạm "Nguyên tắc bất biến" trong AGENTS.md, lỗ hổng phân quyền
(đọc dữ liệu của user khác), SQL ghép chuỗi, lộ secret / token trong log,
thiếu test, edge case, và với UI: thiếu trạng thái, accessibility, hard-code token.
Chỉ báo cáo, không sửa. Xếp theo mức độ nghiêm trọng, nêu file và dòng.
```

## 5. Terraform
```text
Mục tiêu: <module / tài nguyên>.
Đọc trước: AGENTS.md (mục AWS và Terraform), docs/architecture.md, docs/decisions.md.
Làm: viết code, chạy terraform fmt, validate, plan -out=tfplan rồi DỪNG.
Báo cáo bằng ngôn ngữ thường: tạo / sửa / xóa / thay thế gì, rủi ro, chi phí ước tính,
và mọi cảnh báo theo AGENTS.md. Không apply.
```

## 6. Kết thúc phiên
```text
Cập nhật docs/PROGRESS.md: đã xong, đang dở, bước tiếp theo (tối đa 5), câu hỏi mở,
việc ngoài phạm vi đã phát hiện. Liệt kê các lệnh đã chạy và kết quả.
```

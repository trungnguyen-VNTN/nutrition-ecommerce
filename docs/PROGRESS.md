# Tiến độ

_Cập nhật lần cuối: 2026-10-29_ (Codex cập nhật cuối mỗi phiên)

## Trạng thái hiện tại

- Giai đoạn: **0 – Chuẩn bị**
- Cấu trúc repo và tài liệu đã tạo. Frontend scaffold đã có mã nguồn trên `feat/frontend-scaffold`, **chưa nghiệm thu**: dependency đã cài nhưng audit và typecheck còn lỗi. Chưa có hạ tầng.

## Đã xong

- [x] Khung thư mục repo, `AGENTS.md` (gốc, frontend, backend), `.codex/` (config + rules), `.gitignore`
- [x] Playbook chuyển sang Codex (`docs/playbook.md`, thay `claude-code-playbook.md`)
- [x] Hướng dẫn UI (`docs/ui-guidelines.md`), mẫu prompt (`docs/prompts.md`), thư mục ảnh tham chiếu (`docs/design-refs/`)
- [x] Bản nháp: `architecture.md`, `decisions.md`, `db-schema.md`, `api-contract.md`, `test-plan.md`

## Việc người dùng cần làm trước khi giao việc cho Codex (Giai đoạn 0)

- [ ] AWS: tài khoản, MFA root, AWS Budgets có cảnh báo email
- [ ] IAM Identity Center: permission set `plan` và `apply`; hai profile SSO đăng nhập được
- [ ] Công cụ: Git, `gh`, JDK, Maven/Gradle, Node, Docker, Terraform ≥ 1.10, `psql`, Codex (CLI hoặc extension)
- [ ] Spike S1 (Bedrock + inference profile + Guardrail), S2 (state S3), S5 (quota) → ghi vào `decisions.md`
- [ ] Chốt các quyết định mở O1–O5 trong `decisions.md`
- [ ] Điền các chỗ `<...>` trong `AGENTS.md` và `backend/AGENTS.md` (JDK, build tool, kiến trúc CPU, lệnh thường dùng)
- [ ] Codex: trust thư mục repo, chạy `codex execpolicy check` theo `.codex/README.md`, xác nhận rule `terraform apply` bị `forbidden`
- [ ] Kiểm tra IAM của `nutrition-plan` không có quyền tạo / xóa tài nguyên (chốt chặn thật, vì Codex không có deny-read / wildcard)
- [ ] Chốt UI stack (mục D9 trong `decisions.md`) và chỉnh màu / font trong `docs/ui-guidelines.md` nếu muốn
- [ ] Chuẩn bị 3–5 ảnh tham chiếu giao diện vào `docs/design-refs/` (trang danh sách, chi tiết sản phẩm, chat, giỏ hàng)
- [ ] Tạo repo GitHub, bảo vệ nhánh `main`, commit cấu trúc này

## Đang làm

### Kiểm tra lại với Full Access (2026-10-29)

- Đã đọc lại hướng dẫn, source/config và package-lock; không viết lại scaffold, không sửa dependency/lockfile trong lượt kiểm tra này. Metadata npm đã truy cập được. Bằng chứng được lưu ở `frontend/verification/` và tổng hợp trong `frontend/verification/REVIEW.md`.
- Xác minh đủ 35 dependency trực tiếp đều có tuổi phát hành >21 ngày. Audit mới chạy vẫn là **7 mục package bị ảnh hưởng: 1 low, 1 moderate, 4 high, 1 critical**. Không chạy audit fix.
- Format, format:check và lint PASS. Typecheck FAIL do cây cài đặt thiếu file React Query và playwright-core không đồng nhất. Đối chiếu archive npm (đã kiểm SHA-512) xác nhận React Query 5.90.2 có file .d.ts trong bản phát hành, nhưng file local bị thiếu; không cần ép kiểu hoặc nâng React Query để che lỗi.
- Unit test đã thử chạy: BLOCKED trước khi chạy bài test vì bốn worker không tìm thấy css-tree (dependency gián tiếp của cssstyle/jsdom). Production build FAIL ở typecheck; kiểm tra bundle chưa được chạy. E2E/axe/screenshots và vòng visual review BLOCKED bởi prerequisite build của cấu hình Playwright hiện tại. Chưa có bằng chứng nghiệm thu.
- Đề xuất chờ duyệt: vite 7.3.7 (06/10/2026), react-router-dom 7.18.4 (15/09/2026), vitest 4.1.12 (15/10/2026), zod 4.6.7 (12/10/2026); esbuild gián tiếp 0.28.1 (12/06/2026), áp dụng override playwright-core 1.56.1 hiện có. Ngày theo Asia/Saigon. Vitest và Zod chưa đủ 21 ngày: cần ngoại lệ rõ ràng hoặc chờ. Vitest 4.1.11 và Zod trước 4.6.6 vẫn nằm trong phạm vi cảnh báo; không coi bản cũ đủ tuổi là đã vá.
- Bước phụ thuộc đang chờ: duyệt thay đổi dependency và ngoại lệ tuổi phát hành, sau đó cài lại cây dependency bằng npm để phục hồi file thiếu, đồng bộ lockfile và kiểm tra tiếp. Không chuyển thao tác kỹ thuật thông thường sang người dùng; Codex sẽ tự chạy khi được duyệt.

### Lịch sử dựng scaffold

- Frontend scaffold (2026-10-29): đã viết cấu hình Vite/React/TypeScript strict, Tailwind, font Be Vietnam Pro local, ESLint/Prettier, Vitest/Testing Library/MSW và Playwright/axe; chỉ dùng các dependency trực tiếp đã được duyệt.
- Đã viết tokens, layout header/footer/container, tám route, Button/Skeleton/EmptyState/ErrorState, ProductCard/DataStatusBadge và trang `/products` với tám sản phẩm mẫu cùng bốn trạng thái. Các route nghiệp vụ khác chỉ là placeholder.
- Đã viết test render, dữ liệu thiếu, retry, lỗi mạng/schema, trạng thái HTTP, điều hướng, keyboard, axe và responsive. Script screenshots dự kiến tạo 22 ảnh (8 route × 2 kích thước, cộng 3 trạng thái bổ sung × 2).
- Đã thêm chặn production: import MSW chỉ trong `import.meta.env.DEV`, không copy public worker vào build, không gọi API thật. Có kiểm tra bundle trong `build`, unit test chặn request production và E2E kiểm tra không đăng ký worker/không tải mock/không gọi API. **Các kiểm tra này chưa chạy được**.
- Lần kiểm tra ban đầu thiếu `node_modules`, tất cả công cụ chưa chạy được. Sau khi người dùng cài package: `npm.cmd run format`, `format:check`, `lint` đã qua; `typecheck` chưa qua do thiếu declaration của React Query và hai bản playwright-core không đồng nhất. Chưa tiếp tục test/build/E2E/screenshots sau lỗi typecheck; chưa có ảnh để duyệt.
- `node --check` cho cấu hình ESLint và script kiểm tra production đã qua. Rà soát nguồn bằng `rg` không thấy màu literal ngoài tokens; `font-size` ngoài tokens chỉ tham chiếu CSS variable. Đây không thay thế kiểm tra build, accessibility hoặc kiểm tra thị giác.
- Người dùng đã chạy `npm.cmd install --no-audit`, `npm.cmd audit`, `npm.cmd run mocks:init`, `npm.cmd exec -- playwright install chromium`. Lockfile và MSW worker đã có; Chromium 1194 đã được tải trong tài khoản người dùng. Chưa kiểm tra quyền truy cập browser cache từ sandbox.
- Audit do người dùng gửi: **7 vulnerabilities (1 low, 1 moderate, 4 high, 1 critical)**. Report đề xuất vite 7.3.7, vitest 4.1.12, react-router-dom 7.18.5, zod 4.6.7; esbuild cũng cần được giải quyết qua dependency tree. Đây mới là phiên bản ứng viên từ audit, chưa xác minh tuổi phát hành và peer dependencies. ESLint 9.39.1 có cảnh báo không còn được hỗ trợ. Không chạy `npm audit fix` và chưa cập nhật các phiên bản này.
- Registry trong sandbox từng lỗi `ENOTFOUND`; người dùng xác nhận terminal Windows có mạng. Script `frontend/scripts/check-dependencies.ps1` bị Windows Execution Policy chặn; không sửa policy hay chạy vòng. Cần kết quả các lệnh `npm.cmd view` trực tiếp, được người dùng duyệt/chạy, để xác minh ngày phát hành và tương thích trước khi cập nhật dependency.
- Đã sửa `reducedMotion` vào `use.contextOptions` theo kiểu khai báo Playwright đã cài. Đã thêm override `playwright-core: 1.56.1` để đồng bộ dependency gián tiếp của axe với @playwright/test 1.56.1; không thêm package trực tiếp. Override chưa được áp dụng vào lockfile/node_modules, cần chạy npm install sau khi chốt bản vá.
- Kiểm tra file local cho thấy @tanstack/react-query 5.90.2 tham chiếu `build/modern/index.d.ts` và `build/legacy/index.d.ts` nhưng hai file đều thiếu. Chưa rõ gói phát hành hay cây cài đặt bị thiếu file; không sửa node_modules, không thêm @types giả hoặc ép any để che lỗi.
- Người dùng giữ quyền ghi `.git`; Codex chỉ đọc git, không commit và không sửa AGENTS.md. Chưa có nhóm thay đổi nào đủ điều kiện nghiệm thu để commit.

### Giả định riêng của scaffold (chưa phải quyết định API đã chốt)

- Response Catalog tạm là `{ items, page, size, total }`, trang bắt đầu từ 0. Product tạm có `id`, `name`, `price`, `currency`, `stock`, `nutrition_complete`, `allergens_verified`; khai báo tập trung ở `frontend/src/lib/api/catalog.types.ts`. **Đây là giả định mock đã được duyệt, chưa phải schema API chốt**. Không sửa `docs/api-contract.md`.
- Fixture hoàn toàn giả lập, chỉ phục vụ kiểm thử; UI ghi rõ dữ liệu mẫu. Không hiển thị số liệu dinh dưỡng giả định. Cờ thiếu dữ liệu luôn có thông báo rõ, không thay bằng 0. Hình minh họa bao bì dùng SVG inline và màu token, không tải ảnh/CDN ngoài.
- Giữ nguyên bảng màu, thang chữ và spacing trong ui-guidelines. Bổ sung token kỹ thuật trong `tokens.css`: shadow sm/md dùng màu neutral hiện có, vùng bấm 44px, border/focus, motion và opacity. Dùng tên token radius/shadow riêng với namespace Tailwind để tránh CSS variable tự tham chiếu. Không sửa ui-guidelines.
- `?mock=loading|empty|error|error-once` chỉ được đọc bởi module MSW dành cho dev/test để chụp ảnh và kiểm thử; không thêm nút điều khiển mock vào UI. Production chỉ hiển thị thông báo chưa kết nối Catalog, không lấy dữ liệu thật.

## Bước tiếp theo (tối đa 5)

1. Xác minh metadata các bản vá được audit đề xuất bằng lệnh npm.cmd view trực tiếp; chốt phiên bản tương thích và đủ tuổi phát hành. Không thay đổi Execution Policy.
2. Cập nhật manifest sau xác minh rồi người dùng cài lại dependency, áp dụng override Playwright, kiểm tra file kiểu React Query và chạy lại npm audit. Không dùng audit fix, force hoặc legacy-peer-deps. Không viết tay lockfile.
3. Chạy format → format:check → lint → typecheck → test → build; sửa lỗi rồi chạy E2E/axe và screenshots. Nếu thiếu thư viện hệ thống hoặc lỗi quyền thì dừng và báo.
4. Mở ảnh home/products ở 390px và 1440px, đối chiếu mục 8 ui-guidelines, ghi điểm chưa khớp, sửa và chụp lại ít nhất một vòng; chỉ sau đó đánh giá nghiệm thu scaffold và đề xuất các commit nhỏ bằng tiếng Anh.
5. Tiếp tục các bước Giai đoạn 0 và kế hoạch hạ tầng hiện có sau khi người dùng giao riêng; không mở rộng phạm vi scaffold.

## Câu hỏi mở

- Xem bảng "Quyết định còn mở" trong `decisions.md`.
- Chưa xác minh ngày phát hành, peer dependencies và audit của các phiên bản frontend đã ghim. Cần kết quả từ terminal có mạng trước khi chốt lockfile.
- Catalog response chính thức, tích hợp Cognito/API thật và ảnh sản phẩm thật để giai đoạn sau; không triển khai trong scaffold.

## Rủi ro / vấn đề tồn đọng

- Cách backend tải JWKS của Cognito trong mạng riêng (spike S3).
- CloudFront VPC origin ở Singapore và hỗ trợ của provider Terraform (spike S4).
- Quota Bedrock của tài khoản mới (spike S5).

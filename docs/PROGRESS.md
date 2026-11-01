# Tiến độ

_Cập nhật lần cuối: 2026-11-01_ (Codex cập nhật cuối mỗi phiên)

## Trạng thái hiện tại

- Chuẩn hoá repo 2026-11-01 (nhánh chore/repo-hygiene): cài skill ui-ux-pro-max vào .claude/skills và thêm quy tắc UI/UX, điền chỗ trống trong CLAUDE.md; thêm .gitattributes/.editorconfig, mẫu PR/issue, Dependabot; tách CI thành từng step, thêm concurrency/timeout; README thêm badge, ảnh, sơ đồ Mermaid, mục lục, mục Đóng góp. Không đổi code ứng dụng/dependency/Terraform. YAML parse OK, git diff --check PASS; CI trên GitHub chưa chạy. Đã chốt ALB công khai: đồng bộ decisions (D2, D7, O3, O6, S3, S4), architecture.md, CLAUDE.md, AGENTS.md, README và ghi chú đầu playbook. Thêm LICENSE MIT. Còn mở: O3 (đường ra Internet của ECS: public subnet hay NAT). Nhánh tính năng chưa merge vào master; commit commerce nằm trên feat/cognito-infra.

- Dọn repo 2026-11-01: xoá 48 log và 3 placeholder trong phạm vi duyệt; chuyển 9 bằng chứng sang docs/verification/frontend-2026-10-29/ (hash khớp). Bổ sung ignore/mẫu môi trường, viết lại README, thêm CI push master và Terraform validate. Không đổi logic/dependency/Terraform. Đề xuất cấu trúc infra chờ duyệt; người dùng tự commit và đồng bộ quyền agent nếu cần. Terraform fmt/validate, frontend format:check/lint và git diff --check PASS. Lệnh README đã đối chiếu package.json/pom.xml/Compose; chưa chạy workflow trên GitHub, không chạy lại test nghiệp vụ. Ignore đã kiểm chứng cho env/state/tfvars/log; không có artifact nhạy cảm/build đang track. Bỏ qua Maven compile vì chỉ còn khoảng 703 MB RAM trống.

- Frontend V2 (2026-10-31): nâng cấp layout/header tìm kiếm và chỉ báo giỏ, footer, homepage, catalog/bộ lọc/chips, chi tiết/chọn số lượng, tài khoản, cart/checkout/orders, AI chat và admin. Giữ API/auth/session và backend; không thêm dependency. Palette xanh trầm/cream và typography qua tokens; hero WebP 246 KB là minh họa AI, không phải ảnh sản phẩm. Asset: frontend/public/images/food-editorial.webp; tạo bằng imagegen built-in với prompt bát ngũ cốc/rau/hạt nhìn từ trên, ánh sáng tự nhiên, nền cream, không chữ/logo/claim.
- Kiểm chứng V2 PASS: format:check, lint, typecheck, full unit 45/45; sau bổ sung số lượng chạy 10/10 test commerce/shared liên quan, sau sửa thứ tự form mobile chạy 3/3 auth. Tổng 46 test hiện có đã được kiểm chứng qua các lượt, không tuyên bố một full run 46. Build cuối PASS, bundle không MSW; cảnh báo JS ~547 KB (gzip ~165 KB), không tăng ngưỡng che cảnh báo. Log tạm frontend/*-v2*.log đã được xoá trong lượt dọn repo 2026-11-01; kết quả lịch sử giữ tại đây.
- Browser V2 PASS theo nhóm: 22 axe + 5 trạng thái/geometry catalog, 17 route/keyboard, 3 luồng search/chips, cart→checkout, admin cancel + 1 production no-mock. Đã sửa expectation tiêu đề homepage theo thiết kế mới; sửa fixture Playwright không chặn nhầm module /src/.../api/ và không khởi động đồng thời MSW. Không xóa test hoặc tăng timeout. Test auth mới phát hiện input xác minh bị giữ giá trị password: đã dùng key riêng và chuyển về login sau xác minh, giữ SRP nguyên trạng.
- Visual V2: 45/45 screenshot/layout/axe PASS ở 390/768/1440 (15 màn hình/trạng thái), thêm 6/6 ảnh auth sau vòng sửa cuối. Đã mở ảnh trước/sau, sửa filter desktop quá hẹp, hero không phủ kín, trang chủ mobile quá dài, artifact skip-link và ưu tiên form tài khoản trên mobile. Ảnh frontend/.screenshots/v2/*-fixture.png dùng fixture chỉ trong E2E, kể cả các màn hình cần auth; không có bypass trong code ứng dụng.
- API local thật V2 PASS: START.bat chạy PostgreSQL/Spring local/Vite; catalog 20 sản phẩm, loại peanut+milk còn 6 và fail-closed đúng. Homepage/catalog/detail ở 390/1440 PASS overflow/axe, không JS error/service worker; 7 ảnh trong frontend/.screenshots/v2-real/ (gồm viewport hero). Đã mở ảnh thật để đối chiếu. Server đang chạy http://localhost:5173 để review, dùng STOP.bat để dừng; không sửa Docker/backend/infra/AWS/AGENTS.md/.codex.
- Kết luận frontend V2: READY FOR REVIEW trong phạm vi UI local. Còn thiếu ảnh sản phẩm thật (fallback ghi rõ), dữ liệu local vẫn seed; Cognito SRP/Bedrock và thao tác có auth với AWS thật chưa kiểm chứng. Không có sort server vì API hiện không hỗ trợ. Git giữ nguyên nhánh feat/cognito-infra, 67 file chưa commit gồm cả công việc cũ; không commit/push. Bước tiếp theo: người dùng đánh giá ảnh/UI, bổ sung ảnh sản phẩm và kiểm chứng AWS khi được cấp cấu hình; triển khai AWS tiếp tục chờ.

- 2026-10-31: thêm START.bat / STOP.bat ở gốc, dùng scripts/local.ps1; tự mở Docker Desktop, chờ PostgreSQL, chạy Maven offline profile local và Vite, chờ health/HTTP rồi mở trình duyệt. Không install dependency hay build production; Maven chỉ thực hiện lifecycle cần cho spring-boot:run. Log/PID nằm trong .local-run/ (gitignored).
- Kiểm thử thực tế PASS trên Windows PowerShell/CMD: Docker ban đầu tắt được khởi động tự động; API UP, frontend proxy trả 20 sản phẩm; START lặp lại không tạo server mới; STOP và STOP lặp lại thành công, hết listener 8080/5173, tiến trình Node độc lập vẫn sống. Cổng 5173 bị chiếm trả lỗi/exit 1. PowerShell parser và git diff --check PASS; không chạy lại test nghiệp vụ vì không sửa code ứng dụng.
- STOP chỉ taskkill cây tiến trình có PID/thời điểm tạo khớp bản ghi START, rồi compose stop postgres; không xóa container/volume/data. Sau kiểm thử đã dừng dịch vụ project. Docker local hoạt động trong lượt này; chưa kiểm chứng lại image build từng lỗi storage. AWS vẫn chờ, Cognito/Bedrock thật chưa kiểm chứng; launcher không bổ sung cấu hình xác thực hay bypass auth.

- Tiếp tục 2026-10-30: hoàn thiện API/UI admin dinh dưỡng và allergen (null không thành 0, flag hoàn chỉnh do server tính, rollback dữ liệu lỗi), CRUD danh mục với bảo vệ FK, chi tiết giao hàng chỉ ADMIN. Bộ lọc công khai hỗ trợ nhiều allergen và giữ lựa chọn khi phân trang. Đã sửa lỗi browser Cognito SRP `global is not defined` bằng ánh xạ Vite sang globalThis.
- PASS mới: Maven offline/giới hạn heap 256 MB: 9 test JWT/RBAC, admin nutrition/allergen/đơn và AI, sau đó 1 test category liên quan; format/Checkstyle/compile/package xanh. Frontend lint/typecheck xanh; các nhóm unit liên quan 10, 2, 13 test xanh; 17 test từng timeout do thiếu RAM đã chạy lại một worker và xanh, không tăng timeout. Không chạy lại checkout/catalog đã PASS khi code không bị ảnh hưởng.
- Browser: 45/45 Playwright (gồm axe 390/1440 và production không MSW) PASS sau sửa global; sau thêm nhiều allergen chỉ chạy lại 18/18 test liên quan, PASS. Build production trong quy trình này PASS. Smoke frontend → API → PostgreSQL thật loại peanut + milk trả 6 sản phẩm đủ dữ liệu ở cả 390/1440, API bảo vệ trả 401 khi không token, không có service worker. Ảnh: frontend/.screenshots/products-allergens-390.png và products-allergens-1440.png. Hai server kiểm tra đã dừng để nhường RAM.
- Cognito Terraform fmt/init -backend=false/validate PASS; không plan/apply hay tạo AWS resources. Người dùng chọn giữ triển khai AWS chờ, tiếp tục local. Dockerfile/CI được giới hạn bộ nhớ/parallelism; build image linux/arm64 BLOCKED do Docker Desktop storage báo read-only file system ở bước tạo layer, chưa xác minh image hoặc CI trên GitHub. Không reset/prune/sửa cấu hình Docker Desktop.
- Vẫn cần AWS thật: Cognito SRP và Bedrock Converse end-to-end. Biến cấu hình: COGNITO_ISSUER_URI, COGNITO_CLIENT_ID, VITE_COGNITO_USER_POOL_ID, VITE_COGNITO_CLIENT_ID; BEDROCK_MODEL_ID hoặc BEDROCK_INFERENCE_PROFILE_ID và IAM runtime. Auth/token chỉ trong bộ nhớ, backend lấy sub từ JWT; giỏ/đơn/idempotency/hoàn kho và AI chỉ đọc đã có code/test local, không có bypass auth production. app_users chỉ lưu sub vì access token không có email.
- Tiếp tục từ đây: khắc phục filesystem Docker trước khi build lại; không chạy lại các nhóm xanh trừ khi sửa code liên quan. Còn thiếu upload ảnh S3/UI, workflow deployment/rollback và Terraform triển khai đầy đủ/TLS origin (đang chờ quyết định AWS); chưa tuyên bố MVP hoàn tất. Chưa thêm dependency trong lượt resume; audit runtime gần nhất 0 từ lượt trước, không chạy lại. Git chỉ đọc, chưa commit/push, không sửa AGENTS.md hoặc .codex. Các dòng Phase A/B/C bên dưới là lịch sử.

- Giai đoạn: **0 – Chuẩn bị**
- Phase A hoàn tất: lint, typecheck, 29 unit tests, build và kiểm tra bundle không có mock đều xanh; audit gần nhất 0.
- Ảnh `/products` sau sửa ở `frontend/.screenshots/products-390.png` và `products-1440.png`; không thấy tràn ngang/cắt chữ/thiếu nhãn dữ liệu. Các ghi chép lỗi bên dưới là lịch sử đã được xử lý.
- Phase B hoàn tất: Java 21/Spring Boot 3.5.16/JDBC/Flyway, PostgreSQL arm64 local, 20 seed dev; wrapper verify xanh với đúng 2 test tích hợp fail-closed/phân trang. Đã điền O2/O5 theo quyết định người dùng.
- Đã được duyệt PATH Docker riêng tiến trình; PostgreSQL healthy, health API UP, thử API thật trả total=20/page=8 và lọc kết hợp 4 sản phẩm; dữ liệu thiếu trả null. UTC chỉ áp dụng JVM ứng dụng/test, không đổi Windows.
- Phase C hoàn tất: frontend gọi /api qua proxy localhost:8080; bộ lọc danh mục/calo/protein, phân trang và chi tiết với NutritionTable/AllergenBadge; MSW chỉ ở test.
- Kiểm chứng Phase C: format, lint, typecheck, 34 unit tests, build và kiểm tra bundle không mock PASS; thử trình duyệt/API thật lọc kết hợp trả 3 sản phẩm, xóa lọc và nhãn thiếu dinh dưỡng/allergen PASS.
- Ảnh mới từ API thật: frontend/.screenshots/product-detail-390.png và product-detail-1440.png (2/2 PASS); không chạy lại toàn bộ E2E/axe, không làm đẹp thêm.
- Còn lại: dữ liệu local là seed tổng hợp, ảnh chỉ minh họa; chưa có auth/mua hàng. Không đổi dependency; audit gần nhất 0, không chạy lại. Bước tiếp theo: người dùng xem ảnh và commit Phase C; không có câu hỏi mở.

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

- Đã đọc lại hướng dẫn, source/config và package-lock; không viết lại scaffold, không sửa dependency/lockfile trong lượt kiểm tra này. Metadata npm đã truy cập được. Bằng chứng được lưu ở `docs/verification/frontend-2026-10-29/` và tổng hợp trong `docs/verification/frontend-2026-10-29/REVIEW.md`.
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

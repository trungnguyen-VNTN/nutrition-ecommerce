# Thư mục `.codex/`

Thay cho `.claude/settings.json` (Claude Code). Gồm:

| File | Vai trò |
| --- | --- |
| `config.toml` | Sandbox `workspace-write`, phê duyệt `on-request`, tắt mạng mặc định, đặt sẵn `AWS_PROFILE=nutrition-plan` |
| `rules/default.rules` | Cấm / hỏi / cho phép lệnh theo tiền tố (terraform, aws, git, docker, rm) |

## Cần làm một lần
1. Mở repo bằng Codex và chọn **trust** thư mục này, để `.codex/config.toml` được nạp.
2. Chạy thử rule: `codex execpolicy check --rules .codex/rules/default.rules -- terraform apply` (kỳ vọng: `forbidden`).
3. Nếu bản Codex của bạn **không nạp rules theo dự án**, sao chép file vào cấp người dùng:
   `mkdir -p ~/.codex/rules && cp .codex/rules/default.rules ~/.codex/rules/default.rules`
4. Nếu Codex báo sai tên khóa trong `config.toml`, đối chiếu với tài liệu chính thức của đúng phiên bản bạn cài.

## Khác biệt so với Claude Code (đọc kỹ)
| Việc | Claude Code | Codex (repo này) |
| --- | --- | --- |
| Chặn đọc `.env`, `*.tfstate`, `~/.aws` | `deny Read(...)` | **Không chặn được bằng cấu hình.** Dựa vào luật trong `AGENTS.md` + không để secret trong thư mục dự án |
| Ký tự đại diện `aws * delete-*` | Có | Không. Liệt kê các lệnh cụ thể; chốt chặn thật là IAM của profile `nutrition-plan` |
| Cho phép `aws * describe/list/get` | `allow` | Rơi về chính sách phê duyệt (hỏi từng lần) |
| Quyền ghi file | `Edit(/backend/**)`... | Sandbox `workspace-write`: ghi được trong toàn bộ thư mục dự án |
| Mạng | Theo lệnh | Tắt mặc định, phải duyệt khi cần |

## Việc nên làm ngoài repo
- IAM của `nutrition-plan` phải **không có quyền xóa / tạo** tài nguyên (đã nêu trong `docs/architecture.md`, mục 8). Đây là lớp bảo vệ đáng tin nhất.
- Chỉ đăng nhập SSO `nutrition-apply` khi chính bạn cần `terraform apply`; đăng xuất sau đó.
- Không đặt secret thật trong thư mục repo.

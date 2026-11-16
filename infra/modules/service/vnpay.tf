# VNPAY sandbox credentials (D27). Terraform creates the secret with empty values so the API starts
# with online payment off; the real TmnCode / HashSecret from VNPAY's e-mail are pasted in the
# console and never pass through Terraform state or the repository.
resource "aws_secretsmanager_secret" "vnpay" {
  count = var.vnpay_enabled ? 1 : 0

  name                    = "${var.name_prefix}/vnpay-sandbox"
  description             = "VNPAY sandbox tmn_code and hash_secret for the API (D27)."
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "vnpay_placeholder" {
  count = var.vnpay_enabled ? 1 : 0

  secret_id     = aws_secretsmanager_secret.vnpay[0].id
  secret_string = jsonencode({ tmn_code = "", hash_secret = "" })

  lifecycle {
    # Values are set by hand in the console; Terraform must not overwrite them.
    ignore_changes = [secret_string]
  }
}

locals {
  vnpay_secret_arn = var.vnpay_enabled ? aws_secretsmanager_secret.vnpay[0].arn : ""
  vnpay_secrets = var.vnpay_enabled ? [
    { name = "VNPAY_TMN_CODE", valueFrom = "${local.vnpay_secret_arn}:tmn_code::" },
    { name = "VNPAY_HASH_SECRET", valueFrom = "${local.vnpay_secret_arn}:hash_secret::" },
  ] : []
}

resource "aws_cognito_user_pool" "users" {
  name                     = "${var.name_prefix}-users"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  deletion_protection      = "ACTIVE"

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = true
    require_numbers   = true
    require_symbols   = true
  }
}

resource "aws_cognito_user_pool_client" "spa" {
  name                                 = "${var.name_prefix}-spa"
  user_pool_id                         = aws_cognito_user_pool.users.id
  generate_secret                      = false
  allowed_oauth_flows_user_pool_client = false
  prevent_user_existence_errors        = "ENABLED"

  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    # Dev only: admin password authentication requires authorized server-side IAM.
    "ALLOW_ADMIN_USER_PASSWORD_AUTH",
  ]
}

resource "aws_cognito_user_group" "admin" {
  name         = "ADMIN"
  user_pool_id = aws_cognito_user_pool.users.id
}

resource "aws_cognito_user_group" "user" {
  name         = "USER"
  user_pool_id = aws_cognito_user_pool.users.id
}

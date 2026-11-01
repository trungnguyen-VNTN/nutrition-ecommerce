output "user_pool_id" {
  description = "Cognito user pool ID."
  value       = aws_cognito_user_pool.users.id
}

output "app_client_id" {
  description = "Public SPA app client ID."
  value       = aws_cognito_user_pool_client.spa.id
}

output "issuer_uri" {
  description = "JWT issuer for the Cognito user pool."
  value       = "https://cognito-idp.${local.region}.amazonaws.com/${aws_cognito_user_pool.users.id}"
}

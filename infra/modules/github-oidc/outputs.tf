output "deploy_role_arn" {
  description = "Set as the AWS_DEPLOY_ROLE_ARN variable in GitHub (not a secret)."
  value       = aws_iam_role.deploy.arn
}

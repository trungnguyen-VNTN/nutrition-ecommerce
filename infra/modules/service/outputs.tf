output "alb_dns_name" {
  description = "ALB host name (CloudFront origin); null while the app is off."
  value       = one(aws_lb.api[*].dns_name)
}

output "cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.main.name
}

output "service_name" {
  description = "ECS service name."
  value       = local.service_name
}

output "service_arn" {
  description = "ECS service ARN (exists only while the app is on)."
  value       = "arn:aws:ecs:${local.region}:${local.account_id}:service/${aws_ecs_cluster.main.name}/${local.service_name}"
}

output "task_family" {
  description = "Task definition family."
  value       = aws_ecs_task_definition.api.family
}

output "execution_role_arn" {
  description = "Task execution role ARN."
  value       = aws_iam_role.execution.arn
}

output "task_role_arn" {
  description = "Task role ARN."
  value       = aws_iam_role.task.arn
}

output "log_group_name" {
  description = "CloudWatch log group of the API."
  value       = aws_cloudwatch_log_group.api.name
}

output "alb_arn_suffix" {
  description = "ALB ARN suffix for CloudWatch metrics; null while the app is off."
  value       = one(aws_lb.api[*].arn_suffix)
}

output "target_group_arn_suffix" {
  description = "Target group ARN suffix for CloudWatch metrics."
  value       = aws_lb_target_group.api.arn_suffix
}

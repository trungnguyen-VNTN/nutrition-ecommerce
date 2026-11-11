output "alb_dns_name" {
  description = "ALB host name (CloudFront origin)."
  value       = aws_lb.api.dns_name
}

output "cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.main.name
}

output "service_name" {
  description = "ECS service name."
  value       = aws_ecs_service.api.name
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

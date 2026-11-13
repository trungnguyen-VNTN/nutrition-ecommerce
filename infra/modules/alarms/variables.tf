variable "name_prefix" {
  description = "Resource name prefix, e.g. nutrition-dev."
  type        = string
}

variable "alert_email" {
  description = "Address that receives alarms (TF_VAR_alert_email). Empty = topic without subscribers."
  type        = string
  default     = ""
  sensitive   = true
}

variable "app_running" {
  description = "Whether the ALB and ECS service exist (D20); their alarms follow it."
  type        = bool
}

variable "alb_arn_suffix" {
  description = "ALB ARN suffix; null while the app is off."
  type        = string
  default     = null
}

variable "target_group_arn_suffix" {
  description = "Target group ARN suffix."
  type        = string
}

variable "ecs_cluster_name" {
  description = "ECS cluster name."
  type        = string
}

variable "ecs_service_name" {
  description = "ECS service name."
  type        = string
}

variable "db_identifier" {
  description = "RDS instance identifier."
  type        = string
}

variable "log_group_name" {
  description = "CloudWatch log group of the API."
  type        = string
}

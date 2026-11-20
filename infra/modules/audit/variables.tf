variable "name_prefix" {
  description = "Resource name prefix, e.g. nutrition-dev."
  type        = string
}

variable "log_retention_days" {
  description = "Days before CloudTrail and ALB access logs are deleted from the bucket."
  type        = number
  default     = 30
}

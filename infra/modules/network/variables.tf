variable "name_prefix" {
  description = "Resource name prefix, e.g. nutrition-dev."
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block."
  type        = string
  default     = "10.20.0.0/16"
}

variable "az_count" {
  description = "Number of AZs. ALB and the RDS subnet group need at least two."
  type        = number
  default     = 2

  validation {
    condition     = var.az_count >= 2 && var.az_count <= 3
    error_message = "az_count must be 2 or 3."
  }
}

variable "app_port" {
  description = "Container port of the Spring Boot API."
  type        = number
  default     = 8080
}

variable "enable_nat" {
  description = "Create a single-AZ NAT gateway. Billed per hour; off by default (D15)."
  type        = bool
  default     = false
}

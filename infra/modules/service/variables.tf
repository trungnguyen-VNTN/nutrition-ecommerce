variable "name_prefix" {
  description = "Resource name prefix, e.g. nutrition-dev."
  type        = string
}

variable "vpc_id" {
  description = "VPC ID."
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnets for the ALB and tasks."
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "ALB security group (CloudFront prefix list only)."
  type        = string
}

variable "ecs_security_group_id" {
  description = "Task security group (ALB only)."
  type        = string
}

variable "app_port" {
  description = "Container port."
  type        = number
  default     = 8080
}

variable "origin_header_name" {
  description = "Header that CloudFront adds and the ALB requires."
  type        = string
}

variable "origin_header_value" {
  description = "Secret value of the origin header."
  type        = string
  sensitive   = true
}

variable "permissions_boundary_name" {
  description = "Name of the IAM permissions boundary every role must carry (D16)."
  type        = string
  default     = "nutrition-boundary"
}

variable "app_running" {
  description = "Demo on/off (D20). false removes the ALB and the ECS service (no hourly cost)."
  type        = bool
  default     = false
}

variable "container_image" {
  description = "Image the service runs (repository_url:latest). Deploys push a new latest and force a new deployment."
  type        = string
}

variable "desired_count" {
  description = "Tasks to run while app_running is true. Each task is billed per hour."
  type        = number
  default     = 1
}

variable "task_cpu" {
  description = "Fargate CPU units."
  type        = number
  default     = 512
}

variable "task_memory" {
  description = "Fargate memory in MiB."
  type        = number
  default     = 1024
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention."
  type        = number
  default     = 14
}

variable "db_host" {
  description = "PostgreSQL host."
  type        = string
}

variable "db_port" {
  description = "PostgreSQL port."
  type        = number
}

variable "db_name" {
  description = "Database name."
  type        = string
}

variable "db_secret_arn" {
  description = "Secrets Manager ARN of the RDS-managed master credentials."
  type        = string
}

variable "cognito_issuer_uri" {
  description = "Cognito JWT issuer."
  type        = string
}

variable "cognito_client_id" {
  description = "Cognito SPA client ID (audience check)."
  type        = string
}

variable "bedrock_model_id" {
  description = "Foundation model ID behind the inference profile. Empty = AI disabled."
  type        = string
  default     = ""
}

variable "bedrock_inference_profile_id" {
  description = "Inference profile ID used for Converse. Empty = AI disabled."
  type        = string
  default     = ""
}

variable "db_state" {
  description = "RDS state from the rds module. Only used to order the ECS service after the DB starts."
  type        = string
}

variable "images_bucket_name" {
  description = "Product images bucket (IMAGES_BUCKET)."
  type        = string
}

variable "images_bucket_arn" {
  description = "Product images bucket ARN; the task may write under images/ only."
  type        = string
}

variable "extra_flyway_locations" {
  description = "Extra Flyway locations after classpath:db/migration, e.g. classpath:db/usda for the demo catalog."
  type        = list(string)
  default     = []

  validation {
    condition     = alltrue([for location in var.extra_flyway_locations : startswith(location, "classpath:db/")])
    error_message = "Only classpath:db/... locations bundled in the image are allowed."
  }
}

variable "seed_demo_images" {
  description = "Attach the bundled CC0 / public-domain demo photos to products without images (D23)."
  type        = bool
  default     = false
}

variable "ecr_repository_arn" {
  description = "Backend ECR repository; the execution role may pull from it only."
  type        = string
}

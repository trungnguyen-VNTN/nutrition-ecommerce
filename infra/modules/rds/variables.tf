variable "name_prefix" {
  description = "Resource name prefix, e.g. nutrition-dev."
  type        = string
}

variable "subnet_ids" {
  description = "Private DB subnets in at least two AZs."
  type        = list(string)
}

variable "security_group_id" {
  description = "Security group that only allows PostgreSQL from ECS tasks."
  type        = string
}

variable "engine_version" {
  description = "PostgreSQL major version (RDS picks the default minor)."
  type        = string
  default     = "17"
}

variable "instance_class" {
  description = "Instance class. Larger classes cost more per hour; ask before changing."
  type        = string
  default     = "db.t4g.micro"
}

variable "allocated_storage" {
  description = "Initial storage in GiB."
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Storage autoscaling ceiling in GiB."
  type        = number
  default     = 50
}

variable "db_name" {
  description = "Initial database name."
  type        = string
  default     = "nutrition"
}

variable "master_username" {
  description = "Master user name (password is managed by RDS)."
  type        = string
  default     = "nutrition_admin"
}

variable "backup_retention_days" {
  description = "Automated backup retention in days."
  type        = number
  default     = 7
}

variable "running" {
  description = "true = available, false = stopped (D20)."
  type        = bool
  default     = false
}

variable "restore_snapshot_identifier" {
  description = "Create the instance from this snapshot (docs/runbook.md). Null = empty database."
  type        = string
  default     = null
}

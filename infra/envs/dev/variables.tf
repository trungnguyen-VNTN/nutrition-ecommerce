variable "owner" {
  description = "Owner tag. Supply via TF_VAR_owner."
  type        = string

  validation {
    condition     = length(trimspace(var.owner)) > 0
    error_message = "Owner must not be empty."
  }
}

variable "enable_nat" {
  description = "Create a single-AZ NAT gateway. Billed per hour; keep false unless approved (D15)."
  type        = bool
  default     = false
}

variable "github_subject_prefix" {
  description = "OIDC sub prefix of the repository whose master branch may deploy (immutable subject: owner and repo IDs are included, so a renamed or recreated repo cannot assume the role)."
  type        = string
  default     = "repo:trungnguyen-VNTN@264366223/nutrition-ecommerce@1438480231"
}

variable "app_running" {
  description = "Demo on/off (D20). true starts RDS and creates the ALB and ECS service; false stops RDS and removes them."
  type        = bool
  default     = false
}

variable "api_desired_count" {
  description = "API tasks while the app is on (billed per hour)."
  type        = number
  default     = 1
}

variable "bedrock_model_id" {
  description = "Foundation model behind the inference profile (D18). Empty disables AI permissions."
  type        = string
  default     = "anthropic.claude-haiku-5-5"
}

variable "bedrock_inference_profile_id" {
  description = "Global inference profile ID (D18: Haiku 5.5 has no APAC profile in Singapore). Empty disables AI permissions."
  type        = string
  default     = "global.anthropic.claude-haiku-5-5"
}

variable "load_demo_catalog" {
  description = "Seed the 18-product USDA demo catalog (idempotent, never overwrites existing rows; D22)."
  type        = bool
  default     = true
}

variable "guardrail_tier" {
  description = "Bedrock guardrail tier: CLASSIC or STANDARD (confirm Vietnamese support in spike S1)."
  type        = string
  default     = "CLASSIC"
}

variable "alert_email" {
  description = "E-mail for CloudWatch alarms (TF_VAR_alert_email; never commit it). Empty = no subscription."
  type        = string
  default     = ""
  sensitive   = true
}

variable "restore_snapshot_identifier" {
  description = "Rebuild RDS from this snapshot when the instance is (re)created; see docs/runbook.md."
  type        = string
  default     = null
}

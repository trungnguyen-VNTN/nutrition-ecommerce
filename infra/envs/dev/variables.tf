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
  description = "Foundation model ID (after spike S1). Empty disables AI permissions."
  type        = string
  default     = ""
}

variable "bedrock_inference_profile_id" {
  description = "APAC inference profile ID (after spike S1, D18). Empty disables AI permissions."
  type        = string
  default     = ""
}

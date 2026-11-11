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

variable "github_repository" {
  description = "owner/name of the repository whose master branch may deploy."
  type        = string
  default     = "trungnguyen-VNTN/nutrition-ecommerce"
}

variable "api_desired_count" {
  description = "Running API tasks. Keep 0 until the first image is in ECR (billed per hour)."
  type        = number
  default     = 0
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

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

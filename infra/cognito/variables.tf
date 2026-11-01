variable "owner" {
  description = "Owner tag for the development resources. Supply via TF_VAR_owner."
  type        = string

  validation {
    condition     = length(trimspace(var.owner)) > 0
    error_message = "Owner must not be empty."
  }
}

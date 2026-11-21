variable "name_prefix" {
  description = "Resource name prefix, e.g. nutrition-dev."
  type        = string
}

variable "region" {
  description = "Region of the guardrail; the same region the backend calls Bedrock in. Null = provider region."
  type        = string
  default     = null
}

variable "tier" {
  description = "CLASSIC (English-first) or STANDARD (more languages, needs a cross-Region guardrail profile). Confirm in spike S1."
  type        = string
  default     = "CLASSIC"

  validation {
    condition     = contains(["CLASSIC", "STANDARD"], var.tier)
    error_message = "tier must be CLASSIC or STANDARD."
  }
}

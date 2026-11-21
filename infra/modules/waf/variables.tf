variable "name_prefix" {
  description = "Resource name prefix, e.g. nutrition-dev."
  type        = string
}

variable "enabled" {
  description = "Create the web ACL. Billed monthly per ACL and rule (prorated hourly), so it is only on for demos."
  type        = bool
  default     = false
}

variable "rate_limit_per_5_minutes" {
  description = "Requests per IP in any 5-minute window before WAF blocks that IP."
  type        = number
  default     = 1000
}

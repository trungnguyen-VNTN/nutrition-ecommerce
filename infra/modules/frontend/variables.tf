variable "name_prefix" {
  description = "Resource name prefix, e.g. nutrition-dev."
  type        = string
}

variable "alb_dns_name" {
  description = "DNS name of the ALB that serves /api/*; null while the app is off."
  type        = string
  default     = null
}

variable "origin_header_name" {
  description = "Header CloudFront adds so the ALB can reject direct requests."
  type        = string
}

variable "origin_header_value" {
  description = "Secret value of the origin header (generated, never committed)."
  type        = string
  sensitive   = true
}

variable "price_class" {
  description = "CloudFront price class. PriceClass_200 includes Asia edge locations."
  type        = string
  default     = "PriceClass_200"
}

variable "api_read_timeout_seconds" {
  description = "How long CloudFront waits for the API (AI chat is the slowest call)."
  type        = number
  default     = 60
}

variable "images_bucket_name" {
  description = "Product images bucket (module images)."
  type        = string
}

variable "images_bucket_arn" {
  description = "Product images bucket ARN."
  type        = string
}

variable "images_bucket_regional_domain_name" {
  description = "Regional domain of the images bucket, used as CloudFront origin."
  type        = string
}

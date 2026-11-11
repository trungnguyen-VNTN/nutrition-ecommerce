variable "name_prefix" {
  description = "Resource name prefix, e.g. nutrition-dev."
  type        = string
}

variable "keep_images" {
  description = "Number of images to keep in the repository."
  type        = number
  default     = 10
}

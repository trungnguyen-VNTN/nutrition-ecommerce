terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.71.0"
    }
  }

  # Temporary local state; migrate to the shared backend before team deployment.
  backend "local" {}
}

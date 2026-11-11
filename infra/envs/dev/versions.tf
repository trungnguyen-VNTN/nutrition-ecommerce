terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.71.0"
    }
  }

  # Partial config: bucket comes from backend.hcl (git-ignored), see backend.hcl.example.
  backend "s3" {
    key          = "envs/dev/terraform.tfstate"
    region       = "ap-southeast-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = "ap-southeast-1"

  default_tags {
    tags = {
      Project = "nutrition"
      Env     = "dev"
      Owner   = var.owner
    }
  }
}

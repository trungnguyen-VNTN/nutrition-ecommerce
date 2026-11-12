locals {
  name_prefix = "nutrition-dev"
}

module "network" {
  source = "../../modules/network"

  name_prefix = local.name_prefix
  enable_nat  = var.enable_nat
}

module "ecr" {
  source = "../../modules/ecr"

  name_prefix = local.name_prefix
}

module "rds" {
  source = "../../modules/rds"

  name_prefix       = local.name_prefix
  subnet_ids        = module.network.db_subnet_ids
  security_group_id = module.network.rds_security_group_id
  running           = var.app_running
}

module "cognito" {
  source = "../../modules/cognito"

  name_prefix = local.name_prefix
}

# Secret header CloudFront sends and the ALB requires. Lives only in the (encrypted) state.
resource "random_password" "origin_header" {
  length  = 40
  special = false
}

locals {
  origin_header_name = "X-Origin-Verify"
}

module "images" {
  source = "../../modules/images"

  name_prefix = local.name_prefix
}

module "guardrail" {
  source = "../../modules/guardrail"

  name_prefix = local.name_prefix
  tier        = var.guardrail_tier
}

module "service" {
  source = "../../modules/service"

  name_prefix           = local.name_prefix
  vpc_id                = module.network.vpc_id
  public_subnet_ids     = module.network.public_subnet_ids
  alb_security_group_id = module.network.alb_security_group_id
  ecs_security_group_id = module.network.ecs_security_group_id

  origin_header_name  = local.origin_header_name
  origin_header_value = random_password.origin_header.result

  app_running     = var.app_running
  container_image = "${module.ecr.repository_url}:latest"
  desired_count   = var.api_desired_count

  db_host       = module.rds.endpoint
  db_port       = module.rds.port
  db_name       = module.rds.db_name
  db_secret_arn = module.rds.master_user_secret_arn

  cognito_issuer_uri = module.cognito.issuer_uri
  cognito_client_id  = module.cognito.app_client_id

  images_bucket_name = module.images.bucket_name
  images_bucket_arn  = module.images.bucket_arn

  extra_flyway_locations = var.load_demo_catalog ? ["classpath:db/usda"] : []
  seed_demo_images       = var.load_demo_catalog

  bedrock_model_id             = var.bedrock_model_id
  bedrock_inference_profile_id = var.bedrock_inference_profile_id
  bedrock_guardrail_id         = module.guardrail.guardrail_id
  bedrock_guardrail_version    = module.guardrail.guardrail_version
  bedrock_guardrail_arn        = module.guardrail.guardrail_arn

  # Ties the ECS service to the RDS state so tasks start after the DB is available.
  db_state = module.rds.state
}

module "frontend" {
  source = "../../modules/frontend"

  name_prefix         = local.name_prefix
  alb_dns_name        = module.service.alb_dns_name
  origin_header_name  = local.origin_header_name
  origin_header_value = random_password.origin_header.result

  images_bucket_name                 = module.images.bucket_name
  images_bucket_arn                  = module.images.bucket_arn
  images_bucket_regional_domain_name = module.images.bucket_regional_domain_name
}

module "github_oidc" {
  source = "../../modules/github-oidc"

  name_prefix           = local.name_prefix
  github_subject_prefix = var.github_subject_prefix
  ecr_repository_arn    = module.ecr.repository_arn
  ecs_service_arn       = module.service.service_arn
  frontend_bucket_arn   = module.frontend.bucket_arn
  distribution_arn      = module.frontend.distribution_arn
}

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
}

module "cognito" {
  source = "../../modules/cognito"

  name_prefix = local.name_prefix
}

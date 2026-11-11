# D15: ECS tasks run in public subnets with public IPs; RDS stays in private-db subnets.
# No NAT unless enable_nat = true (costs per hour; needs approval).

data "aws_availability_zones" "available" {
  state = "available"
}

# CloudFront origin-facing IP ranges, used so only CloudFront can reach the ALB (D7, O6).
data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, var.az_count)
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${var.name_prefix}-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "${var.name_prefix}-igw" }
}

resource "aws_subnet" "public" {
  count = var.az_count

  vpc_id                  = aws_vpc.main.id
  availability_zone       = local.azs[count.index]
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  map_public_ip_on_launch = false # ECS sets assign_public_ip explicitly.

  tags = { Name = "${var.name_prefix}-public-${local.azs[count.index]}", Tier = "public" }
}

resource "aws_subnet" "db" {
  count = var.az_count

  vpc_id            = aws_vpc.main.id
  availability_zone = local.azs[count.index]
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, 100 + count.index)

  tags = { Name = "${var.name_prefix}-db-${local.azs[count.index]}", Tier = "db" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "${var.name_prefix}-public" }
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main.id
}

resource "aws_route_table_association" "public" {
  count = var.az_count

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# DB subnets get their own route table with no Internet route.
resource "aws_route_table" "db" {
  vpc_id = aws_vpc.main.id

  tags = { Name = "${var.name_prefix}-db" }
}

resource "aws_route_table_association" "db" {
  count = var.az_count

  subnet_id      = aws_subnet.db[count.index].id
  route_table_id = aws_route_table.db.id
}

# Optional single-AZ NAT (disabled by default, D15).
resource "aws_eip" "nat" {
  count  = var.enable_nat ? 1 : 0
  domain = "vpc"

  tags = { Name = "${var.name_prefix}-nat" }
}

resource "aws_nat_gateway" "main" {
  count = var.enable_nat ? 1 : 0

  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id

  tags = { Name = "${var.name_prefix}-nat" }

  depends_on = [aws_internet_gateway.main]
}

resource "aws_route" "db_nat" {
  count = var.enable_nat ? 1 : 0

  route_table_id         = aws_route_table.db.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main[0].id
}

# Security groups. Rules are separate resources so they can reference each other.

resource "aws_security_group" "alb" {
  name        = "${var.name_prefix}-alb"
  description = "ALB: HTTP from CloudFront origin-facing ranges only"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${var.name_prefix}-alb" }
}

resource "aws_security_group" "ecs" {
  name        = "${var.name_prefix}-ecs"
  description = "ECS tasks: app port from ALB only"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${var.name_prefix}-ecs" }
}

resource "aws_security_group" "rds" {
  name        = "${var.name_prefix}-rds"
  description = "RDS: PostgreSQL from ECS tasks only"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${var.name_prefix}-rds" }
}

resource "aws_vpc_security_group_ingress_rule" "alb_from_cloudfront" {
  security_group_id = aws_security_group.alb.id
  description       = "HTTP from CloudFront"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
  prefix_list_id    = data.aws_ec2_managed_prefix_list.cloudfront.id
}

resource "aws_vpc_security_group_egress_rule" "alb_to_ecs" {
  security_group_id            = aws_security_group.alb.id
  description                  = "Forward to ECS tasks"
  ip_protocol                  = "tcp"
  from_port                    = var.app_port
  to_port                      = var.app_port
  referenced_security_group_id = aws_security_group.ecs.id
}

resource "aws_vpc_security_group_ingress_rule" "ecs_from_alb" {
  security_group_id            = aws_security_group.ecs.id
  description                  = "App traffic from ALB"
  ip_protocol                  = "tcp"
  from_port                    = var.app_port
  to_port                      = var.app_port
  referenced_security_group_id = aws_security_group.alb.id
}

# Tasks need HTTPS out to ECR, Bedrock, Cognito JWKS and CloudWatch Logs (no VPC endpoints, D2).
resource "aws_vpc_security_group_egress_rule" "ecs_https_out" {
  security_group_id = aws_security_group.ecs.id
  description       = "HTTPS to AWS APIs"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
  cidr_ipv4         = "0.0.0.0/0"
}

resource "aws_vpc_security_group_egress_rule" "ecs_to_rds" {
  security_group_id            = aws_security_group.ecs.id
  description                  = "PostgreSQL to RDS"
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  referenced_security_group_id = aws_security_group.rds.id
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_ecs" {
  security_group_id            = aws_security_group.rds.id
  description                  = "PostgreSQL from ECS tasks"
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  referenced_security_group_id = aws_security_group.ecs.id
}

resource "aws_db_subnet_group" "main" {
  name        = "${var.name_prefix}-db"
  description = "Private DB subnets"
  subnet_ids  = var.subnet_ids
}

resource "aws_db_instance" "main" {
  identifier     = "${var.name_prefix}-postgres"
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.master_username
  # Master password is generated and rotated by RDS in Secrets Manager; never in state or code.
  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.security_group_id]
  publicly_accessible    = false
  multi_az               = false

  backup_retention_period   = var.backup_retention_days
  copy_tags_to_snapshot     = true
  deletion_protection       = true
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.name_prefix}-postgres-final"

  auto_minor_version_upgrade   = true
  performance_insights_enabled = false
  apply_immediately            = false
}

# Demo on/off (D20): stopped instances only pay for storage. AWS starts a stopped
# instance again by itself after 7 days, so run demo-down again if it stays off longer.
resource "aws_rds_instance_state" "main" {
  identifier = aws_db_instance.main.identifier
  state      = var.running ? "available" : "stopped"
}

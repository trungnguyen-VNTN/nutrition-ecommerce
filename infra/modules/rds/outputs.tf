output "endpoint" {
  description = "Host name of the PostgreSQL instance."
  value       = aws_db_instance.main.address
}

output "port" {
  description = "PostgreSQL port."
  value       = aws_db_instance.main.port
}

output "db_name" {
  description = "Initial database name."
  value       = aws_db_instance.main.db_name
}

output "master_user_secret_arn" {
  description = "Secrets Manager ARN of the RDS-managed master password."
  value       = aws_db_instance.main.master_user_secret[0].secret_arn
}

output "state" {
  description = "available or stopped (D20)."
  value       = aws_rds_instance_state.main.state
}

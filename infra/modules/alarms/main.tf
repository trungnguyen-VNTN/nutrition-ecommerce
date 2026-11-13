# Phase 7 alarms, e-mailed through SNS. ALB and ECS alarms exist only while the app is on (D20);
# RDS alarms treat missing data (database stopped) as OK, so the off state stays quiet.

resource "aws_sns_topic" "alerts" {
  name = "${var.name_prefix}-alerts"
}

# The address is supplied at plan time (TF_VAR_alert_email) and never committed. AWS sends a
# confirmation e-mail; alarms are delivered only after the link in it is clicked.
resource "aws_sns_topic_subscription" "email" {
  count = var.alert_email == "" ? 0 : 1

  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

locals {
  actions = [aws_sns_topic.alerts.arn]
  app_on  = var.app_running
}

# ---------------------------------------------------------------- ALB (app on)

resource "aws_cloudwatch_metric_alarm" "alb_target_5xx" {
  count = local.app_on ? 1 : 0

  alarm_name          = "${var.name_prefix}-api-5xx"
  alarm_description   = "API returned 5 or more 5xx responses in 5 minutes."
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HTTPCode_Target_5XX_Count"
  dimensions          = { LoadBalancer = var.alb_arn_suffix }
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 5
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.actions
  ok_actions          = local.actions
}

resource "aws_cloudwatch_metric_alarm" "alb_unhealthy" {
  count = local.app_on ? 1 : 0

  alarm_name          = "${var.name_prefix}-api-unhealthy"
  alarm_description   = "No healthy API task behind the ALB for 5 minutes."
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HealthyHostCount"
  dimensions          = { LoadBalancer = var.alb_arn_suffix, TargetGroup = var.target_group_arn_suffix }
  statistic           = "Minimum"
  period              = 60
  evaluation_periods  = 5
  threshold           = 1
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "breaching"
  alarm_actions       = local.actions
  ok_actions          = local.actions
}

# ---------------------------------------------------------------- ECS (app on)

resource "aws_cloudwatch_metric_alarm" "ecs_cpu" {
  count = local.app_on ? 1 : 0

  alarm_name          = "${var.name_prefix}-api-cpu"
  alarm_description   = "API tasks above 80% CPU for 10 minutes."
  namespace           = "AWS/ECS"
  metric_name         = "CPUUtilization"
  dimensions          = { ClusterName = var.ecs_cluster_name, ServiceName = var.ecs_service_name }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  threshold           = 80
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.actions
}

resource "aws_cloudwatch_metric_alarm" "ecs_memory" {
  count = local.app_on ? 1 : 0

  alarm_name          = "${var.name_prefix}-api-memory"
  alarm_description   = "API tasks above 85% memory for 10 minutes."
  namespace           = "AWS/ECS"
  metric_name         = "MemoryUtilization"
  dimensions          = { ClusterName = var.ecs_cluster_name, ServiceName = var.ecs_service_name }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  threshold           = 85
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.actions
}

# ---------------------------------------------------------------- RDS (always; quiet while stopped)

resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "${var.name_prefix}-db-cpu"
  alarm_description   = "Database above 80% CPU for 15 minutes."
  namespace           = "AWS/RDS"
  metric_name         = "CPUUtilization"
  dimensions          = { DBInstanceIdentifier = var.db_identifier }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 3
  threshold           = 80
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.actions
}

resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  alarm_name          = "${var.name_prefix}-db-storage"
  alarm_description   = "Less than 2 GiB of free database storage."
  namespace           = "AWS/RDS"
  metric_name         = "FreeStorageSpace"
  dimensions          = { DBInstanceIdentifier = var.db_identifier }
  statistic           = "Minimum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 2147483648
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.actions
}

# ---------------------------------------------------------------- Application errors in logs

# Spring Boot writes ERROR as the level of unexpected failures. Counting those lines gives an early
# signal without logging request bodies or tokens (invariant 4).
resource "aws_cloudwatch_log_metric_filter" "api_errors" {
  name           = "${var.name_prefix}-api-errors"
  log_group_name = var.log_group_name
  pattern        = "\" ERROR \""

  metric_transformation {
    name          = "ApiErrorLogs"
    namespace     = "Nutrition/${var.name_prefix}"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_metric_alarm" "api_errors" {
  alarm_name          = "${var.name_prefix}-api-error-logs"
  alarm_description   = "API logged 5 or more ERROR lines in 5 minutes."
  namespace           = "Nutrition/${var.name_prefix}"
  metric_name         = "ApiErrorLogs"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 5
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"
  alarm_actions       = local.actions

  depends_on = [aws_cloudwatch_log_metric_filter.api_errors]
}

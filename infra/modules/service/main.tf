# Public ALB (only CloudFront can reach it: SG prefix list + secret header) in front of an
# ECS Fargate service running the Spring Boot API on ARM64 (D15, O2).

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

data "aws_iam_policy" "boundary" {
  name = var.permissions_boundary_name
}

locals {
  region       = data.aws_region.current.region
  account_id   = data.aws_caller_identity.current.account_id
  service_name = "${var.name_prefix}-backend"
  use_bedrock  = var.bedrock_inference_profile_id != "" && var.bedrock_model_id != ""
}

# ---------------------------------------------------------------- ALB

resource "aws_lb" "api" {
  name               = "${var.name_prefix}-api"
  load_balancer_type = "application"
  internal           = false
  subnets            = var.public_subnet_ids
  security_groups    = [var.alb_security_group_id]
  idle_timeout       = 60

  drop_invalid_header_fields = true
}

resource "aws_lb_target_group" "api" {
  name        = "${var.name_prefix}-api"
  port        = var.app_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = var.vpc_id

  deregistration_delay = 30

  health_check {
    path                = "/actuator/health"
    matcher             = "200"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.api.arn
  port              = 80
  protocol          = "HTTP"

  # Anything without the CloudFront secret header is rejected.
  default_action {
    type = "fixed-response"

    fixed_response {
      content_type = "text/plain"
      message_body = "Forbidden"
      status_code  = "403"
    }
  }
}

resource "aws_lb_listener_rule" "from_cloudfront" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10

  condition {
    http_header {
      http_header_name = var.origin_header_name
      values           = [var.origin_header_value]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

# ---------------------------------------------------------------- IAM (all roles carry the boundary, D16)

data "aws_iam_policy_document" "ecs_tasks_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [local.account_id]
    }
  }
}

resource "aws_iam_role" "execution" {
  name                 = "${var.name_prefix}-ecs-execution"
  assume_role_policy   = data.aws_iam_policy_document.ecs_tasks_assume.json
  permissions_boundary = data.aws_iam_policy.boundary.arn
}

resource "aws_iam_role_policy_attachment" "execution_managed" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "execution_secrets" {
  statement {
    sid       = "ReadDbPassword"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [var.db_secret_arn]
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  name   = "read-db-secret"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution_secrets.json
}

resource "aws_iam_role" "task" {
  name                 = "${var.name_prefix}-ecs-task"
  assume_role_policy   = data.aws_iam_policy_document.ecs_tasks_assume.json
  permissions_boundary = data.aws_iam_policy.boundary.arn
}

# Converse through an inference profile needs the profile in this region and the
# foundation model in every region the profile may route to.
data "aws_iam_policy_document" "task_bedrock" {
  count = local.use_bedrock ? 1 : 0

  statement {
    sid     = "InvokeConfiguredModel"
    actions = ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"]
    resources = [
      "arn:aws:bedrock:${local.region}:${local.account_id}:inference-profile/${var.bedrock_inference_profile_id}",
      "arn:aws:bedrock:*::foundation-model/${var.bedrock_model_id}",
    ]
  }
}

resource "aws_iam_role_policy" "task_bedrock" {
  count = local.use_bedrock ? 1 : 0

  name   = "invoke-bedrock"
  role   = aws_iam_role.task.id
  policy = data.aws_iam_policy_document.task_bedrock[0].json
}

# ---------------------------------------------------------------- ECS

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${local.service_name}"
  retention_in_days = var.log_retention_days
}

resource "aws_ecs_cluster" "main" {
  name = "${var.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "disabled" # Extra CloudWatch cost; enable in Giai đoạn 7 if needed.
  }
}

resource "aws_ecs_task_definition" "api" {
  family                   = local.service_name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "ARM64"
  }

  container_definitions = jsonencode([
    {
      name      = "api"
      image     = var.container_image
      essential = true

      portMappings = [{ containerPort = var.app_port, protocol = "tcp" }]

      environment = [
        { name = "SPRING_PROFILES_ACTIVE", value = "production" },
        { name = "DB_URL", value = "jdbc:postgresql://${var.db_host}:${var.db_port}/${var.db_name}?sslmode=require" },
        { name = "COGNITO_ISSUER_URI", value = var.cognito_issuer_uri },
        { name = "COGNITO_CLIENT_ID", value = var.cognito_client_id },
        { name = "BEDROCK_MODEL_ID", value = var.bedrock_model_id },
        { name = "BEDROCK_INFERENCE_PROFILE_ID", value = var.bedrock_inference_profile_id },
      ]

      # RDS-managed secret is JSON with "username" and "password" keys.
      secrets = [
        { name = "DB_USERNAME", valueFrom = "${var.db_secret_arn}:username::" },
        { name = "DB_PASSWORD", valueFrom = "${var.db_secret_arn}:password::" },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.api.name
          awslogs-region        = local.region
          awslogs-stream-prefix = "api"
        }
      }
    }
  ])
}

resource "aws_ecs_service" "api" {
  name            = local.service_name
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  health_check_grace_period_seconds = 120

  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [var.ecs_security_group_id]
    assign_public_ip = true # D15: public subnet, no NAT. SG only allows the ALB in.
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = var.app_port
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  depends_on = [aws_lb_listener_rule.from_cloudfront]

  lifecycle {
    # The deploy workflow registers new task definitions; Terraform must not roll them back.
    ignore_changes = [task_definition]
  }
}

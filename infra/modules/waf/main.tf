# AWS WAF for CloudFront. A CLOUDFRONT-scope web ACL must live in us-east-1; the provider's
# per-resource region keeps the rest of the stack in Singapore.

locals {
  managed_groups = [
    # SizeRestrictions_BODY blocks bodies over 8 KB, which would block admin image uploads
    # (up to 2 MB, checked by the backend), so that one rule only counts.
    { name = "AWSManagedRulesCommonRuleSet", priority = 1, count_rules = ["SizeRestrictions_BODY"] },
    { name = "AWSManagedRulesKnownBadInputsRuleSet", priority = 2, count_rules = [] },
    { name = "AWSManagedRulesAmazonIpReputationList", priority = 3, count_rules = [] },
  ]
}

resource "aws_wafv2_web_acl" "cloudfront" {
  count = var.enabled ? 1 : 0

  region      = "us-east-1"
  name        = "${var.name_prefix}-cloudfront"
  description = "Managed rules and a per-IP rate limit in front of CloudFront."
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  dynamic "rule" {
    for_each = local.managed_groups

    content {
      name     = rule.value.name
      priority = rule.value.priority

      override_action {
        none {}
      }

      statement {
        managed_rule_group_statement {
          vendor_name = "AWS"
          name        = rule.value.name

          dynamic "rule_action_override" {
            for_each = rule.value.count_rules

            content {
              name = rule_action_override.value
              action_to_use {
                count {}
              }
            }
          }
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "${var.name_prefix}-${rule.value.name}"
        sampled_requests_enabled   = true
      }
    }
  }

  rule {
    name     = "rate-limit-per-ip"
    priority = 10

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit_per_5_minutes
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.name_prefix}-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.name_prefix}-cloudfront"
    sampled_requests_enabled   = true
  }
}

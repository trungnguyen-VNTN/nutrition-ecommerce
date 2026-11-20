output "web_acl_arn" {
  description = "Web ACL ARN for the CloudFront distribution, or null when WAF is off."
  value       = var.enabled ? aws_wafv2_web_acl.cloudfront[0].arn : null
}

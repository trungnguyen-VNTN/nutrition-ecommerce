output "guardrail_id" {
  description = "Guardrail identifier for BEDROCK_GUARDRAIL_ID."
  value       = aws_bedrock_guardrail.chat.guardrail_id
}

output "guardrail_arn" {
  description = "Guardrail ARN (task role may apply it)."
  value       = aws_bedrock_guardrail.chat.guardrail_arn
}

output "guardrail_version" {
  description = "Numbered version for BEDROCK_GUARDRAIL_VERSION."
  value       = aws_bedrock_guardrail_version.chat.version
}

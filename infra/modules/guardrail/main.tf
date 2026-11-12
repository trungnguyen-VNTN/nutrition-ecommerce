# Bedrock guardrail for the read-only food search chat (phase 6). It screens the customer message
# before the model sees it: medical advice topics, harmful content and prompt attacks are
# blocked, and the API answers with a fixed refusal (AiRefusedException). The model output is
# only a tool call that the backend validates, so the guardrail is a second line of defence.

resource "aws_bedrock_guardrail" "chat" {
  name                      = "${var.name_prefix}-chat"
  description               = "Food catalog search: no medical advice, no prompt attacks."
  blocked_input_messaging   = "Tôi chỉ hỗ trợ tra cứu thực phẩm trong cửa hàng và không đưa ra lời khuyên y tế."
  blocked_outputs_messaging = "Tôi chỉ hỗ trợ tra cứu thực phẩm trong cửa hàng và không đưa ra lời khuyên y tế."

  content_policy_config {
    dynamic "filters_config" {
      for_each = ["SEXUAL", "VIOLENCE", "HATE", "INSULTS", "MISCONDUCT"]

      content {
        type            = filters_config.value
        input_strength  = "HIGH"
        output_strength = "HIGH"
      }
    }

    # Prompt-attack filtering applies to input only; output strength must be NONE.
    filters_config {
      type            = "PROMPT_ATTACK"
      input_strength  = "HIGH"
      output_strength = "NONE"
    }

    tier_config = [{ tier_name = var.tier }]
  }

  topic_policy_config {
    topics_config {
      name       = "medical-advice"
      type       = "DENY"
      definition = "Diagnosis, treatment, medication, dosage, supplements as medicine, pregnancy care or diets meant to cure or manage a disease."
      examples = [
        "What should I eat to cure diabetes?",
        "How many mg of vitamin D should I take?",
        "Tôi bị tiểu đường thì nên ăn gì để chữa bệnh?",
        "Có thể thay insulin bằng mật ong không?",
      ]
    }

    tier_config = [{ tier_name = var.tier }]
  }

  word_policy_config {
    managed_word_lists_config {
      type = "PROFANITY"
    }
  }
}

# Converse needs a numbered version; a new version is cut whenever the guardrail changes.
resource "aws_bedrock_guardrail_version" "chat" {
  guardrail_arn = aws_bedrock_guardrail.chat.guardrail_arn
  description   = "Managed by Terraform"

  lifecycle {
    replace_triggered_by = [aws_bedrock_guardrail.chat]
  }
}

package com.nutrition.ai;

/** The Bedrock guardrail blocked the request; customers get a polite refusal, not an error. */
public class AiRefusedException extends RuntimeException {
  public AiRefusedException() {
    super("Request blocked by the guardrail");
  }
}

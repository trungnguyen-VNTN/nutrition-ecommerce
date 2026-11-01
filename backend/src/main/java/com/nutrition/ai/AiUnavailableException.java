package com.nutrition.ai;

public class AiUnavailableException extends RuntimeException {
  public AiUnavailableException() {
    super("AI service unavailable");
  }
}

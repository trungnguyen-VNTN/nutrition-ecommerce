package com.nutrition.ai;

public class AiUnavailableException extends RuntimeException {
  public AiUnavailableException() {
    super("AI service unavailable");
  }

  /** Keeps the root cause for diagnostics; the API still answers with a fixed 503 body. */
  public AiUnavailableException(Throwable cause) {
    super("AI service unavailable", cause);
  }
}

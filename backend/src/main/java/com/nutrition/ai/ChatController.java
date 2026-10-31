package com.nutrition.ai;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ChatController {
  private final ChatService service;

  public ChatController(ChatService service) {
    this.service = service;
  }

  public record Input(@NotBlank @Size(max = 1000) String message) {}

  @PostMapping("/api/chat")
  public ChatService.Reply chat(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody Input input) {
    return service.chat(UUID.fromString(jwt.getSubject()), input.message);
  }
}

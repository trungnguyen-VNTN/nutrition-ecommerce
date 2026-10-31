package com.nutrition.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.document.Document;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;
import software.amazon.awssdk.services.bedrockruntime.model.ContentBlock;
import software.amazon.awssdk.services.bedrockruntime.model.ConversationRole;
import software.amazon.awssdk.services.bedrockruntime.model.Message;
import software.amazon.awssdk.services.bedrockruntime.model.SystemContentBlock;
import software.amazon.awssdk.services.bedrockruntime.model.Tool;
import software.amazon.awssdk.services.bedrockruntime.model.ToolConfiguration;
import software.amazon.awssdk.services.bedrockruntime.model.ToolInputSchema;
import software.amazon.awssdk.services.bedrockruntime.model.ToolSpecification;

@Component
public class BedrockLlmClient implements LlmClient {
  private final String model;
  private final BedrockRuntimeClient client;
  private final ObjectMapper mapper;

  public BedrockLlmClient(
      @Value("${BEDROCK_MODEL_ID:}") String model,
      @Value("${BEDROCK_INFERENCE_PROFILE_ID:}") String profile,
      ObjectMapper mapper) {
    this.model = profile.isBlank() ? model : profile;
    this.mapper =
        mapper
            .copy()
            .setPropertyNamingStrategy(
                com.fasterxml.jackson.databind.PropertyNamingStrategies.LOWER_CAMEL_CASE);
    this.client =
        this.model.isBlank()
            ? null
            : BedrockRuntimeClient.builder()
                .region(Region.AP_SOUTHEAST_1)
                .overrideConfiguration(
                    config ->
                        config
                            .apiCallTimeout(Duration.ofSeconds(12))
                            .apiCallAttemptTimeout(Duration.ofSeconds(10)))
                .build();
  }

  @Override
  public Search search(String message) {
    if (client == null) throw new AiUnavailableException();
    try {
      // One tool-selection request only. Never expose free-form model output to customers.
      var response =
          client.converse(
              request ->
                  request
                      .modelId(model)
                      .system(
                          SystemContentBlock.builder()
                              .text(
                                  "Extract food catalog search constraints. Never provide medical advice. Set medicalAdvice=true for diagnosis, treatment, dosage or disease-specific advice. Use searchProducts only. q must contain only the food name, not instructions. Never invent nutrition values; thresholds must be requested by the user. No userId, SQL, ordering or write tools exist.")
                              .build())
                      .messages(
                          Message.builder()
                              .role(ConversationRole.USER)
                              .content(ContentBlock.fromText(message))
                              .build())
                      .inferenceConfig(config -> config.maxTokens(400).temperature(0F))
                      .toolConfig(
                          ToolConfiguration.builder()
                              .tools(
                                  Tool.builder()
                                      .toolSpec(
                                          ToolSpecification.builder()
                                              .name("searchProducts")
                                              .description(
                                                  "Read-only catalog search. No medical advice.")
                                              .inputSchema(
                                                  ToolInputSchema.builder().json(schema()).build())
                                              .build())
                                      .build())
                              .build()));
      var blocks = response.output().message().content();
      var tools = blocks.stream().filter(block -> block.toolUse() != null).toList();
      if (tools.size() != 1 || !tools.getFirst().toolUse().name().equals("searchProducts"))
        throw new AiUnavailableException();
      var data = mapper.readTree(tools.getFirst().toolUse().input().toString());
      if (!data.isObject() || !data.has("medicalAdvice") || !data.get("medicalAdvice").isBoolean())
        throw new AiUnavailableException();
      var names = data.fieldNames();
      while (names.hasNext())
        if (!List.of("q", "maxCalories", "minProtein", "excludeAllergen", "medicalAdvice")
            .contains(names.next())) throw new AiUnavailableException();
      return mapper.treeToValue(data, Search.class);
    } catch (Exception exception) {
      throw new AiUnavailableException();
    }
  }

  private Document schema() {
    return Document.fromMap(
        Map.of(
            "type", Document.fromString("object"),
            "additionalProperties", Document.fromBoolean(false),
            "required", Document.fromList(List.of(Document.fromString("medicalAdvice"))),
            "properties",
                Document.fromMap(
                    Map.of(
                        "q",
                        Document.fromMap(
                            Map.of(
                                "type",
                                Document.fromString("string"),
                                "maxLength",
                                Document.fromNumber(100))),
                        "maxCalories",
                        numberSchema(),
                        "minProtein",
                        numberSchema(),
                        "medicalAdvice",
                        Document.fromMap(Map.of("type", Document.fromString("boolean"))),
                        "excludeAllergen",
                        Document.fromMap(
                            Map.of(
                                "type",
                                Document.fromString("array"),
                                "maxItems",
                                Document.fromNumber(6),
                                "items",
                                Document.fromMap(
                                    Map.of(
                                        "type",
                                        Document.fromString("string"),
                                        "enum",
                                        Document.fromList(
                                            List.of(
                                                    "peanut",
                                                    "milk",
                                                    "egg",
                                                    "soy",
                                                    "gluten",
                                                    "shellfish")
                                                .stream()
                                                .map(Document::fromString)
                                                .toList())))))))));
  }

  private Document numberSchema() {
    return Document.fromMap(
        Map.of(
            "type",
            Document.fromString("number"),
            "minimum",
            Document.fromNumber(0),
            "maximum",
            Document.fromNumber(10000)));
  }

  @PreDestroy
  public void close() {
    if (client != null) client.close();
  }
}

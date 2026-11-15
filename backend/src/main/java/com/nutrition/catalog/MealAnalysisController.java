package com.nutrition.catalog;

import com.nutrition.catalog.MealAnalysisService.Analysis;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** Public, read-only meal nutrition calculator (D26). POST only because the body is a list. */
@RestController
public class MealAnalysisController {
  public record ItemRequest(
      @NotNull @Positive Long productId,
      @NotNull @DecimalMin("1") @DecimalMax("5000") BigDecimal grams) {}

  public record AnalyzeRequest(
      @NotNull @Size(min = 1, max = 30) List<@NotNull @Valid ItemRequest> items) {}

  private final MealAnalysisService service;

  public MealAnalysisController(MealAnalysisService service) {
    this.service = service;
  }

  @PostMapping("/api/nutrition/analyze")
  public Analysis analyze(@Valid @RequestBody AnalyzeRequest request) {
    return service.analyze(
        request.items().stream()
            .map(item -> new MealAnalysisService.Item(item.productId(), item.grams()))
            .toList());
  }
}

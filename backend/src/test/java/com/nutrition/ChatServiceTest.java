package com.nutrition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.nutrition.ai.AiUnavailableException;
import com.nutrition.ai.ChatService;
import com.nutrition.ai.LlmClient;
import com.nutrition.catalog.CatalogModels.ProductPage;
import com.nutrition.catalog.CatalogRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class ChatServiceTest {
  private final CatalogRepository catalog = mock(CatalogRepository.class);
  private final JdbcTemplate db = mock(JdbcTemplate.class);
  private final UUID user = UUID.randomUUID();

  private ChatService service(LlmClient llm) {
    when(db.update(anyString(), any(UUID.class))).thenReturn(1);
    return new ChatService(llm, catalog, db);
  }

  @Test
  void onlyValidatedFiltersReachReadOnlyCatalog() {
    var search =
        new LlmClient.Search("oats", BigDecimal.valueOf(300), null, List.of("peanut"), false);
    when(catalog.list(0, 8, null, search.maxCalories(), null, search.excludeAllergen(), "oats"))
        .thenReturn(new ProductPage(List.of(), 0, 8, 0));
    var reply = service(message -> search).chat(user, "search oats");
    assertThat(reply.products()).isEmpty();
    assertThat(reply.reply()).contains("Không tìm thấy", "không phải tư vấn y tế");
    verify(catalog).list(0, 8, null, search.maxCalories(), null, List.of("peanut"), "oats");
  }

  @Test
  void medicalRequestsNeverQueryCatalog() {
    var reply =
        service(message -> new LlmClient.Search(null, null, null, null, true))
            .chat(user, "medical request");
    assertThat(reply.products()).isEmpty();
    verifyNoInteractions(catalog);
  }

  @Test
  void invalidModelFiltersFailClosed() {
    var service =
        service(
            message -> new LlmClient.Search("", BigDecimal.valueOf(-1), null, List.of(), false));
    assertThatThrownBy(() -> service.chat(user, "query"))
        .isInstanceOf(AiUnavailableException.class);
    verifyNoInteractions(catalog);
  }

  @Test
  void exhaustedQuotaNeverCallsModel() {
    var llm = mock(LlmClient.class);
    var service = service(llm);
    when(db.update(anyString(), any(UUID.class))).thenReturn(0);
    assertThatThrownBy(() -> service.chat(user, "query"))
        .isInstanceOf(ChatService.QuotaExceeded.class);
    verifyNoInteractions(llm, catalog);
  }
}

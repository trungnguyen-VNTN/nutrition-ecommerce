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
import com.nutrition.catalog.CatalogModels.Category;
import com.nutrition.catalog.CatalogModels.Nutrition;
import com.nutrition.catalog.CatalogModels.Product;
import com.nutrition.catalog.CatalogModels.ProductPage;
import com.nutrition.catalog.CatalogRepository;
import com.nutrition.catalog.DietLabel;
import com.nutrition.catalog.ProductSort;
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
    when(catalog.list(
            0,
            8,
            null,
            search.maxCalories(),
            null,
            search.excludeAllergen(),
            "oats",
            ProductSort.DEFAULT,
            List.of(),
            false))
        .thenReturn(new ProductPage(List.of(), 0, 8, 0));
    var reply = service(message -> search).chat(user, "search oats");
    assertThat(reply.products()).isEmpty();
    assertThat(reply.reply()).contains("Không tìm thấy", "không phải tư vấn y tế");
    verify(catalog)
        .list(
            0,
            8,
            null,
            search.maxCalories(),
            null,
            List.of("peanut"),
            "oats",
            ProductSort.DEFAULT,
            List.of(),
            false);
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

  private static Product product(
      long id, String name, String size, String unit, Nutrition nutrition, boolean complete) {
    return new Product(
        id,
        name,
        null,
        BigDecimal.valueOf(10000),
        "VND",
        5,
        null,
        size == null ? null : new BigDecimal(size),
        unit,
        complete,
        true,
        false,
        nutrition,
        List.of(),
        List.of(),
        List.of());
  }

  private static Nutrition nutrition(String kcal, String protein) {
    return new Nutrition(
        new BigDecimal(kcal),
        new BigDecimal(protein),
        new BigDecimal("66.3"),
        new BigDecimal("6.9"),
        null,
        new BigDecimal("10.6"),
        null,
        "USDA");
  }

  private void found(String name, Product product) {
    when(catalog.list(
            0, 1, null, null, null, List.of(), name, ProductSort.DEFAULT, List.<DietLabel>of()))
        .thenReturn(new ProductPage(product == null ? List.of() : List.of(product), 0, 1, 0));
  }

  private static LlmClient.Search ask(String intent, List<String> items) {
    return new LlmClient.Search(null, null, null, null, false, null, null, null, intent, items);
  }

  @Test
  void categoryLabelsAndStockReachTheCatalogAsFixedFilters() {
    when(catalog.categories()).thenReturn(List.of(new Category(4, "Trái cây sấy", "trai-cay-say")));
    var search =
        new LlmClient.Search(
            null,
            null,
            null,
            null,
            false,
            "trai-cay-say",
            List.of("LOW_SUGAR"),
            true,
            "search",
            null);
    when(catalog.list(
            0,
            8,
            4L,
            null,
            null,
            List.of(),
            "",
            ProductSort.DEFAULT,
            List.of(DietLabel.LOW_SUGAR),
            true))
        .thenReturn(new ProductPage(List.of(), 0, 8, 0));
    service(message -> search).chat(user, "trái cây sấy ít đường còn hàng");
    verify(catalog)
        .list(
            0,
            8,
            4L,
            null,
            null,
            List.of(),
            "",
            ProductSort.DEFAULT,
            List.of(DietLabel.LOW_SUGAR),
            true);
  }

  @Test
  void aCategoryNameRepeatedAsSearchTextIsDropped() {
    when(catalog.categories()).thenReturn(List.of(new Category(4, "Trái cây sấy", "trai-cay-say")));
    var search =
        new LlmClient.Search(
            "trái cây sấy",
            null,
            null,
            null,
            false,
            "trai-cay-say",
            List.of("LOW_SUGAR"),
            null,
            "search",
            null);
    when(catalog.list(
            0,
            8,
            4L,
            null,
            null,
            List.of(),
            "",
            ProductSort.DEFAULT,
            List.of(DietLabel.LOW_SUGAR),
            false))
        .thenReturn(new ProductPage(List.of(), 0, 8, 0));
    service(message -> search).chat(user, "Trái cây sấy ít đường");
    verify(catalog)
        .list(
            0,
            8,
            4L,
            null,
            null,
            List.of(),
            "",
            ProductSort.DEFAULT,
            List.of(DietLabel.LOW_SUGAR),
            false);
  }

  @Test
  void unknownCategoryOrLabelFailsClosed() {
    when(catalog.categories()).thenReturn(List.of(new Category(4, "Trái cây sấy", "trai-cay-say")));
    var badCategory =
        new LlmClient.Search(null, null, null, null, false, "x", null, null, "search", null);
    assertThatThrownBy(() -> service(message -> badCategory).chat(user, "q"))
        .isInstanceOf(AiUnavailableException.class);
    var badLabel =
        new LlmClient.Search(
            null, null, null, null, false, null, List.of("TASTY"), null, null, null);
    assertThatThrownBy(() -> service(message -> badLabel).chat(user, "q"))
        .isInstanceOf(AiUnavailableException.class);
  }

  @Test
  void factsAreWrittenFromDatabaseValuesAndMissingDataIsSaid() {
    found("yến mạch", product(1, "Yến mạch", "100", "g", nutrition("389", "16.9"), true));
    found("hạt chia", product(2, "Hạt chia", null, null, null, false));
    found("kẹo bay", null);
    var search = ask("facts", List.of("yến mạch", "hạt chia", "kẹo bay"));
    var reply = service(message -> search).chat(user, "yến mạch có bao nhiêu protein");
    assertThat(reply.reply())
        .contains("Yến mạch (mỗi 100 g): 389 kcal · protein 16,9 g · carb 66,3 g · chất béo 6,9 g")
        .contains("chất xơ 10,6 g")
        .contains("Hạt chia: chưa có đủ dữ liệu dinh dưỡng.")
        .contains("Không tìm thấy một món bạn hỏi")
        .contains("không phải tư vấn y tế")
        .doesNotContain("kẹo bay");
    assertThat(reply.products()).extracting(Product::id).containsExactly(1L, 2L);
  }

  @Test
  void comparisonNormalisesTo100gAndNeedsTwoCompleteProducts() {
    found("yến mạch", product(1, "Yến mạch", "100", "g", nutrition("389", "16.9"), true));
    found("gạo lứt", product(3, "Gạo lứt", "50", "g", nutrition("180", "3.8"), true));
    var compare = ask("compare", List.of("yến mạch", "gạo lứt"));
    var reply = service(message -> compare).chat(user, "so sánh");
    // 180 kcal per 50 g = 360 kcal per 100 g, lighter than 389; oats have more protein.
    assertThat(reply.reply())
        .contains("Ít năng lượng nhất (trên 100 g hoặc 100 ml): Gạo lứt (360 kcal).")
        .contains("Nhiều protein nhất (trên 100 g hoặc 100 ml): Yến mạch (16,9 g).");

    found("hạt chia", product(2, "Hạt chia", null, null, null, false));
    var single = ask("compare", List.of("yến mạch", "hạt chia"));
    assertThat(service(message -> single).chat(user, "so sánh").reply())
        .contains("Chưa đủ dữ liệu để so sánh");
  }

  @Test
  void factsWithoutItemsOrUnknownIntentFailClosed() {
    var noItems = ask("facts", List.of());
    assertThatThrownBy(() -> service(message -> noItems).chat(user, "q"))
        .isInstanceOf(AiUnavailableException.class);
    var odd = ask("order", null);
    assertThatThrownBy(() -> service(message -> odd).chat(user, "q"))
        .isInstanceOf(AiUnavailableException.class);
    verifyNoInteractions(catalog);
  }
}

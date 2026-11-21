package com.nutrition.ai;

import com.nutrition.catalog.CatalogModels.Category;
import com.nutrition.catalog.CatalogModels.Product;
import com.nutrition.catalog.CatalogRepository;
import com.nutrition.catalog.DietLabel;
import com.nutrition.catalog.ProductSort;
import com.nutrition.profile.RecommendationService;
import com.nutrition.profile.RecommendationService.Meal;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Read-only AI lookup (phase 6, D31). The model only extracts validated filters; every sentence
 * with a number is written here from database values, so the reply never carries a figure the model
 * produced (invariant 2) and products with missing data are reported as missing (invariant 3).
 */
@Service
public class ChatService {
  private final LlmClient llm;
  private final CatalogRepository catalog;
  private final JdbcTemplate db;
  private final RecommendationService recommendations;

  public ChatService(
      LlmClient llm,
      CatalogRepository catalog,
      JdbcTemplate db,
      RecommendationService recommendations) {
    this.llm = llm;
    this.catalog = catalog;
    this.db = db;
    this.recommendations = recommendations;
  }

  public record Reply(String reply, List<Product> products) {}

  public static class QuotaExceeded extends RuntimeException {}

  /** Shown when the Bedrock guardrail blocks a request (medical, abusive or prompt attack). */
  static final String REFUSED =
      "Tôi chỉ hỗ trợ tra cứu thực phẩm trong cửa hàng và không đưa ra lời khuyên y tế. Hãy hỏi về món ăn, dinh dưỡng hoặc allergen cần tránh.";

  static final String NOT_MEDICAL = "Thông tin tham khảo, không phải tư vấn y tế.";

  // Upper bound only; the Bedrock client already checks codes against the allergens table.
  private static final int MAX_ALLERGENS = 20;
  private static final int MAX_ITEMS = 3;

  public Reply chat(UUID user, String message) {
    // Atomic daily cap works across ECS tasks; failed requests also consume quota.
    int allowed =
        db.update(
            """
        INSERT INTO chat_usage(user_id,day,request_count) VALUES (?,(now() AT TIME ZONE 'UTC')::date,1)
        ON CONFLICT(user_id,day) DO UPDATE SET request_count=chat_usage.request_count+1
        WHERE chat_usage.request_count<30
        """,
            user);
    if (allowed == 0) throw new QuotaExceeded();
    LlmClient.Search search;
    try {
      search = llm.search(message);
    } catch (AiRefusedException refused) {
      return new Reply(REFUSED, List.of());
    }
    if (search == null) throw new AiUnavailableException();
    if (search.medicalAdvice())
      return new Reply(
          "Tôi chỉ tra cứu thực phẩm, không đưa ra lời khuyên y tế. Vui lòng trao đổi với chuyên gia y tế.",
          List.of());
    String intent = search.intentOrSearch();
    if (!LlmClient.INTENTS.contains(intent)) throw new AiUnavailableException();
    try {
      return switch (intent) {
        case "search" -> search(search);
        case "plan" -> plan(user, search);
        default -> facts(search, "compare".equals(intent));
      };
    } catch (IllegalArgumentException exception) {
      throw new AiUnavailableException();
    }
  }

  private Reply search(LlmClient.Search search) {
    String q = search.q() == null ? "" : search.q().trim();
    var excluded = search.excludeAllergen() == null ? List.<String>of() : search.excludeAllergen();
    if (q.length() > 100
        || excluded.size() > MAX_ALLERGENS
        || invalid(search.maxCalories())
        || invalid(search.minProtein())) throw new AiUnavailableException();
    Category category = category(search.category());
    // The model sometimes repeats the category name as search text ("trái cây sấy"), which would
    // demand that word in every product name and return nothing: the category filter covers it.
    if (category != null && sameText(category.name(), q)) q = "";
    var products =
        catalog
            .list(
                0,
                8,
                category == null ? null : category.id(),
                search.maxCalories(),
                search.minProtein(),
                excluded,
                q,
                ProductSort.DEFAULT,
                labels(search.labels()),
                Boolean.TRUE.equals(search.inStock()))
            .items();
    return new Reply(
        products.isEmpty()
            ? "Không tìm thấy sản phẩm đủ dữ liệu đáp ứng yêu cầu. " + NOT_MEDICAL
            : "Các sản phẩm sau lấy trực tiếp từ dữ liệu cửa hàng. Xem chi tiết để kiểm tra dinh dưỡng và allergen. "
                + NOT_MEDICAL,
        products);
  }

  static final String NO_PROFILE =
      "Bạn chưa có hồ sơ dinh dưỡng. Hãy tạo hồ sơ ở trang Hồ sơ dinh dưỡng để nhận gợi ý bữa ăn theo mục tiêu của bạn.";
  static final String NOT_ELIGIBLE =
      "Hồ sơ của bạn nằm ngoài phạm vi ước tính (tuổi, BMI, mang thai hoặc có bệnh cần giám sát) nên hệ thống không đưa ra gợi ý cá nhân. Hãy hỏi bác sĩ hoặc chuyên gia dinh dưỡng.";
  private static final Map<Meal, String> MEAL_NAMES =
      Map.of(Meal.BREAKFAST, "bữa sáng", Meal.LUNCH, "bữa trưa", Meal.DINNER, "bữa tối");

  /**
   * A meal toward the caller's own targets (D32). The user comes from the JWT; the model only chose
   * the intent and the meal, and every number below comes from the recommender's DB values.
   */
  private Reply plan(UUID user, LlmClient.Search search) {
    Meal meal;
    try {
      meal = search.meal() == null ? Meal.LUNCH : Meal.valueOf(search.meal());
    } catch (IllegalArgumentException unknown) {
      throw new AiUnavailableException();
    }
    var excluded = search.excludeAllergen() == null ? List.<String>of() : search.excludeAllergen();
    if (excluded.size() > MAX_ALLERGENS) throw new AiUnavailableException();
    RecommendationService.Recommendation rec;
    try {
      // Labels are ignored here: the goal lives in the profile, and a label such as HIGH_PROTEIN
      // (often added for "tăng cơ") would drop every vegetable and starch from the meal.
      rec = recommendations.recommend(user, meal, excluded, List.of());
    } catch (NoSuchElementException noProfile) {
      return new Reply(NO_PROFILE + " " + NOT_MEDICAL, List.of());
    }
    if (!rec.eligible()) return new Reply(NOT_ELIGIBLE, List.of());
    if (rec.items().isEmpty())
      return new Reply(
          "Chưa tìm được món còn hàng, đủ dữ liệu dinh dưỡng và không chứa allergen bạn tránh cho "
              + MEAL_NAMES.get(meal)
              + ". "
              + NOT_MEDICAL,
          List.of());
    List<String> lines = new ArrayList<>();
    lines.add(
        "Gợi ý "
            + MEAL_NAMES.get(meal)
            + " theo hồ sơ của bạn (mục tiêu bữa khoảng "
            + number(rec.target().calories())
            + " kcal, "
            + number(rec.target().proteinG())
            + " g protein):");
    for (var pick : rec.items())
      lines.add(
          "- "
              + pick.product().name()
              + " ("
              + pick.role()
              + "), "
              + number(pick.grams())
              + " g: "
              + number(pick.amounts().calories())
              + " kcal · protein "
              + number(pick.amounts().proteinG())
              + " g.");
    lines.add(
        "Tổng: "
            + number(rec.total().calories())
            + " kcal"
            + (rec.caloriesPct() == null ? "" : " (" + rec.caloriesPct() + "% mục tiêu bữa)")
            + " · protein "
            + number(rec.total().proteinG())
            + " g. Xem và đổi bữa ở trang Gợi ý cho bạn.");
    lines.add("Số liệu tính từ dữ liệu cửa hàng và hồ sơ của bạn. " + NOT_MEDICAL);
    return new Reply(
        String.join("\n", lines), rec.items().stream().map(pick -> pick.product()).toList());
  }

  /** Nutrition facts of named foods, or a comparison, written from database values only. */
  private Reply facts(LlmClient.Search search, boolean compare) {
    List<String> items = search.items() == null ? List.of() : search.items();
    if (items.isEmpty()
        || items.size() > MAX_ITEMS
        || items.stream().anyMatch(item -> item == null || item.isBlank() || item.length() > 100))
      throw new AiUnavailableException();
    Map<Long, Product> found = new LinkedHashMap<>();
    int missing = 0;
    for (String item : items) {
      var matches =
          catalog
              .list(0, 1, null, null, null, List.of(), item.trim(), ProductSort.DEFAULT, List.of())
              .items();
      if (matches.isEmpty()) missing++;
      else found.putIfAbsent(matches.getFirst().id(), matches.getFirst());
    }
    List<String> lines = new ArrayList<>();
    for (Product product : found.values()) lines.add(factLine(product));
    if (missing > 0)
      lines.add(
          missing == 1
              ? "Không tìm thấy một món bạn hỏi trong cửa hàng."
              : "Không tìm thấy " + missing + " món bạn hỏi trong cửa hàng.");
    if (compare) lines.addAll(comparison(List.copyOf(found.values())));
    if (!found.isEmpty())
      lines.add("Số liệu lấy từ dữ liệu cửa hàng (nguồn ghi trên từng sản phẩm). " + NOT_MEDICAL);
    else lines.add(NOT_MEDICAL);
    return new Reply(String.join("\n", lines), List.copyOf(found.values()));
  }

  private static boolean complete(Product product) {
    var n = product.nutrition();
    return product.nutritionComplete()
        && n != null
        && n.calories() != null
        && n.proteinG() != null
        && n.carbsG() != null
        && n.fatG() != null
        && product.servingSize() != null
        && product.servingUnit() != null;
  }

  static String factLine(Product product) {
    if (!complete(product)) return product.name() + ": chưa có đủ dữ liệu dinh dưỡng.";
    var n = product.nutrition();
    StringBuilder line =
        new StringBuilder(product.name())
            .append(" (mỗi ")
            .append(number(product.servingSize()))
            .append(' ')
            .append(unit(product.servingUnit()))
            .append("): ")
            .append(number(n.calories()))
            .append(" kcal · protein ")
            .append(number(n.proteinG()))
            .append(" g · carb ")
            .append(number(n.carbsG()))
            .append(" g · chất béo ")
            .append(number(n.fatG()))
            .append(" g");
    if (n.sugarG() != null) line.append(" · đường ").append(number(n.sugarG())).append(" g");
    if (n.fiberG() != null) line.append(" · chất xơ ").append(number(n.fiberG())).append(" g");
    return line.append('.').toString();
  }

  /** Lowest energy and highest protein per 100 g / 100 ml, only among complete g or ml data. */
  static List<String> comparison(List<Product> products) {
    var comparable =
        products.stream()
            .filter(ChatService::complete)
            .filter(p -> List.of("g", "ml").contains(p.servingUnit()))
            .filter(p -> p.servingSize().signum() > 0)
            .toList();
    if (comparable.size() < 2)
      return List.of(
          "Chưa đủ dữ liệu để so sánh (cần ít nhất hai món có đủ số liệu theo g hoặc ml).");
    Product lighter =
        comparable.stream()
            .min(Comparator.comparing(p -> per100(p.nutrition().calories(), p)))
            .orElseThrow();
    Product richer =
        comparable.stream()
            .max(Comparator.comparing(p -> per100(p.nutrition().proteinG(), p)))
            .orElseThrow();
    return List.of(
        "Ít năng lượng nhất (trên 100 g hoặc 100 ml): "
            + lighter.name()
            + " ("
            + number(per100(lighter.nutrition().calories(), lighter))
            + " kcal).",
        "Nhiều protein nhất (trên 100 g hoặc 100 ml): "
            + richer.name()
            + " ("
            + number(per100(richer.nutrition().proteinG(), richer))
            + " g).");
  }

  private static BigDecimal per100(BigDecimal value, Product product) {
    return value
        .multiply(BigDecimal.valueOf(100))
        .divide(product.servingSize(), 4, RoundingMode.HALF_UP);
  }

  /** Vietnamese number: one decimal at most, comma separator. */
  static String number(BigDecimal value) {
    return value
        .setScale(1, RoundingMode.HALF_UP)
        .stripTrailingZeros()
        .toPlainString()
        .replace('.', ',');
  }

  private static String unit(String unit) {
    return "unit".equals(unit) ? "đơn vị" : unit;
  }

  private Category category(String slug) {
    if (slug == null || slug.isBlank()) return null;
    return catalog.categories().stream()
        .filter(category -> category.slug().equals(slug))
        .findFirst()
        .orElseThrow(AiUnavailableException::new);
  }

  /** Case- and accent-insensitive: "trai cay say" and "Trái cây sấy" are the same text. */
  static boolean sameText(String a, String b) {
    if (a == null || b == null || b.isBlank()) return false;
    return fold(a).equals(fold(b));
  }

  private static String fold(String text) {
    String decomposed =
        java.text.Normalizer.normalize(
                text.trim().toLowerCase(java.util.Locale.ROOT), java.text.Normalizer.Form.NFD)
            .replace('đ', 'd');
    return decomposed.replaceAll("\\p{M}", "").replaceAll("\\s+", " ");
  }

  private static List<DietLabel> labels(List<String> names) {
    if (names == null) return List.of();
    List<DietLabel> labels = new ArrayList<>();
    for (String name : names) {
      try {
        labels.add(DietLabel.valueOf(name));
      } catch (IllegalArgumentException unknown) {
        throw new AiUnavailableException();
      }
    }
    return labels;
  }

  private boolean invalid(BigDecimal value) {
    return value != null && (value.signum() < 0 || value.compareTo(BigDecimal.valueOf(10000)) > 0);
  }
}

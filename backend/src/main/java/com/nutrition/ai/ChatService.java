package com.nutrition.ai;

import com.nutrition.catalog.CatalogModels.Product;
import com.nutrition.catalog.CatalogRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class ChatService {
  private final LlmClient llm;
  private final CatalogRepository catalog;
  private final JdbcTemplate db;

  public ChatService(LlmClient llm, CatalogRepository catalog, JdbcTemplate db) {
    this.llm = llm;
    this.catalog = catalog;
    this.db = db;
  }

  public record Reply(String reply, List<Product> products) {}

  public static class QuotaExceeded extends RuntimeException {}

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
    var search = llm.search(message);
    if (search == null) throw new AiUnavailableException();
    if (search.medicalAdvice())
      return new Reply(
          "Tôi chỉ tra cứu thực phẩm, không đưa ra lời khuyên y tế. Vui lòng trao đổi với chuyên gia y tế.",
          List.of());
    String q = search.q() == null ? "" : search.q().trim();
    var excluded = search.excludeAllergen() == null ? List.<String>of() : search.excludeAllergen();
    if (q.length() > 100
        || excluded.size() > 6
        || invalid(search.maxCalories())
        || invalid(search.minProtein())) throw new AiUnavailableException();
    try {
      var products =
          catalog.list(0, 8, null, search.maxCalories(), search.minProtein(), excluded, q).items();
      return new Reply(
          products.isEmpty()
              ? "Không tìm thấy sản phẩm đủ dữ liệu đáp ứng yêu cầu. Thông tin tham khảo, không phải tư vấn y tế."
              : "Các sản phẩm sau lấy trực tiếp từ dữ liệu cửa hàng. Xem chi tiết để kiểm tra dinh dưỡng và allergen. Thông tin tham khảo, không phải tư vấn y tế.",
          products);
    } catch (IllegalArgumentException exception) {
      throw new AiUnavailableException();
    }
  }

  private boolean invalid(BigDecimal value) {
    return value != null && (value.signum() < 0 || value.compareTo(BigDecimal.valueOf(10000)) > 0);
  }
}

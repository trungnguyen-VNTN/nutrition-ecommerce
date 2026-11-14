package com.nutrition;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/** The filter is part of the real chain and answers with the API error format. */
@SpringBootTest(properties = "nutrition.rate-limit.read-per-minute=2")
@AutoConfigureMockMvc
@ActiveProfiles("local")
class RateLimitIntegrationTest {
  @Autowired MockMvc http;

  @Test
  void returns429WithRetryAfterOnceTheLimitIsReached() throws Exception {
    http.perform(get("/api/categories").with(r -> remote(r, "192.0.2.10")))
        .andExpect(status().isOk());
    http.perform(get("/api/categories").with(r -> remote(r, "192.0.2.10")))
        .andExpect(status().isOk());
    http.perform(get("/api/categories").with(r -> remote(r, "192.0.2.10")))
        .andExpect(status().isTooManyRequests())
        .andExpect(header().exists("Retry-After"))
        .andExpect(jsonPath("$.code").value("RATE_LIMITED"));
    http.perform(get("/actuator/health").with(r -> remote(r, "192.0.2.10")))
        .andExpect(status().isOk());
  }

  private static org.springframework.mock.web.MockHttpServletRequest remote(
      org.springframework.mock.web.MockHttpServletRequest request, String address) {
    request.setRemoteAddr(address);
    return request;
  }
}

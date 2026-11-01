package com.nutrition;

import java.util.TimeZone;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class NutritionApplication {
  public static void main(String[] args) {
    // Use a canonical database timezone instead of OS-specific legacy aliases.
    TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    SpringApplication.run(NutritionApplication.class, args);
  }
}

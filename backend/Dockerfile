FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /workspace
COPY .mvn .mvn
COPY mvnw pom.xml checkstyle.xml ./
RUN chmod +x mvnw
COPY src src
RUN MAVEN_OPTS="-Xmx256m -XX:MaxMetaspaceSize=128m -XX:+UseSerialGC" ./mvnw -B -ntp -DskipTests package

FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
RUN groupadd --system app && useradd --system --gid app app
COPY --from=build /workspace/target/nutrition-api-0.0.1-SNAPSHOT.jar /app/app.jar
USER app
ENV SERVER_ADDRESS=0.0.0.0 SPRING_PROFILES_ACTIVE=production
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]

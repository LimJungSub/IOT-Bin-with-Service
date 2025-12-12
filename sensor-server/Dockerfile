# 1단계: Gradle로 빌드
FROM gradle:8.10.2-jdk17-alpine AS builder

WORKDIR /app

COPY build.gradle settings.gradle ./
COPY gradlew gradlew.bat ./
COPY gradle ./gradle
COPY src ./src

RUN ./gradlew clean bootJar -x test

# 2단계: 실행용 경량 이미지
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY --from=builder /app/build/libs/*.jar app.jar

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]

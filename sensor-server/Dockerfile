# 1단계: 빌드 스테이지
FROM gradle:8.8-jdk17-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# Gradle 설정/캐시용 파일 먼저 복사
COPY build.gradle settings.gradle ./
COPY gradle gradle
COPY gradlew ./

# 의존성만 먼저 다운로드 (빌드 캐시 효과)
RUN ./gradlew dependencies --no-daemon || return 0

# 실제 소스 복사
COPY src src

# Spring Boot JAR 빌드
RUN ./gradlew bootJar --no-daemon

# 2단계: 런타임 스테이지 (슬림 JDK)
FROM eclipse-temurin:17-jre-alpine

# Render가 제공하는 PORT 환경변수 사용 (기본값 8080)
ENV PORT=8080

WORKDIR /app

# 빌드된 JAR 복사 (경로는 실제 빌드 결과에 맞게)
COPY --from=builder /app/build/libs/*.jar app.jar

# 헬스 체크 용도로 포트 노출 (로컬 테스트용, Render에서는 의미상)
EXPOSE 8080

# Spring Boot를 Render의 PORT에 맞춰 실행
ENTRYPOINT ["sh", "-c", "java -jar -Dserver.port=${PORT} app.jar"]

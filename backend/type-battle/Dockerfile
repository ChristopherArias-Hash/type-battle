

# Stage 1: Build the JAR inside a Maven container
FROM maven:3.9.4-eclipse-temurin-22-alpine AS build

WORKDIR /app

# Copy only pom.xml and download dependencies first (cache layer)
COPY pom.xml .
RUN mvn dependency:go-offline

# Copy source code
COPY src ./src

# Build the JAR (skip tests for faster builds)
RUN mvn clean package -DskipTests

# Stage 2: Run the app with OpenJDK 22 slim
FROM eclipse-temurin:22-jre-alpine

WORKDIR /app

# Copy the JAR from the build stage
COPY --from=build /app/target/*.jar app.jar

# Expose your app port (change if needed)
EXPOSE 8080

# Run the app
ENTRYPOINT ["java", "-jar", "app.jar"]

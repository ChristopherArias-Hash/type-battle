FROM ubuntu:latest
LABEL authors="Christopher"

# Use a base image with Java 21 (Temurin is OpenJDK based)
FROM openjdk:21-jdk-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the Maven/Gradle build artifact into the container
# If you are using Maven:
COPY target/*.jar app.jar

# If you are using Gradle:
# COPY build/libs/*.jar app.jar

# Expose the port your Spring Boot application listens on (default is 8080)
EXPOSE 8080

# Run the JAR file when the container starts
ENTRYPOINT ["java", "-jar", "app.jar"]
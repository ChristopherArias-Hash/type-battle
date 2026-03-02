package com.example.type_battle.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitFilter implements Filter {

    // Separate caches for each type of endpoint so they don't share tokens
    private final Map<String, Bucket> mediaBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> sessionBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> wsBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> defaultBuckets = new ConcurrentHashMap<>();

    // Limit: 5 requests per 1 hour
    private Bucket createMediaBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.classic(5, Refill.greedy(5, Duration.ofHours(1))))
                .build();
    }

    // Limit: 50 requests per 5 minutes
    private Bucket createSessionBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.classic(50, Refill.greedy(50, Duration.ofMinutes(5))))
                .build();
    }

    // Limit: 50 requests per 5 minutes
    private Bucket createWsBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.classic(50, Refill.greedy(5, Duration.ofMinutes(5))))
                .build();
    }

    // Default catch-all limit for other API routes (e.g., 100 per 1 minute)
    private Bucket createDefaultBucket() {
        return Bucket.builder()
                .addLimit(Bandwidth.classic(100, Refill.greedy(100, Duration.ofMinutes(1))))
                .build();
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        // Get the actual user's IP from Cloudflare
        String clientIp = httpRequest.getHeader("CF-Connecting-IP");
        if (clientIp == null || clientIp.isEmpty()) {
            clientIp = httpRequest.getRemoteAddr();
        }

        String path = httpRequest.getRequestURI();
        Bucket bucket;

        // Route the request to the correct bucket based on the URI path
        if (path.contains("/media")) {
            bucket = mediaBuckets.computeIfAbsent(clientIp, k -> createMediaBucket());
        } else if (path.contains("/session")) {
            bucket = sessionBuckets.computeIfAbsent(clientIp, k -> createSessionBucket());
        } else if (path.contains("/ws")) {
            bucket = wsBuckets.computeIfAbsent(clientIp, k -> createWsBucket());
        } else {
            bucket = defaultBuckets.computeIfAbsent(clientIp, k -> createDefaultBucket());
        }

        // Try to consume a token
        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
        } else {
            httpResponse.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            httpResponse.getWriter().write("Too many requests. Please slow down.");
        }
    }
}
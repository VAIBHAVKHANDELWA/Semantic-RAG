package com.middleware.gateway.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

@Slf4j
@Component
public class RedisRateLimitingFilter extends OncePerRequestFilter {

    private final StringRedisTemplate redisTemplate;
    private static final int DEFAULT_LIMIT_PER_MINUTE = 120;

    public RedisRateLimitingFilter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        // Only enforce on authenticated API endpoints
        String path = request.getRequestURI();
        if (path.startsWith("/api/v1/auth") || path.startsWith("/actuator") || "OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            String userId = principal.getUsername();
            long currentMinute = System.currentTimeMillis() / 60000;
            String redisKey = String.format("rl:%s:%d", userId, currentMinute);

            try {
                Long currentRequests = redisTemplate.opsForValue().increment(redisKey);
                if (currentRequests != null && currentRequests == 1) {
                    redisTemplate.expire(redisKey, Duration.ofSeconds(65));
                }

                // Increment total request metric counter
                redisTemplate.opsForValue().increment("metrics:gateway_requests:total");

                if (currentRequests != null && currentRequests > DEFAULT_LIMIT_PER_MINUTE) {
                    log.warn("Rate limit breached for user [{}] (Limit: {} req/min)", userId, DEFAULT_LIMIT_PER_MINUTE);
                    redisTemplate.opsForValue().increment("metrics:gateway_requests:throttled");
                    response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\": \"Rate limit exceeded. Maximum 120 requests per minute.\"}");
                    return;
                }
            } catch (Exception e) {
                // If Redis is unreachable, fail-open to avoid service disruption
                log.debug("Redis rate limiter unavailable ({}), failing open.", e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }
}

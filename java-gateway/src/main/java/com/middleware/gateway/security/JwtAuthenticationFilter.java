package com.middleware.gateway.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final StringRedisTemplate redisTemplate;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        try {
            String uri = request.getRequestURI();
            boolean isSseStream = uri.endsWith("/telemetry/stream");

            String authHeader = request.getHeader("Authorization");
            String token = jwtUtil.extractTokenFromHeader(authHeader);

            // Accept ?token= query parameter strictly on SSE EventSource handshake path
            if ((token == null || token.isBlank()) && isSseStream) {
                token = request.getParameter("token");
            }

            if (token != null && jwtUtil.validateToken(token)) {
                String jti = jwtUtil.extractJti(token);
                if (jti != null && Boolean.TRUE.equals(redisTemplate.hasKey("token:denylist:" + jti))) {
                    log.warn("Authentication rejected: Token jti [{}] is denylisted/logged out", jti);
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\": \"Unauthorized: Token has been revoked\"}");
                    return;
                }

                String subject = jwtUtil.extractSubject(token);
                String role = jwtUtil.extractRole(token);
                String tenant = jwtUtil.extractTenant(token);
                boolean mustChangePassword = jwtUtil.extractMustChangePassword(token);
                boolean isSuperAdmin = jwtUtil.extractIsSuperAdmin(token);

                if (tenant == null || tenant.isBlank()) {
                    log.warn("Authentication rejected: Missing tenant claim in JWT for subject [{}]", subject);
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\": \"Forbidden: Missing required tenant scope in token\"}");
                    return;
                }

                // If user is required to change password, reject access to non-change-password endpoints
                if (mustChangePassword && !uri.equals("/api/v1/auth/change-password") && !uri.equals("/api/v1/auth/logout") && !uri.equals("/api/v1/health")) {
                    log.warn("Access denied for subject [{}]: Password change is required before accessing {}", subject, uri);
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\": \"Forbidden: Password change required before accessing other resources\"}");
                    return;
                }

                UserPrincipal userPrincipal = UserPrincipal.create(subject, role, tenant, mustChangePassword, isSuperAdmin);

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userPrincipal,
                        null,
                        userPrincipal.getAuthorities()
                );
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception e) {
            log.error("Could not set user authentication in security context: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}

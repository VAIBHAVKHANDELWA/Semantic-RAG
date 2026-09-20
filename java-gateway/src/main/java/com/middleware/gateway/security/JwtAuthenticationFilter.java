package com.middleware.gateway.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        try {
            String authHeader = request.getHeader("Authorization");
            String token = jwtUtil.extractTokenFromHeader(authHeader);

            // Staff Engineer Pattern: Fallback to ?token=<jwt> parameter for SSE EventSource handshakes
            if (token == null || token.isBlank()) {
                token = request.getParameter("token");
            }

            if (token != null && jwtUtil.validateToken(token)) {
                String userId = jwtUtil.extractSubject(token);
                String role = jwtUtil.extractRole(token);
                String tenant = jwtUtil.extractTenant(token);

                UserPrincipal userPrincipal = UserPrincipal.create(userId, role, tenant);

                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                        userPrincipal,
                        null,
                        userPrincipal.getAuthorities()
                );
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                SecurityContextHolder.getContext().setAuthentication(authentication);
                log.debug("Successfully authenticated user [{}] with role [{}] and tenant [{}]", userId, role, tenant);
            }
        } catch (Exception e) {
            log.error("Could not set user authentication in security context", e);
        }

        filterChain.doFilter(request, response);
    }
}

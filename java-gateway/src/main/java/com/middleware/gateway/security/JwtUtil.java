package com.middleware.gateway.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtUtil {

    private final SecretKey key;

    public JwtUtil(@Value("${jwt.secret}") String secret) {
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        this.key = Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Extracts Bearer token string from HTTP Authorization header.
     */
    public String extractTokenFromHeader(String header) {
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7).trim();
        }
        return null;
    }

    /**
     * Validates JWT token signature and expiration.
     */
    public boolean validateToken(String token) {
        try {
            Claims claims = getClaims(token);
            return !claims.getExpiration().before(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /**
     * Extracts subject (User ID / username) from token claims.
     */
    public String extractSubject(String token) {
        return getClaims(token).getSubject();
    }

    /**
     * Extracts user role from custom claim "role".
     */
    public String extractRole(String token) {
        Claims claims = getClaims(token);
        String role = claims.get("role", String.class);
        return role != null ? role : "DATA_STEWARD";
    }

    /**
     * Extracts tenant ID from custom claim "tenantId" or "tenant".
     */
    public String extractTenant(String token) {
        Claims claims = getClaims(token);
        String tenantId = claims.get("tenantId", String.class);
        if (tenantId == null) {
            tenantId = claims.get("tenant", String.class);
        }
        return tenantId != null ? tenantId : "GLOBAL";
    }

    /**
     * Parses payload Claims from JWT token string.
     */
    public Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}

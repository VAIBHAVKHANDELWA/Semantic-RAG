package com.middleware.gateway.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Arrays;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtUtil {

    private final SecretKey key;
    private final long expirationMs;

    public JwtUtil(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-ms:3600000}") long expirationMs,
            Environment env
    ) {
        boolean isDevProfile = Arrays.asList(env.getActiveProfiles()).contains("dev");
        byte[] keyBytes = Decoders.BASE64.decode(secret);

        if (!isDevProfile && keyBytes.length < 32) {
            throw new IllegalStateException("JWT secret must be at least 32 bytes (256 bits) in non-dev profiles!");
        }

        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.expirationMs = expirationMs;
    }

    /**
     * Issues a cryptographically signed JWT for authenticated user principals including jti claim.
     */
    public String generateToken(String email, String userId, String role, String tenantId, String displayName, boolean mustChangePassword, boolean isSuperAdmin) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);
        String jti = UUID.randomUUID().toString();

        return Jwts.builder()
                .id(jti)
                .subject(email)
                .claim("userId", userId)
                .claim("role", role)
                .claim("tenantId", tenantId)
                .claim("displayName", displayName)
                .claim("mustChangePassword", mustChangePassword)
                .claim("isSuperAdmin", isSuperAdmin)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    public String generateToken(String email, String userId, String role, String tenantId, String displayName) {
        return generateToken(email, userId, role, tenantId, displayName, false, false);
    }

    public String extractTokenFromHeader(String header) {
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7).trim();
        }
        return null;
    }

    public boolean validateToken(String token) {
        try {
            Claims claims = getClaims(token);
            return !claims.getExpiration().before(new Date());
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public String extractJti(String token) {
        return getClaims(token).getId();
    }

    public Date extractExpiration(String token) {
        return getClaims(token).getExpiration();
    }

    public String extractSubject(String token) {
        return getClaims(token).getSubject();
    }

    public String extractRole(String token) {
        return getClaims(token).get("role", String.class);
    }

    public String extractUserId(String token) {
        return getClaims(token).get("userId", String.class);
    }

    public String extractTenant(String token) {
        Claims claims = getClaims(token);
        String tenantId = claims.get("tenantId", String.class);
        if (tenantId == null) {
            tenantId = claims.get("tenant", String.class);
        }
        return tenantId;
    }

    public boolean extractMustChangePassword(String token) {
        Boolean val = getClaims(token).get("mustChangePassword", Boolean.class);
        return Boolean.TRUE.equals(val);
    }

    public boolean extractIsSuperAdmin(String token) {
        Boolean val = getClaims(token).get("isSuperAdmin", Boolean.class);
        return Boolean.TRUE.equals(val);
    }

    public Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}

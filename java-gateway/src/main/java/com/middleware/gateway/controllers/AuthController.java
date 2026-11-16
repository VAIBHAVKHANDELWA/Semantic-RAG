package com.middleware.gateway.controllers;

import com.middleware.gateway.dto.ChangePasswordRequestDTO;
import com.middleware.gateway.dto.LoginRequestDTO;
import com.middleware.gateway.dto.LoginResponseDTO;
import com.middleware.gateway.models.ComplianceAuditLog;
import com.middleware.gateway.models.User;
import com.middleware.gateway.repositories.ComplianceAuditLogRepository;
import com.middleware.gateway.repositories.UserRepository;
import com.middleware.gateway.security.JwtUtil;
import com.middleware.gateway.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Date;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 15;
    private static final Pattern PASSWORD_PATTERN = Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d).{10,}$");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final StringRedisTemplate redisTemplate;
    private final ComplianceAuditLogRepository auditLogRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequestDTO request) {
        if (request == null || request.getEmail() == null || request.getPassword() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and password are required"));
        }

        String email = request.getEmail().trim().toLowerCase();
        log.info("Processing login attempt for email: [{}]", email);

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || Boolean.FALSE.equals(user.getActive())) {
            log.warn("Login failed: User not found or inactive for email [{}]", email);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid email or password"));
        }

        OffsetDateTime now = OffsetDateTime.now();

        // Check if account is currently locked out
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(now)) {
            long remainingMinutes = Duration.between(now, user.getLockedUntil()).toMinutes() + 1;
            log.warn("Login rejected: Account locked for email [{}] until {}", email, user.getLockedUntil());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Account locked due to consecutive failed attempts. Try again in " + remainingMinutes + " minute(s)."));
        }

        // Verify password
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            int currentFailures = (user.getFailedLoginAttempts() != null ? user.getFailedLoginAttempts() : 0) + 1;
            user.setFailedLoginAttempts(currentFailures);

            if (currentFailures >= MAX_FAILED_ATTEMPTS) {
                user.setLockedUntil(now.plusMinutes(LOCKOUT_MINUTES));
                log.warn("Account locked for email [{}] due to {} failed attempts", email, currentFailures);
                recordAuditLog(user.getTenantId(), user.getId(), user.getRole(), "LOGIN_LOCKOUT", user.getId(),
                        "Account locked for 15 minutes after " + currentFailures + " failed attempts");
            }
            userRepository.save(user);

            log.warn("Login failed: Password mismatch for email [{}] (failed attempts: {})", email, currentFailures);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid email or password"));
        }

        // Successful login: reset failed attempts and lockout, update lastLoginAt
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setLastLoginAt(now);
        userRepository.save(user);

        boolean mustChange = Boolean.TRUE.equals(user.getMustChangePassword());
        boolean isSuperAdmin = Boolean.TRUE.equals(user.getIsSuperAdmin());

        String token = jwtUtil.generateToken(
                user.getEmail(),
                user.getId(),
                user.getRole(),
                user.getTenantId(),
                user.getDisplayName(),
                mustChange,
                isSuperAdmin
        );

        log.info("Login successful for user [{}] (role: {}, tenant: {})", user.getId(), user.getRole(), user.getTenantId());

        LoginResponseDTO response = LoginResponseDTO.builder()
                .token(token)
                .mustChangePassword(mustChange)
                .user(LoginResponseDTO.UserDTO.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .name(user.getDisplayName())
                        .role(user.getRole())
                        .tenant(user.getTenantId())
                        .isSuperAdmin(isSuperAdmin)
                        .build())
                .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @RequestBody ChangePasswordRequestDTO request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        if (request == null || request.getOldPassword() == null || request.getNewPassword() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Both oldPassword and newPassword are required"));
        }

        User user = userRepository.findByEmail(principal.getUserId()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Current password does not match"));
        }

        String newPassword = request.getNewPassword();
        if (!PASSWORD_PATTERN.matcher(newPassword).matches()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "New password must be at least 10 characters long and contain at least one letter and one digit"
            ));
        }

        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "New password cannot be identical to the current password"
            ));
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);
        userRepository.save(user);

        recordAuditLog(user.getTenantId(), user.getId(), user.getRole(), "PASSWORD_CHANGE", user.getId(),
                "User changed password successfully");

        // Issue a fresh token with mustChangePassword = false
        String newToken = jwtUtil.generateToken(
                user.getEmail(),
                user.getId(),
                user.getRole(),
                user.getTenantId(),
                user.getDisplayName(),
                false,
                Boolean.TRUE.equals(user.getIsSuperAdmin())
        );

        return ResponseEntity.ok(Map.of(
                "message", "Password changed successfully",
                "token", newToken
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        String token = jwtUtil.extractTokenFromHeader(authHeader);

        if (token != null && jwtUtil.validateToken(token)) {
            String jti = jwtUtil.extractJti(token);
            Date expiry = jwtUtil.extractExpiration(token);
            if (jti != null && expiry != null) {
                long remainingMillis = expiry.getTime() - System.currentTimeMillis();
                if (remainingMillis > 0) {
                    redisTemplate.opsForValue().set("token:denylist:" + jti, "revoked", remainingMillis, TimeUnit.MILLISECONDS);
                    log.info("Token jti [{}] successfully added to Redis denylist for {} ms", jti, remainingMillis);
                }
            }
        }

        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    private void recordAuditLog(String tenantId, String actorId, String actorRole, String action, String targetId, String details) {
        try {
            String auditId = "aud-" + UUID.randomUUID().toString().substring(0, 8);
            String prevHash = auditLogRepository.findTopByTenantIdOrderByCreatedAtDesc(tenantId)
                    .map(ComplianceAuditLog::getIntegrityHash)
                    .orElse("0000000000000000000000000000000000000000000000000000000000000000");

            String payload = prevHash + auditId + actorId + action + targetId + details;
            String integrityHash = computeSha256(payload);

            ComplianceAuditLog logEntry = ComplianceAuditLog.builder()
                    .id(auditId)
                    .tenantId(tenantId)
                    .actorId(actorId)
                    .actorRole(actorRole != null ? actorRole : "SYSTEM")
                    .action(action)
                    .targetId(targetId)
                    .details(details)
                    .prevHash(prevHash)
                    .integrityHash(integrityHash)
                    .build();

            auditLogRepository.save(logEntry);
        } catch (Exception e) {
            log.error("Failed to record audit log for action {}: {}", action, e.getMessage());
        }
    }

    private String computeSha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
}


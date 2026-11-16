package com.middleware.gateway.controllers;

import com.middleware.gateway.dto.CreateUserRequestDTO;
import com.middleware.gateway.dto.PatchUserRequestDTO;
import com.middleware.gateway.dto.UserResponseDTO;
import com.middleware.gateway.models.ComplianceAuditLog;
import com.middleware.gateway.models.User;
import com.middleware.gateway.repositories.ComplianceAuditLogRepository;
import com.middleware.gateway.repositories.UserRepository;
import com.middleware.gateway.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.regex.Pattern;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('SYSTEM_ADMIN')")
public class AdminUserController {

    private static final Set<String> ALLOWED_ROLES = Set.of("DATA_STEWARD", "COMPLIANCE_AUDITOR", "SYSTEM_ADMIN");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");
    private static final String TEMP_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ComplianceAuditLogRepository auditLogRepository;

    @GetMapping
    public ResponseEntity<?> listUsers(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        List<User> users;
        if (principal.isSuperAdmin()) {
            users = userRepository.findAllByOrderByCreatedAtDesc();
        } else {
            users = userRepository.findByTenantIdOrderByCreatedAtDesc(principal.getTenant());
        }

        List<UserResponseDTO> response = users.stream().map(this::toResponseDTO).toList();
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<?> createUser(
            @RequestBody CreateUserRequestDTO request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        if (request == null || request.getEmail() == null || request.getDisplayName() == null
                || request.getRole() == null || request.getTenantId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "email, displayName, role, and tenantId are required"));
        }

        String email = request.getEmail().trim().toLowerCase();
        if (!EMAIL_PATTERN.matcher(email).matches()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid email format"));
        }

        String role = request.getRole().trim().toUpperCase();
        if (!ALLOWED_ROLES.contains(role)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Role must be one of: " + ALLOWED_ROLES));
        }

        String targetTenant = request.getTenantId().trim().toUpperCase();

        // Cross-tenant validation: Tenant Admin cannot create users for other tenants
        if (!principal.isSuperAdmin() && !principal.getTenant().equalsIgnoreCase(targetTenant)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error", "Forbidden: SYSTEM_ADMIN can only create users in their own tenant (" + principal.getTenant() + ")"
            ));
        }

        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "A user with this email already exists"));
        }

        String tempPassword = generateTemporaryPassword();
        String passwordHash = passwordEncoder.encode(tempPassword);
        String userId = "usr-" + UUID.randomUUID().toString().substring(0, 8);

        User newUser = User.builder()
                .id(userId)
                .email(email)
                .displayName(request.getDisplayName().trim())
                .role(role)
                .tenantId(targetTenant)
                .passwordHash(passwordHash)
                .active(true)
                .mustChangePassword(true)
                .failedLoginAttempts(0)
                .isSuperAdmin(false)
                .createdBy(principal.getUsername())
                .createdAt(OffsetDateTime.now())
                .build();

        userRepository.save(newUser);

        // Audit log
        String auditDetails = String.format("Created user %s (%s) with role %s in tenant %s",
                userId, email, role, targetTenant);
        recordAuditLog(targetTenant, principal.getUsername(), principal.getRole(), "USER_CREATE", userId, auditDetails);

        UserResponseDTO responseDTO = toResponseDTO(newUser);
        responseDTO.setTemporaryPassword(tempPassword);

        log.info("Admin [{}] created user [{}] in tenant [{}]", principal.getUsername(), userId, targetTenant);
        return ResponseEntity.status(HttpStatus.CREATED).body(responseDTO);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> patchUser(
            @PathVariable("id") String id,
            @RequestBody PatchUserRequestDTO request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }

        // Cross-tenant check
        if (!principal.isSuperAdmin() && !principal.getTenant().equalsIgnoreCase(user.getTenantId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error", "Forbidden: Cannot modify users from another tenant"
            ));
        }

        // Prevent self-disable
        if (user.getEmail().equalsIgnoreCase(principal.getUsername()) && Boolean.FALSE.equals(request.getActive())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Administrators cannot disable their own account"));
        }

        StringBuilder changes = new StringBuilder();

        if (request.getRole() != null) {
            String newRole = request.getRole().trim().toUpperCase();
            if (!ALLOWED_ROLES.contains(newRole)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Role must be one of: " + ALLOWED_ROLES));
            }
            if (!newRole.equals(user.getRole())) {
                changes.append(String.format("Role changed from %s to %s; ", user.getRole(), newRole));
                user.setRole(newRole);
            }
        }

        if (request.getActive() != null && !request.getActive().equals(user.getActive())) {
            changes.append(String.format("Status changed from %s to %s; ",
                    Boolean.TRUE.equals(user.getActive()) ? "ACTIVE" : "DISABLED",
                    Boolean.TRUE.equals(request.getActive()) ? "ACTIVE" : "DISABLED"));
            user.setActive(request.getActive());
        }

        if (changes.length() == 0) {
            return ResponseEntity.ok(toResponseDTO(user));
        }

        userRepository.save(user);

        // Audit log
        recordAuditLog(user.getTenantId(), principal.getUsername(), principal.getRole(), "USER_UPDATE", user.getId(), changes.toString());
        log.info("Admin [{}] updated user [{}]: {}", principal.getUsername(), user.getId(), changes);

        return ResponseEntity.ok(toResponseDTO(user));
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<?> resetPassword(
            @PathVariable("id") String id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }

        // Cross-tenant check
        if (!principal.isSuperAdmin() && !principal.getTenant().equalsIgnoreCase(user.getTenantId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "error", "Forbidden: Cannot reset password for users from another tenant"
            ));
        }

        String tempPassword = generateTemporaryPassword();
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        user.setMustChangePassword(true);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        String details = "Password reset by admin " + principal.getUsername() + "; forced change enabled";
        recordAuditLog(user.getTenantId(), principal.getUsername(), principal.getRole(), "USER_PASSWORD_RESET", user.getId(), details);
        log.info("Admin [{}] reset password for user [{}]", principal.getUsername(), user.getId());

        UserResponseDTO responseDTO = toResponseDTO(user);
        responseDTO.setTemporaryPassword(tempPassword);

        return ResponseEntity.ok(responseDTO);
    }

    private UserResponseDTO toResponseDTO(User user) {
        return UserResponseDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .role(user.getRole())
                .tenantId(user.getTenantId())
                .active(user.getActive())
                .mustChangePassword(user.getMustChangePassword())
                .failedLoginAttempts(user.getFailedLoginAttempts())
                .lockedUntil(user.getLockedUntil())
                .lastLoginAt(user.getLastLoginAt())
                .createdBy(user.getCreatedBy())
                .isSuperAdmin(user.getIsSuperAdmin())
                .createdAt(user.getCreatedAt())
                .build();
    }

    private String generateTemporaryPassword() {
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder();
        // Ensure at least one upper, one lower, one digit, one special
        sb.append("A");
        sb.append("a");
        sb.append(random.nextInt(10));
        sb.append("!");
        for (int i = 0; i < 8; i++) {
            sb.append(TEMP_PASSWORD_CHARS.charAt(random.nextInt(TEMP_PASSWORD_CHARS.length())));
        }
        return sb.toString();
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
                    .actorRole(actorRole != null ? actorRole : "SYSTEM_ADMIN")
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

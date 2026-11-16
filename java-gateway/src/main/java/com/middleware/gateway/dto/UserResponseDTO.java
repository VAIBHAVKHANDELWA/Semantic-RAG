package com.middleware.gateway.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponseDTO {
    private String id;
    private String email;
    private String displayName;
    private String role;
    private String tenantId;
    private Boolean active;
    private Boolean mustChangePassword;
    private Integer failedLoginAttempts;
    private OffsetDateTime lockedUntil;
    private OffsetDateTime lastLoginAt;
    private String createdBy;
    private Boolean isSuperAdmin;
    private OffsetDateTime createdAt;

    // Returned only ONCE when created or reset
    private String temporaryPassword;
}

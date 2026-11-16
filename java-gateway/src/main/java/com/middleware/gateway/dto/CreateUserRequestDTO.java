package com.middleware.gateway.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateUserRequestDTO {
    private String email;
    private String displayName;
    private String role;     // DATA_STEWARD, COMPLIANCE_AUDITOR, SYSTEM_ADMIN
    private String tenantId; // HR, FINANCE, LEGAL, ENGINEERING
}

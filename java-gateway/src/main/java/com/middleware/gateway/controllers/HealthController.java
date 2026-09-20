package com.middleware.gateway.controllers;

import com.middleware.gateway.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class HealthController {

    /**
     * Public Health Endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }

    /**
     * Protected Health Endpoint - Demonstrates RBAC Claims Extraction
     */
    @GetMapping("/secure-health")
    public ResponseEntity<Map<String, String>> secureHealthCheck(Authentication authentication) {
        String tenant = "UNKNOWN";
        String role = "UNKNOWN";

        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            tenant = principal.getTenant();
            role = principal.getRole();
        }

        return ResponseEntity.ok(Map.of(
                "message", "Secure access granted",
                "tenant", tenant,
                "role", role
        ));
    }
}

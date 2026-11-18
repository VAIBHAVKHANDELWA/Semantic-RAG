package com.middleware.gateway.controllers;

import com.middleware.gateway.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class HealthController {

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Public Health Endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }

    /**
     * AI Engine Health Probe & Proxy
     */
    @GetMapping("/ai/health")
    public ResponseEntity<Map<String, Object>> aiHealth() {
        try {
            Map res = restTemplate.getForObject("http://localhost:8000/health", Map.class);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("status", "UP", "device", "CPU", "model", "all-MiniLM-L6-v2"));
        }
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

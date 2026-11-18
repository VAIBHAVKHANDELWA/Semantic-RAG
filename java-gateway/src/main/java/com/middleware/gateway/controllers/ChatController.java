package com.middleware.gateway.controllers;

import com.middleware.gateway.security.UserPrincipal;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ChatController {

    private final RestTemplate restTemplate = new RestTemplate();

    @Data
    public static class ChatRequest {
        private String question;
        private Integer top_k;
        private String asOfDate;
        private String tenantId;
    }

    /**
     * FEATURE: "ASK THE POLICIES" RAG CHATBOT (CURRENT-POLICY-ONLY)
     * Queries Python AI Engine strictly for ACTIVE chunks scoped to the caller's tenant.
     */
    @PostMapping("/chat")
    public ResponseEntity<Map<String, Object>> chatWithPolicies(
            @RequestBody ChatRequest request,
            Authentication authentication
    ) {
        if (request == null || request.getQuestion() == null || request.getQuestion().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Question is required and cannot be empty");
        }

        String tenantId = "HR";
        String role = "DATA_STEWARD";
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            tenantId = principal.getTenant();
            role = principal.getRole();
        }

        // If SYSTEM_ADMIN or requestedTenant is specified by Admin
        if ("SYSTEM_ADMIN".equalsIgnoreCase(role)) {
            tenantId = (request.getTenantId() != null && !request.getTenantId().isBlank()) ? request.getTenantId() : "ALL";
        } else if ("GLOBAL".equalsIgnoreCase(tenantId) || "ALL".equalsIgnoreCase(tenantId)) {
            tenantId = (request.getTenantId() != null && !request.getTenantId().isBlank()) ? request.getTenantId() : "ALL";
        }

        Map<String, Object> pythonPayload = new HashMap<>();
        pythonPayload.put("tenantId", tenantId.toUpperCase());
        pythonPayload.put("question", request.getQuestion().trim());
        pythonPayload.put("top_k", request.getTop_k() != null ? request.getTop_k() : 5);
        if (request.getAsOfDate() != null && !request.getAsOfDate().isBlank()) {
            pythonPayload.put("asOfDate", request.getAsOfDate().trim());
        }

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> response = restTemplate.postForObject(
                    "http://localhost:8000/api/v1/chat",
                    pythonPayload,
                    Map.class
            );
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error communicating with Python AI Engine chat service: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "AI Chat Engine error: " + e.getMessage());
        }
    }
}

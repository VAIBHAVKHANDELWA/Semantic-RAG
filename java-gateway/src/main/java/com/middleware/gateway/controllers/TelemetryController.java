package com.middleware.gateway.controllers;

import com.middleware.gateway.security.UserPrincipal;
import com.middleware.gateway.services.SseConnectionManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Slf4j
@RestController
@RequestMapping("/api/v1/telemetry")
@RequiredArgsConstructor
public class TelemetryController {

    private final SseConnectionManager sseConnectionManager;

    /**
     * Endpoint: GET /api/v1/telemetry/stream
     * Establishes a real-time Server-Sent Events (SSE) stream for the user's tenant scope.
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("isAuthenticated()")
    public SseEmitter streamTelemetry(Authentication authentication) {
        String tenantId = "GLOBAL";
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            tenantId = principal.getTenant();
        }

        log.info("Establishing real-time SSE stream for Tenant [{}]", tenantId);
        return sseConnectionManager.addEmitter(tenantId);
    }
}

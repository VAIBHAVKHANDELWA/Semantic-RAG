package com.middleware.gateway.controllers;

import com.middleware.gateway.repositories.ComplianceAuditLogRepository;
import com.middleware.gateway.repositories.IngestionJobRepository;
import com.middleware.gateway.repositories.QuarantineConflictRepository;
import com.middleware.gateway.security.UserPrincipal;
import com.middleware.gateway.services.SseConnectionManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/telemetry")
@RequiredArgsConstructor
public class TelemetryController {

    private final SseConnectionManager sseConnectionManager;
    private final StringRedisTemplate redisTemplate;
    private final QuarantineConflictRepository conflictRepository;
    private final IngestionJobRepository ingestionJobRepository;
    private final ComplianceAuditLogRepository auditLogRepository;

    /**
     * Endpoint 1: GET /api/v1/telemetry/stream
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

    /**
     * Endpoint 2: GET /api/v1/telemetry/stats
     * Returns real aggregated platform numbers from PostgreSQL and Redis metrics for the tenant.
     */
    @GetMapping("/stats")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getTelemetryStats(Authentication authentication) {
        String tenantId = "GLOBAL";
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            tenantId = principal.getTenant();
        }

        long pendingConflicts = conflictRepository.countByTenantIdAndStatus(tenantId, "PENDING");
        long totalJobs = ingestionJobRepository.countByTenantId(tenantId);
        long auditCount = auditLogRepository.countByTenantId(tenantId);

        String processedStr = redisTemplate.opsForValue().get("metrics:processed_total");
        String dedupStr = redisTemplate.opsForValue().get("metrics:dedup_pruned:total");
        String quarantinedStr = redisTemplate.opsForValue().get("metrics:quarantined_total");
        String dlqStr = redisTemplate.opsForValue().get("metrics:dlq_total");
        String latencyStr = redisTemplate.opsForValue().get("metrics:last_extraction_latency_ms");

        Map<String, Object> stats = new HashMap<>();
        stats.put("tenantId", tenantId);
        stats.put("pendingConflicts", pendingConflicts);
        stats.put("totalIngestionJobs", totalJobs);
        stats.put("auditLogEntries", auditCount);
        stats.put("processedTotal", processedStr != null ? Long.parseLong(processedStr) : 0L);
        stats.put("duplicatesPrunedTotal", dedupStr != null ? Long.parseLong(dedupStr) : 0L);
        stats.put("quarantinedTotal", quarantinedStr != null ? Long.parseLong(quarantinedStr) : 0L);
        stats.put("dlqTotal", dlqStr != null ? Long.parseLong(dlqStr) : 0L);
        stats.put("lastExtractionLatencyMs", latencyStr != null ? Double.parseDouble(latencyStr) : 0.0);

        return ResponseEntity.ok(stats);
    }
}

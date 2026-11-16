package com.middleware.gateway.controllers;

import com.middleware.gateway.dto.ConflictResolutionRequestDTO;
import com.middleware.gateway.models.ComplianceAuditLog;
import com.middleware.gateway.models.ProvenanceEdge;
import com.middleware.gateway.models.QuarantineConflict;
import com.middleware.gateway.security.UserPrincipal;
import com.middleware.gateway.services.GovernanceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class GovernanceController {

    private final GovernanceService governanceService;

    /**
     * Endpoint 1: GET /api/v1/quarantine/pending
     * Retrieves all pending quarantine conflicts strictly isolated to the user's tenant.
     */
    @GetMapping("/quarantine/pending")
    @PreAuthorize("hasAnyRole('DATA_STEWARD', 'SYSTEM_ADMIN')")
    public ResponseEntity<List<QuarantineConflict>> getPendingConflicts(Authentication authentication) {
        String tenantId = extractTenant(authentication);
        return ResponseEntity.ok(governanceService.getPendingConflicts(tenantId));
    }

    /**
     * Endpoint 2: GET /api/v1/quarantine/{id}
     * Retrieves detail view for a specific quarantine conflict.
     */
    @GetMapping("/quarantine/{id}")
    @PreAuthorize("hasAnyRole('DATA_STEWARD', 'SYSTEM_ADMIN')")
    public ResponseEntity<QuarantineConflict> getConflictDetail(
            @PathVariable("id") String id,
            Authentication authentication
    ) {
        String tenantId = extractTenant(authentication);
        return ResponseEntity.ok(governanceService.getConflictById(id, tenantId));
    }

    /**
     * Endpoint 3: POST /api/v1/quarantine/{id}/resolve
     * Resolves a quarantine conflict, records hash-chained audit log, and writes provenance edge.
     */
    @PostMapping("/quarantine/{id}/resolve")
    @PreAuthorize("hasRole('DATA_STEWARD')")
    public ResponseEntity<QuarantineConflict> resolveConflict(
            @PathVariable("id") String id,
            @RequestBody ConflictResolutionRequestDTO request,
            Authentication authentication
    ) {
        String tenantId = extractTenant(authentication);
        String actorId = extractUserId(authentication);
        String actorRole = extractRole(authentication);

        if (request.getReason() == null || request.getReason().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Resolution reason is required and cannot be empty");
        }

        QuarantineConflict resolved = governanceService.resolveConflict(
                id,
                tenantId,
                actorId,
                actorRole,
                request.getAction(),
                request.getReason(),
                request.getMergedText()
        );
        return ResponseEntity.ok(resolved);
    }

    /**
     * Endpoint 4: GET /api/v1/audit/logs
     * Returns compliance audit log history for the tenant.
     */
    @GetMapping("/audit/logs")
    @PreAuthorize("hasAnyRole('COMPLIANCE_AUDITOR', 'SYSTEM_ADMIN')")
    public ResponseEntity<List<ComplianceAuditLog>> getAuditLogs(Authentication authentication) {
        String tenantId = extractTenant(authentication);
        return ResponseEntity.ok(governanceService.getAuditLogs(tenantId));
    }

    /**
     * Endpoint 5: GET /api/v1/audit/verify
     * Recomputes and verifies the cryptographic SHA-256 integrity hash chain.
     */
    @GetMapping("/audit/verify")
    @PreAuthorize("hasAnyRole('COMPLIANCE_AUDITOR', 'SYSTEM_ADMIN')")
    public ResponseEntity<Map<String, Object>> verifyAuditChain(Authentication authentication) {
        String tenantId = extractTenant(authentication);
        return ResponseEntity.ok(governanceService.verifyAuditChain(tenantId));
    }

    /**
     * Endpoint 6: GET /api/v1/provenance/{conflictId}
     * Fetches provenance edges for lineage graph rendering.
     */
    @GetMapping("/provenance/{conflictId}")
    @PreAuthorize("hasAnyRole('DATA_STEWARD', 'SYSTEM_ADMIN')")
    public ResponseEntity<List<ProvenanceEdge>> getProvenanceEdges(
            @PathVariable("conflictId") String conflictId,
            Authentication authentication
    ) {
        String tenantId = extractTenant(authentication);
        return ResponseEntity.ok(governanceService.getProvenanceEdges(conflictId, tenantId));
    }

    private String extractTenant(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            String tenant = principal.getTenant();
            if (tenant != null && !tenant.trim().isEmpty() && !"GLOBAL".equalsIgnoreCase(tenant) && !"ALL".equalsIgnoreCase(tenant)) {
                return tenant.trim().toUpperCase();
            }
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access Denied: Missing or invalid tenant in JWT token");
    }

    private String extractUserId(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getUsername();
        }
        return "system";
    }

    private String extractRole(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getRole();
        }
        return "UNKNOWN";
    }
}

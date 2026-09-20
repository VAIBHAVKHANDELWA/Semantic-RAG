package com.middleware.gateway.controllers;

import com.middleware.gateway.dto.ResolutionRequestDTO;
import com.middleware.gateway.models.QuarantineItem;
import com.middleware.gateway.security.UserPrincipal;
import com.middleware.gateway.services.QuarantineService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/quarantine")
@RequiredArgsConstructor
public class QuarantineController {

    private final QuarantineService quarantineService;

    /**
     * Endpoint 1: GET /api/v1/quarantine/pending
     * Retrieves all pending quarantine conflicts strictly isolated to the authenticated user's tenant.
     */
    @GetMapping("/pending")
    public ResponseEntity<List<QuarantineItem>> getPendingConflicts(Authentication authentication) {
        String tenantId = extractTenantFromAuth(authentication);
        log.info("REST Request: GET /api/v1/quarantine/pending for Tenant [{}]", tenantId);

        List<QuarantineItem> pendingList = quarantineService.getPendingConflicts(tenantId);
        return ResponseEntity.ok(pendingList);
    }

    /**
     * Endpoint 2: POST /api/v1/quarantine/{itemId}/resolve
     * Submits a human resolution choice ("KEEP_A" or "ACCEPT_B") for a conflict item.
     */
    @PostMapping("/{itemId}/resolve")
    public ResponseEntity<Map<String, Object>> resolveConflict(
            @PathVariable("itemId") Long itemId,
            @RequestBody ResolutionRequestDTO requestBody,
            Authentication authentication
    ) {
        String tenantId = extractTenantFromAuth(authentication);
        String choice = (requestBody != null && requestBody.getChoice() != null) ? requestBody.getChoice() : "KEEP_A";

        log.info("REST Request: POST /api/v1/quarantine/{}/resolve with Choice [{}] for Tenant [{}]",
                itemId, choice, tenantId);

        quarantineService.resolveConflict(itemId, tenantId, choice);

        return ResponseEntity.ok(Map.of(
                "message", "Conflict resolved.",
                "itemId", itemId,
                "tenantId", tenantId,
                "status", "RESOLVED_" + choice.toUpperCase()
        ));
    }

    private String extractTenantFromAuth(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getTenant();
        }
        return "GLOBAL";
    }
}

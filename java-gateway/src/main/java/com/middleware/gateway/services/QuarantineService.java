package com.middleware.gateway.services;

import com.middleware.gateway.models.QuarantineItem;
import com.middleware.gateway.repositories.QuarantineItemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class QuarantineService {

    private final QuarantineItemRepository repository;

    /**
     * Retrieves pending quarantine conflicts filtered by tenant isolation scope.
     */
    @Transactional(readOnly = true)
    public List<QuarantineItem> getPendingConflicts(String tenantId) {
        String sanitizedTenant = (tenantId == null || tenantId.isBlank()) ? "GLOBAL" : tenantId.trim().toUpperCase();

        if ("GLOBAL".equals(sanitizedTenant) || "ALL".equals(sanitizedTenant)) {
            log.info("Fetching all pending quarantine conflicts under Global Multi-Tenant scope.");
            return repository.findByStatus("PENDING");
        }

        log.info("Fetching pending quarantine conflicts strictly isolated for Tenant [{}]", sanitizedTenant);
        return repository.findByTenantIdAndStatus(sanitizedTenant, "PENDING");
    }

    /**
     * Submits a human resolution choice ("KEEP_A" or "ACCEPT_B") for a quarantined conflict.
     * Enforces strict tenant ownership checks.
     */
    @Transactional
    public void resolveConflict(Long itemId, String tenantId, String resolutionChoice) {
        String sanitizedTenant = (tenantId == null || tenantId.isBlank()) ? "GLOBAL" : tenantId.trim().toUpperCase();

        log.info("Attempting resolution [{}] for Quarantine Item [{}] by Tenant [{}]", resolutionChoice, itemId, sanitizedTenant);

        QuarantineItem item = repository.findById(itemId)
                .orElseThrow(() -> new IllegalArgumentException("Quarantine item not found with ID: " + itemId));

        // SECURITY CHECK: Verify tenant ownership unless user operates in GLOBAL scope
        if (!"GLOBAL".equals(sanitizedTenant) && !"ALL".equals(sanitizedTenant)) {
            if (!item.getTenantId().equalsIgnoreCase(sanitizedTenant)) {
                log.error("SECURITY VIOLATION: User from Tenant [{}] attempted to resolve Conflict [{}] owned by Tenant [{}]",
                        sanitizedTenant, itemId, item.getTenantId());
                throw new AccessDeniedException("Access Denied: You do not have permission to resolve conflicts for tenant " + item.getTenantId());
            }
        }

        String normalizedChoice = (resolutionChoice != null) ? resolutionChoice.trim().toUpperCase() : "KEEP_A";
        item.setStatus("RESOLVED_" + normalizedChoice);

        repository.save(item);

        log.info("Successfully updated Quarantine Item [{}] status to [{}] for Tenant [{}]", itemId, item.getStatus(), sanitizedTenant);
    }
}

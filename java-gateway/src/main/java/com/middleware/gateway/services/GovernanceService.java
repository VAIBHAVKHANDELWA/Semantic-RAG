package com.middleware.gateway.services;

import com.middleware.gateway.models.ComplianceAuditLog;
import com.middleware.gateway.models.ProvenanceEdge;
import com.middleware.gateway.models.QuarantineConflict;
import com.middleware.gateway.repositories.ComplianceAuditLogRepository;
import com.middleware.gateway.repositories.ProvenanceEdgeRepository;
import com.middleware.gateway.repositories.QuarantineConflictRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class GovernanceService {

    private final QuarantineConflictRepository conflictRepository;
    private final ComplianceAuditLogRepository auditLogRepository;
    private final ProvenanceEdgeRepository provenanceRepository;
    private final SseConnectionManager sseConnectionManager;

    @Transactional(readOnly = true)
    public List<QuarantineConflict> getPendingConflicts(String tenantId) {
        return conflictRepository.findByTenantIdAndStatusOrderByCreatedAtDesc(tenantId, "PENDING");
    }

    @Transactional(readOnly = true)
    public QuarantineConflict getConflictById(String conflictId, String tenantId) {
        return conflictRepository.findByIdAndTenantId(conflictId, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Quarantine item not found"));
    }

    @Transactional
    public QuarantineConflict resolveConflict(
            String conflictId,
            String tenantId,
            String actorId,
            String actorRole,
            String action,
            String mergedText
    ) {
        QuarantineConflict conflict = getConflictById(conflictId, tenantId);

        String normalizedAction = (action != null) ? action.trim().toUpperCase() : "KEEP_EXISTING";
        conflict.setStatus("RESOLVED_" + normalizedAction);
        conflict.setResolutionAction(normalizedAction);
        conflict.setResolvedBy(actorId);
        conflict.setResolvedAt(LocalDateTime.now());
        conflictRepository.save(conflict);

        // 1. Provenance edge
        String edgeId = "pe-" + UUID.randomUUID().toString().substring(0, 8);
        ProvenanceEdge edge = ProvenanceEdge.builder()
                .id(edgeId)
                .tenantId(tenantId)
                .fromChunkId(conflict.getExistingChunkId() != null ? conflict.getExistingChunkId() : "root-baseline")
                .toChunkId(conflict.getId())
                .relation(mapActionToRelation(normalizedAction))
                .createdByConflictId(conflict.getId())
                .build();
        provenanceRepository.save(edge);

        // 2. Hash-Chained Compliance Audit Log
        String auditId = "aud-" + UUID.randomUUID().toString().substring(0, 8);
        String prevHash = auditLogRepository.findTopByTenantIdOrderByCreatedAtDesc(tenantId)
                .map(ComplianceAuditLog::getIntegrityHash)
                .orElse("0000000000000000000000000000000000000000000000000000000000000000");

        String details = String.format("Resolved conflict %s via %s by %s. Target: %s",
                conflictId, normalizedAction, actorId, conflict.getDocumentId());

        String hashPayload = prevHash + auditId + actorId + ("RESOLVE_" + normalizedAction) + conflictId + details;
        String integrityHash = computeSha256(hashPayload);

        ComplianceAuditLog auditLog = ComplianceAuditLog.builder()
                .id(auditId)
                .tenantId(tenantId)
                .actorId(actorId)
                .actorRole(actorRole)
                .action("RESOLVE_" + normalizedAction)
                .targetId(conflictId)
                .details(details)
                .prevHash(prevHash)
                .integrityHash(integrityHash)
                .build();
        auditLogRepository.save(auditLog);

        // 3. Emit real-time SSE event to the tenant channel
        sseConnectionManager.broadcast(tenantId, "CONFLICT_RESOLVED", Map.of(
                "conflictId", conflictId,
                "action", normalizedAction,
                "resolvedBy", actorId,
                "auditId", auditId,
                "integrityHash", integrityHash
        ));

        log.info("Conflict [{}] resolved with action [{}] for Tenant [{}] by [{}]. Audit ID: [{}]",
                conflictId, normalizedAction, tenantId, actorId, auditId);

        return conflict;
    }

    @Transactional(readOnly = true)
    public List<ComplianceAuditLog> getAuditLogs(String tenantId) {
        return auditLogRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> verifyAuditChain(String tenantId) {
        List<ComplianceAuditLog> logs = auditLogRepository.findByTenantIdOrderByCreatedAtAsc(tenantId);
        Map<String, Object> result = new HashMap<>();

        if (logs.isEmpty()) {
            result.put("verified", true);
            result.put("totalEntries", 0);
            result.put("message", "Audit log chain is empty; genesis valid.");
            return result;
        }

        String expectedPrevHash = "0000000000000000000000000000000000000000000000000000000000000000";
        for (int i = 0; i < logs.size(); i++) {
            ComplianceAuditLog logEntry = logs.get(i);

            // Verify prevHash linkage
            if (i > 0 && !logEntry.getPrevHash().equalsIgnoreCase(expectedPrevHash)) {
                result.put("verified", false);
                result.put("tamperedAt", logEntry.getId());
                result.put("index", i);
                result.put("reason", "Broken prev_hash chain link");
                return result;
            }

            // Verify cryptographic SHA-256 payload integrity
            String expectedPayload = logEntry.getPrevHash() + logEntry.getId() + logEntry.getActorId()
                    + logEntry.getAction() + logEntry.getTargetId() + logEntry.getDetails();
            String recalculated = computeSha256(expectedPayload);

            if (!recalculated.equalsIgnoreCase(logEntry.getIntegrityHash())) {
                result.put("verified", false);
                result.put("tamperedAt", logEntry.getId());
                result.put("index", i);
                result.put("reason", "SHA-256 checksum mismatch (row data altered)");
                return result;
            }

            expectedPrevHash = logEntry.getIntegrityHash();
        }

        result.put("verified", true);
        result.put("totalEntries", logs.size());
        result.put("headHash", expectedPrevHash);
        result.put("message", "Cryptographic audit chain completely verified.");
        return result;
    }

    @Transactional(readOnly = true)
    public List<ProvenanceEdge> getProvenanceEdges(String conflictId, String tenantId) {
        return provenanceRepository.findByTenantIdAndCreatedByConflictId(tenantId, conflictId);
    }

    private String mapActionToRelation(String action) {
        return switch (action) {
            case "PROMOTED_INCOMING" -> "SUPERSEDES";
            case "KEEP_EXISTING" -> "REJECTED_AS_CONTRADICTORY";
            case "MANUALLY_MERGED" -> "PARTIAL_UPDATE_OF";
            default -> "DERIVED_FROM";
        };
    }

    private String computeSha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encodedhash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(2 * encodedhash.length);
            for (byte b : encodedhash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm missing from JVM", e);
        }
    }
}

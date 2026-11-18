package com.middleware.gateway.services;

import com.middleware.gateway.models.ComplianceAuditLog;
import com.middleware.gateway.models.ProvenanceEdge;
import com.middleware.gateway.models.QuarantineConflict;
import com.middleware.gateway.models.VectorChunk;
import com.middleware.gateway.repositories.ComplianceAuditLogRepository;
import com.middleware.gateway.repositories.ProvenanceEdgeRepository;
import com.middleware.gateway.repositories.QuarantineConflictRepository;
import com.middleware.gateway.repositories.VectorChunkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
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
    private final VectorChunkRepository vectorChunkRepository;
    private final SseConnectionManager sseConnectionManager;
    private final RestTemplate restTemplate = new RestTemplate();

    @Transactional(readOnly = true)
    public List<QuarantineConflict> getPendingConflicts(String tenantId) {
        if (tenantId == null || "ALL".equalsIgnoreCase(tenantId)) {
            return conflictRepository.findByStatusOrderByCreatedAtDesc("PENDING");
        }
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
            String reason,
            String mergedText
    ) {
        QuarantineConflict conflict = getConflictById(conflictId, tenantId);

        String normalizedAction = (action != null) ? action.trim().toUpperCase() : "KEEP_EXISTING";
        if ("APPROVE".equalsIgnoreCase(normalizedAction) || "PROMOTE_INCOMING".equalsIgnoreCase(normalizedAction)) {
            normalizedAction = "PROMOTED_INCOMING";
        } else if ("REJECT".equalsIgnoreCase(normalizedAction) || "REJECT_INCOMING".equalsIgnoreCase(normalizedAction)) {
            normalizedAction = "REJECT_INCOMING";
        } else if ("MANUAL_MERGE".equalsIgnoreCase(normalizedAction) || "MANUALLY_MERGED".equalsIgnoreCase(normalizedAction)) {
            normalizedAction = "MANUALLY_MERGED";
        } else if ("KEEP".equalsIgnoreCase(normalizedAction) || "KEEP_EXISTING".equalsIgnoreCase(normalizedAction)) {
            normalizedAction = "KEEP_EXISTING";
        }

        conflict.setStatus(normalizedAction);
        conflict.setResolutionAction(normalizedAction);
        conflict.setResolvedBy(actorId);
        conflict.setResolvedAt(LocalDateTime.now());
        conflictRepository.save(conflict);

        // Soft-archive existing vector chunk when incoming policy is promoted
        if ("PROMOTED_INCOMING".equals(normalizedAction)) {
            if (conflict.getExistingChunkId() != null) {
                vectorChunkRepository.findById(conflict.getExistingChunkId()).ifPresent(chunk -> {
                    chunk.setStatus("ARCHIVED");
                    chunk.setSupersededBy(conflict.getId());
                    vectorChunkRepository.save(chunk);
                    log.info("Soft-archived superseded vector chunk [{}] in PostgreSQL pgvector", chunk.getId());
                });
            }
            try {
                restTemplate.postForEntity(
                        "http://localhost:8000/api/v1/quarantine/promote",
                        Map.of("conflictId", conflictId, "tenantId", tenantId),
                        Map.class
                );
                log.info("Notified Python AI Engine of conflict [{}] promotion for tenant [{}]", conflictId, tenantId);
            } catch (Exception e) {
                log.warn("Failed to notify Python AI Engine of conflict promotion: {}", e.getMessage());
            }
        } else if ("KEEP_EXISTING".equals(normalizedAction) || "REJECT_INCOMING".equals(normalizedAction)) {
            try {
                restTemplate.postForEntity(
                        "http://localhost:8000/api/v1/quarantine/keep",
                        Map.of("conflictId", conflictId, "tenantId", tenantId),
                        Map.class
                );
                log.info("Notified Python AI Engine of conflict [{}] keep/rejection for tenant [{}]", conflictId, tenantId);
            } catch (Exception e) {
                log.warn("Failed to notify Python AI Engine of conflict keep: {}", e.getMessage());
            }
        }

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

        String details = String.format("Resolved conflict %s via %s (Reason: %s) by %s. Target: %s",
                conflictId, normalizedAction, reason.trim(), actorId, conflict.getDocumentId());

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
                result.put("firstBrokenEntry", Map.of(
                        "id", logEntry.getId(),
                        "index", i,
                        "tenantId", tenantId,
                        "actualPrevHash", logEntry.getPrevHash(),
                        "expectedPrevHash", expectedPrevHash,
                        "reason", "Broken prev_hash chain link"
                ));
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
                result.put("firstBrokenEntry", Map.of(
                        "id", logEntry.getId(),
                        "index", i,
                        "tenantId", tenantId,
                        "storedHash", logEntry.getIntegrityHash(),
                        "recalculatedHash", recalculated,
                        "reason", "SHA-256 checksum mismatch (row data altered)"
                ));
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
        if ("GLOBAL".equalsIgnoreCase(tenantId) || "ALL".equalsIgnoreCase(tenantId)) {
            return provenanceRepository.findByCreatedByConflictId(conflictId);
        }
        return provenanceRepository.findByTenantIdAndCreatedByConflictId(tenantId, conflictId);
    }

    private String mapActionToRelation(String action) {
        return switch (action) {
            case "PROMOTED_INCOMING" -> "SUPERSEDES";
            case "KEEP_EXISTING", "REJECT_INCOMING" -> "CONTRADICTS";
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

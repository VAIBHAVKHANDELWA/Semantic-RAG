package com.middleware.gateway.controllers;

import com.middleware.gateway.dto.IngestionCompleteRequestDTO;
import com.middleware.gateway.dto.ParsedDocumentDTO;
import com.middleware.gateway.dto.UploadTicketResponseDTO;
import com.middleware.gateway.models.IngestionJob;
import com.middleware.gateway.repositories.IngestionJobRepository;
import com.middleware.gateway.security.UserPrincipal;
import com.middleware.gateway.services.DocumentParserService;
import com.middleware.gateway.services.RabbitMqPublisherService;
import com.middleware.gateway.services.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/ingest")
@RequiredArgsConstructor
public class IngestionController {

    private final StorageService storageService;
    private final DocumentParserService documentParserService;
    private final IngestionJobRepository ingestionJobRepository;
    private final RabbitMqPublisherService rabbitMqPublisherService;
    private final StringRedisTemplate redisTemplate;

    /**
     * Endpoint 1: GET /api/v1/ingest/upload-ticket?fileName=...
     * Generates a 15-minute Direct-to-Cloud MinIO/S3 Presigned Upload URL enforcing tenant isolation from JWT.
     */
    @GetMapping("/upload-ticket")
    @PreAuthorize("hasRole('DATA_STEWARD')")
    public ResponseEntity<UploadTicketResponseDTO> getUploadTicket(
            @RequestParam("fileName") String fileName,
            Authentication authentication
    ) {
        String tenantId = extractTenant(authentication);
        log.info("Received request for S3 upload ticket. File: [{}], Tenant: [{}]", fileName, tenantId);

        UploadTicketResponseDTO ticket = storageService.generatePresignedUploadTicket(fileName, tenantId);
        return ResponseEntity.ok(ticket);
    }

    /**
     * Endpoint 2: POST /api/v1/ingest/complete
     * Creates an ingestion job row in PostgreSQL and dispatches the task to RabbitMQ raw-document-queue.
     */
    @PostMapping("/complete")
    @PreAuthorize("hasRole('DATA_STEWARD')")
    public ResponseEntity<Map<String, Object>> completeIngestion(
            @RequestBody IngestionCompleteRequestDTO request,
            Authentication authentication
    ) {
        String tenantId = extractTenant(authentication);
        String userId = extractUserId(authentication);

        if (request.getObjectKey() == null || request.getObjectKey().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "objectKey is required");
        }

        // Validate cross-tenant target if explicitly supplied
        if (request.getTenantId() != null && !request.getTenantId().trim().isEmpty() && !request.getTenantId().trim().equalsIgnoreCase(tenantId)) {
            log.error("Tenant isolation violation: User from Tenant [{}] attempted to complete ingestion for Tenant [{}]", tenantId, request.getTenantId());
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cross-tenant ingestion is strictly prohibited");
        }

        // Validate that objectKey belongs strictly to the authenticated tenant
        String expectedPrefix = "uploads/" + tenantId + "/";
        if (!request.getObjectKey().startsWith(expectedPrefix)) {
            log.error("Tenant isolation violation: User from Tenant [{}] submitted objectKey [{}]", tenantId, request.getObjectKey());
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Object key does not belong to your tenant namespace");
        }

        String jobId = "job-" + UUID.randomUUID().toString().substring(0, 8);
        String fileName = request.getFileName() != null ? request.getFileName() : request.getObjectKey().substring(request.getObjectKey().lastIndexOf('/') + 1);

        IngestionJob job = IngestionJob.builder()
                .id(jobId)
                .tenantId(tenantId)
                .uploadedBy(userId)
                .objectKey(request.getObjectKey())
                .fileName(fileName)
                .status("QUEUED")
                .chunkTotal(0)
                .chunksCommitted(0)
                .chunksQuarantined(0)
                .build();

        ingestionJobRepository.save(job);
        log.info("Persisted IngestionJob [{}] for Tenant [{}] (File: {})", jobId, tenantId, fileName);

        // Publish to RabbitMQ raw-document-queue
        rabbitMqPublisherService.publishIngestionJob(jobId, tenantId, request.getObjectKey());

        // Invalidate tenant Redis query cache so subsequent queries reflect incoming ingestion changes
        try {
            if (redisTemplate != null) {
                java.util.Set<String> queryKeys = redisTemplate.keys("rag:query:" + tenantId + ":*");
                if (queryKeys != null && !queryKeys.isEmpty()) {
                    redisTemplate.delete(queryKeys);
                    log.info("Invalidated {} cached query entries for Tenant [{}] on ingest complete", queryKeys.size(), tenantId);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to invalidate query cache for Tenant [{}]: {}", tenantId, e.getMessage());
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "jobId", jobId,
                "tenantId", tenantId,
                "status", "QUEUED",
                "message", "Ingestion job created and queued for AI worker processing."
        ));
    }

    /**
     * Endpoint 3: GET /api/v1/ingest/jobs
     * Lists ingestion jobs strictly scoped to the authenticated tenant.
     */
    @GetMapping("/jobs")
    @PreAuthorize("hasAnyRole('DATA_STEWARD', 'SYSTEM_ADMIN')")
    public ResponseEntity<List<IngestionJob>> getIngestionJobs(Authentication authentication) {
        String tenantId = extractTenant(authentication);
        List<IngestionJob> jobs = ingestionJobRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        return ResponseEntity.ok(jobs);
    }

    /**
     * Endpoint 4: POST /api/v1/ingest/parse-local-sync
     * Synchronous Apache Tika fallback parser.
     */
    @PostMapping("/parse-local-sync")
    @PreAuthorize("hasRole('DATA_STEWARD')")
    public ResponseEntity<ParsedDocumentDTO> parseLocalSync(
            @RequestParam("file") MultipartFile file
    ) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            ParsedDocumentDTO parsedDoc = documentParserService.parse(
                    file.getInputStream(),
                    file.getOriginalFilename()
            );
            return ResponseEntity.ok(parsedDoc);
        } catch (Exception e) {
            log.error("Failed synchronous parsing for file [{}]: {}", file.getOriginalFilename(), e.getMessage());
            throw new RuntimeException("Synchronous document extraction failed: " + e.getMessage(), e);
        }
    }

    private String extractTenant(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            String tenant = principal.getTenant();
            if (tenant != null && !tenant.trim().isEmpty() && !"GLOBAL".equalsIgnoreCase(tenant) && !"ALL".equalsIgnoreCase(tenant)) {
                return tenant.trim().toUpperCase();
            }
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Missing or invalid tenant in authentication context");
    }

    private String extractUserId(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getUsername();
        }
        return "anonymous";
    }
}

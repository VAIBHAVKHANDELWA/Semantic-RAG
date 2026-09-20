package com.middleware.gateway.controllers;

import com.middleware.gateway.dto.ParsedDocumentDTO;
import com.middleware.gateway.dto.UploadTicketResponseDTO;
import com.middleware.gateway.security.UserPrincipal;
import com.middleware.gateway.services.DocumentParserService;
import com.middleware.gateway.services.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Slf4j
@RestController
@RequestMapping("/api/v1/ingest")
@RequiredArgsConstructor
public class IngestionController {

    private final StorageService storageService;
    private final DocumentParserService documentParserService;

    /**
     * Endpoint 1: GET /api/v1/ingest/upload-ticket?fileName=...
     * Generates a 15-minute Direct-to-Cloud MinIO/S3 Presigned Upload URL enforcing tenant isolation.
     */
    @GetMapping("/upload-ticket")
    public ResponseEntity<UploadTicketResponseDTO> getUploadTicket(
            @RequestParam("fileName") String fileName,
            Authentication authentication
    ) {
        String tenantId = "GLOBAL";
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            tenantId = principal.getTenant();
        }

        log.info("Received request for S3 upload ticket. File: [{}], Tenant: [{}]", fileName, tenantId);
        UploadTicketResponseDTO ticket = storageService.generatePresignedUploadTicket(fileName, tenantId);

        return ResponseEntity.ok(ticket);
    }

    /**
     * Endpoint 2: POST /api/v1/ingest/parse-local-sync
     * Synchronous Apache Tika multi-modal parsing endpoint for local testing and fallback.
     */
    @PostMapping("/parse-local-sync")
    public ResponseEntity<ParsedDocumentDTO> parseLocalSync(
            @RequestParam("file") MultipartFile file
    ) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        log.info("Received synchronous parse request for document [{}] ({})",
                file.getOriginalFilename(), file.getSize());

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
}

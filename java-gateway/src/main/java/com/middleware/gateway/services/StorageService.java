package com.middleware.gateway.services;

import com.middleware.gateway.dto.UploadTicketResponseDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.time.Duration;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class StorageService {

    private final S3Presigner s3Presigner;

    @Value("${cloud.s3.bucket-name:semantic-rag-uploads}")
    private String bucketName;

    /**
     * Generates a 15-minute Direct-to-Cloud S3/MinIO Presigned PUT Ticket enforcing tenant isolation.
     * Object Key Format: uploads/{tenantId}/{uuid}-{fileName}
     */
    public UploadTicketResponseDTO generatePresignedUploadTicket(String fileName, String tenantId) {
        String sanitizedTenant = (tenantId == null || tenantId.isBlank()) ? "GLOBAL" : tenantId.trim().toUpperCase();
        String sanitizedFileName = (fileName != null) ? fileName.replaceAll("[^a-zA-Z0-9_.-]", "_") : "unnamed_document.pdf";
        String uuid = UUID.randomUUID().toString().substring(0, 8);

        // Security Rule: Enforce tenant isolation in S3 Object Key path
        String objectKey = String.format("uploads/%s/%s-%s", sanitizedTenant, uuid, sanitizedFileName);
        String ticketId = "tkt-" + UUID.randomUUID().toString().substring(0, 8);

        log.info("Generating S3 Presigned Ticket [{}] for Tenant [{}] - Key: [{}]", ticketId, sanitizedTenant, objectKey);

        PutObjectRequest objectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .putObjectRequest(objectRequest)
                .build();

        PresignedPutObjectRequest presignedPut = s3Presigner.presignPutObject(presignRequest);
        String uploadUrl = presignedPut.url().toString();

        log.debug("Issued MinIO Presigned URL for Ticket [{}]: {}", ticketId, uploadUrl);

        return UploadTicketResponseDTO.builder()
                .ticketId(ticketId)
                .uploadUrl(uploadUrl)
                .objectKey(objectKey)
                .bucketName(bucketName)
                .tenantId(sanitizedTenant)
                .expiresInSeconds(900)
                .build();
    }

    public String generatePresignedUploadUrl(String fileName, String tenantId) {
        return generatePresignedUploadTicket(fileName, tenantId).getUploadUrl();
    }
}

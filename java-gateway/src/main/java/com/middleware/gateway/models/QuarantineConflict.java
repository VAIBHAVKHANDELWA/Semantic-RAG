package com.middleware.gateway.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "quarantine_queue")
public class QuarantineConflict {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "job_id", length = 64)
    private String jobId;

    @Column(name = "tenant_id", nullable = false, length = 64)
    private String tenantId;

    @Column(name = "document_id", length = 64)
    private String documentId;

    @Column(name = "existing_document", length = 255)
    private String existingDocument;

    @Column(name = "incoming_chunk_text", columnDefinition = "TEXT")
    private String incomingChunkText;

    @Column(name = "existing_chunk_id", length = 64)
    private String existingChunkId;

    @Column(name = "existing_chunk_text", columnDefinition = "TEXT")
    private String existingChunkText;

    @Column(name = "similarity_score")
    private Double similarityScore;

    @Column(name = "verdict_type", length = 64)
    private String verdictType;

    @Column(name = "verdict_confidence")
    private Double verdictConfidence;

    @Column(name = "contradiction_explanation", length = 2000)
    private String contradictionExplanation;

    @Column(name = "status", nullable = false, length = 64)
    private String status;

    @Column(name = "resolved_by", length = 64)
    private String resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "resolution_action", length = 64)
    private String resolutionAction;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = "PENDING";
        }
    }
}

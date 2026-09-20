package com.middleware.gateway.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
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
@Table(name = "quarantine_items")
public class QuarantineItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private String tenantId;

    @Column(name = "job_id", nullable = false)
    private String jobId;

    @Column(name = "source_document_a")
    private String sourceDocumentA;

    @Column(name = "chunk_text_a", length = 2000)
    private String chunkTextA;

    @Column(name = "source_document_b")
    private String sourceDocumentB;

    @Column(name = "chunk_text_b", length = 2000)
    private String chunkTextB;

    @Column(name = "status", nullable = false)
    private String status;

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

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
@Table(name = "ingestion_jobs")
public class IngestionJob {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "tenant_id", nullable = false, length = 64)
    private String tenantId;

    @Column(name = "uploaded_by", length = 64)
    private String uploadedBy;

    @Column(name = "object_key", nullable = false)
    private String objectKey;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "status", nullable = false, length = 32)
    private String status;

    @Column(name = "chunk_total")
    private Integer chunkTotal;

    @Column(name = "chunks_committed")
    private Integer chunksCommitted;

    @Column(name = "chunks_quarantined")
    private Integer chunksQuarantined;

    @Column(name = "error", length = 2000)
    private String error;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "finished_at")
    private LocalDateTime finishedAt;

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = "QUEUED";
        }
        if (this.chunkTotal == null) {
            this.chunkTotal = 0;
        }
        if (this.chunksCommitted == null) {
            this.chunksCommitted = 0;
        }
        if (this.chunksQuarantined == null) {
            this.chunksQuarantined = 0;
        }
    }
}

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

import java.time.OffsetDateTime;

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "documents")
public class Document {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "tenant_id", nullable = false, length = 64)
    private String tenantId;

    @Column(name = "job_id", length = 64)
    private String jobId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "version", length = 32)
    private String version;

    @Column(name = "effective_date", length = 64)
    private String effectiveDate;

    @Column(name = "status", length = 32)
    private String status;

    @Column(name = "content_sha256", length = 64)
    private String contentSha256;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = OffsetDateTime.now();
        }
        if (this.status == null) {
            this.status = "ACTIVE";
        }
        if (this.version == null) {
            this.version = "1.0";
        }
    }
}

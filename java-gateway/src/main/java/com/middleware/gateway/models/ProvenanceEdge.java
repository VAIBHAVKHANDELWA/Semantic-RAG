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
@Table(name = "provenance_edges")
public class ProvenanceEdge {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "tenant_id", nullable = false, length = 64)
    private String tenantId;

    @Column(name = "from_chunk_id", nullable = false, length = 64)
    private String fromChunkId;

    @Column(name = "to_chunk_id", nullable = false, length = 64)
    private String toChunkId;

    @Column(name = "relation", nullable = false, length = 64)
    private String relation;

    @Column(name = "created_by_conflict_id", length = 64)
    private String createdByConflictId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}

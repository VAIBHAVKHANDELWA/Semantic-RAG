package com.middleware.gateway.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
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
@Table(name = "vector_chunks")
public class VectorChunk {

    @Id
    @Column(name = "id", length = 64)
    private String id;

    @Column(name = "document_id", length = 64)
    private String documentId;

    @Column(name = "chunk_index")
    private Integer chunkIndex;

    @Column(name = "doc_name", nullable = false)
    private String docName;

    @Column(name = "tenant_id", nullable = false, length = 64)
    private String tenantId;

    @Column(name = "chunk_text", nullable = false, columnDefinition = "TEXT")
    private String chunkText;

    @Column(name = "status", length = 32)
    private String status;

    @Column(name = "superseded_by", length = 64)
    private String supersededBy;

    @Column(name = "content_sha256", length = 64)
    private String contentSha256;

    @Column(name = "created_at")
    private OffsetDateTime createdAt;
}

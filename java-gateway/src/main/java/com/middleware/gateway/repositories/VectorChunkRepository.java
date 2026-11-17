package com.middleware.gateway.repositories;

import com.middleware.gateway.models.VectorChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VectorChunkRepository extends JpaRepository<VectorChunk, String> {
    List<VectorChunk> findByDocumentIdAndTenantIdOrderByChunkIndexAsc(String documentId, String tenantId);
    List<VectorChunk> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    List<VectorChunk> findByTenantIdAndStatusOrderByCreatedAtDesc(String tenantId, String status);
}

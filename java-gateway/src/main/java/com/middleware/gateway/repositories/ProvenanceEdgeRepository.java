package com.middleware.gateway.repositories;

import com.middleware.gateway.models.ProvenanceEdge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProvenanceEdgeRepository extends JpaRepository<ProvenanceEdge, String> {
    List<ProvenanceEdge> findByTenantIdAndCreatedByConflictId(String tenantId, String createdByConflictId);
    List<ProvenanceEdge> findByCreatedByConflictId(String createdByConflictId);
    List<ProvenanceEdge> findByTenantIdOrderByCreatedAtDesc(String tenantId);
}

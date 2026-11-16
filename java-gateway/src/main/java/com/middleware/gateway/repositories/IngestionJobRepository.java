package com.middleware.gateway.repositories;

import com.middleware.gateway.models.IngestionJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IngestionJobRepository extends JpaRepository<IngestionJob, String> {
    List<IngestionJob> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    long countByTenantId(String tenantId);
}

package com.middleware.gateway.repositories;

import com.middleware.gateway.models.QuarantineConflict;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuarantineConflictRepository extends JpaRepository<QuarantineConflict, String> {
    List<QuarantineConflict> findByTenantIdAndStatusOrderByCreatedAtDesc(String tenantId, String status);
    Optional<QuarantineConflict> findByIdAndTenantId(String id, String tenantId);
}

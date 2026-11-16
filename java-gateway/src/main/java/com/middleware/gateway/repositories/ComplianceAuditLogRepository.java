package com.middleware.gateway.repositories;

import com.middleware.gateway.models.ComplianceAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ComplianceAuditLogRepository extends JpaRepository<ComplianceAuditLog, String> {
    List<ComplianceAuditLog> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    List<ComplianceAuditLog> findByTenantIdOrderByCreatedAtAsc(String tenantId);
    Optional<ComplianceAuditLog> findTopByTenantIdOrderByCreatedAtDesc(String tenantId);
    long countByTenantId(String tenantId);
}

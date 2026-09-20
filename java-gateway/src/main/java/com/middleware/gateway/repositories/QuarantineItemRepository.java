package com.middleware.gateway.repositories;

import com.middleware.gateway.models.QuarantineItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuarantineItemRepository extends JpaRepository<QuarantineItem, Long> {

    /**
     * CRITICAL SECURITY METHOD: Enforces strict tenant isolation for pending conflict queries.
     * Prevents HR users from accessing Finance or Legal conflicts.
     */
    List<QuarantineItem> findByTenantIdAndStatus(String tenantId, String status);

    /**
     * Global query for System Admin / Compliance Auditor multi-tenant inspection.
     */
    List<QuarantineItem> findByStatus(String status);
}

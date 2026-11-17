package com.middleware.gateway.repositories;

import com.middleware.gateway.models.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, String> {
    List<Document> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    Optional<Document> findByIdAndTenantId(String id, String tenantId);
}

package com.middleware.gateway.repositories;

import com.middleware.gateway.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    List<User> findByTenantId(String tenantId);
    List<User> findAllByOrderByCreatedAtDesc();
    List<User> findByTenantIdOrderByCreatedAtDesc(String tenantId);
}



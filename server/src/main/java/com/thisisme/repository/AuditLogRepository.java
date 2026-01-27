package com.thisisme.repository;

import com.thisisme.model.entity.AuditLog;
import com.thisisme.model.enums.AuditAction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    Page<AuditLog> findByUserId(UUID userId, Pageable pageable);

    Page<AuditLog> findByPassportId(UUID passportId, Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE a.userId = :userId " +
           "AND a.timestamp BETWEEN :start AND :end ORDER BY a.timestamp DESC")
    List<AuditLog> findByUserIdAndTimeRange(
        @Param("userId") UUID userId,
        @Param("start") Instant start,
        @Param("end") Instant end);

    @Query("SELECT a FROM AuditLog a WHERE a.passportId = :passportId " +
           "AND a.action = :action ORDER BY a.timestamp DESC")
    List<AuditLog> findByPassportIdAndAction(
        @Param("passportId") UUID passportId,
        @Param("action") AuditAction action);

    @Query("SELECT a FROM AuditLog a WHERE a.entityType = :entityType " +
           "AND a.entityId = :entityId ORDER BY a.timestamp DESC")
    List<AuditLog> findByEntity(
        @Param("entityType") String entityType,
        @Param("entityId") UUID entityId);

    @Query("SELECT a FROM AuditLog a WHERE a.childDataAccessed = true " +
           "AND a.timestamp >= :since ORDER BY a.timestamp DESC")
    Page<AuditLog> findChildDataAccess(@Param("since") Instant since, Pageable pageable);
}

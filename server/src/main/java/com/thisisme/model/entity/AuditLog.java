package com.thisisme.model.entity;

import com.thisisme.model.enums.AuditAction;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

/**
 * Comprehensive audit logging for UK GDPR Article 30 compliance.
 * Records must be retained for 6 years.
 */
@Entity
@Table(name = "audit_logs", indexes = {
    @Index(name = "idx_audit_user", columnList = "user_id"),
    @Index(name = "idx_audit_passport", columnList = "passport_id"),
    @Index(name = "idx_audit_action", columnList = "action"),
    @Index(name = "idx_audit_timestamp", columnList = "timestamp"),
    @Index(name = "idx_audit_entity", columnList = "entity_type, entity_id")
})
@EntityListeners(AuditingEntityListener.class)
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * User who performed the action (null for system actions)
     */
    @Column(name = "user_id")
    private UUID userId;

    @Column
    private String userName;

    /**
     * Passport affected (if applicable)
     */
    @Column(name = "passport_id")
    private UUID passportId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuditAction action;

    /**
     * Type of entity affected (e.g., "Passport", "TimelineEntry")
     */
    @Column
    private String entityType;

    /**
     * ID of the entity affected
     */
    @Column
    private UUID entityId;

    /**
     * Previous value (for updates) - stored as JSON
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "JSONB")
    private String oldValue;

    /**
     * New value (for creates/updates) - stored as JSON
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "JSONB")
    private String newValue;

    /**
     * Human-readable description of the action
     */
    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String ipAddress;

    @Column
    private String userAgent;

    /**
     * Request ID for correlation
     */
    @Column
    private String requestId;

    /**
     * Whether this action involved child data (for Children's Code compliance)
     */
    @Column(nullable = false)
    private boolean childDataAccessed = false;

    /**
     * Categories of data accessed (e.g., "HEALTH,BEHAVIORAL")
     */
    @Column
    private String dataCategories;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant timestamp;

    protected AuditLog() {}

    public AuditLog(AuditAction action, String ipAddress) {
        this.action = action;
        this.ipAddress = ipAddress;
    }

    // Builder pattern for fluent construction
    public AuditLog withUser(UUID userId, String userName) {
        this.userId = userId;
        this.userName = userName;
        return this;
    }

    public AuditLog withPassport(UUID passportId) {
        this.passportId = passportId;
        this.childDataAccessed = true;
        return this;
    }

    public AuditLog withEntity(String entityType, UUID entityId) {
        this.entityType = entityType;
        this.entityId = entityId;
        return this;
    }

    public AuditLog withValues(String oldValue, String newValue) {
        this.oldValue = oldValue;
        this.newValue = newValue;
        return this;
    }

    public AuditLog withDescription(String description) {
        this.description = description;
        return this;
    }

    public AuditLog withRequestContext(String requestId, String userAgent) {
        this.requestId = requestId;
        this.userAgent = userAgent;
        return this;
    }

    public AuditLog withDataCategories(String... categories) {
        this.dataCategories = String.join(",", categories);
        return this;
    }

    // Getters
    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public String getUserName() { return userName; }
    public UUID getPassportId() { return passportId; }
    public AuditAction getAction() { return action; }
    public String getEntityType() { return entityType; }
    public UUID getEntityId() { return entityId; }
    public String getOldValue() { return oldValue; }
    public String getNewValue() { return newValue; }
    public String getDescription() { return description; }
    public String getIpAddress() { return ipAddress; }
    public String getUserAgent() { return userAgent; }
    public String getRequestId() { return requestId; }
    public boolean isChildDataAccessed() { return childDataAccessed; }
    public String getDataCategories() { return dataCategories; }
    public Instant getTimestamp() { return timestamp; }
}

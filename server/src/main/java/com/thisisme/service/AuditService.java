package com.thisisme.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.thisisme.model.entity.AuditLog;
import com.thisisme.model.enums.AuditAction;
import com.thisisme.repository.AuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Service for comprehensive audit logging under UK GDPR Article 30.
 * All logs are immutable and retained for 6 years.
 */
@Service
public class AuditService {

    private static final Logger logger = LoggerFactory.getLogger(AuditService.class);

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public AuditService(AuditLogRepository auditLogRepository, ObjectMapper objectMapper) {
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Create a new audit log entry builder
     */
    public AuditLogBuilder log(AuditAction action, UUID userId, String userName, String ipAddress) {
        return new AuditLogBuilder(action, userId, userName, ipAddress);
    }

    /**
     * Create a system audit log (no user)
     */
    public AuditLogBuilder logSystem(AuditAction action, String ipAddress) {
        return new AuditLogBuilder(action, null, "SYSTEM", ipAddress);
    }

    /**
     * Save an audit log entry asynchronously
     */
    @Async
    public void saveAsync(AuditLog auditLog) {
        try {
            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            // Log to file as fallback - audit logs must not be lost
            logger.error("Failed to save audit log: {} - {}", auditLog.getAction(), e.getMessage());
            logger.info("AUDIT_FALLBACK: action={}, userId={}, passportId={}, entityType={}, entityId={}, ip={}",
                auditLog.getAction(),
                auditLog.getUserId(),
                auditLog.getPassportId(),
                auditLog.getEntityType(),
                auditLog.getEntityId(),
                auditLog.getIpAddress());
        }
    }

    /**
     * Get audit logs for a user
     */
    public Page<AuditLog> getLogsForUser(UUID userId, Pageable pageable) {
        return auditLogRepository.findByUserId(userId, pageable);
    }

    /**
     * Get audit logs for a passport
     */
    public Page<AuditLog> getLogsForPassport(UUID passportId, Pageable pageable) {
        return auditLogRepository.findByPassportId(passportId, pageable);
    }

    /**
     * Get audit logs for a specific entity
     */
    public List<AuditLog> getLogsForEntity(String entityType, UUID entityId) {
        return auditLogRepository.findByEntity(entityType, entityId);
    }

    /**
     * Get all child data access logs since a given time (for compliance reporting)
     */
    public Page<AuditLog> getChildDataAccessLogs(Instant since, Pageable pageable) {
        return auditLogRepository.findChildDataAccess(since, pageable);
    }

    /**
     * Serialize an object to JSON for audit logging
     */
    public String toJson(Object obj) {
        if (obj == null) return null;
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            logger.warn("Failed to serialize object for audit: {}", e.getMessage());
            return obj.toString();
        }
    }

    /**
     * Builder for creating audit log entries with fluent API
     */
    public class AuditLogBuilder {
        private final AuditLog auditLog;

        private AuditLogBuilder(AuditAction action, UUID userId, String userName, String ipAddress) {
            this.auditLog = new AuditLog(action, ipAddress);
            if (userId != null) {
                this.auditLog.withUser(userId, userName);
            }
        }

        public AuditLogBuilder withPassport(UUID passportId) {
            if (passportId != null) {
                auditLog.withPassport(passportId);
            }
            return this;
        }

        public AuditLogBuilder withPassport(com.thisisme.model.entity.Passport passport) {
            if (passport != null) {
                auditLog.withPassport(passport.getId());
            }
            return this;
        }

        public AuditLogBuilder withEntity(String entityType, UUID entityId) {
            auditLog.withEntity(entityType, entityId);
            return this;
        }

        public AuditLogBuilder withOldValue(Object oldValue) {
            auditLog.withValues(toJson(oldValue), auditLog.getNewValue());
            return this;
        }

        public AuditLogBuilder withNewValue(Object newValue) {
            auditLog.withValues(auditLog.getOldValue(), toJson(newValue));
            return this;
        }

        public AuditLogBuilder withValues(Object oldValue, Object newValue) {
            auditLog.withValues(toJson(oldValue), toJson(newValue));
            return this;
        }

        public AuditLogBuilder withDescription(String description) {
            auditLog.withDescription(description);
            return this;
        }

        public AuditLogBuilder withRequestContext(String requestId, String userAgent) {
            auditLog.withRequestContext(requestId, userAgent);
            return this;
        }

        public AuditLogBuilder withDataCategories(String... categories) {
            auditLog.withDataCategories(categories);
            return this;
        }

        /**
         * Save the audit log entry (async by default)
         */
        public void save() {
            saveAsync(auditLog);
        }

        /**
         * Save synchronously (for critical operations)
         */
        public AuditLog saveSync() {
            return auditLogRepository.save(auditLog);
        }

        /**
         * Get the built audit log without saving
         */
        public AuditLog build() {
            return auditLog;
        }
    }
}

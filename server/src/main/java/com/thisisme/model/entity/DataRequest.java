package com.thisisme.model.entity;

import com.thisisme.model.enums.DataRequestType;
import com.thisisme.model.enums.RequestStatus;
import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Tracks data subject rights requests under UK GDPR.
 * Must respond within 30 days (extendable to 90 for complex requests).
 */
@Entity
@Table(name = "data_requests", indexes = {
    @Index(name = "idx_data_request_user", columnList = "requester_id"),
    @Index(name = "idx_data_request_status", columnList = "status"),
    @Index(name = "idx_data_request_due", columnList = "due_by")
})
@EntityListeners(AuditingEntityListener.class)
public class DataRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false)
    private User requester;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DataRequestType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestStatus status = RequestStatus.PENDING;

    /**
     * Details of what the user is requesting
     */
    @Column(columnDefinition = "TEXT")
    private String requestDetails;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant requestedAt;

    /**
     * Default 30 days from request
     */
    @Column(nullable = false)
    private Instant dueBy;

    /**
     * If extended, new due date (max 90 days total)
     */
    @Column
    private Instant extendedDueBy;

    @Column
    private String extensionReason;

    @Column
    private Instant completedAt;

    /**
     * If refused, must document the reason
     */
    @Column(columnDefinition = "TEXT")
    private String refusalReason;

    /**
     * Notes about completion/handling
     */
    @Column(columnDefinition = "TEXT")
    private String completionNotes;

    /**
     * For ACCESS/PORTABILITY - link to exported data
     */
    @Column
    private String exportFileLocation;

    /**
     * User who handled the request
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "handled_by_id")
    private User handledBy;

    protected DataRequest() {}

    public DataRequest(User requester, DataRequestType type, String requestDetails) {
        this.requester = requester;
        this.type = type;
        this.requestDetails = requestDetails;
        this.dueBy = Instant.now().plus(30, ChronoUnit.DAYS);
    }

    // Getters and setters
    public UUID getId() { return id; }

    public User getRequester() { return requester; }

    public DataRequestType getType() { return type; }

    public RequestStatus getStatus() { return status; }
    public void setStatus(RequestStatus status) { this.status = status; }

    public String getRequestDetails() { return requestDetails; }

    public Instant getRequestedAt() { return requestedAt; }

    public Instant getDueBy() { return dueBy; }

    public Instant getExtendedDueBy() { return extendedDueBy; }

    public String getExtensionReason() { return extensionReason; }

    public Instant getCompletedAt() { return completedAt; }

    public String getRefusalReason() { return refusalReason; }

    public String getCompletionNotes() { return completionNotes; }
    public void setCompletionNotes(String completionNotes) { this.completionNotes = completionNotes; }

    public String getExportFileLocation() { return exportFileLocation; }
    public void setExportFileLocation(String location) { this.exportFileLocation = location; }

    public User getHandledBy() { return handledBy; }
    public void setHandledBy(User handledBy) { this.handledBy = handledBy; }

    /**
     * Extend deadline (max 90 days from original request)
     */
    public void extendDeadline(String reason) {
        Instant maxExtension = requestedAt.plus(90, ChronoUnit.DAYS);
        this.extendedDueBy = maxExtension;
        this.extensionReason = reason;
        this.status = RequestStatus.EXTENDED;
    }

    public void complete(String notes, User handledBy) {
        this.status = RequestStatus.COMPLETED;
        this.completedAt = Instant.now();
        this.completionNotes = notes;
        this.handledBy = handledBy;
    }

    public void refuse(String reason, User handledBy) {
        this.status = RequestStatus.REFUSED;
        this.completedAt = Instant.now();
        this.refusalReason = reason;
        this.handledBy = handledBy;
    }

    public boolean isOverdue() {
        Instant deadline = extendedDueBy != null ? extendedDueBy : dueBy;
        return Instant.now().isAfter(deadline) &&
               status != RequestStatus.COMPLETED &&
               status != RequestStatus.REFUSED;
    }

    public Instant getEffectiveDeadline() {
        return extendedDueBy != null ? extendedDueBy : dueBy;
    }
}

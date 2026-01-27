package com.thisisme.model.entity;

import com.thisisme.model.enums.NotificationType;
import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notifications", indexes = {
    @Index(name = "idx_notifications_recipient", columnList = "recipient_id"),
    @Index(name = "idx_notifications_recipient_read", columnList = "recipient_id, read_at"),
    @Index(name = "idx_notifications_created_at", columnList = "created_at DESC")
})
@EntityListeners(AuditingEntityListener.class)
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient;

    @Enumerated(EnumType.STRING)
    @Column(name = "notification_type", nullable = false, length = 50)
    private NotificationType notificationType;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, length = 500)
    private String message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    @Column(name = "passport_id")
    private UUID passportId;

    @Column(name = "timeline_entry_id")
    private UUID timelineEntryId;

    @Column(name = "comment_id")
    private UUID commentId;

    @Column(name = "document_id")
    private UUID documentId;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    protected Notification() {}

    public Notification(User recipient, NotificationType notificationType, String title, String message) {
        this.recipient = recipient;
        this.notificationType = notificationType;
        this.title = title;
        this.message = message;
    }

    // Getters
    public UUID getId() { return id; }
    public User getRecipient() { return recipient; }
    public NotificationType getNotificationType() { return notificationType; }
    public String getTitle() { return title; }
    public String getMessage() { return message; }
    public User getActor() { return actor; }
    public UUID getPassportId() { return passportId; }
    public UUID getTimelineEntryId() { return timelineEntryId; }
    public UUID getCommentId() { return commentId; }
    public UUID getDocumentId() { return documentId; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getReadAt() { return readAt; }
    public Instant getDeletedAt() { return deletedAt; }

    // Setters
    public void setActor(User actor) { this.actor = actor; }
    public void setPassportId(UUID passportId) { this.passportId = passportId; }
    public void setTimelineEntryId(UUID timelineEntryId) { this.timelineEntryId = timelineEntryId; }
    public void setCommentId(UUID commentId) { this.commentId = commentId; }
    public void setDocumentId(UUID documentId) { this.documentId = documentId; }
    public void setReadAt(Instant readAt) { this.readAt = readAt; }
    public void setDeletedAt(Instant deletedAt) { this.deletedAt = deletedAt; }

    // Helpers
    public boolean isRead() { return readAt != null; }
    public boolean isDeleted() { return deletedAt != null; }

    public void markAsRead() {
        if (this.readAt == null) {
            this.readAt = Instant.now();
        }
    }

    public void markAsUnread() {
        this.readAt = null;
    }
}

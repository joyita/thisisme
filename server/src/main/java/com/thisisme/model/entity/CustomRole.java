package com.thisisme.model.entity;

import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "custom_roles",
    uniqueConstraints = @UniqueConstraint(name = "uq_custom_role_name", columnNames = {"passport_id", "name"})
)
@EntityListeners(AuditingEntityListener.class)
public class CustomRole {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passport_id", nullable = false)
    private Passport passport;

    @Column(nullable = false, length = 64)
    private String name;

    @Column(length = 256)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private Instant updatedAt;

    // Passport-level
    @Column(nullable = false) private boolean canViewPassport = true;
    @Column(nullable = false) private boolean canEditPassport = false;
    @Column(nullable = false) private boolean canDeletePassport = false;
    @Column(nullable = false) private boolean canManagePermissions = false;
    @Column(nullable = false) private boolean canCreateShareLinks = false;

    // Section-level
    @Column(nullable = false) private boolean canViewSections = true;
    @Column(nullable = false) private boolean canEditSections = false;
    @Column(nullable = false) private boolean canDeleteSections = false;
    @Column(nullable = false) private boolean canPublishSections = false;
    @Column(nullable = false) private boolean canReorderSections = false;

    // Timeline-level
    @Column(nullable = false) private boolean canViewTimeline = true;
    @Column(nullable = false) private boolean canAddTimelineEntries = false;
    @Column(nullable = false) private boolean canEditTimelineEntries = false;
    @Column(nullable = false) private boolean canDeleteTimelineEntries = false;
    @Column(nullable = false) private boolean canCommentOnTimeline = false;
    @Column(nullable = false) private boolean canReactOnTimeline = false;

    // Document-level
    @Column(nullable = false) private boolean canViewDocuments = false;
    @Column(nullable = false) private boolean canUploadDocuments = false;
    @Column(nullable = false) private boolean canDownloadDocuments = false;
    @Column(nullable = false) private boolean canDeleteDocuments = false;

    protected CustomRole() {}

    public CustomRole(Passport passport, String name, String description, User createdBy) {
        this.passport = passport;
        this.name = name;
        this.description = description;
        this.createdBy = createdBy;
    }

    // Getters / setters

    public UUID getId() { return id; }
    public Passport getPassport() { return passport; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public User getCreatedBy() { return createdBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    // Passport-level
    public boolean canViewPassport() { return canViewPassport; }
    public void setCanViewPassport(boolean v) { this.canViewPassport = v; }
    public boolean canEditPassport() { return canEditPassport; }
    public void setCanEditPassport(boolean v) { this.canEditPassport = v; }
    public boolean canDeletePassport() { return canDeletePassport; }
    public void setCanDeletePassport(boolean v) { this.canDeletePassport = v; }
    public boolean canManagePermissions() { return canManagePermissions; }
    public void setCanManagePermissions(boolean v) { this.canManagePermissions = v; }
    public boolean canCreateShareLinks() { return canCreateShareLinks; }
    public void setCanCreateShareLinks(boolean v) { this.canCreateShareLinks = v; }

    // Section-level
    public boolean canViewSections() { return canViewSections; }
    public void setCanViewSections(boolean v) { this.canViewSections = v; }
    public boolean canEditSections() { return canEditSections; }
    public void setCanEditSections(boolean v) { this.canEditSections = v; }
    public boolean canDeleteSections() { return canDeleteSections; }
    public void setCanDeleteSections(boolean v) { this.canDeleteSections = v; }
    public boolean canPublishSections() { return canPublishSections; }
    public void setCanPublishSections(boolean v) { this.canPublishSections = v; }
    public boolean canReorderSections() { return canReorderSections; }
    public void setCanReorderSections(boolean v) { this.canReorderSections = v; }

    // Timeline-level
    public boolean canViewTimeline() { return canViewTimeline; }
    public void setCanViewTimeline(boolean v) { this.canViewTimeline = v; }
    public boolean canAddTimelineEntries() { return canAddTimelineEntries; }
    public void setCanAddTimelineEntries(boolean v) { this.canAddTimelineEntries = v; }
    public boolean canEditTimelineEntries() { return canEditTimelineEntries; }
    public void setCanEditTimelineEntries(boolean v) { this.canEditTimelineEntries = v; }
    public boolean canDeleteTimelineEntries() { return canDeleteTimelineEntries; }
    public void setCanDeleteTimelineEntries(boolean v) { this.canDeleteTimelineEntries = v; }
    public boolean canCommentOnTimeline() { return canCommentOnTimeline; }
    public void setCanCommentOnTimeline(boolean v) { this.canCommentOnTimeline = v; }
    public boolean canReactOnTimeline() { return canReactOnTimeline; }
    public void setCanReactOnTimeline(boolean v) { this.canReactOnTimeline = v; }

    // Document-level
    public boolean canViewDocuments() { return canViewDocuments; }
    public void setCanViewDocuments(boolean v) { this.canViewDocuments = v; }
    public boolean canUploadDocuments() { return canUploadDocuments; }
    public void setCanUploadDocuments(boolean v) { this.canUploadDocuments = v; }
    public boolean canDownloadDocuments() { return canDownloadDocuments; }
    public void setCanDownloadDocuments(boolean v) { this.canDownloadDocuments = v; }
    public boolean canDeleteDocuments() { return canDeleteDocuments; }
    public void setCanDeleteDocuments(boolean v) { this.canDeleteDocuments = v; }
}

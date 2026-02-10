package com.thisisme.model.entity;

import com.thisisme.model.enums.Role;
import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "passport_permissions",
    uniqueConstraints = @UniqueConstraint(columnNames = {"passport_id", "user_id"}),
    indexes = {
        @Index(name = "idx_permissions_passport", columnList = "passport_id"),
        @Index(name = "idx_permissions_user", columnList = "user_id")
    }
)
@EntityListeners(AuditingEntityListener.class)
public class PassportPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passport_id", nullable = false)
    private Passport passport;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    // Passport-level
    @Column(nullable = false)
    private boolean canViewPassport = true;

    @Column(nullable = false)
    private boolean canEditPassport = false;

    @Column(nullable = false)
    private boolean canDeletePassport = false;

    @Column(nullable = false)
    private boolean canManagePermissions = false;

    @Column(nullable = false)
    private boolean canCreateShareLinks = false;

    // Section-level
    @Column(nullable = false)
    private boolean canViewSections = true;

    @Column(nullable = false)
    private boolean canEditSections = false;

    @Column(nullable = false)
    private boolean canDeleteSections = false;

    @Column(nullable = false)
    private boolean canPublishSections = false;

    @Column(nullable = false)
    private boolean canReorderSections = false;

    // Timeline-level
    @Column(nullable = false)
    private boolean canViewTimeline = true;

    @Column(nullable = false)
    private boolean canAddTimelineEntries = false;

    @Column(nullable = false)
    private boolean canEditTimelineEntries = false;

    @Column(nullable = false)
    private boolean canDeleteTimelineEntries = false;

    @Column(nullable = false)
    private boolean canCommentOnTimeline = false;

    @Column(nullable = false)
    private boolean canReactOnTimeline = false;

    // Document-level
    @Column(nullable = false)
    private boolean canViewDocuments = false;

    @Column(nullable = false)
    private boolean canUploadDocuments = false;

    @Column(nullable = false)
    private boolean canDownloadDocuments = false;

    @Column(nullable = false)
    private boolean canDeleteDocuments = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "custom_role_id")
    private CustomRole customRole;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "granted_by_id", nullable = false)
    private User grantedBy;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant grantedAt;

    @Column
    private Instant revokedAt;

    @Column
    private String notes;

    protected PassportPermission() {}

    public PassportPermission(Passport passport, User user, Role role, User grantedBy) {
        this.passport = passport;
        this.user = user;
        this.role = role;
        this.grantedBy = grantedBy;
        applyRoleDefaults();
    }

    private void applyRoleDefaults() {
        switch (role) {
            case OWNER -> {
                canViewPassport = true;
                canEditPassport = true;
                canDeletePassport = true;
                canManagePermissions = true;
                canCreateShareLinks = true;
                canViewSections = true;
                canEditSections = true;
                canDeleteSections = true;
                canPublishSections = true;
                canReorderSections = true;
                canViewTimeline = true;
                canAddTimelineEntries = true;
                canEditTimelineEntries = true;
                canDeleteTimelineEntries = true;
                canCommentOnTimeline = true;
                canReactOnTimeline = true;
                canViewDocuments = true;
                canUploadDocuments = true;
                canDownloadDocuments = true;
                canDeleteDocuments = true;
            }
            case CO_OWNER -> {
                canViewPassport = true;
                canEditPassport = true;
                canDeletePassport = false;
                canManagePermissions = true;
                canCreateShareLinks = true;
                canViewSections = true;
                canEditSections = true;
                canDeleteSections = false;
                canPublishSections = false;
                canReorderSections = true;
                canViewTimeline = true;
                canAddTimelineEntries = true;
                canEditTimelineEntries = true;
                canDeleteTimelineEntries = false;
                canCommentOnTimeline = true;
                canReactOnTimeline = true;
                canViewDocuments = true;
                canUploadDocuments = true;
                canDownloadDocuments = true;
                canDeleteDocuments = false;
            }
            case PROFESSIONAL -> {
                canViewPassport = true;
                canEditPassport = false;
                canDeletePassport = false;
                canManagePermissions = false;
                canCreateShareLinks = false;
                canViewSections = true;
                canEditSections = false;
                canDeleteSections = false;
                canPublishSections = false;
                canReorderSections = false;
                canViewTimeline = true;
                canAddTimelineEntries = true;
                canEditTimelineEntries = false;
                canDeleteTimelineEntries = false;
                canCommentOnTimeline = true;
                canReactOnTimeline = true;
                canViewDocuments = true;
                canUploadDocuments = false;
                canDownloadDocuments = true;
                canDeleteDocuments = false;
            }
            case VIEWER -> {
                canViewPassport = true;
                canEditPassport = false;
                canDeletePassport = false;
                canManagePermissions = false;
                canCreateShareLinks = false;
                canViewSections = true;
                canEditSections = false;
                canDeleteSections = false;
                canPublishSections = false;
                canReorderSections = false;
                canViewTimeline = true;
                canAddTimelineEntries = false;
                canEditTimelineEntries = false;
                canDeleteTimelineEntries = false;
                canCommentOnTimeline = false;
                canReactOnTimeline = false;
                canViewDocuments = true;
                canUploadDocuments = false;
                canDownloadDocuments = true;
                canDeleteDocuments = false;
            }
            case CHILD -> {
                canViewPassport = true;
                canEditPassport = false;
                canDeletePassport = false;
                canManagePermissions = false;
                canCreateShareLinks = false;
                canViewSections = true;
                canEditSections = true;  // service layer enforces PENDING_REVIEW
                canDeleteSections = false;
                canPublishSections = false;
                canReorderSections = false;
                canViewTimeline = true;
                canAddTimelineEntries = true;  // service layer enforces PENDING_REVIEW
                canEditTimelineEntries = false;
                canDeleteTimelineEntries = false;
                canCommentOnTimeline = false;
                canReactOnTimeline = true;
                canViewDocuments = false;
                canUploadDocuments = false;
                canDownloadDocuments = false;
                canDeleteDocuments = false;
            }
        }
    }

    // Getters and setters
    public UUID getId() { return id; }

    public Passport getPassport() { return passport; }
    void setPassport(Passport passport) { this.passport = passport; }

    public User getUser() { return user; }

    public Role getRole() { return role; }
    public void setRole(Role role) {
        this.role = role;
        applyRoleDefaults();
    }

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

    public CustomRole getCustomRole() { return customRole; }
    public void setCustomRole(CustomRole customRole) { this.customRole = customRole; }

    /** Copy all permission flags from a custom role template. */
    public void applyFromCustomRole(CustomRole cr) {
        this.customRole = cr;
        this.canViewPassport = cr.canViewPassport();
        this.canEditPassport = cr.canEditPassport();
        this.canDeletePassport = cr.canDeletePassport();
        this.canManagePermissions = cr.canManagePermissions();
        this.canCreateShareLinks = cr.canCreateShareLinks();
        this.canViewSections = cr.canViewSections();
        this.canEditSections = cr.canEditSections();
        this.canDeleteSections = cr.canDeleteSections();
        this.canPublishSections = cr.canPublishSections();
        this.canReorderSections = cr.canReorderSections();
        this.canViewTimeline = cr.canViewTimeline();
        this.canAddTimelineEntries = cr.canAddTimelineEntries();
        this.canEditTimelineEntries = cr.canEditTimelineEntries();
        this.canDeleteTimelineEntries = cr.canDeleteTimelineEntries();
        this.canCommentOnTimeline = cr.canCommentOnTimeline();
        this.canReactOnTimeline = cr.canReactOnTimeline();
        this.canViewDocuments = cr.canViewDocuments();
        this.canUploadDocuments = cr.canUploadDocuments();
        this.canDownloadDocuments = cr.canDownloadDocuments();
        this.canDeleteDocuments = cr.canDeleteDocuments();
    }

    public User getGrantedBy() { return grantedBy; }
    public Instant getGrantedAt() { return grantedAt; }

    public Instant getRevokedAt() { return revokedAt; }
    public void setRevokedAt(Instant revokedAt) { this.revokedAt = revokedAt; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public boolean isActive() { return revokedAt == null; }
}

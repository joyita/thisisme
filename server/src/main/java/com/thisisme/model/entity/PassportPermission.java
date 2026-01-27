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

    @Column(nullable = false)
    private boolean canViewTimeline = true;

    @Column(nullable = false)
    private boolean canAddTimelineEntries = false;

    @Column(nullable = false)
    private boolean canViewDocuments = false;

    @Column(nullable = false)
    private boolean canUploadDocuments = false;

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
            case OWNER, CO_OWNER -> {
                canViewTimeline = true;
                canAddTimelineEntries = true;
                canViewDocuments = true;
                canUploadDocuments = true;
            }
            case PROFESSIONAL -> {
                canViewTimeline = true;
                canAddTimelineEntries = true;
                canViewDocuments = true;
                canUploadDocuments = false;
            }
            case VIEWER -> {
                canViewTimeline = true;
                canAddTimelineEntries = false;
                canViewDocuments = false;
                canUploadDocuments = false;
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

    public boolean canViewTimeline() { return canViewTimeline; }
    public void setCanViewTimeline(boolean canViewTimeline) { this.canViewTimeline = canViewTimeline; }

    public boolean canAddTimelineEntries() { return canAddTimelineEntries; }
    public void setCanAddTimelineEntries(boolean canAddTimelineEntries) {
        this.canAddTimelineEntries = canAddTimelineEntries;
    }

    public boolean canViewDocuments() { return canViewDocuments; }
    public void setCanViewDocuments(boolean canViewDocuments) { this.canViewDocuments = canViewDocuments; }

    public boolean canUploadDocuments() { return canUploadDocuments; }
    public void setCanUploadDocuments(boolean canUploadDocuments) {
        this.canUploadDocuments = canUploadDocuments;
    }

    public User getGrantedBy() { return grantedBy; }
    public Instant getGrantedAt() { return grantedAt; }

    public Instant getRevokedAt() { return revokedAt; }
    public void setRevokedAt(Instant revokedAt) { this.revokedAt = revokedAt; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public boolean isActive() { return revokedAt == null; }
}

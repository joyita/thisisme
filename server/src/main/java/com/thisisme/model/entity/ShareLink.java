package com.thisisme.model.entity;

import com.thisisme.model.enums.SectionType;
import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "share_links", indexes = {
    @Index(name = "idx_share_token", columnList = "token", unique = true),
    @Index(name = "idx_share_passport", columnList = "passport_id"),
    @Index(name = "idx_share_expires", columnList = "expires_at")
})
@EntityListeners(AuditingEntityListener.class)
public class ShareLink {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passport_id", nullable = false)
    private Passport passport;

    /**
     * Unique token for the share URL
     */
    @Column(nullable = false, unique = true)
    private String token;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    /**
     * Optional name/label for this link (e.g., "For Dr. Smith")
     */
    @Column
    private String label;

    /**
     * Which sections are visible via this link
     */
    @ElementCollection
    @CollectionTable(name = "share_link_sections",
        joinColumns = @JoinColumn(name = "share_link_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "section_type")
    private Set<SectionType> visibleSections = new HashSet<>();

    /**
     * Whether timeline is visible via this link
     */
    @Column(nullable = false)
    private boolean showTimeline = false;

    /**
     * Whether documents are visible via this link
     */
    @Column(nullable = false)
    private boolean showDocuments = false;

    @Column
    private Instant expiresAt;

    @Column(nullable = false)
    private boolean active = true;

    @Column
    private Instant revokedAt;

    /**
     * Optional password protection
     */
    @Column
    private String passwordHash;

    /**
     * Track access count
     */
    @Column(nullable = false)
    private int accessCount = 0;

    @Column
    private Instant lastAccessedAt;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected ShareLink() {}

    public ShareLink(Passport passport, String token, User createdBy) {
        this.passport = passport;
        this.token = token;
        this.createdBy = createdBy;
        // Default to all sections visible
        this.visibleSections.addAll(Set.of(SectionType.values()));
    }

    // Getters and setters
    public UUID getId() { return id; }

    public Passport getPassport() { return passport; }

    public String getToken() { return token; }

    public User getCreatedBy() { return createdBy; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public Set<SectionType> getVisibleSections() { return visibleSections; }
    public void setVisibleSections(Set<SectionType> sections) { this.visibleSections = sections; }

    public boolean isShowTimeline() { return showTimeline; }
    public void setShowTimeline(boolean showTimeline) { this.showTimeline = showTimeline; }

    public boolean isShowDocuments() { return showDocuments; }
    public void setShowDocuments(boolean showDocuments) { this.showDocuments = showDocuments; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }

    public boolean isActive() { return active; }

    public Instant getRevokedAt() { return revokedAt; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public int getAccessCount() { return accessCount; }

    public Instant getLastAccessedAt() { return lastAccessedAt; }

    public Instant getCreatedAt() { return createdAt; }

    public void revoke() {
        this.active = false;
        this.revokedAt = Instant.now();
    }

    public void recordAccess() {
        this.accessCount++;
        this.lastAccessedAt = Instant.now();
    }

    public boolean isExpired() {
        return expiresAt != null && Instant.now().isAfter(expiresAt);
    }

    public boolean isValid() {
        return active && !isExpired();
    }

    public boolean isPasswordProtected() {
        return passwordHash != null && !passwordHash.isEmpty();
    }
}

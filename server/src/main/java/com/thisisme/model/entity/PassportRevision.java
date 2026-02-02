package com.thisisme.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.Type;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;


import java.time.Instant;
import java.util.UUID;

/**
 * Stores historical snapshots of passport state for version history.
 * Enables viewing previous versions and audit compliance.
 */
@Entity
@Table(name = "passport_revisions", indexes = {
    @Index(name = "idx_revisions_passport", columnList = "passport_id"),
    @Index(name = "idx_revisions_created_at", columnList = "created_at")
})
@EntityListeners(AuditingEntityListener.class)
public class PassportRevision {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passport_id", nullable = false)
    private Passport passport;

    @Column(nullable = false)
    private int revisionNumber;

    /**
     * JSON snapshot of passport sections at time of revision
     */
    @Column(nullable = false, columnDefinition = "JSONB")
    @Type(JsonStringType.class)
    private String sectionsSnapshot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    @Column
    private String changeDescription;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected PassportRevision() {}

    public PassportRevision(Passport passport, int revisionNumber, String sectionsSnapshot,
                           User createdBy, String changeDescription) {
        this.passport = passport;
        this.revisionNumber = revisionNumber;
        this.sectionsSnapshot = sectionsSnapshot;
        this.createdBy = createdBy;
        this.changeDescription = changeDescription;
    }

    // Getters
    public UUID getId() { return id; }
    public Passport getPassport() { return passport; }
    void setPassport(Passport passport) { this.passport = passport; }
    public int getRevisionNumber() { return revisionNumber; }
    public String getSectionsSnapshot() { return sectionsSnapshot; }
    public User getCreatedBy() { return createdBy; }
    public String getChangeDescription() { return changeDescription; }
    public Instant getCreatedAt() { return createdAt; }
}

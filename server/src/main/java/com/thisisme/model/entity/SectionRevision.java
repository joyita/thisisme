package com.thisisme.model.entity;

import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

/**
 * Per-field revision history for passport sections.
 * EDIT revisions capture the previous content before a change and can be restored.
 * PUBLISH/UNPUBLISH revisions record visibility changes and are not restorable.
 */
@Entity
@Table(name = "section_revisions", indexes = {
    @Index(name = "idx_section_revisions_section", columnList = "section_id, created_at")
})
@EntityListeners(AuditingEntityListener.class)
public class SectionRevision {

    public enum ChangeType { EDIT, PUBLISH, UNPUBLISH }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id", nullable = false)
    private PassportSection section;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passport_id", nullable = false)
    private Passport passport;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(columnDefinition = "TEXT")
    private String remedialSuggestion;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ChangeType changeType = ChangeType.EDIT;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(nullable = false)
    private String authorName;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected SectionRevision() {}

    public SectionRevision(PassportSection section, Passport passport,
                           String content, String remedialSuggestion,
                           ChangeType changeType, User author) {
        this.section = section;
        this.passport = passport;
        this.content = content;
        this.remedialSuggestion = remedialSuggestion;
        this.changeType = changeType;
        this.author = author;
        this.authorName = author.getName();
    }

    public UUID getId() { return id; }
    public PassportSection getSection() { return section; }
    public Passport getPassport() { return passport; }
    public String getContent() { return content; }
    public String getRemedialSuggestion() { return remedialSuggestion; }
    public ChangeType getChangeType() { return changeType; }
    public User getAuthor() { return author; }
    public String getAuthorName() { return authorName; }
    public Instant getCreatedAt() { return createdAt; }
}

package com.thisisme.model.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Comments on timeline entries for collaboration.
 */
@Entity
@Table(name = "timeline_comments")
public class TimelineComment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entry_id", nullable = false)
    private TimelineEntry entry;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(nullable = false, length = 2000)
    private String content;

    @ElementCollection
    @CollectionTable(name = "comment_mentions", joinColumns = @JoinColumn(name = "comment_id"))
    @Column(name = "user_id")
    private Set<UUID> mentionedUserIds = new HashSet<>();

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    protected TimelineComment() {}

    public TimelineComment(TimelineEntry entry, User author, String content) {
        this.entry = entry;
        this.author = author;
        this.content = content;
        this.createdAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // Getters and setters
    public UUID getId() { return id; }
    public TimelineEntry getEntry() { return entry; }
    public User getAuthor() { return author; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Set<UUID> getMentionedUserIds() { return mentionedUserIds; }
    public void setMentionedUserIds(Set<UUID> mentionedUserIds) { this.mentionedUserIds = mentionedUserIds; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getDeletedAt() { return deletedAt; }
    public void setDeletedAt(Instant deletedAt) { this.deletedAt = deletedAt; }
    public boolean isDeleted() { return deletedAt != null; }
}

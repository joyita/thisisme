package com.thisisme.model.entity;

import com.thisisme.model.enums.ContentStatus;
import com.thisisme.model.enums.EntryType;
import com.thisisme.model.enums.Role;
import com.thisisme.model.enums.VisibilityLevel;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "timeline_entries", indexes = {
    @Index(name = "idx_timeline_passport", columnList = "passport_id"),
    @Index(name = "idx_timeline_author", columnList = "author_id"),
    @Index(name = "idx_timeline_type", columnList = "entry_type"),
    @Index(name = "idx_timeline_date", columnList = "entry_date"),
    @Index(name = "idx_timeline_visibility", columnList = "visibility_level")
})
@EntityListeners(AuditingEntityListener.class)
public class TimelineEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passport_id", nullable = false)
    private Passport passport;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Enumerated(EnumType.STRING)
    @Column(name = "entry_type", nullable = false)
    private EntryType entryType;

    @NotBlank
    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String content;

    /**
     * The date this entry refers to (may differ from creation date)
     */
    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VisibilityLevel visibilityLevel = VisibilityLevel.OWNERS_ONLY;

    /**
     * For CUSTOM visibility, which roles can see this entry
     */
    @ElementCollection
    @CollectionTable(name = "timeline_entry_visible_roles",
        joinColumns = @JoinColumn(name = "entry_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "role")
    private Set<Role> visibleToRoles = new HashSet<>();

    @OneToMany(mappedBy = "timelineEntry", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Document> attachments = new ArrayList<>();

    /**
     * Optional tags for filtering/categorization
     */
    @ElementCollection
    @CollectionTable(name = "timeline_entry_tags",
        joinColumns = @JoinColumn(name = "entry_id"))
    @Column(name = "tag")
    private Set<String> tags = new HashSet<>();

    @ElementCollection
    @CollectionTable(name = "timeline_entry_mentions",
        joinColumns = @JoinColumn(name = "entry_id"))
    @Column(name = "user_id")
    private Set<UUID> mentionedUserIds = new HashSet<>();

    /**
     * JSONB metadata for entry types like CORRESPONDENCE.
     * Stores email headers: from, to, date, subject, source (WEBHOOK|MANUAL)
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> metadata = new HashMap<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ContentStatus status = ContentStatus.PUBLISHED;

    @Column(nullable = false)
    private boolean childModeContribution = false;

    @Column(nullable = false)
    private boolean pinned = false;

    @Column(name = "flagged", nullable = false)
    private boolean flaggedForFollowup = false;

    @Column(name = "follow_up_due_date")
    private LocalDate followupDueDate;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private Instant updatedAt;

    @Column
    private Instant deletedAt;

    protected TimelineEntry() {}

    public TimelineEntry(Passport passport, User author, EntryType entryType,
                        String title, String content, LocalDate entryDate) {
        this.passport = passport;
        this.author = author;
        this.entryType = entryType;
        this.title = title;
        this.content = content;
        this.entryDate = entryDate;
    }

    // Getters and setters
    public UUID getId() { return id; }

    public Passport getPassport() { return passport; }
    void setPassport(Passport passport) { this.passport = passport; }

    public User getAuthor() { return author; }

    public EntryType getEntryType() { return entryType; }
    public void setEntryType(EntryType entryType) { this.entryType = entryType; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public LocalDate getEntryDate() { return entryDate; }
    public void setEntryDate(LocalDate entryDate) { this.entryDate = entryDate; }

    public VisibilityLevel getVisibilityLevel() { return visibilityLevel; }
    public void setVisibilityLevel(VisibilityLevel visibilityLevel) {
        this.visibilityLevel = visibilityLevel;
    }

    public Set<Role> getVisibleToRoles() { return visibleToRoles; }
    public void setVisibleToRoles(Set<Role> roles) { this.visibleToRoles = roles; }

    public List<Document> getAttachments() { return attachments; }
    public void addAttachment(Document document) {
        attachments.add(document);
        document.setTimelineEntry(this);
    }

    public Set<String> getTags() { return tags; }
    public void addTag(String tag) { tags.add(tag); }

    public Set<UUID> getMentionedUserIds() { return mentionedUserIds; }
    public void setMentionedUserIds(Set<UUID> mentionedUserIds) { this.mentionedUserIds = mentionedUserIds; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }

    public boolean isPinned() { return pinned; }
    public void setPinned(boolean pinned) { this.pinned = pinned; }

    public boolean isFlaggedForFollowup() { return flaggedForFollowup; }
    public void setFlaggedForFollowup(boolean flaggedForFollowup) { this.flaggedForFollowup = flaggedForFollowup; }

    public LocalDate getFollowupDueDate() { return followupDueDate; }
    public void setFollowupDueDate(LocalDate followupDueDate) { this.followupDueDate = followupDueDate; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public Instant getDeletedAt() { return deletedAt; }
    public void setDeletedAt(Instant deletedAt) { this.deletedAt = deletedAt; }

    public ContentStatus getStatus() { return status; }
    public void setStatus(ContentStatus status) { this.status = status; }

    public boolean isChildModeContribution() { return childModeContribution; }
    public void setChildModeContribution(boolean childModeContribution) { this.childModeContribution = childModeContribution; }

    public boolean isDeleted() { return deletedAt != null; }

    /**
     * Check if a user with given role can view this entry
     */
    public boolean isVisibleTo(Role role) {
        return switch (visibilityLevel) {
            case OWNERS_ONLY -> role == Role.OWNER || role == Role.CO_OWNER;
            case PROFESSIONALS -> role == Role.OWNER || role == Role.CO_OWNER || role == Role.PROFESSIONAL;
            case ALL -> true;
            case CUSTOM -> visibleToRoles.contains(role);
        };
    }
}

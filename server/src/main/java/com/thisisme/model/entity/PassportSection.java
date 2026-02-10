package com.thisisme.model.entity;

import com.thisisme.model.enums.ContentStatus;
import com.thisisme.model.enums.SectionType;
import com.thisisme.model.enums.VisibilityLevel;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "passport_sections", indexes = {
    @Index(name = "idx_sections_passport", columnList = "passport_id"),
    @Index(name = "idx_sections_type", columnList = "type")
})
@EntityListeners(AuditingEntityListener.class)
public class PassportSection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passport_id", nullable = false)
    private Passport passport;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SectionType type;

    @NotBlank
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(columnDefinition = "TEXT")
    private String remedialSuggestion;

    @Column(nullable = false)
    private boolean published = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VisibilityLevel visibilityLevel = VisibilityLevel.OWNERS_ONLY;

    @Column(nullable = false)
    private int displayOrder = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ContentStatus status = ContentStatus.PUBLISHED;

    @Column(nullable = false)
    private boolean childModeContribution = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "last_edited_by_id")
    private User lastEditedBy;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private Instant updatedAt;

    protected PassportSection() {}

    public PassportSection(Passport passport, SectionType type, String content, User createdBy) {
        this.passport = passport;
        this.type = type;
        this.content = content;
        this.createdBy = createdBy;
        this.lastEditedBy = createdBy;
    }

    // Getters and setters
    public UUID getId() { return id; }

    public Passport getPassport() { return passport; }
    void setPassport(Passport passport) { this.passport = passport; }

    public SectionType getType() { return type; }
    public void setType(SectionType type) { this.type = type; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getRemedialSuggestion() { return remedialSuggestion; }
    public void setRemedialSuggestion(String remedialSuggestion) {
        this.remedialSuggestion = remedialSuggestion;
    }

    public boolean isPublished() { return published; }
    public void setPublished(boolean published) { this.published = published; }

    public VisibilityLevel getVisibilityLevel() { return visibilityLevel; }
    public void setVisibilityLevel(VisibilityLevel visibilityLevel) {
        this.visibilityLevel = visibilityLevel;
    }

    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }

    public User getCreatedBy() { return createdBy; }
    public User getLastEditedBy() { return lastEditedBy; }
    public void setLastEditedBy(User lastEditedBy) { this.lastEditedBy = lastEditedBy; }

    public ContentStatus getStatus() { return status; }
    public void setStatus(ContentStatus status) { this.status = status; }

    public boolean isChildModeContribution() { return childModeContribution; }
    public void setChildModeContribution(boolean childModeContribution) { this.childModeContribution = childModeContribution; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}

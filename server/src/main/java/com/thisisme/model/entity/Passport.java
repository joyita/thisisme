package com.thisisme.model.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "passports", indexes = {
    @Index(name = "idx_passports_created_by", columnList = "created_by_id")
})
@EntityListeners(AuditingEntityListener.class)
public class Passport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank
    @Size(max = 100)
    @Column(nullable = false)
    private String childFirstName;

    @Column
    private LocalDate childDateOfBirth;

    @Column
    private String childAvatar;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_user_id")
    private User subjectUser;

    @Column(nullable = false)
    private boolean childViewShowHates = false;

    @OneToMany(mappedBy = "passport", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("type ASC, displayOrder ASC, createdAt ASC")
    private List<PassportSection> sections = new ArrayList<>();

    @OneToMany(mappedBy = "passport", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<PassportPermission> permissions = new HashSet<>();

    @OneToMany(mappedBy = "passport", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt DESC")
    private List<PassportRevision> revisions = new ArrayList<>();

    @OneToMany(mappedBy = "passport", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt DESC")
    private List<TimelineEntry> timelineEntries = new ArrayList<>();

    @OneToMany(mappedBy = "passport", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Document> documents = new ArrayList<>();

    @OneToMany(mappedBy = "passport", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<ShareLink> shareLinks = new HashSet<>();

    @Column(nullable = false)
    private boolean wizardComplete = false;

    @Column(nullable = false)
    private boolean active = true;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private Instant updatedAt;

    // For soft delete / data retention
    @Column
    private Instant deletedAt;

    @Column
    private Instant scheduledForDeletionAt;

    protected Passport() {}

    public Passport(String childFirstName, User createdBy) {
        this.childFirstName = childFirstName;
        this.createdBy = createdBy;
    }

    // Getters and setters
    public UUID getId() { return id; }

    public String getChildFirstName() { return childFirstName; }
    public void setChildFirstName(String childFirstName) { this.childFirstName = childFirstName; }

    public LocalDate getChildDateOfBirth() { return childDateOfBirth; }
    public void setChildDateOfBirth(LocalDate childDateOfBirth) { this.childDateOfBirth = childDateOfBirth; }

    public String getChildAvatar() { return childAvatar; }
    public void setChildAvatar(String childAvatar) { this.childAvatar = childAvatar; }

    public User getCreatedBy() { return createdBy; }

    public User getSubjectUser() { return subjectUser; }
    public void setSubjectUser(User subjectUser) { this.subjectUser = subjectUser; }

    public boolean isChildViewShowHates() { return childViewShowHates; }
    public void setChildViewShowHates(boolean childViewShowHates) { this.childViewShowHates = childViewShowHates; }

    public List<PassportSection> getSections() { return sections; }
    public void addSection(PassportSection section) {
        sections.add(section);
        section.setPassport(this);
    }

    public Set<PassportPermission> getPermissions() { return permissions; }
    public void addPermission(PassportPermission permission) {
        permissions.add(permission);
        permission.setPassport(this);
    }

    public List<PassportRevision> getRevisions() { return revisions; }
    public void addRevision(PassportRevision revision) {
        revisions.add(revision);
        revision.setPassport(this);
    }

    public List<TimelineEntry> getTimelineEntries() { return timelineEntries; }
    public void addTimelineEntry(TimelineEntry entry) {
        timelineEntries.add(entry);
        entry.setPassport(this);
    }

    public List<Document> getDocuments() { return documents; }
    public void addDocument(Document document) {
        documents.add(document);
        document.setPassport(this);
    }

    public Set<ShareLink> getShareLinks() { return shareLinks; }

    public boolean isWizardComplete() { return wizardComplete; }
    public void setWizardComplete(boolean wizardComplete) { this.wizardComplete = wizardComplete; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }

    public Instant getDeletedAt() { return deletedAt; }
    public void setDeletedAt(Instant deletedAt) { this.deletedAt = deletedAt; }

    public Instant getScheduledForDeletionAt() { return scheduledForDeletionAt; }
    public void setScheduledForDeletionAt(Instant scheduledForDeletionAt) {
        this.scheduledForDeletionAt = scheduledForDeletionAt;
    }
}

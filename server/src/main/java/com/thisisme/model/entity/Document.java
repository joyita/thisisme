package com.thisisme.model.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "documents", indexes = {
    @Index(name = "idx_documents_passport", columnList = "passport_id"),
    @Index(name = "idx_documents_timeline", columnList = "timeline_entry_id"),
    @Index(name = "idx_documents_uploaded_by", columnList = "uploaded_by_id")
})
@EntityListeners(AuditingEntityListener.class)
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passport_id", nullable = false)
    private Passport passport;

    /**
     * Optional link to timeline entry (if attached to an entry)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "timeline_entry_id")
    private TimelineEntry timelineEntry;

    @NotBlank
    @Column(nullable = false)
    private String fileName;

    @NotBlank
    @Column(nullable = false)
    private String originalFileName;

    @NotBlank
    @Column(nullable = false)
    private String mimeType;

    @Column(nullable = false)
    private long fileSize;

    /**
     * S3 key/path for the encrypted file
     */
    @NotBlank
    @Column(nullable = false)
    private String storagePath;

    /**
     * ID of the encryption key used (for key rotation)
     */
    @Column(nullable = false)
    private String encryptionKeyId;

    /**
     * SHA-256 hash of original file for integrity verification
     */
    @Column(nullable = false)
    private String contentHash;

    /**
     * OCR extracted text (if applicable)
     */
    @Column(columnDefinition = "TEXT")
    private String ocrText;

    @Column
    private Instant ocrProcessedAt;

    @Column
    private String ocrError;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by_id", nullable = false)
    private User uploadedBy;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant uploadedAt;

    @Column
    private Instant deletedAt;

    /**
     * For data retention - when file should be auto-deleted
     */
    @Column
    private Instant expiresAt;

    protected Document() {}

    public Document(Passport passport, String fileName, String originalFileName,
                   String mimeType, long fileSize, String storagePath,
                   String encryptionKeyId, String contentHash, User uploadedBy) {
        this.passport = passport;
        this.fileName = fileName;
        this.originalFileName = originalFileName;
        this.mimeType = mimeType;
        this.fileSize = fileSize;
        this.storagePath = storagePath;
        this.encryptionKeyId = encryptionKeyId;
        this.contentHash = contentHash;
        this.uploadedBy = uploadedBy;
    }

    // Getters and setters
    public UUID getId() { return id; }

    public Passport getPassport() { return passport; }
    void setPassport(Passport passport) { this.passport = passport; }

    public TimelineEntry getTimelineEntry() { return timelineEntry; }
    void setTimelineEntry(TimelineEntry timelineEntry) { this.timelineEntry = timelineEntry; }

    public String getFileName() { return fileName; }
    public String getOriginalFileName() { return originalFileName; }
    public String getMimeType() { return mimeType; }
    public long getFileSize() { return fileSize; }
    public String getStoragePath() { return storagePath; }
    public String getEncryptionKeyId() { return encryptionKeyId; }
    public String getContentHash() { return contentHash; }

    public String getOcrText() { return ocrText; }
    public void setOcrText(String ocrText) {
        this.ocrText = ocrText;
        this.ocrProcessedAt = Instant.now();
    }

    public Instant getOcrProcessedAt() { return ocrProcessedAt; }

    public String getOcrError() { return ocrError; }
    public void setOcrError(String ocrError) {
        this.ocrError = ocrError;
        this.ocrProcessedAt = Instant.now();
    }

    public User getUploadedBy() { return uploadedBy; }
    public Instant getUploadedAt() { return uploadedAt; }

    public Instant getDeletedAt() { return deletedAt; }
    public void setDeletedAt(Instant deletedAt) { this.deletedAt = deletedAt; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }

    public boolean isDeleted() { return deletedAt != null; }
    public boolean isImage() { return mimeType != null && mimeType.startsWith("image/"); }
    public boolean isPdf() { return "application/pdf".equals(mimeType); }
}

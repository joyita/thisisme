package com.thisisme.service;

import com.thisisme.exception.ResourceNotFoundException;
import com.thisisme.model.dto.DocumentDTO.*;
import com.thisisme.model.entity.Document;
import com.thisisme.model.entity.Passport;
import com.thisisme.model.entity.TimelineEntry;
import com.thisisme.model.entity.User;
import com.thisisme.model.enums.AuditAction;
import com.thisisme.model.enums.EntryType;
import com.thisisme.model.enums.VisibilityLevel;
import com.thisisme.repository.DocumentRepository;
import com.thisisme.repository.PassportRepository;
import com.thisisme.repository.TimelineEntryRepository;
import com.thisisme.repository.UserRepository;
import com.thisisme.security.PermissionEvaluator;
import com.thisisme.service.OcrService.OcrResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DocumentService {

    private static final Logger logger = LoggerFactory.getLogger(DocumentService.class);

    private static final List<String> ALLOWED_MIME_TYPES = List.of(
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    private final DocumentRepository documentRepository;
    private final PassportRepository passportRepository;
    private final TimelineEntryRepository timelineRepository;
    private final UserRepository userRepository;
    private final PermissionEvaluator permissionEvaluator;
    private final AuditService auditService;
    private final StorageService storageService;
    private final OcrService ocrService;
    private final NotificationService notificationService;

    @Value("${app.storage.encryption-key-id:default-key}")
    private String encryptionKeyId;

    @Value("${app.storage.max-file-size:52428800}")
    private long maxFileSize; // 50MB default

    @Value("${app.storage.quota-per-passport:524288000}")
    private long storageQuotaPerPassport; // 500MB default

    @Value("${app.ocr.auto-timeline:true}")
    private boolean autoCreateTimelineFromOcr;

    public DocumentService(
            DocumentRepository documentRepository,
            PassportRepository passportRepository,
            TimelineEntryRepository timelineRepository,
            UserRepository userRepository,
            PermissionEvaluator permissionEvaluator,
            AuditService auditService,
            StorageService storageService,
            OcrService ocrService,
            NotificationService notificationService) {
        this.documentRepository = documentRepository;
        this.passportRepository = passportRepository;
        this.timelineRepository = timelineRepository;
        this.userRepository = userRepository;
        this.permissionEvaluator = permissionEvaluator;
        this.auditService = auditService;
        this.storageService = storageService;
        this.ocrService = ocrService;
        this.notificationService = notificationService;
    }

    /**
     * Upload a document
     */
    @Transactional
    public Document uploadDocument(UUID passportId, UUID userId, MultipartFile file,
                                   UUID timelineEntryId, String ipAddress) throws IOException {
        if (!permissionEvaluator.canUploadDocuments(passportId, userId)) {
            throw new SecurityException("You don't have permission to upload documents");
        }

        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport not found"));

        User uploader = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Validate file
        validateFile(file, passportId);

        // Generate storage path
        String storagePath = generateStoragePath(passportId, file.getOriginalFilename());

        // Calculate content hash
        String contentHash = calculateHash(file.getBytes());

        // Upload to storage
        storageService.upload(storagePath, file.getBytes(), file.getContentType());

        // Create document record
        Document document = new Document(
            passport,
            storagePath.substring(storagePath.lastIndexOf('/') + 1),
            file.getOriginalFilename(),
            file.getContentType(),
            file.getSize(),
            storagePath,
            encryptionKeyId,
            contentHash,
            uploader
        );

        // Process with OCR if it's an image
        OcrResult ocrResult = null;
        boolean ocrCompleted = false;
        if (isImageFile(file.getContentType())) {
            ocrResult = ocrService.processImage(file.getBytes(), file.getOriginalFilename(), file.getContentType());
            if (ocrResult != null && ocrResult.success()) {
                document.setOcrText(ocrResult.rawTextOrError());
                ocrCompleted = true;
                logger.info("OCR extracted {} fields from {}",
                    ocrResult.formFields() != null ? ocrResult.formFields().size() : 0,
                    file.getOriginalFilename());
            } else if (ocrResult != null) {
                document.setOcrError(ocrResult.rawTextOrError());
            }
        }

        // Link to timeline entry if provided, or create one from OCR
        TimelineEntry linkedEntry = null;
        if (timelineEntryId != null) {
            linkedEntry = timelineRepository.findById(timelineEntryId)
                .orElseThrow(() -> new ResourceNotFoundException("Timeline entry not found"));

            if (!linkedEntry.getPassport().getId().equals(passportId)) {
                throw new IllegalArgumentException("Timeline entry doesn't belong to this passport");
            }
        } else if (autoCreateTimelineFromOcr && ocrResult != null && ocrResult.success()) {
            // Auto-create timeline entry from OCR result
            linkedEntry = createTimelineEntryFromOcr(passport, uploader, ocrResult, file.getOriginalFilename());
            logger.info("Created timeline entry from OCR: {}", linkedEntry.getTitle());
        }

        if (linkedEntry != null) {
            linkedEntry.addAttachment(document);
        }

        Document saved = documentRepository.save(document);

        auditService.log(AuditAction.DOCUMENT_UPLOADED, userId, uploader.getName(), ipAddress)
            .withPassport(passport)
            .withEntity("Document", saved.getId())
            .withDescription("Uploaded document: " + file.getOriginalFilename())
            .withDataCategories("DOCUMENTS");

        // Send notification when OCR completes
        if (ocrCompleted) {
            try {
                notificationService.notifyDocumentOcrComplete(
                    userId,
                    passportId,
                    saved.getId(),
                    file.getOriginalFilename()
                );
            } catch (Exception e) {
                logger.warn("Failed to send OCR complete notification: {}", e.getMessage());
            }
        }

        logger.info("Document uploaded: {} for passport {}", saved.getId(), passportId);

        return saved;
    }

    /**
     * Get all documents for a passport
     */
    @Transactional(readOnly = true)
    public DocumentListResponse getDocuments(UUID passportId, UUID userId, String ipAddress) {
        if (!permissionEvaluator.canViewDocuments(passportId, userId)) {
            throw new SecurityException("You don't have permission to view documents");
        }

        List<Document> documents = documentRepository.findByPassportId(passportId);
        Long totalStorage = documentRepository.getTotalStorageByPassport(passportId);

        List<DocumentResponse> responses = documents.stream()
            .map(doc -> toResponse(doc))
            .collect(Collectors.toList());

        return new DocumentListResponse(
            responses,
            totalStorage != null ? totalStorage : 0L,
            storageQuotaPerPassport
        );
    }

    /**
     * Get a document by ID
     */
    @Transactional(readOnly = true)
    public Document getDocument(UUID documentId, UUID userId, String ipAddress) {
        Document document = documentRepository.findById(documentId)
            .orElseThrow(() -> new ResourceNotFoundException("Document not found"));

        if (document.isDeleted()) {
            throw new ResourceNotFoundException("Document not found");
        }

        UUID passportId = document.getPassport().getId();
        if (!permissionEvaluator.canViewDocuments(passportId, userId)) {
            throw new SecurityException("You don't have permission to view this document");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        auditService.log(AuditAction.DOCUMENT_VIEWED, userId, user.getName(), ipAddress)
            .withPassport(document.getPassport())
            .withEntity("Document", documentId)
            .withDescription("Viewed document: " + document.getOriginalFileName());

        return document;
    }

    /**
     * Generate a pre-signed download URL
     */
    @Transactional(readOnly = true)
    public String getDownloadUrl(UUID documentId, UUID userId, String ipAddress) {
        Document document = getDocument(documentId, userId, ipAddress);

        UUID passportId = document.getPassport().getId();
        if (!permissionEvaluator.canDownloadDocuments(passportId, userId)) {
            throw new SecurityException("You don't have permission to download documents");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        auditService.log(AuditAction.DOCUMENT_DOWNLOADED, userId, user.getName(), ipAddress)
            .withPassport(document.getPassport())
            .withEntity("Document", documentId)
            .withDescription("Downloaded document: " + document.getOriginalFileName());

        return storageService.getDownloadUrl(document.getStoragePath(), document.getOriginalFileName());
    }

    /**
     * Soft delete a document
     */
    @Transactional
    public void deleteDocument(UUID documentId, UUID userId, String ipAddress) {
        Document document = documentRepository.findById(documentId)
            .orElseThrow(() -> new ResourceNotFoundException("Document not found"));

        UUID passportId = document.getPassport().getId();
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean isUploader = document.getUploadedBy().getId().equals(userId);
        boolean canDelete = permissionEvaluator.canDeleteDocuments(passportId, userId);

        if (!isUploader && !canDelete) {
            throw new SecurityException("You don't have permission to delete this document");
        }

        document.setDeletedAt(Instant.now());
        documentRepository.save(document);

        // Note: We don't delete from S3 immediately for compliance/recovery
        // A background job handles permanent deletion after retention period

        auditService.log(AuditAction.DOCUMENT_DELETED, userId, user.getName(), ipAddress)
            .withPassport(document.getPassport())
            .withEntity("Document", documentId)
            .withDescription("Deleted document: " + document.getOriginalFileName());
    }

    /**
     * Get documents for a timeline entry
     */
    @Transactional(readOnly = true)
    public List<Document> getDocumentsForTimelineEntry(UUID entryId, UUID userId, String ipAddress) {
        TimelineEntry entry = timelineRepository.findById(entryId)
            .orElseThrow(() -> new ResourceNotFoundException("Timeline entry not found"));

        UUID passportId = entry.getPassport().getId();
        if (!permissionEvaluator.canViewDocuments(passportId, userId)) {
            throw new SecurityException("You don't have permission to view documents");
        }

        return documentRepository.findByTimelineEntryId(entryId);
    }

    // Helper methods

    private void validateFile(MultipartFile file, UUID passportId) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }

        if (file.getSize() > maxFileSize) {
            throw new IllegalArgumentException("File exceeds maximum size of " + (maxFileSize / 1048576) + "MB");
        }

        if (!ALLOWED_MIME_TYPES.contains(file.getContentType())) {
            throw new IllegalArgumentException("File type not allowed: " + file.getContentType());
        }

        // Check storage quota
        Long currentUsage = documentRepository.getTotalStorageByPassport(passportId);
        if (currentUsage != null && (currentUsage + file.getSize()) > storageQuotaPerPassport) {
            throw new IllegalStateException("Storage quota exceeded");
        }
    }

    private String generateStoragePath(UUID passportId, String originalFilename) {
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        return String.format("passports/%s/documents/%s%s",
            passportId.toString(),
            UUID.randomUUID().toString(),
            extension);
    }

    private String calculateHash(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data);
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    private DocumentResponse toResponse(Document doc) {
        return new DocumentResponse(
            doc.getId(),
            doc.getPassport().getId(),
            doc.getTimelineEntry() != null ? doc.getTimelineEntry().getId() : null,
            doc.getFileName(),
            doc.getOriginalFileName(),
            doc.getMimeType(),
            doc.getFileSize(),
            null, // URL generated on-demand
            doc.getOcrText() != null,
            doc.getOcrError(),
            doc.getUploadedAt(),
            new UploaderInfo(doc.getUploadedBy().getId(), doc.getUploadedBy().getName())
        );
    }

    private boolean isImageFile(String mimeType) {
        return mimeType != null && mimeType.startsWith("image/");
    }

    /**
     * Create a timeline entry from OCR results.
     * Maps document types to appropriate EntryTypes.
     */
    private TimelineEntry createTimelineEntryFromOcr(
            Passport passport, User author, OcrResult ocrResult, String fileName) {

        EntryType entryType = mapDocumentTypeToEntryType(ocrResult.documentType());

        TimelineEntry entry = new TimelineEntry(
            passport,
            author,
            entryType,
            ocrResult.getTitle(),
            ocrResult.getContent(),
            java.time.LocalDate.now()
        );

        entry.setVisibilityLevel(VisibilityLevel.PROFESSIONALS);
        entry.addTag("scanned");
        entry.addTag("ocr");

        if (ocrResult.documentType() != null) {
            entry.addTag(ocrResult.documentType().toLowerCase().replace(" ", "-"));
        }

        return timelineRepository.save(entry);
    }

    /**
     * Map OCR document classification to timeline entry type.
     */
    private EntryType mapDocumentTypeToEntryType(String documentType) {
        if (documentType == null) {
            return EntryType.NOTE;
        }

        String type = documentType.toLowerCase();

        if (type.contains("medical") || type.contains("health") || type.contains("prescription")) {
            return EntryType.MEDICAL;
        }
        if (type.contains("school") || type.contains("report") || type.contains("assessment")) {
            return EntryType.SCHOOL_REPORT;
        }
        if (type.contains("therapy") || type.contains("speech") || type.contains("occupational")) {
            return EntryType.THERAPY;
        }
        if (type.contains("iep") || type.contains("education") || type.contains("learning")) {
            return EntryType.EDUCATIONAL;
        }
        if (type.contains("behavior") || type.contains("incident")) {
            return EntryType.BEHAVIOR;
        }

        return EntryType.NOTE;
    }
}

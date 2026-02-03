package com.thisisme.service;

import com.thisisme.exception.ResourceNotFoundException;
import com.thisisme.model.entity.Document;
import com.thisisme.model.entity.Passport;
import com.thisisme.model.entity.User;
import com.thisisme.repository.DocumentRepository;
import com.thisisme.repository.PassportRepository;
import com.thisisme.repository.TimelineEntryRepository;
import com.thisisme.repository.UserRepository;
import com.thisisme.security.PermissionEvaluator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DocumentServiceTest {

    @Mock private DocumentRepository documentRepository;
    @Mock private PassportRepository passportRepository;
    @Mock private TimelineEntryRepository timelineRepository;
    @Mock private UserRepository userRepository;
    @Mock private PermissionEvaluator permissionEvaluator;
    @Mock private AuditService auditService;
    @Mock private AuditService.AuditLogBuilder auditLogBuilder;
    @Mock private StorageService storageService;
    @Mock private OcrService ocrService;
    @Mock private NotificationService notificationService;

    private DocumentService documentService;
    private User testUser;
    private Passport testPassport;
    private Document testDocument;

    @BeforeEach
    void setUp() {
        documentService = new DocumentService(
            documentRepository,
            passportRepository,
            timelineRepository,
            userRepository,
            permissionEvaluator,
            auditService,
            storageService,
            ocrService, notificationService
        );

        // Set config values
        ReflectionTestUtils.setField(documentService, "encryptionKeyId", "test-key");
        ReflectionTestUtils.setField(documentService, "maxFileSize", 52428800L);
        ReflectionTestUtils.setField(documentService, "storageQuotaPerPassport", 524288000L);
        ReflectionTestUtils.setField(documentService, "autoCreateTimelineFromOcr", true);

        testUser = new User("Test User", "test@example.com", "hashedPassword");
        ReflectionTestUtils.setField(testUser, "id", UUID.randomUUID());

        testPassport = new Passport("Test Child", testUser);
        ReflectionTestUtils.setField(testPassport, "id", UUID.randomUUID());

        testDocument = new Document(
            testPassport,
            "file-uuid.pdf",
            "test-document.pdf",
            "application/pdf",
            1024L,
            "passports/" + testPassport.getId() + "/documents/file-uuid.pdf",
            "test-key",
            "content-hash",
            testUser
        );
        ReflectionTestUtils.setField(testDocument, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(testDocument, "uploadedAt", Instant.now());

        // Setup audit mock chain
        lenient().when(auditService.log(any(), any(), any(), any())).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withPassport(any(Passport.class))).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withPassport(any(UUID.class))).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withEntity(any(), any())).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withDescription(any())).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withDataCategories(any(String[].class))).thenReturn(auditLogBuilder);
    }

    @Test
    void uploadDocument_ShouldUploadWhenUserHasPermission() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
            "file",
            "test.pdf",
            "application/pdf",
            "PDF content".getBytes()
        );

        when(permissionEvaluator.canUploadDocuments(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(documentRepository.getTotalStorageByPassport(testPassport.getId())).thenReturn(0L);
        when(documentRepository.save(any(Document.class))).thenAnswer(i -> {
            Document d = i.getArgument(0);
            ReflectionTestUtils.setField(d, "id", UUID.randomUUID());
            return d;
        });

        Document result = documentService.uploadDocument(
            testPassport.getId(),
            testUser.getId(),
            file,
            null,
            "192.168.1.1"
        );

        assertNotNull(result);
        assertEquals("test.pdf", result.getOriginalFileName());
        assertEquals("application/pdf", result.getMimeType());

        verify(storageService).upload(any(String.class), any(byte[].class), eq("application/pdf"));
        verify(documentRepository).save(any(Document.class));
    }

    @Test
    void uploadDocument_ShouldThrowWhenUserLacksPermission() {
        MockMultipartFile file = new MockMultipartFile(
            "file", "test.pdf", "application/pdf", "content".getBytes()
        );

        when(permissionEvaluator.canUploadDocuments(testPassport.getId(), testUser.getId())).thenReturn(false);

        assertThrows(SecurityException.class, () ->
            documentService.uploadDocument(testPassport.getId(), testUser.getId(), file, null, "192.168.1.1")
        );
    }

    @Test
    void uploadDocument_ShouldThrowForInvalidFileType() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
            "file", "test.exe", "application/x-msdownload", "content".getBytes()
        );

        when(permissionEvaluator.canUploadDocuments(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(documentRepository.getTotalStorageByPassport(testPassport.getId())).thenReturn(0L);

        assertThrows(IllegalArgumentException.class, () ->
            documentService.uploadDocument(testPassport.getId(), testUser.getId(), file, null, "192.168.1.1")
        );
    }

    @Test
    void uploadDocument_ShouldThrowWhenQuotaExceeded() throws IOException {
        MockMultipartFile file = new MockMultipartFile(
            "file", "test.pdf", "application/pdf", "content".getBytes()
        );

        when(permissionEvaluator.canUploadDocuments(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(documentRepository.getTotalStorageByPassport(testPassport.getId())).thenReturn(524288000L); // At quota

        assertThrows(IllegalStateException.class, () ->
            documentService.uploadDocument(testPassport.getId(), testUser.getId(), file, null, "192.168.1.1")
        );
    }

    @Test
    void getDocuments_ShouldReturnDocumentList() {
        when(permissionEvaluator.canViewDocuments(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(documentRepository.findByPassportId(testPassport.getId())).thenReturn(List.of(testDocument));
        when(documentRepository.getTotalStorageByPassport(testPassport.getId())).thenReturn(1024L);

        var result = documentService.getDocuments(testPassport.getId(), testUser.getId(), "192.168.1.1");

        assertNotNull(result);
        assertEquals(1, result.documents().size());
        assertEquals(1024L, result.totalStorageBytes());
    }

    @Test
    void getDocument_ShouldReturnDocumentWhenUserHasPermission() {
        when(documentRepository.findById(testDocument.getId())).thenReturn(Optional.of(testDocument));
        when(permissionEvaluator.canViewDocuments(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));

        Document result = documentService.getDocument(testDocument.getId(), testUser.getId(), "192.168.1.1");

        assertNotNull(result);
        assertEquals(testDocument.getId(), result.getId());
    }

    @Test
    void getDocument_ShouldThrowWhenDocumentDeleted() {
        testDocument.setDeletedAt(Instant.now());

        when(documentRepository.findById(testDocument.getId())).thenReturn(Optional.of(testDocument));

        assertThrows(ResourceNotFoundException.class, () ->
            documentService.getDocument(testDocument.getId(), testUser.getId(), "192.168.1.1")
        );
    }

    @Test
    void deleteDocument_ShouldSoftDeleteWhenUserIsUploader() {
        when(documentRepository.findById(testDocument.getId())).thenReturn(Optional.of(testDocument));
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(permissionEvaluator.canDeleteDocuments(testPassport.getId(), testUser.getId())).thenReturn(false);
        when(documentRepository.save(any(Document.class))).thenAnswer(i -> i.getArgument(0));

        documentService.deleteDocument(testDocument.getId(), testUser.getId(), "192.168.1.1");

        verify(documentRepository).save(argThat(doc -> doc.getDeletedAt() != null));
    }

    @Test
    void deleteDocument_ShouldThrowWhenNotUploaderOrOwner() {
        User otherUser = new User("Other User", "other@example.com", "hash");
        ReflectionTestUtils.setField(otherUser, "id", UUID.randomUUID());

        when(documentRepository.findById(testDocument.getId())).thenReturn(Optional.of(testDocument));
        when(userRepository.findById(otherUser.getId())).thenReturn(Optional.of(otherUser));
        when(permissionEvaluator.canDeleteDocuments(testPassport.getId(), otherUser.getId())).thenReturn(false);

        assertThrows(SecurityException.class, () ->
            documentService.deleteDocument(testDocument.getId(), otherUser.getId(), "192.168.1.1")
        );
    }

    @Test
    void getDownloadUrl_ShouldGenerateUrl() {
        when(documentRepository.findById(testDocument.getId())).thenReturn(Optional.of(testDocument));
        when(permissionEvaluator.canViewDocuments(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(permissionEvaluator.canDownloadDocuments(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(storageService.getDownloadUrl(testDocument.getStoragePath(), testDocument.getOriginalFileName()))
            .thenReturn("https://storage.example.com/download/file");

        String url = documentService.getDownloadUrl(testDocument.getId(), testUser.getId(), "192.168.1.1");

        assertNotNull(url);
        assertEquals("https://storage.example.com/download/file", url);
    }
}

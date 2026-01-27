package com.thisisme.service;

import com.thisisme.model.entity.*;
import com.thisisme.model.enums.EntryType;
import com.thisisme.model.enums.SectionType;
import com.thisisme.model.enums.VisibilityLevel;
import com.thisisme.repository.*;
import com.thisisme.security.PermissionEvaluator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ExportServiceTest {

    @Mock private PassportRepository passportRepository;
    @Mock private TimelineEntryRepository timelineRepository;
    @Mock private DocumentRepository documentRepository;
    @Mock private UserRepository userRepository;
    @Mock private PermissionEvaluator permissionEvaluator;
    @Mock private AuditService auditService;
    @Mock private AuditService.AuditLogBuilder auditLogBuilder;

    private ExportService exportService;
    private User testUser;
    private Passport testPassport;
    private PassportSection testSection;
    private TimelineEntry testEntry;
    private Document testDocument;

    @BeforeEach
    void setUp() {
        exportService = new ExportService(
            passportRepository,
            timelineRepository,
            documentRepository,
            userRepository,
            permissionEvaluator,
            auditService
        );

        testUser = new User("Test User", "test@example.com", "hashedPassword");
        ReflectionTestUtils.setField(testUser, "id", UUID.randomUUID());

        testPassport = new Passport("Test Child", testUser);
        ReflectionTestUtils.setField(testPassport, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(testPassport, "createdAt", Instant.now());

        testSection = new PassportSection(testPassport, SectionType.LOVES, "Loves dinosaurs and trains", testUser);
        testSection.setVisibilityLevel(VisibilityLevel.ALL);
        ReflectionTestUtils.setField(testSection, "id", UUID.randomUUID());

        List<PassportSection> sections = new ArrayList<>();
        sections.add(testSection);
        ReflectionTestUtils.setField(testPassport, "sections", sections);

        testEntry = new TimelineEntry(testPassport, testUser, EntryType.MILESTONE,
            "First Word", "Said 'mama' today!", LocalDate.now());
        testEntry.setVisibilityLevel(VisibilityLevel.ALL);
        ReflectionTestUtils.setField(testEntry, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(testEntry, "createdAt", Instant.now());
        ReflectionTestUtils.setField(testEntry, "tags", new HashSet<>(Set.of("speech")));

        testDocument = new Document(testPassport, "doc.pdf", "report.pdf", "application/pdf",
            1024L, "path/to/doc", "key", "hash", testUser);
        ReflectionTestUtils.setField(testDocument, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(testDocument, "uploadedAt", Instant.now());

        // Setup audit mock chain
        lenient().when(auditService.log(any(), any(), any(), any())).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withPassport(any(UUID.class))).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withPassport(any(Passport.class))).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withDescription(any())).thenReturn(auditLogBuilder);
    }

    @Test
    void exportAsJson_ShouldGenerateValidJson() {
        when(permissionEvaluator.canView(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));
        when(timelineRepository.findByPassportId(eq(testPassport.getId()), any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of(testEntry)));
        when(documentRepository.findByPassportId(testPassport.getId())).thenReturn(List.of(testDocument));
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));

        String json = exportService.exportAsJson(testPassport.getId(), testUser.getId(), "192.168.1.1");

        assertNotNull(json);
        assertTrue(json.contains("THISISME_PASSPORT_EXPORT"));
        assertTrue(json.contains("Test Child"));
        assertTrue(json.contains("LOVES"));
        assertTrue(json.contains("First Word"));
        assertTrue(json.contains("report.pdf"));
    }

    @Test
    void exportAsCsv_ShouldGenerateValidCsv() {
        when(permissionEvaluator.canView(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));
        when(timelineRepository.findByPassportId(eq(testPassport.getId()), any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of(testEntry)));
        when(documentRepository.findByPassportId(testPassport.getId())).thenReturn(List.of(testDocument));
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));

        String csv = exportService.exportAsCsv(testPassport.getId(), testUser.getId(), "192.168.1.1");

        assertNotNull(csv);
        assertTrue(csv.startsWith("Section,Type,Date,Title,Content"));
        assertTrue(csv.contains("Test Child"));
        assertTrue(csv.contains("LOVES"));
        assertTrue(csv.contains("MILESTONE"));
        assertTrue(csv.contains("report.pdf"));
    }

    @Test
    void exportAsMarkdown_ShouldGenerateValidMarkdown() {
        when(permissionEvaluator.canView(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));
        when(timelineRepository.findByPassportId(eq(testPassport.getId()), any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of(testEntry)));
        when(documentRepository.findByPassportId(testPassport.getId())).thenReturn(List.of(testDocument));
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));

        String md = exportService.exportAsMarkdown(testPassport.getId(), testUser.getId(), "192.168.1.1");

        assertNotNull(md);
        assertTrue(md.startsWith("# Passport for Test Child"));
        assertTrue(md.contains("## Basic Information"));
        assertTrue(md.contains("## About Me"));
        assertTrue(md.contains("### Loves"));
        assertTrue(md.contains("## Timeline"));
        assertTrue(md.contains("## Documents"));
    }

    @Test
    void exportAsHtml_ShouldGenerateValidHtml() {
        when(permissionEvaluator.canView(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));
        when(timelineRepository.findByPassportId(eq(testPassport.getId()), any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of(testEntry)));
        when(documentRepository.findByPassportId(testPassport.getId())).thenReturn(List.of());
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));

        String html = exportService.exportAsHtml(testPassport.getId(), testUser.getId(), "192.168.1.1");

        assertNotNull(html);
        assertTrue(html.startsWith("<!DOCTYPE html>"));
        assertTrue(html.contains("<title>Passport for Test Child</title>"));
        assertTrue(html.contains("Loves dinosaurs and trains"));
        assertTrue(html.contains("First Word"));
    }

    @Test
    void exportAsJson_ShouldThrowWhenNoAccess() {
        when(permissionEvaluator.canView(testPassport.getId(), testUser.getId())).thenReturn(false);

        assertThrows(SecurityException.class, () ->
            exportService.exportAsJson(testPassport.getId(), testUser.getId(), "192.168.1.1")
        );
    }

    @Test
    void exportAsCsv_ShouldEscapeSpecialCharacters() {
        testSection = new PassportSection(testPassport, SectionType.NEEDS,
            "Needs \"quiet time\" and breaks\nMultiple lines", testUser);
        testSection.setVisibilityLevel(VisibilityLevel.ALL);
        ReflectionTestUtils.setField(testSection, "id", UUID.randomUUID());

        List<PassportSection> sections = new ArrayList<>();
        sections.add(testSection);
        ReflectionTestUtils.setField(testPassport, "sections", sections);

        when(permissionEvaluator.canView(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));
        when(timelineRepository.findByPassportId(eq(testPassport.getId()), any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of()));
        when(documentRepository.findByPassportId(testPassport.getId())).thenReturn(List.of());
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));

        String csv = exportService.exportAsCsv(testPassport.getId(), testUser.getId(), "192.168.1.1");

        assertNotNull(csv);
        // Quotes should be escaped as double quotes
        assertTrue(csv.contains("\"\"quiet time\"\""));
        // Newlines should be replaced with space
        assertFalse(csv.contains("\nMultiple"));
    }

    @Test
    void exportAsHtml_ShouldEscapeHtmlCharacters() {
        testSection = new PassportSection(testPassport, SectionType.NEEDS,
            "Needs <script>alert('xss')</script>", testUser);
        testSection.setVisibilityLevel(VisibilityLevel.ALL);
        ReflectionTestUtils.setField(testSection, "id", UUID.randomUUID());

        List<PassportSection> sections = new ArrayList<>();
        sections.add(testSection);
        ReflectionTestUtils.setField(testPassport, "sections", sections);

        when(permissionEvaluator.canView(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));
        when(timelineRepository.findByPassportId(eq(testPassport.getId()), any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of()));
        when(documentRepository.findByPassportId(testPassport.getId())).thenReturn(List.of());
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));

        String html = exportService.exportAsHtml(testPassport.getId(), testUser.getId(), "192.168.1.1");

        assertNotNull(html);
        // Script tags should be escaped
        assertTrue(html.contains("&lt;script&gt;"));
        assertFalse(html.contains("<script>"));
    }
}

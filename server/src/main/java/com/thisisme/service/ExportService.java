package com.thisisme.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.thisisme.exception.ResourceNotFoundException;
import com.thisisme.model.entity.*;
import com.thisisme.model.enums.AuditAction;
import com.thisisme.repository.*;
import com.thisisme.security.PermissionEvaluator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ExportService {

    private final PassportRepository passportRepository;
    private final TimelineEntryRepository timelineRepository;
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final PermissionEvaluator permissionEvaluator;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public ExportService(
            PassportRepository passportRepository,
            TimelineEntryRepository timelineRepository,
            DocumentRepository documentRepository,
            UserRepository userRepository,
            PermissionEvaluator permissionEvaluator,
            AuditService auditService) {
        this.passportRepository = passportRepository;
        this.timelineRepository = timelineRepository;
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.permissionEvaluator = permissionEvaluator;
        this.auditService = auditService;

        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.enable(SerializationFeature.INDENT_OUTPUT);
        this.objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    /**
     * Export passport as JSON
     */
    @Transactional(readOnly = true)
    public String exportAsJson(UUID passportId, UUID userId, String ipAddress) {
        validateAccess(passportId, userId);

        Map<String, Object> export = buildExportData(passportId, userId, ipAddress);

        try {
            return objectMapper.writeValueAsString(export);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate JSON export", e);
        }
    }

    /**
     * Export passport as CSV
     */
    @Transactional(readOnly = true)
    public String exportAsCsv(UUID passportId, UUID userId, String ipAddress) {
        validateAccess(passportId, userId);

        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport not found"));

        StringBuilder csv = new StringBuilder();

        // Header
        csv.append("Section,Type,Date,Title,Content\n");

        // Passport info
        csv.append("\"Passport Info\",\"Name\",\"")
            .append(passport.getCreatedAt() != null ? passport.getCreatedAt().toString() : "")
            .append("\",\"Child Name\",\"")
            .append(escapeCSV(passport.getChildFirstName()))
            .append("\"\n");

        if (passport.getChildDateOfBirth() != null) {
            csv.append("\"Passport Info\",\"DOB\",\"\",\"Date of Birth\",\"")
                .append(passport.getChildDateOfBirth().toString())
                .append("\"\n");
        }

        // Sections
        for (PassportSection section : passport.getSections()) {
            csv.append("\"Section\",\"")
                .append(section.getType().name())
                .append("\",\"\",\"")
                .append(section.getType().name())
                .append("\",\"")
                .append(escapeCSV(section.getContent()))
                .append("\"\n");
        }

        // Timeline entries
        List<TimelineEntry> entries = timelineRepository.findByPassportId(passportId,
            org.springframework.data.domain.PageRequest.of(0, 1000)).getContent();

        for (TimelineEntry entry : entries) {
            csv.append("\"Timeline\",\"")
                .append(entry.getEntryType().name())
                .append("\",\"")
                .append(entry.getEntryDate().toString())
                .append("\",\"")
                .append(escapeCSV(entry.getTitle()))
                .append("\",\"")
                .append(escapeCSV(entry.getContent()))
                .append("\"\n");
        }

        // Documents (metadata only)
        List<Document> documents = documentRepository.findByPassportId(passportId);
        for (Document doc : documents) {
            csv.append("\"Document\",\"")
                .append(doc.getMimeType())
                .append("\",\"")
                .append(doc.getUploadedAt() != null ? doc.getUploadedAt().toString() : "")
                .append("\",\"")
                .append(escapeCSV(doc.getOriginalFileName()))
                .append("\",\"")
                .append(doc.getFileSize() + " bytes")
                .append("\"\n");
        }

        logExport(passportId, userId, "CSV", ipAddress);

        return csv.toString();
    }

    /**
     * Export passport as Markdown
     */
    @Transactional(readOnly = true)
    public String exportAsMarkdown(UUID passportId, UUID userId, String ipAddress) {
        validateAccess(passportId, userId);

        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport not found"));

        StringBuilder md = new StringBuilder();

        // Title
        md.append("# Passport for ").append(passport.getChildFirstName()).append("\n\n");
        md.append("*Exported: ").append(Instant.now().toString()).append("*\n\n");

        // Basic Info
        md.append("## Basic Information\n\n");
        md.append("| Field | Value |\n");
        md.append("|-------|-------|\n");
        md.append("| Name | ").append(passport.getChildFirstName()).append(" |\n");
        if (passport.getChildDateOfBirth() != null) {
            md.append("| Date of Birth | ").append(passport.getChildDateOfBirth()).append(" |\n");
        }
        md.append("\n");

        // Sections
        if (!passport.getSections().isEmpty()) {
            md.append("## About Me\n\n");
            for (PassportSection section : passport.getSections()) {
                md.append("### ").append(formatSectionType(section.getType().name())).append("\n\n");
                md.append(section.getContent()).append("\n\n");
            }
        }

        // Timeline
        List<TimelineEntry> entries = timelineRepository.findByPassportId(passportId,
            org.springframework.data.domain.PageRequest.of(0, 100)).getContent();

        if (!entries.isEmpty()) {
            md.append("## Timeline\n\n");

            // Group by type
            Map<String, List<TimelineEntry>> byType = entries.stream()
                .collect(Collectors.groupingBy(e -> e.getEntryType().name()));

            for (Map.Entry<String, List<TimelineEntry>> group : byType.entrySet()) {
                md.append("### ").append(formatSectionType(group.getKey())).append("s\n\n");

                for (TimelineEntry entry : group.getValue()) {
                    md.append("#### ").append(entry.getTitle()).append("\n");
                    md.append("*").append(entry.getEntryDate()).append("*\n\n");
                    md.append(entry.getContent()).append("\n\n");
                }
            }
        }

        // Documents
        List<Document> documents = documentRepository.findByPassportId(passportId);
        if (!documents.isEmpty()) {
            md.append("## Documents\n\n");
            md.append("| File Name | Type | Size | Uploaded |\n");
            md.append("|-----------|------|------|----------|\n");

            for (Document doc : documents) {
                md.append("| ").append(doc.getOriginalFileName())
                    .append(" | ").append(doc.getMimeType())
                    .append(" | ").append(formatFileSize(doc.getFileSize()))
                    .append(" | ").append(formatDate(doc.getUploadedAt()))
                    .append(" |\n");
            }
            md.append("\n");
        }

        // Footer
        md.append("---\n");
        md.append("*Generated by ThisIsMe - Care Coordination Platform*\n");

        logExport(passportId, userId, "Markdown", ipAddress);

        return md.toString();
    }

    /**
     * Export passport as printable HTML
     */
    @Transactional(readOnly = true)
    public String exportAsHtml(UUID passportId, UUID userId, String ipAddress) {
        validateAccess(passportId, userId);

        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport not found"));

        StringBuilder html = new StringBuilder();

        html.append("<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n");
        html.append("<meta charset=\"UTF-8\">\n");
        html.append("<title>Passport for ").append(escapeHtml(passport.getChildFirstName())).append("</title>\n");
        html.append("<style>\n");
        html.append("body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }\n");
        html.append("h1 { color: #2563eb; }\n");
        html.append("h2 { color: #1e40af; border-bottom: 2px solid #2563eb; padding-bottom: 5px; }\n");
        html.append("h3 { color: #3b82f6; }\n");
        html.append(".section { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 10px 0; }\n");
        html.append(".timeline-entry { border-left: 3px solid #2563eb; padding-left: 15px; margin: 15px 0; }\n");
        html.append(".date { color: #6b7280; font-size: 0.9em; }\n");
        html.append("table { width: 100%; border-collapse: collapse; }\n");
        html.append("th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }\n");
        html.append("th { background: #f3f4f6; }\n");
        html.append("@media print { .no-print { display: none; } }\n");
        html.append("</style>\n</head>\n<body>\n");

        html.append("<h1>Passport for ").append(escapeHtml(passport.getChildFirstName())).append("</h1>\n");

        // Basic info
        html.append("<h2>Basic Information</h2>\n");
        html.append("<table>\n");
        html.append("<tr><th>Name</th><td>").append(escapeHtml(passport.getChildFirstName())).append("</td></tr>\n");
        if (passport.getChildDateOfBirth() != null) {
            html.append("<tr><th>Date of Birth</th><td>").append(passport.getChildDateOfBirth()).append("</td></tr>\n");
        }
        html.append("</table>\n");

        // Sections
        if (!passport.getSections().isEmpty()) {
            html.append("<h2>About Me</h2>\n");
            for (PassportSection section : passport.getSections()) {
                html.append("<div class=\"section\">\n");
                html.append("<h3>").append(formatSectionType(section.getType().name())).append("</h3>\n");
                html.append("<p>").append(escapeHtml(section.getContent())).append("</p>\n");
                html.append("</div>\n");
            }
        }

        // Timeline
        List<TimelineEntry> entries = timelineRepository.findByPassportId(passportId,
            org.springframework.data.domain.PageRequest.of(0, 50)).getContent();

        if (!entries.isEmpty()) {
            html.append("<h2>Recent Timeline</h2>\n");
            for (TimelineEntry entry : entries) {
                html.append("<div class=\"timeline-entry\">\n");
                html.append("<h4>").append(escapeHtml(entry.getTitle())).append("</h4>\n");
                html.append("<p class=\"date\">").append(entry.getEntryDate()).append(" - ")
                    .append(formatSectionType(entry.getEntryType().name())).append("</p>\n");
                html.append("<p>").append(escapeHtml(entry.getContent())).append("</p>\n");
                html.append("</div>\n");
            }
        }

        html.append("<hr>\n");
        html.append("<p class=\"no-print\"><em>Generated by ThisIsMe on ").append(LocalDate.now()).append("</em></p>\n");
        html.append("</body>\n</html>");

        logExport(passportId, userId, "HTML", ipAddress);

        return html.toString();
    }

    // Helper methods

    private void validateAccess(UUID passportId, UUID userId) {
        if (!permissionEvaluator.canView(passportId, userId)) {
            throw new SecurityException("You don't have permission to export this passport");
        }
    }

    private Map<String, Object> buildExportData(UUID passportId, UUID userId, String ipAddress) {
        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport not found"));

        Map<String, Object> export = new LinkedHashMap<>();
        export.put("exportType", "THISISME_PASSPORT_EXPORT");
        export.put("exportVersion", "1.0");
        export.put("exportDate", Instant.now().toString());

        // Passport data
        Map<String, Object> passportData = new LinkedHashMap<>();
        passportData.put("id", passport.getId());
        passportData.put("childFirstName", passport.getChildFirstName());
        passportData.put("childDateOfBirth", passport.getChildDateOfBirth());
        passportData.put("createdAt", passport.getCreatedAt());

        // Sections
        List<Map<String, Object>> sections = passport.getSections().stream()
            .map(s -> {
                Map<String, Object> section = new LinkedHashMap<>();
                section.put("type", s.getType().name());
                section.put("content", s.getContent());
                section.put("visibilityLevel", s.getVisibilityLevel().name());
                return section;
            })
            .collect(Collectors.toList());
        passportData.put("sections", sections);

        export.put("passport", passportData);

        // Timeline entries
        List<TimelineEntry> entries = timelineRepository.findByPassportId(passportId,
            org.springframework.data.domain.PageRequest.of(0, 1000)).getContent();

        List<Map<String, Object>> timelineData = entries.stream()
            .map(e -> {
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("id", e.getId());
                entry.put("entryType", e.getEntryType().name());
                entry.put("title", e.getTitle());
                entry.put("content", e.getContent());
                entry.put("entryDate", e.getEntryDate());
                entry.put("visibilityLevel", e.getVisibilityLevel().name());
                entry.put("tags", e.getTags());
                entry.put("pinned", e.isPinned());
                entry.put("createdAt", e.getCreatedAt());
                return entry;
            })
            .collect(Collectors.toList());
        export.put("timeline", timelineData);

        // Documents (metadata)
        List<Document> documents = documentRepository.findByPassportId(passportId);
        List<Map<String, Object>> documentsData = documents.stream()
            .map(d -> {
                Map<String, Object> doc = new LinkedHashMap<>();
                doc.put("id", d.getId());
                doc.put("fileName", d.getOriginalFileName());
                doc.put("mimeType", d.getMimeType());
                doc.put("fileSize", d.getFileSize());
                doc.put("hasOcrText", d.getOcrText() != null);
                doc.put("uploadedAt", d.getUploadedAt());
                return doc;
            })
            .collect(Collectors.toList());
        export.put("documents", documentsData);

        logExport(passportId, userId, "JSON", ipAddress);

        return export;
    }

    private void logExport(UUID passportId, UUID userId, String format, String ipAddress) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        auditService.log(AuditAction.DATA_EXPORT_COMPLETED, userId, user.getName(), ipAddress)
            .withPassport(passportId)
            .withDescription("Exported passport as " + format);
    }

    private String escapeCSV(String value) {
        if (value == null) return "";
        return value.replace("\"", "\"\"").replace("\n", " ");
    }

    private String escapeHtml(String value) {
        if (value == null) return "";
        return value
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("\n", "<br>");
    }

    private String formatSectionType(String type) {
        return type.charAt(0) + type.substring(1).toLowerCase().replace("_", " ");
    }

    private String formatFileSize(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1048576) return (bytes / 1024) + " KB";
        return String.format("%.1f MB", bytes / 1048576.0);
    }

    private String formatDate(Instant instant) {
        if (instant == null) return "";
        return DateTimeFormatter.ISO_LOCAL_DATE.format(
            instant.atZone(java.time.ZoneId.systemDefault()).toLocalDate());
    }
}

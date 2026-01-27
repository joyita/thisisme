package com.thisisme.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.thisisme.model.entity.*;
import com.thisisme.model.enums.AuditAction;
import com.thisisme.model.enums.DataRequestType;
import com.thisisme.model.enums.RequestStatus;
import com.thisisme.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Service for handling UK GDPR data subject rights (Articles 15-21).
 */
@Service
public class PrivacyRightsService {

    private final DataRequestRepository dataRequestRepository;
    private final UserRepository userRepository;
    private final PassportRepository passportRepository;
    private final ConsentRepository consentRepository;
    private final AuditLogRepository auditLogRepository;
    private final TimelineEntryRepository timelineEntryRepository;
    private final DocumentRepository documentRepository;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public PrivacyRightsService(
            DataRequestRepository dataRequestRepository,
            UserRepository userRepository,
            PassportRepository passportRepository,
            ConsentRepository consentRepository,
            AuditLogRepository auditLogRepository,
            TimelineEntryRepository timelineEntryRepository,
            DocumentRepository documentRepository,
            AuditService auditService) {
        this.dataRequestRepository = dataRequestRepository;
        this.userRepository = userRepository;
        this.passportRepository = passportRepository;
        this.consentRepository = consentRepository;
        this.auditLogRepository = auditLogRepository;
        this.timelineEntryRepository = timelineEntryRepository;
        this.documentRepository = documentRepository;
        this.auditService = auditService;

        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.enable(SerializationFeature.INDENT_OUTPUT);
        this.objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    /**
     * Submit a Subject Access Request (Art 15)
     */
    @Transactional
    public DataRequest submitAccessRequest(UUID userId, String details, String ipAddress) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        DataRequest request = new DataRequest(user, DataRequestType.ACCESS, details);
        DataRequest saved = dataRequestRepository.save(request);

        auditService.log(AuditAction.DATA_ACCESS_REQUEST, userId, user.getName(), ipAddress)
            .withEntity("DataRequest", saved.getId())
            .withDescription("Subject Access Request submitted")
            .save();

        return saved;
    }

    /**
     * Submit an erasure request (Art 17 - Right to be forgotten)
     */
    @Transactional
    public DataRequest submitErasureRequest(UUID userId, String details, String ipAddress) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        DataRequest request = new DataRequest(user, DataRequestType.ERASURE, details);
        DataRequest saved = dataRequestRepository.save(request);

        auditService.log(AuditAction.DATA_ERASURE_REQUESTED, userId, user.getName(), ipAddress)
            .withEntity("DataRequest", saved.getId())
            .withDescription("Erasure request submitted")
            .save();

        return saved;
    }

    /**
     * Submit a data portability request (Art 20)
     */
    @Transactional
    public DataRequest submitPortabilityRequest(UUID userId, String details, String ipAddress) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        DataRequest request = new DataRequest(user, DataRequestType.PORTABILITY, details);
        DataRequest saved = dataRequestRepository.save(request);

        auditService.log(AuditAction.DATA_EXPORT_REQUESTED, userId, user.getName(), ipAddress)
            .withEntity("DataRequest", saved.getId())
            .withDescription("Data portability request submitted")
            .save();

        return saved;
    }

    /**
     * Generate data export for SAR or portability (JSON format)
     */
    @Transactional(readOnly = true)
    public Map<String, Object> generateDataExport(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Map<String, Object> export = new LinkedHashMap<>();

        // Metadata
        export.put("exportDate", Instant.now().toString());
        export.put("exportType", "UK_GDPR_SAR");
        export.put("dataController", "ThisIsMe");

        // User data
        Map<String, Object> userData = new LinkedHashMap<>();
        userData.put("id", user.getId());
        userData.put("name", user.getName());
        userData.put("email", user.getEmail());
        userData.put("emailVerified", user.isEmailVerified());
        userData.put("createdAt", user.getCreatedAt());
        userData.put("lastLoginAt", user.getLastLoginAt());
        export.put("userData", userData);

        // Passports
        List<Map<String, Object>> passports = new ArrayList<>();
        for (Passport passport : passportRepository.findAllByCreator(userId)) {
            passports.add(exportPassport(passport));
        }
        export.put("passports", passports);

        // Consent records
        List<Map<String, Object>> consents = new ArrayList<>();
        for (Consent consent : consentRepository.findAllByUser(userId)) {
            Map<String, Object> c = new LinkedHashMap<>();
            c.put("id", consent.getId());
            c.put("type", consent.getType());
            c.put("lawfulBasis", consent.getLawfulBasis());
            c.put("consentText", consent.getConsentText());
            c.put("policyVersion", consent.getPolicyVersion());
            c.put("grantedAt", consent.getGrantedAt());
            c.put("withdrawnAt", consent.getWithdrawnAt());
            c.put("withdrawalReason", consent.getWithdrawalReason());
            consents.add(c);
        }
        export.put("consentRecords", consents);

        return export;
    }

    private Map<String, Object> exportPassport(Passport passport) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("id", passport.getId());
        p.put("childFirstName", passport.getChildFirstName());
        p.put("childDateOfBirth", passport.getChildDateOfBirth());
        p.put("createdAt", passport.getCreatedAt());
        p.put("updatedAt", passport.getUpdatedAt());

        // Sections
        List<Map<String, Object>> sections = new ArrayList<>();
        for (PassportSection section : passport.getSections()) {
            Map<String, Object> s = new LinkedHashMap<>();
            s.put("type", section.getType());
            s.put("content", section.getContent());
            s.put("remedialSuggestion", section.getRemedialSuggestion());
            s.put("createdAt", section.getCreatedAt());
            sections.add(s);
        }
        p.put("sections", sections);

        // Timeline entries
        List<Map<String, Object>> timeline = new ArrayList<>();
        for (TimelineEntry entry : passport.getTimelineEntries()) {
            if (entry.getDeletedAt() == null) {
                Map<String, Object> t = new LinkedHashMap<>();
                t.put("id", entry.getId());
                t.put("entryType", entry.getEntryType());
                t.put("title", entry.getTitle());
                t.put("content", entry.getContent());
                t.put("entryDate", entry.getEntryDate());
                t.put("createdAt", entry.getCreatedAt());
                timeline.add(t);
            }
        }
        p.put("timelineEntries", timeline);

        return p;
    }

    /**
     * Export data as JSON string
     */
    public String exportAsJson(UUID userId) {
        try {
            return objectMapper.writeValueAsString(generateDataExport(userId));
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate JSON export", e);
        }
    }

    /**
     * Export data as CSV (simplified format for timeline/sections)
     */
    public String exportAsCsv(UUID userId) {
        StringBuilder csv = new StringBuilder();

        // Header
        csv.append("Type,Date,Title,Content\n");

        // Get all passports and their data
        for (Passport passport : passportRepository.findAllByCreator(userId)) {
            // Sections
            for (PassportSection section : passport.getSections()) {
                csv.append(escapeCsv("Section: " + section.getType())).append(",");
                csv.append(escapeCsv(section.getCreatedAt().toString())).append(",");
                csv.append(escapeCsv(section.getType().name())).append(",");
                csv.append(escapeCsv(section.getContent())).append("\n");
            }

            // Timeline
            for (TimelineEntry entry : passport.getTimelineEntries()) {
                if (entry.getDeletedAt() == null) {
                    csv.append(escapeCsv("Timeline: " + entry.getEntryType())).append(",");
                    csv.append(escapeCsv(entry.getEntryDate().toString())).append(",");
                    csv.append(escapeCsv(entry.getTitle())).append(",");
                    csv.append(escapeCsv(entry.getContent())).append("\n");
                }
            }
        }

        return csv.toString();
    }

    /**
     * Process erasure request - soft delete user data
     */
    @Transactional
    public void processErasure(UUID userId, UUID handledById, String ipAddress) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        User handledBy = userRepository.findById(handledById)
            .orElseThrow(() -> new IllegalArgumentException("Handler not found"));

        // Schedule passports for deletion (30-day grace period)
        Instant deletionDate = Instant.now().plus(30, ChronoUnit.DAYS);
        for (Passport passport : passportRepository.findAllByCreator(userId)) {
            passport.setScheduledForDeletionAt(deletionDate);
            passport.setActive(false);
            passportRepository.save(passport);
        }

        // Anonymize user data
        user.setName("Deleted User");
        user.setEmail("deleted_" + user.getId() + "@deleted.local");
        user.setActive(false);
        userRepository.save(user);

        auditService.log(AuditAction.DATA_ERASURE_COMPLETED, userId, "Deleted User", ipAddress)
            .withDescription("User data scheduled for erasure")
            .save();

        // Update data request
        List<DataRequest> requests = dataRequestRepository.findByRequesterIdAndStatus(
            userId, RequestStatus.IN_PROGRESS);
        for (DataRequest request : requests) {
            if (request.getType() == DataRequestType.ERASURE) {
                request.complete("Data anonymized and scheduled for deletion", handledBy);
                dataRequestRepository.save(request);
            }
        }
    }

    /**
     * Get pending requests (for admin dashboard)
     */
    public List<DataRequest> getPendingRequests() {
        return dataRequestRepository.findByStatusIn(
            List.of(RequestStatus.PENDING, RequestStatus.IN_PROGRESS, RequestStatus.EXTENDED));
    }

    /**
     * Get overdue requests
     */
    public List<DataRequest> getOverdueRequests() {
        return dataRequestRepository.findOverdue(Instant.now());
    }

    /**
     * Get user's requests
     */
    public List<DataRequest> getUserRequests(UUID userId) {
        return dataRequestRepository.findByRequesterId(userId);
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}

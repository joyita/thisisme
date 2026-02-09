package com.thisisme.model.dto;

import com.thisisme.model.enums.SectionType;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

public class ShareDTO {

    public record CreateShareLinkRequest(
        String label,
        Set<SectionType> visibleSections,
        boolean showTimeline,
        boolean showDocuments,
        Integer expiresInDays,
        String password,
        String timelineVisibilityLevel
    ) {}

    public record ShareLinkResponse(
        UUID id,
        String token,
        String shareUrl,
        String label,
        Set<SectionType> visibleSections,
        boolean showTimeline,
        boolean showDocuments,
        String timelineVisibilityLevel,
        Instant expiresAt,
        boolean isPasswordProtected,
        int accessCount,
        Instant lastAccessedAt,
        Instant createdAt,
        boolean active
    ) {}

    public record SharedPassportResponse(
        UUID passportId,
        String childFirstName,
        java.time.LocalDate childDateOfBirth,
        java.util.List<SectionInfo> sections,
        java.util.List<TimelineEntryInfo> timelineEntries,
        java.util.List<DocumentInfo> documents
    ) {}

    public record SectionInfo(
        SectionType type,
        String content,
        String remedialSuggestion
    ) {}

    public record TimelineEntryInfo(
        String title,
        String content,
        String entryType,
        java.time.LocalDate entryDate
    ) {}

    public record DocumentInfo(
        String fileName,
        String mimeType,
        long fileSize
    ) {}

    public record VerifyPasswordRequest(
        String password
    ) {}

    public record ShareAccessResponse(
        boolean requiresPassword,
        boolean isExpired,
        String passportChildName
    ) {}
}

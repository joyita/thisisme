package com.thisisme.model.dto;

import com.thisisme.model.enums.SectionType;
import com.thisisme.model.enums.VisibilityLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class PassportDTO {

    public record CreatePassportRequest(
        @NotBlank @Size(max = 100) String childFirstName,
        LocalDate childDateOfBirth,
        boolean consentToHealthDataProcessing
    ) {}

    public record UpdatePassportRequest(
        @Size(max = 100) String childFirstName,
        LocalDate childDateOfBirth,
        String childAvatar
    ) {}

    public record PassportResponse(
        UUID id,
        String childFirstName,
        LocalDate childDateOfBirth,
        String childAvatar,
        UUID createdById,
        String createdByName,
        boolean wizardComplete,
        Map<SectionType, List<SectionResponse>> sections,
        String userRole,
        Instant createdAt,
        Instant updatedAt
    ) {}

    public record PassportSummaryResponse(
        UUID id,
        String childFirstName,
        LocalDate childDateOfBirth,
        String childAvatar,
        boolean wizardComplete,
        Instant updatedAt
    ) {}

    public record SectionResponse(
        UUID id,
        SectionType type,
        String content,
        String remedialSuggestion,
        boolean published,
        VisibilityLevel visibilityLevel,
        int displayOrder,
        String createdByName,
        String lastEditedByName,
        Integer revisionCount,
        Instant createdAt,
        Instant updatedAt
    ) {}

    public record CreateSectionRequest(
        @NotNull SectionType type,
        @NotBlank String content,
        String remedialSuggestion,
        VisibilityLevel visibilityLevel
    ) {}

    public record UpdateSectionRequest(
        String content,
        String remedialSuggestion,
        Boolean published,
        VisibilityLevel visibilityLevel,
        Integer displayOrder
    ) {}

    public record SectionRevisionResponse(
        UUID id,
        String content,
        String remedialSuggestion,
        String changeType,
        UUID authorId,
        String authorName,
        Instant timestamp
    ) {}

    public record RestoreSectionRequest(
        @NotNull UUID revisionId
    ) {}

    public record ReorderSectionsRequest(
        @NotNull List<ReorderItem> items
    ) {}

    public record ReorderItem(
        @NotNull UUID sectionId,
        int displayOrder
    ) {}

    public record AddPermissionRequest(
        @NotBlank String email,
        @NotBlank String role,
        String notes
    ) {}

    public record PermissionResponse(
        UUID id,
        UUID userId,
        String userName,
        String userEmail,
        String role,
        boolean canViewTimeline,
        boolean canAddTimelineEntries,
        boolean canViewDocuments,
        boolean canUploadDocuments,
        Instant grantedAt,
        String notes
    ) {}
}

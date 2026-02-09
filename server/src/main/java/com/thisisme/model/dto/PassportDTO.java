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
        String notes,
        UUID customRoleId
    ) {}

    public record PermissionResponse(
        UUID id,
        UUID userId,
        String userName,
        String userEmail,
        String role,
        String customRoleName,
        // Passport
        boolean canViewPassport,
        boolean canEditPassport,
        boolean canDeletePassport,
        boolean canManagePermissions,
        boolean canCreateShareLinks,
        // Sections
        boolean canViewSections,
        boolean canEditSections,
        boolean canDeleteSections,
        boolean canPublishSections,
        boolean canReorderSections,
        // Timeline
        boolean canViewTimeline,
        boolean canAddTimelineEntries,
        boolean canEditTimelineEntries,
        boolean canDeleteTimelineEntries,
        boolean canCommentOnTimeline,
        boolean canReactOnTimeline,
        // Documents
        boolean canViewDocuments,
        boolean canUploadDocuments,
        boolean canDownloadDocuments,
        boolean canDeleteDocuments,
        Instant grantedAt,
        String notes
    ) {}

    public record UpdatePermissionRequest(
        Boolean canViewPassport,
        Boolean canEditPassport,
        Boolean canDeletePassport,
        Boolean canManagePermissions,
        Boolean canCreateShareLinks,
        Boolean canViewSections,
        Boolean canEditSections,
        Boolean canDeleteSections,
        Boolean canPublishSections,
        Boolean canReorderSections,
        Boolean canViewTimeline,
        Boolean canAddTimelineEntries,
        Boolean canEditTimelineEntries,
        Boolean canDeleteTimelineEntries,
        Boolean canCommentOnTimeline,
        Boolean canReactOnTimeline,
        Boolean canViewDocuments,
        Boolean canUploadDocuments,
        Boolean canDownloadDocuments,
        Boolean canDeleteDocuments
    ) {}

    // Invitation DTOs
    public record InvitationResponse(
        UUID id,
        String email,
        String role,
        String customRoleName,
        String status,
        String invitedByName,
        Instant createdAt,
        Instant expiresAt,
        String notes,
        String inviteLink
    ) {}

    // Custom-role DTOs
    public record CreateCustomRoleRequest(
        @NotBlank @Size(max = 64) String name,
        @Size(max = 256) String description,
        // 20 permission flags — all required
        @NotNull Boolean canViewPassport,
        @NotNull Boolean canEditPassport,
        @NotNull Boolean canDeletePassport,
        @NotNull Boolean canManagePermissions,
        @NotNull Boolean canCreateShareLinks,
        @NotNull Boolean canViewSections,
        @NotNull Boolean canEditSections,
        @NotNull Boolean canDeleteSections,
        @NotNull Boolean canPublishSections,
        @NotNull Boolean canReorderSections,
        @NotNull Boolean canViewTimeline,
        @NotNull Boolean canAddTimelineEntries,
        @NotNull Boolean canEditTimelineEntries,
        @NotNull Boolean canDeleteTimelineEntries,
        @NotNull Boolean canCommentOnTimeline,
        @NotNull Boolean canReactOnTimeline,
        @NotNull Boolean canViewDocuments,
        @NotNull Boolean canUploadDocuments,
        @NotNull Boolean canDownloadDocuments,
        @NotNull Boolean canDeleteDocuments
    ) {}

    public record UpdateCustomRoleRequest(
        @Size(max = 64) String name,
        String description,
        Boolean canViewPassport,
        Boolean canEditPassport,
        Boolean canDeletePassport,
        Boolean canManagePermissions,
        Boolean canCreateShareLinks,
        Boolean canViewSections,
        Boolean canEditSections,
        Boolean canDeleteSections,
        Boolean canPublishSections,
        Boolean canReorderSections,
        Boolean canViewTimeline,
        Boolean canAddTimelineEntries,
        Boolean canEditTimelineEntries,
        Boolean canDeleteTimelineEntries,
        Boolean canCommentOnTimeline,
        Boolean canReactOnTimeline,
        Boolean canViewDocuments,
        Boolean canUploadDocuments,
        Boolean canDownloadDocuments,
        Boolean canDeleteDocuments
    ) {}

    public record CustomRoleResponse(
        UUID id,
        String name,
        String description,
        String createdByName,
        Instant createdAt,
        Instant updatedAt,
        boolean canViewPassport,
        boolean canEditPassport,
        boolean canDeletePassport,
        boolean canManagePermissions,
        boolean canCreateShareLinks,
        boolean canViewSections,
        boolean canEditSections,
        boolean canDeleteSections,
        boolean canPublishSections,
        boolean canReorderSections,
        boolean canViewTimeline,
        boolean canAddTimelineEntries,
        boolean canEditTimelineEntries,
        boolean canDeleteTimelineEntries,
        boolean canCommentOnTimeline,
        boolean canReactOnTimeline,
        boolean canViewDocuments,
        boolean canUploadDocuments,
        boolean canDownloadDocuments,
        boolean canDeleteDocuments
    ) {}

    public record ResendInvitationRequest(
        @NotNull UUID invitationId
    ) {}
}

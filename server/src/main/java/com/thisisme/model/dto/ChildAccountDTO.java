package com.thisisme.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class ChildAccountDTO {

    public record CreateChildAccountRequest(
        @NotBlank @Size(min = 3, max = 50) String username,
        @NotBlank @Size(min = 6, max = 100) String password
    ) {}

    public record ResetChildPasswordRequest(
        @NotBlank @Size(min = 6, max = 100) String newPassword
    ) {}

    public record ChildAccountResponse(
        UUID userId,
        String username,
        boolean active,
        Instant createdAt
    ) {}

    public record VerifyPasswordRequest(
        @NotBlank String password
    ) {}

    public record ReviewContributionRequest(
        boolean approve
    ) {}

    public record ChildViewSettingsRequest(
        boolean showHates
    ) {}

    public record PendingReviewsResponse(
        List<PendingSection> sections,
        List<PendingTimelineEntry> timelineEntries
    ) {}

    public record PendingSection(
        UUID id,
        String sectionType,
        String content,
        String remedialSuggestion,
        String createdByName,
        Instant createdAt
    ) {}

    public record PendingTimelineEntry(
        UUID id,
        String entryType,
        String title,
        String content,
        String createdByName,
        Instant createdAt
    ) {}
}

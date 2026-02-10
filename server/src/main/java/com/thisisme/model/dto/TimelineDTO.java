package com.thisisme.model.dto;

import com.thisisme.model.enums.EntryType;
import com.thisisme.model.enums.Role;
import com.thisisme.model.enums.VisibilityLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public class TimelineDTO {

    public record CreateTimelineEntryRequest(
        @NotNull EntryType entryType,
        @NotBlank String title,
        String content,
        @NotNull LocalDate entryDate,
        VisibilityLevel visibilityLevel,
        Set<Role> visibleToRoles,
        Set<String> tags,
        Set<UUID> mentionedUserIds,
        Map<String, Object> metadata
    ) {}

    public record UpdateTimelineEntryRequest(
        String title,
        String content,
        EntryType entryType,
        LocalDate entryDate,
        VisibilityLevel visibilityLevel,
        Set<Role> visibleToRoles,
        Set<String> tags,
        Boolean pinned,
        Set<UUID> mentionedUserIds,
        Map<String, Object> metadata
    ) {}

    public record FlagEntryRequest(
        Boolean flaggedForFollowup,
        LocalDate followupDueDate
    ) {}

    public record TimelineEntryResponse(
        UUID id,
        UUID passportId,
        AuthorInfo author,
        EntryType entryType,
        String title,
        String content,
        LocalDate entryDate,
        VisibilityLevel visibilityLevel,
        Set<Role> visibleToRoles,
        Set<String> tags,
        boolean pinned,
        int attachmentCount,
        Instant createdAt,
        Instant updatedAt,
        boolean flaggedForFollowup,
        LocalDate followupDueDate,
        Set<UUID> mentionedUserIds,
        Map<String, Object> metadata
    ) {}

    public record AuthorInfo(
        UUID id,
        String name,
        String role
    ) {}

    public record CollaboratorInfo(
        UUID id,
        String name,
        String email,
        String role
    ) {}

    public record TimelineFilterRequest(
        Set<EntryType> entryTypes,
        LocalDate startDate,
        LocalDate endDate,
        Set<String> tags,
        Boolean pinnedOnly,
        Boolean flaggedOnly,
        String searchQuery,
        int page,
        int size
    ) {
        public TimelineFilterRequest {
            if (page < 0) page = 0;
            if (size <= 0 || size > 100) size = 20;
        }
    }

    public record TimelinePageResponse(
        List<TimelineEntryResponse> entries,
        int currentPage,
        int totalPages,
        long totalElements,
        boolean hasNext,
        boolean hasPrevious
    ) {}
}

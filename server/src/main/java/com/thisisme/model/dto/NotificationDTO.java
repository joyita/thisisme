package com.thisisme.model.dto;

import com.thisisme.model.enums.NotificationType;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * DTOs for notification features.
 */
public class NotificationDTO {

    // === Response DTOs ===

    public record NotificationResponse(
        UUID id,
        NotificationType notificationType,
        String title,
        String message,
        ActorInfo actor,
        UUID passportId,
        UUID timelineEntryId,
        UUID commentId,
        UUID documentId,
        Instant createdAt,
        Instant readAt,
        boolean isRead
    ) {}

    public record ActorInfo(
        UUID id,
        String name
    ) {}

    public record NotificationPageResponse(
        List<NotificationResponse> notifications,
        int currentPage,
        int totalPages,
        long totalElements,
        boolean hasNext,
        boolean hasPrevious
    ) {}

    public record UnreadCountResponse(
        long count
    ) {}

    // === Preference DTOs ===

    public record NotificationPreferenceResponse(
        NotificationType notificationType,
        String displayName,
        String description,
        boolean enabled
    ) {}

    public record UpdatePreferenceRequest(
        @NotNull NotificationType notificationType,
        @NotNull Boolean enabled
    ) {}

    // === Helper to get display info for notification types ===
    public static NotificationPreferenceResponse toPreferenceResponse(NotificationType type, boolean enabled) {
        return new NotificationPreferenceResponse(
            type,
            getDisplayName(type),
            getDescription(type),
            enabled
        );
    }

    private static String getDisplayName(NotificationType type) {
        return switch (type) {
            case COMMENT_ON_YOUR_ENTRY -> "Comments on your entries";
            case MENTIONED_IN_COMMENT -> "Mentions in comments";
            case REACTION_ON_YOUR_ENTRY -> "Reactions to your entries";
            case PERMISSION_GRANTED -> "Access granted";
            case PERMISSION_REVOKED -> "Access revoked";
            case DOCUMENT_OCR_COMPLETE -> "Document processing complete";
        };
    }

    private static String getDescription(NotificationType type) {
        return switch (type) {
            case COMMENT_ON_YOUR_ENTRY -> "When someone comments on a timeline entry you created";
            case MENTIONED_IN_COMMENT -> "When someone @mentions you in a comment";
            case REACTION_ON_YOUR_ENTRY -> "When someone reacts to a timeline entry you created";
            case PERMISSION_GRANTED -> "When someone shares a passport with you";
            case PERMISSION_REVOKED -> "When your access to a passport is removed";
            case DOCUMENT_OCR_COMPLETE -> "When document text extraction finishes";
        };
    }
}

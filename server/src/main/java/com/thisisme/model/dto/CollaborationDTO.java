package com.thisisme.model.dto;

import com.thisisme.model.enums.ReactionType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * DTOs for timeline collaboration features (comments, reactions, mentions).
 */
public class CollaborationDTO {

    // === Comment DTOs ===

    public record CreateCommentRequest(
        @NotBlank @Size(max = 2000) String content,
        Set<UUID> mentionedUserIds
    ) {}

    public record UpdateCommentRequest(
        @NotBlank @Size(max = 2000) String content
    ) {}

    public record CommentResponse(
        UUID id,
        UUID entryId,
        AuthorInfo author,
        String content,
        Set<UUID> mentionedUserIds,
        Instant createdAt,
        Instant updatedAt,
        boolean isEdited
    ) {}

    public record AuthorInfo(
        UUID id,
        String name,
        String role
    ) {}

    // === Reaction DTOs ===

    public record AddReactionRequest(
        @NotNull ReactionType reactionType
    ) {}

    public record ReactionResponse(
        UUID id,
        UUID entryId,
        UUID userId,
        String userName,
        ReactionType reactionType,
        Instant createdAt
    ) {}

    public record ReactionSummary(
        Map<ReactionType, Long> counts,
        Set<ReactionType> userReactions
    ) {}

    // === Notification DTOs ===

    public record MentionNotification(
        UUID id,
        UUID passportId,
        UUID entryId,
        UUID commentId,
        UUID mentionedByUserId,
        String mentionedByUserName,
        String entryTitle,
        String commentSnippet,
        Instant createdAt,
        boolean isRead
    ) {}
}

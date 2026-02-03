package com.thisisme.service;

import com.thisisme.exception.ResourceNotFoundException;
import com.thisisme.model.dto.CollaborationDTO.*;
import com.thisisme.model.entity.TimelineComment;
import com.thisisme.model.entity.TimelineEntry;
import com.thisisme.model.entity.TimelineReaction;
import com.thisisme.model.entity.User;
import com.thisisme.model.enums.ReactionType;
import com.thisisme.model.enums.Role;
import com.thisisme.repository.TimelineCommentRepository;
import com.thisisme.repository.TimelineEntryRepository;
import com.thisisme.repository.TimelineReactionRepository;
import com.thisisme.repository.UserRepository;
import com.thisisme.security.PermissionEvaluator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class CollaborationService {

    private static final Logger logger = LoggerFactory.getLogger(CollaborationService.class);

    private final TimelineCommentRepository commentRepository;
    private final TimelineReactionRepository reactionRepository;
    private final TimelineEntryRepository entryRepository;
    private final UserRepository userRepository;
    private final PermissionEvaluator permissionEvaluator;
    private final NotificationService notificationService;

    public CollaborationService(
            TimelineCommentRepository commentRepository,
            TimelineReactionRepository reactionRepository,
            TimelineEntryRepository entryRepository,
            UserRepository userRepository,
            PermissionEvaluator permissionEvaluator,
            NotificationService notificationService) {
        this.commentRepository = commentRepository;
        this.reactionRepository = reactionRepository;
        this.entryRepository = entryRepository;
        this.userRepository = userRepository;
        this.permissionEvaluator = permissionEvaluator;
        this.notificationService = notificationService;
    }

    // === Comments ===

    @Transactional
    public CommentResponse addComment(UUID entryId, UUID userId, CreateCommentRequest request) {
        TimelineEntry entry = entryRepository.findById(entryId)
            .orElseThrow(() -> new ResourceNotFoundException("Entry not found"));

        UUID passportId = entry.getPassport().getId();
        if (!permissionEvaluator.canCommentOnTimeline(passportId, userId)) {
            throw new SecurityException("You don't have permission to comment on this entry");
        }

        User author = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        TimelineComment comment = new TimelineComment(entry, author, request.content());
        if (request.mentionedUserIds() != null) {
            comment.setMentionedUserIds(request.mentionedUserIds());
        }

        TimelineComment saved = commentRepository.save(comment);

        // Send notifications
        try {
            // Notify entry author (if not the commenter)
            User entryAuthor = entry.getAuthor();
            if (!entryAuthor.getId().equals(userId)) {
                notificationService.notifyCommentOnEntry(
                    entryAuthor, author, passportId, entryId, saved.getId(), entry.getTitle()
                );
            }

            // Notify mentioned users
            if (request.mentionedUserIds() != null) {
                for (UUID mentionedUserId : request.mentionedUserIds()) {
                    if (!mentionedUserId.equals(userId)) {
                        notificationService.notifyMentionInComment(
                            mentionedUserId, author, passportId, entryId, saved.getId()
                        );
                    }
                }
            }
        } catch (Exception e) {
            logger.warn("Failed to send comment notifications: {}", e.getMessage());
        }

        return toCommentResponse(saved, passportId);
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> getComments(UUID entryId, UUID userId) {
        TimelineEntry entry = entryRepository.findById(entryId)
            .orElseThrow(() -> new ResourceNotFoundException("Entry not found"));

        UUID passportId = entry.getPassport().getId();
        if (!permissionEvaluator.canViewTimeline(passportId, userId)) {
            throw new SecurityException("You don't have permission to view comments");
        }

        return commentRepository.findByEntryId(entryId).stream()
            .map(c -> toCommentResponse(c, passportId))
            .collect(Collectors.toList());
    }

    @Transactional
    public CommentResponse updateComment(UUID commentId, UUID userId, UpdateCommentRequest request) {
        TimelineComment comment = commentRepository.findById(commentId)
            .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));

        if (!comment.getAuthor().getId().equals(userId)) {
            throw new SecurityException("You can only edit your own comments");
        }

        comment.setContent(request.content());
        TimelineComment saved = commentRepository.save(comment);
        return toCommentResponse(saved, comment.getEntry().getPassport().getId());
    }

    @Transactional
    public void deleteComment(UUID commentId, UUID userId) {
        TimelineComment comment = commentRepository.findById(commentId)
            .orElseThrow(() -> new ResourceNotFoundException("Comment not found"));

        UUID passportId = comment.getEntry().getPassport().getId();
        boolean isAuthor = comment.getAuthor().getId().equals(userId);
        boolean isOwner = permissionEvaluator.isOwner(passportId, userId);

        if (!isAuthor && !isOwner) {
            throw new SecurityException("You don't have permission to delete this comment");
        }

        comment.setDeletedAt(Instant.now());
        commentRepository.save(comment);
    }

    // === Reactions ===

    @Transactional
    public ReactionResponse addReaction(UUID entryId, UUID userId, AddReactionRequest request) {
        TimelineEntry entry = entryRepository.findById(entryId)
            .orElseThrow(() -> new ResourceNotFoundException("Entry not found"));

        UUID passportId = entry.getPassport().getId();
        if (!permissionEvaluator.canReactOnTimeline(passportId, userId)) {
            throw new SecurityException("You don't have permission to react to this entry");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Check if already reacted with this type
        Optional<TimelineReaction> existing = reactionRepository
            .findByEntryIdAndUserIdAndReactionType(entryId, userId, request.reactionType());

        if (existing.isPresent()) {
            return toReactionResponse(existing.get());
        }

        TimelineReaction reaction = new TimelineReaction(entry, user, request.reactionType());
        TimelineReaction saved = reactionRepository.save(reaction);

        // Send notification to entry author
        try {
            User entryAuthor = entry.getAuthor();
            if (!entryAuthor.getId().equals(userId)) {
                notificationService.notifyReactionOnEntry(
                    entryAuthor, user, passportId, entryId, entry.getTitle(), request.reactionType().name()
                );
            }
        } catch (Exception e) {
            logger.warn("Failed to send reaction notification: {}", e.getMessage());
        }

        return toReactionResponse(saved);
    }

    @Transactional
    public void removeReaction(UUID entryId, UUID userId, ReactionType reactionType) {
        reactionRepository.deleteByEntryIdAndUserIdAndReactionType(entryId, userId, reactionType);
    }

    @Transactional(readOnly = true)
    public ReactionSummary getReactionSummary(UUID entryId, UUID userId) {
        List<Object[]> counts = reactionRepository.countByEntryIdGroupByType(entryId);

        Map<ReactionType, Long> countMap = new EnumMap<>(ReactionType.class);
        for (Object[] row : counts) {
            countMap.put((ReactionType) row[0], (Long) row[1]);
        }

        Set<ReactionType> userReactions = reactionRepository.findByEntryId(entryId).stream()
            .filter(r -> r.getUser().getId().equals(userId))
            .map(TimelineReaction::getReactionType)
            .collect(Collectors.toSet());

        return new ReactionSummary(countMap, userReactions);
    }

    // === Helper methods ===

    private CommentResponse toCommentResponse(TimelineComment comment, UUID passportId) {
        Role authorRole = permissionEvaluator.getRole(passportId, comment.getAuthor().getId());
        return new CommentResponse(
            comment.getId(),
            comment.getEntry().getId(),
            new AuthorInfo(
                comment.getAuthor().getId(),
                comment.getAuthor().getName(),
                authorRole != null ? authorRole.toApiName() : "VIEWER"
            ),
            comment.getContent(),
            new HashSet<>(comment.getMentionedUserIds()),
            comment.getCreatedAt(),
            comment.getUpdatedAt(),
            comment.getUpdatedAt() != null
        );
    }

    private ReactionResponse toReactionResponse(TimelineReaction reaction) {
        return new ReactionResponse(
            reaction.getId(),
            reaction.getEntry().getId(),
            reaction.getUser().getId(),
            reaction.getUser().getName(),
            reaction.getReactionType(),
            reaction.getCreatedAt()
        );
    }
}

package com.thisisme.service;

import com.thisisme.exception.ResourceNotFoundException;
import com.thisisme.model.dto.NotificationDTO;
import com.thisisme.model.dto.NotificationDTO.*;
import com.thisisme.model.entity.Notification;
import com.thisisme.model.entity.NotificationPreference;
import com.thisisme.model.entity.User;
import com.thisisme.model.enums.NotificationType;
import com.thisisme.repository.NotificationPreferenceRepository;
import com.thisisme.repository.NotificationRepository;
import com.thisisme.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notificationRepository;
    private final NotificationPreferenceRepository preferenceRepository;
    private final UserRepository userRepository;

    public NotificationService(
            NotificationRepository notificationRepository,
            NotificationPreferenceRepository preferenceRepository,
            UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.preferenceRepository = preferenceRepository;
        this.userRepository = userRepository;
    }

    // === Create Notifications ===

    @Transactional
    public Notification createNotification(
            UUID recipientId,
            NotificationType type,
            String title,
            String message,
            User actor,
            UUID passportId,
            UUID timelineEntryId,
            UUID commentId,
            UUID documentId) {

        // Don't notify yourself
        if (actor != null && actor.getId().equals(recipientId)) {
            return null;
        }

        // Check if user has disabled this notification type
        if (!isNotificationEnabled(recipientId, type)) {
            logger.debug("Notification type {} disabled for user {}", type, recipientId);
            return null;
        }

        User recipient = userRepository.findById(recipientId)
            .orElseThrow(() -> new ResourceNotFoundException("User", recipientId));

        Notification notification = new Notification(recipient, type, title, message);
        notification.setActor(actor);
        notification.setPassportId(passportId);
        notification.setTimelineEntryId(timelineEntryId);
        notification.setCommentId(commentId);
        notification.setDocumentId(documentId);

        Notification saved = notificationRepository.save(notification);
        logger.info("Created notification {} for user {}", type, recipientId);
        return saved;
    }

    // === Convenience methods for specific notification types ===

    @Transactional
    public void notifyCommentOnEntry(User entryAuthor, User commenter, UUID passportId, UUID entryId, UUID commentId, String entryTitle) {
        createNotification(
            entryAuthor.getId(),
            NotificationType.COMMENT_ON_YOUR_ENTRY,
            commenter.getName() + " commented on your entry",
            "New comment on \"" + truncate(entryTitle, 50) + "\"",
            commenter,
            passportId,
            entryId,
            commentId,
            null
        );
    }

    @Transactional
    public void notifyMentionInComment(UUID mentionedUserId, User mentioner, UUID passportId, UUID entryId, UUID commentId) {
        createNotification(
            mentionedUserId,
            NotificationType.MENTIONED_IN_COMMENT,
            mentioner.getName() + " mentioned you",
            "You were mentioned in a comment",
            mentioner,
            passportId,
            entryId,
            commentId,
            null
        );
    }

    @Transactional
    public void notifyReactionOnEntry(User entryAuthor, User reactor, UUID passportId, UUID entryId, String entryTitle, String reactionType) {
        createNotification(
            entryAuthor.getId(),
            NotificationType.REACTION_ON_YOUR_ENTRY,
            reactor.getName() + " reacted to your entry",
            reactionType + " reaction on \"" + truncate(entryTitle, 50) + "\"",
            reactor,
            passportId,
            entryId,
            null,
            null
        );
    }

    @Transactional
    public void notifyPermissionGranted(UUID recipientId, User granter, UUID passportId, String childName, String role) {
        User granter_ = granter; // For lambda capture
        createNotification(
            recipientId,
            NotificationType.PERMISSION_GRANTED,
            "You now have access to " + childName + "'s passport",
            granter_.getName() + " granted you " + role.toLowerCase() + " access",
            granter_,
            passportId,
            null,
            null,
            null
        );
    }

    @Transactional
    public void notifyPermissionRevoked(UUID recipientId, User revoker, UUID passportId, String childName) {
        createNotification(
            recipientId,
            NotificationType.PERMISSION_REVOKED,
            "Your access has been revoked",
            "You no longer have access to " + childName + "'s passport",
            revoker,
            passportId,
            null,
            null,
            null
        );
    }

    @Transactional
    public void notifyDocumentOcrComplete(UUID uploaderId, UUID passportId, UUID documentId, String fileName) {
        createNotification(
            uploaderId,
            NotificationType.DOCUMENT_OCR_COMPLETE,
            "Document processed",
            "\"" + truncate(fileName, 40) + "\" has been processed",
            null,
            passportId,
            null,
            null,
            documentId
        );
    }

    // === Read Notifications ===

    @Transactional(readOnly = true)
    public NotificationPageResponse getNotifications(UUID userId, int page, int size) {
        Page<Notification> notificationPage = notificationRepository.findByRecipientId(
            userId, PageRequest.of(page, size)
        );

        List<NotificationResponse> responses = notificationPage.getContent().stream()
            .map(this::toResponse)
            .toList();

        return new NotificationPageResponse(
            responses,
            notificationPage.getNumber(),
            notificationPage.getTotalPages(),
            notificationPage.getTotalElements(),
            notificationPage.hasNext(),
            notificationPage.hasPrevious()
        );
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countUnreadByRecipientId(userId);
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getRecentUnread(UUID userId, int limit) {
        List<Notification> notifications = notificationRepository.findRecentUnreadByRecipientId(
            userId, PageRequest.of(0, limit)
        );
        return notifications.stream()
            .map(this::toResponse)
            .toList();
    }

    // === Update Notifications ===

    @Transactional
    public void markAsRead(UUID notificationId, UUID userId) {
        Notification notification = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new ResourceNotFoundException("Notification", notificationId));

        if (!notification.getRecipient().getId().equals(userId)) {
            throw new SecurityException("You cannot modify this notification");
        }

        notification.markAsRead();
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAsUnread(UUID notificationId, UUID userId) {
        Notification notification = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new ResourceNotFoundException("Notification", notificationId));

        if (!notification.getRecipient().getId().equals(userId)) {
            throw new SecurityException("You cannot modify this notification");
        }

        notification.markAsUnread();
        notificationRepository.save(notification);
    }

    @Transactional
    public int markAllAsRead(UUID userId) {
        return notificationRepository.markAllAsReadByRecipientId(userId);
    }

    // === Preferences ===

    @Transactional(readOnly = true)
    public List<NotificationPreferenceResponse> getPreferences(UUID userId) {
        Map<NotificationType, Boolean> prefMap = new EnumMap<>(NotificationType.class);

        // Default all to true
        for (NotificationType type : NotificationType.values()) {
            prefMap.put(type, true);
        }

        // Override with user preferences
        for (NotificationPreference pref : preferenceRepository.findByUserId(userId)) {
            prefMap.put(pref.getNotificationType(), pref.isEnabled());
        }

        return prefMap.entrySet().stream()
            .map(e -> NotificationDTO.toPreferenceResponse(e.getKey(), e.getValue()))
            .toList();
    }

    @Transactional
    public void updatePreference(UUID userId, NotificationType type, boolean enabled) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        Optional<NotificationPreference> existing = preferenceRepository.findByUserIdAndType(userId, type);

        if (existing.isPresent()) {
            existing.get().setEnabled(enabled);
            preferenceRepository.save(existing.get());
        } else {
            NotificationPreference pref = new NotificationPreference(user, type, enabled);
            preferenceRepository.save(pref);
        }
    }

    @Transactional(readOnly = true)
    public boolean isNotificationEnabled(UUID userId, NotificationType type) {
        return preferenceRepository.findByUserIdAndType(userId, type)
            .map(NotificationPreference::isEnabled)
            .orElse(true); // Default to enabled
    }

    // === Helpers ===

    private NotificationResponse toResponse(Notification n) {
        ActorInfo actor = null;
        if (n.getActor() != null) {
            actor = new ActorInfo(n.getActor().getId(), n.getActor().getName());
        }

        return new NotificationResponse(
            n.getId(),
            n.getNotificationType(),
            n.getTitle(),
            n.getMessage(),
            actor,
            n.getPassportId(),
            n.getTimelineEntryId(),
            n.getCommentId(),
            n.getDocumentId(),
            n.getCreatedAt(),
            n.getReadAt(),
            n.isRead()
        );
    }

    private String truncate(String text, int maxLength) {
        if (text == null) return "";
        if (text.length() <= maxLength) return text;
        return text.substring(0, maxLength - 3) + "...";
    }
}

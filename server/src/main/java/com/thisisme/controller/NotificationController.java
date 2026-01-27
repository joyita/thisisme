package com.thisisme.controller;

import com.thisisme.model.dto.NotificationDTO.*;
import com.thisisme.security.UserPrincipal;
import com.thisisme.service.NotificationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<NotificationPageResponse> getNotifications(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        NotificationPageResponse response = notificationService.getNotifications(principal.id(), page, size);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/unread/count")
    public ResponseEntity<UnreadCountResponse> getUnreadCount(
            @AuthenticationPrincipal UserPrincipal principal) {
        long count = notificationService.getUnreadCount(principal.id());
        return ResponseEntity.ok(new UnreadCountResponse(count));
    }

    @GetMapping("/unread/recent")
    public ResponseEntity<List<NotificationResponse>> getRecentUnread(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "5") int limit) {
        List<NotificationResponse> notifications = notificationService.getRecentUnread(principal.id(), limit);
        return ResponseEntity.ok(notifications);
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        notificationService.markAsRead(id, principal.id());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/unread")
    public ResponseEntity<Void> markAsUnread(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        notificationService.markAsUnread(id, principal.id());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(
            @AuthenticationPrincipal UserPrincipal principal) {
        notificationService.markAllAsRead(principal.id());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/preferences")
    public ResponseEntity<List<NotificationPreferenceResponse>> getPreferences(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<NotificationPreferenceResponse> preferences = notificationService.getPreferences(principal.id());
        return ResponseEntity.ok(preferences);
    }

    @PutMapping("/preferences")
    public ResponseEntity<Void> updatePreference(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdatePreferenceRequest request) {
        notificationService.updatePreference(principal.id(), request.notificationType(), request.enabled());
        return ResponseEntity.ok().build();
    }
}

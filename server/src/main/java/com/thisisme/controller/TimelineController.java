package com.thisisme.controller;

import com.thisisme.model.dto.TimelineDTO.*;
import com.thisisme.model.entity.TimelineEntry;
import com.thisisme.model.enums.EntryType;
import com.thisisme.model.enums.Role;
import com.thisisme.security.PermissionEvaluator;
import com.thisisme.security.UserPrincipal;
import com.thisisme.service.TimelineService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/passports/{passportId}/timeline")
public class TimelineController {

    private final TimelineService timelineService;
    private final PermissionEvaluator permissionEvaluator;

    public TimelineController(TimelineService timelineService,
                              PermissionEvaluator permissionEvaluator) {
        this.timelineService = timelineService;
        this.permissionEvaluator = permissionEvaluator;
    }

    @PostMapping
    public ResponseEntity<TimelineEntryResponse> createEntry(
            @PathVariable UUID passportId,
            @Valid @RequestBody CreateTimelineEntryRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        TimelineEntry entry = timelineService.createEntry(
            passportId,
            principal.id(),
            request,
            getClientIp(httpRequest)
        );

        return ResponseEntity.ok(toResponse(entry, passportId, principal.id()));
    }

    @GetMapping
    public ResponseEntity<TimelinePageResponse> getTimeline(
            @PathVariable UUID passportId,
            @RequestParam(required = false) Set<EntryType> types,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) Set<String> tags,
            @RequestParam(required = false) Boolean pinnedOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        TimelineFilterRequest filter = new TimelineFilterRequest(
            types,
            startDate != null ? java.time.LocalDate.parse(startDate) : null,
            endDate != null ? java.time.LocalDate.parse(endDate) : null,
            tags,
            pinnedOnly,
            page,
            size
        );

        TimelinePageResponse response = timelineService.getTimelineEntries(
            passportId,
            principal.id(),
            filter,
            getClientIp(httpRequest)
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{entryId}")
    public ResponseEntity<TimelineEntryResponse> getEntry(
            @PathVariable UUID passportId,
            @PathVariable UUID entryId,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        TimelineEntry entry = timelineService.getEntry(
            entryId,
            principal.id(),
            getClientIp(httpRequest)
        );

        return ResponseEntity.ok(toResponse(entry, passportId, principal.id()));
    }

    @PutMapping("/{entryId}")
    public ResponseEntity<TimelineEntryResponse> updateEntry(
            @PathVariable UUID passportId,
            @PathVariable UUID entryId,
            @Valid @RequestBody UpdateTimelineEntryRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        TimelineEntry entry = timelineService.updateEntry(
            entryId,
            principal.id(),
            request,
            getClientIp(httpRequest)
        );

        return ResponseEntity.ok(toResponse(entry, passportId, principal.id()));
    }

    @DeleteMapping("/{entryId}")
    public ResponseEntity<Void> deleteEntry(
            @PathVariable UUID passportId,
            @PathVariable UUID entryId,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        timelineService.deleteEntry(
            entryId,
            principal.id(),
            getClientIp(httpRequest)
        );

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/by-type/{type}")
    public ResponseEntity<List<TimelineEntryResponse>> getEntriesByType(
            @PathVariable UUID passportId,
            @PathVariable EntryType type,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        List<TimelineEntry> entries = timelineService.getEntriesByType(
            passportId,
            principal.id(),
            type,
            getClientIp(httpRequest)
        );

        List<TimelineEntryResponse> responses = entries.stream()
            .map(entry -> toResponse(entry, passportId, principal.id()))
            .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    @PostMapping("/{entryId}/pin")
    public ResponseEntity<TimelineEntryResponse> togglePin(
            @PathVariable UUID passportId,
            @PathVariable UUID entryId,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        TimelineEntry entry = timelineService.togglePin(
            entryId,
            principal.id(),
            getClientIp(httpRequest)
        );

        return ResponseEntity.ok(toResponse(entry, passportId, principal.id()));
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private TimelineEntryResponse toResponse(TimelineEntry entry, UUID passportId, UUID viewerId) {
        Role authorRole = permissionEvaluator.getRole(passportId, entry.getAuthor().getId());
        // Make defensive copies of collections to avoid LazyInitializationException
        Set<Role> visibleToRoles = entry.getVisibleToRoles() != null ? new java.util.HashSet<>(entry.getVisibleToRoles()) : Set.of();
        Set<String> tags = entry.getTags() != null ? new java.util.HashSet<>(entry.getTags()) : Set.of();
        int attachmentCount = entry.getAttachments() != null ? entry.getAttachments().size() : 0;

        return new TimelineEntryResponse(
            entry.getId(),
            entry.getPassport().getId(),
            new AuthorInfo(
                entry.getAuthor().getId(),
                entry.getAuthor().getName(),
                authorRole != null ? authorRole.name() : "VIEWER"
            ),
            entry.getEntryType(),
            entry.getTitle(),
            entry.getContent(),
            entry.getEntryDate(),
            entry.getVisibilityLevel(),
            visibleToRoles,
            tags,
            entry.isPinned(),
            attachmentCount,
            entry.getCreatedAt(),
            entry.getUpdatedAt()
        );
    }
}

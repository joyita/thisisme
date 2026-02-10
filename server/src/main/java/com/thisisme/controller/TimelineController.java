package com.thisisme.controller;

import com.thisisme.model.dto.TimelineDTO.*;
import com.thisisme.model.enums.EntryType;
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

@RestController
@RequestMapping("/api/v1/passports/{passportId}/timeline")
public class TimelineController {

    private final TimelineService timelineService;

    public TimelineController(TimelineService timelineService) {
        this.timelineService = timelineService;
    }

    @PostMapping
    public ResponseEntity<TimelineEntryResponse> createEntry(
            @PathVariable UUID passportId,
            @Valid @RequestBody CreateTimelineEntryRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        TimelineEntryResponse response = timelineService.createEntry(
            passportId,
            principal.id(),
            request,
            getClientIp(httpRequest)
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<TimelinePageResponse> getTimeline(
            @PathVariable UUID passportId,
            @RequestParam(required = false) Set<EntryType> types,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) Set<String> tags,
            @RequestParam(required = false) Boolean pinnedOnly,
            @RequestParam(required = false) Boolean flaggedOnly,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "false") boolean childView,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        if (childView) {
            // Override types to only child-allowed types
            types = Set.of(EntryType.SUCCESS, EntryType.MILESTONE, EntryType.LIKE);
        }

        TimelineFilterRequest filter = new TimelineFilterRequest(
            types,
            startDate != null ? java.time.LocalDate.parse(startDate) : null,
            endDate != null ? java.time.LocalDate.parse(endDate) : null,
            tags,
            pinnedOnly,
            flaggedOnly,
            search,
            page,
            size
        );

        TimelinePageResponse response = timelineService.getTimelineEntries(
            passportId,
            principal.id(),
            filter,
            getClientIp(httpRequest),
            childView
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{entryId}")
    public ResponseEntity<TimelineEntryResponse> getEntry(
            @PathVariable UUID passportId,
            @PathVariable UUID entryId,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        TimelineEntryResponse response = timelineService.getEntry(
            entryId,
            principal.id(),
            getClientIp(httpRequest)
        );

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{entryId}")
    public ResponseEntity<TimelineEntryResponse> updateEntry(
            @PathVariable UUID passportId,
            @PathVariable UUID entryId,
            @Valid @RequestBody UpdateTimelineEntryRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        TimelineEntryResponse response = timelineService.updateEntry(
            entryId,
            principal.id(),
            request,
            getClientIp(httpRequest)
        );

        return ResponseEntity.ok(response);
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

        List<TimelineEntryResponse> responses = timelineService.getEntriesByType(
            passportId,
            principal.id(),
            type,
            getClientIp(httpRequest)
        );

        return ResponseEntity.ok(responses);
    }

    @PostMapping("/{entryId}/pin")
    public ResponseEntity<TimelineEntryResponse> togglePin(
            @PathVariable UUID passportId,
            @PathVariable UUID entryId,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        TimelineEntryResponse response = timelineService.togglePin(
            entryId,
            principal.id(),
            getClientIp(httpRequest)
        );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{entryId}/flag")
    public ResponseEntity<TimelineEntryResponse> flagEntry(
            @PathVariable UUID passportId,
            @PathVariable UUID entryId,
            @RequestBody FlagEntryRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        TimelineEntryResponse response = timelineService.flagEntry(
            entryId,
            principal.id(),
            request,
            getClientIp(httpRequest)
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/collaborators")
    public ResponseEntity<List<CollaboratorInfo>> getCollaborators(
            @PathVariable UUID passportId,
            @AuthenticationPrincipal UserPrincipal principal) {

        List<CollaboratorInfo> collaborators = timelineService.getCollaborators(
            passportId,
            principal.id()
        );

        return ResponseEntity.ok(collaborators);
    }

    @PostMapping("/{entryId}/review")
    public ResponseEntity<Void> reviewTimelineEntry(
            @PathVariable UUID passportId,
            @PathVariable UUID entryId,
            @RequestBody com.thisisme.model.dto.ChildAccountDTO.ReviewContributionRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        timelineService.reviewTimelineEntry(
            passportId, entryId, principal.id(), request.approve(), getClientIp(httpRequest));
        return ResponseEntity.ok().build();
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}

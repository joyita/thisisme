package com.thisisme.controller;

import com.thisisme.model.entity.DataRequest;
import com.thisisme.model.enums.DataRequestType;
import com.thisisme.security.UserPrincipal;
import com.thisisme.service.PrivacyRightsService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Controller for UK GDPR data subject rights.
 */
@RestController
@RequestMapping("/api/privacy")
public class PrivacyController {

    private final PrivacyRightsService privacyRightsService;

    public PrivacyController(PrivacyRightsService privacyRightsService) {
        this.privacyRightsService = privacyRightsService;
    }

    /**
     * Submit a Subject Access Request (Art 15)
     */
    @PostMapping("/requests/access")
    public ResponseEntity<DataRequestResponse> submitAccessRequest(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody DataRequestSubmission request,
            HttpServletRequest httpRequest) {
        DataRequest dataRequest = privacyRightsService.submitAccessRequest(
            principal.id(),
            request.details(),
            getClientIp(httpRequest)
        );
        return ResponseEntity.ok(toResponse(dataRequest));
    }

    /**
     * Submit an erasure request (Art 17)
     */
    @PostMapping("/requests/erasure")
    public ResponseEntity<DataRequestResponse> submitErasureRequest(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody DataRequestSubmission request,
            HttpServletRequest httpRequest) {
        DataRequest dataRequest = privacyRightsService.submitErasureRequest(
            principal.id(),
            request.details(),
            getClientIp(httpRequest)
        );
        return ResponseEntity.ok(toResponse(dataRequest));
    }

    /**
     * Submit a portability request (Art 20)
     */
    @PostMapping("/requests/portability")
    public ResponseEntity<DataRequestResponse> submitPortabilityRequest(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody DataRequestSubmission request,
            HttpServletRequest httpRequest) {
        DataRequest dataRequest = privacyRightsService.submitPortabilityRequest(
            principal.id(),
            request.details(),
            getClientIp(httpRequest)
        );
        return ResponseEntity.ok(toResponse(dataRequest));
    }

    /**
     * Get user's data requests
     */
    @GetMapping("/requests")
    public ResponseEntity<List<DataRequestResponse>> getMyRequests(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<DataRequest> requests = privacyRightsService.getUserRequests(principal.id());
        return ResponseEntity.ok(requests.stream().map(this::toResponse).toList());
    }

    /**
     * Export my data as JSON
     */
    @GetMapping("/export/json")
    public ResponseEntity<String> exportJson(
            @AuthenticationPrincipal UserPrincipal principal) {
        String json = privacyRightsService.exportAsJson(principal.id());
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_JSON)
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"thisisme-export-" + Instant.now() + ".json\"")
            .body(json);
    }

    /**
     * Export my data as CSV
     */
    @GetMapping("/export/csv")
    public ResponseEntity<String> exportCsv(
            @AuthenticationPrincipal UserPrincipal principal) {
        String csv = privacyRightsService.exportAsCsv(principal.id());
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType("text/csv"))
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"thisisme-export-" + Instant.now() + ".csv\"")
            .body(csv);
    }

    private DataRequestResponse toResponse(DataRequest request) {
        return new DataRequestResponse(
            request.getId(),
            request.getType(),
            request.getStatus().name(),
            request.getRequestDetails(),
            request.getRequestedAt(),
            request.getEffectiveDeadline(),
            request.getCompletedAt(),
            request.isOverdue()
        );
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    public record DataRequestSubmission(String details) {}

    public record DataRequestResponse(
        UUID id,
        DataRequestType type,
        String status,
        String details,
        Instant requestedAt,
        Instant dueBy,
        Instant completedAt,
        boolean overdue
    ) {}
}

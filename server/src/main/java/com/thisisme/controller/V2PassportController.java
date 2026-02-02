package com.thisisme.controller;

import com.thisisme.model.dto.PassportDTO.*;
import com.thisisme.model.entity.PassportSection;
import com.thisisme.security.UserPrincipal;
import com.thisisme.service.PassportService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v2/passports")
public class V2PassportController {

    private final PassportService passportService;

    public V2PassportController(PassportService passportService) {
        this.passportService = passportService;
    }

    @GetMapping("/{passportId}/sections/{sectionId}/history")
    public ResponseEntity<List<SectionRevisionResponse>> getSectionHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID passportId,
            @PathVariable UUID sectionId) {
        List<SectionRevisionResponse> history = passportService.getSectionHistory(
            passportId, sectionId, principal.id());
        return ResponseEntity.ok(history);
    }

    @PostMapping("/{passportId}/sections/{sectionId}/restore")
    public ResponseEntity<SectionResponse> restoreSection(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID passportId,
            @PathVariable UUID sectionId,
            @Valid @RequestBody RestoreSectionRequest request,
            HttpServletRequest httpRequest) {
        PassportSection section = passportService.restoreSectionRevision(
            passportId, sectionId, request.revisionId(), principal.id(), getClientIp(httpRequest));
        return ResponseEntity.ok(new SectionResponse(
            section.getId(),
            section.getType(),
            section.getContent(),
            section.getRemedialSuggestion(),
            section.isPublished(),
            section.getVisibilityLevel(),
            section.getDisplayOrder(),
            section.getCreatedBy().getName(),
            section.getLastEditedBy() != null ? section.getLastEditedBy().getName() : section.getCreatedBy().getName(),
            0,  // revisionCount not needed for immediate responses
            section.getCreatedAt(),
            section.getUpdatedAt()
        ));
    }

    @PatchMapping("/{passportId}/sections/reorder")
    public ResponseEntity<Void> reorderSections(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID passportId,
            @Valid @RequestBody ReorderSectionsRequest request,
            HttpServletRequest httpRequest) {
        passportService.reorderSections(passportId, principal.id(), request, getClientIp(httpRequest));
        return ResponseEntity.noContent().build();
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}

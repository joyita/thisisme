package com.thisisme.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.thisisme.model.dto.PassportDTO.*;
import com.thisisme.model.entity.Passport;
import com.thisisme.model.entity.PassportPermission;
import com.thisisme.model.entity.PassportRevision;
import com.thisisme.model.entity.PassportSection;
import com.thisisme.model.enums.SectionType;
import com.thisisme.security.UserPrincipal;
import com.thisisme.service.PassportService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/passports")
public class PassportController {

    private final PassportService passportService;
    private final ObjectMapper objectMapper;

    public PassportController(PassportService passportService, ObjectMapper objectMapper) {
        this.passportService = passportService;
        this.objectMapper = objectMapper;
    }

    @PostMapping
    public ResponseEntity<PassportResponse> createPassport(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreatePassportRequest request,
            HttpServletRequest httpRequest) {
        Passport passport = passportService.createPassport(
            principal.id(),
            request,
            getClientIp(httpRequest),
            httpRequest.getHeader("User-Agent")
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(passport));
    }

    @GetMapping
    public ResponseEntity<List<PassportSummaryResponse>> getMyPassports(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<Passport> passports = passportService.getAccessiblePassports(principal.id());
        return ResponseEntity.ok(passports.stream().map(this::toSummaryResponse).toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PassportResponse> getPassport(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            HttpServletRequest httpRequest) {
        PassportResponse response = passportService.getPassportForRole(
            id, principal.id(), getClientIp(httpRequest));
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PassportResponse> updatePassport(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody UpdatePassportRequest request,
            HttpServletRequest httpRequest) {
        PassportResponse response = passportService.updatePassport(
            id, principal.id(), request, getClientIp(httpRequest));
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/sections")
    public ResponseEntity<SectionResponse> addSection(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody CreateSectionRequest request,
            HttpServletRequest httpRequest) {
        PassportSection section = passportService.addSection(
            id, principal.id(), request, getClientIp(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(toSectionResponse(section));
    }

    @PutMapping("/{passportId}/sections/{sectionId}")
    public ResponseEntity<SectionResponse> updateSection(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID passportId,
            @PathVariable UUID sectionId,
            @Valid @RequestBody UpdateSectionRequest request,
            HttpServletRequest httpRequest) {
        PassportSection section = passportService.updateSection(
            passportId, sectionId, principal.id(), request, getClientIp(httpRequest));
        return ResponseEntity.ok(toSectionResponse(section));
    }

    @DeleteMapping("/{passportId}/sections/{sectionId}")
    public ResponseEntity<Void> deleteSection(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID passportId,
            @PathVariable UUID sectionId,
            HttpServletRequest httpRequest) {
        passportService.deleteSection(passportId, sectionId, principal.id(), getClientIp(httpRequest));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/complete-wizard")
    public ResponseEntity<Void> completeWizard(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            HttpServletRequest httpRequest) {
        passportService.completeWizard(id, principal.id(), getClientIp(httpRequest));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<RevisionResponse>> getRevisionHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        List<PassportRevision> revisions = passportService.getRevisionHistory(id, principal.id());
        return ResponseEntity.ok(revisions.stream().map(this::toRevisionResponse).toList());
    }

    // Permission management
    @GetMapping("/{id}/permissions")
    public ResponseEntity<List<PermissionResponse>> getPermissions(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        List<PermissionResponse> permissions = passportService.getPermissions(id, principal.id());
        return ResponseEntity.ok(permissions);
    }

    @PostMapping("/{id}/permissions")
    public ResponseEntity<PermissionResponse> addPermission(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody AddPermissionRequest request,
            HttpServletRequest httpRequest) {
        PermissionResponse permission = passportService.addPermission(
            id, principal.id(), request, getClientIp(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(permission);
    }

    @DeleteMapping("/{passportId}/permissions/{permissionId}")
    public ResponseEntity<Void> revokePermission(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID passportId,
            @PathVariable UUID permissionId,
            HttpServletRequest httpRequest) {
        passportService.revokePermission(passportId, permissionId, principal.id(), getClientIp(httpRequest));
        return ResponseEntity.noContent().build();
    }

    // Helper methods
    private PassportResponse toResponse(Passport passport) {
        Map<SectionType, List<SectionResponse>> sections = passport.getSections().stream()
            .map(this::toSectionResponse)
            .collect(Collectors.groupingBy(SectionResponse::type));

        return new PassportResponse(
            passport.getId(),
            passport.getChildFirstName(),
            passport.getChildDateOfBirth(),
            passport.getChildAvatar(),
            passport.getCreatedBy().getId(),
            passport.getCreatedBy().getName(),
            passport.isWizardComplete(),
            sections,
            "OWNER",  // Only owners can create passports
            passport.getCreatedAt(),
            passport.getUpdatedAt()
        );
    }

    private PassportSummaryResponse toSummaryResponse(Passport passport) {
        return new PassportSummaryResponse(
            passport.getId(),
            passport.getChildFirstName(),
            passport.getChildDateOfBirth(),
            passport.getChildAvatar(),
            passport.isWizardComplete(),
            passport.getUpdatedAt()
        );
    }

    private SectionResponse toSectionResponse(PassportSection section) {
        return new SectionResponse(
            section.getId(),
            section.getType(),
            section.getContent(),
            section.getRemedialSuggestion(),
            section.isPublished(),
            section.getVisibilityLevel(),
            section.getDisplayOrder(),
            section.getCreatedBy().getName(),
            section.getLastEditedBy() != null ? section.getLastEditedBy().getName() : section.getCreatedBy().getName(),
            0,  // revisionCount not needed for immediate responses, will be populated on full passport fetch
            section.getCreatedAt(),
            section.getUpdatedAt()
        );
    }

    private PermissionResponse toPermissionResponse(PassportPermission permission) {
        return new PermissionResponse(
            permission.getId(),
            permission.getUser().getId(),
            permission.getUser().getName(),
            permission.getUser().getEmail(),
            permission.getRole().name(),
            permission.canViewTimeline(),
            permission.canAddTimelineEntries(),
            permission.canViewDocuments(),
            permission.canUploadDocuments(),
            permission.getGrantedAt(),
            permission.getNotes()
        );
    }

    private RevisionResponse toRevisionResponse(PassportRevision revision) {
        JsonNode snapshot;
        try {
            snapshot = objectMapper.readTree(revision.getSectionsSnapshot());
        } catch (Exception e) {
            snapshot = objectMapper.createArrayNode();
        }
        return new RevisionResponse(
            revision.getId(),
            revision.getRevisionNumber(),
            revision.getChangeDescription(),
            revision.getCreatedBy().getName(),
            revision.getCreatedAt(),
            snapshot
        );
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    public record RevisionResponse(
        UUID id,
        int revisionNumber,
        String description,
        String createdByName,
        java.time.Instant createdAt,
        JsonNode sectionsSnapshot
    ) {}
}

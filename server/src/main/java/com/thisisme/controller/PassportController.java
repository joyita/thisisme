package com.thisisme.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.thisisme.model.dto.ChildAccountDTO;
import com.thisisme.model.dto.PassportDTO.*;
import com.thisisme.model.entity.Passport;
import com.thisisme.model.entity.PassportRevision;
import com.thisisme.model.entity.PassportSection;
import com.thisisme.model.enums.SectionType;
import com.thisisme.security.UserPrincipal;
import com.thisisme.service.CustomRoleService;
import com.thisisme.service.InvitationService;
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
    private final InvitationService invitationService;
    private final CustomRoleService customRoleService;
    private final ObjectMapper objectMapper;

    public PassportController(PassportService passportService,
                              InvitationService invitationService,
                              CustomRoleService customRoleService,
                              ObjectMapper objectMapper) {
        this.passportService = passportService;
        this.invitationService = invitationService;
        this.customRoleService = customRoleService;
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
            @RequestParam(defaultValue = "false") boolean childView,
            HttpServletRequest httpRequest) {
        if (childView) {
            PassportResponse response = passportService.getPassportForChildView(id, principal.id());
            return ResponseEntity.ok(response);
        }
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

        // null means an invitation was created instead of an immediate grant
        if (permission == null) {
            return ResponseEntity.status(HttpStatus.ACCEPTED).build();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(permission);
    }

    @PutMapping("/{passportId}/permissions/{permissionId}")
    public ResponseEntity<PermissionResponse> updatePermission(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID passportId,
            @PathVariable UUID permissionId,
            @Valid @RequestBody UpdatePermissionRequest request,
            HttpServletRequest httpRequest) {
        PermissionResponse permission = passportService.updatePermission(
            passportId, permissionId, principal.id(), request, getClientIp(httpRequest));
        return ResponseEntity.ok(permission);
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

    // Invitation endpoints
    @GetMapping("/{id}/invitations")
    public ResponseEntity<List<InvitationResponse>> getPendingInvitations(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        List<InvitationResponse> invitations = invitationService.getPendingInvitations(id, principal.id());
        return ResponseEntity.ok(invitations);
    }

    @PostMapping("/{id}/invitations/{invitationId}/resend")
    public ResponseEntity<InvitationResponse> resendInvitation(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID invitationId,
            HttpServletRequest httpRequest) {
        InvitationResponse invitation = invitationService.resendInvitation(
            invitationId, principal.id(), getClientIp(httpRequest));
        return ResponseEntity.ok(invitation);
    }

    @DeleteMapping("/{id}/invitations/{invitationId}")
    public ResponseEntity<Void> revokeInvitation(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID invitationId,
            HttpServletRequest httpRequest) {
        invitationService.revokeInvitation(invitationId, principal.id(), getClientIp(httpRequest));
        return ResponseEntity.noContent().build();
    }

    // Custom-role endpoints
    @GetMapping("/{id}/custom-roles")
    public ResponseEntity<List<CustomRoleResponse>> getCustomRoles(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        List<CustomRoleResponse> roles = customRoleService.listCustomRoles(id, principal.id());
        return ResponseEntity.ok(roles);
    }

    @PostMapping("/{id}/custom-roles")
    public ResponseEntity<CustomRoleResponse> createCustomRole(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody CreateCustomRoleRequest request,
            HttpServletRequest httpRequest) {
        CustomRoleResponse role = customRoleService.createCustomRole(
            id, principal.id(), request, getClientIp(httpRequest));
        return ResponseEntity.status(HttpStatus.CREATED).body(role);
    }

    @PutMapping("/{id}/custom-roles/{customRoleId}")
    public ResponseEntity<CustomRoleResponse> updateCustomRole(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID customRoleId,
            @Valid @RequestBody UpdateCustomRoleRequest request,
            HttpServletRequest httpRequest) {
        CustomRoleResponse role = customRoleService.updateCustomRole(
            id, customRoleId, principal.id(), request, getClientIp(httpRequest));
        return ResponseEntity.ok(role);
    }

    @DeleteMapping("/{id}/custom-roles/{customRoleId}")
    public ResponseEntity<Void> deleteCustomRole(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @PathVariable UUID customRoleId,
            HttpServletRequest httpRequest) {
        customRoleService.deleteCustomRole(id, customRoleId, principal.id(), getClientIp(httpRequest));
        return ResponseEntity.noContent().build();
    }

    // Child view endpoints

    @GetMapping("/{id}/pending-reviews")
    public ResponseEntity<ChildAccountDTO.PendingReviewsResponse> getPendingReviews(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        return ResponseEntity.ok(passportService.getPendingReviews(id, principal.id()));
    }

    @PostMapping("/{passportId}/sections/{sectionId}/review")
    public ResponseEntity<Void> reviewSection(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID passportId,
            @PathVariable UUID sectionId,
            @Valid @RequestBody ChildAccountDTO.ReviewContributionRequest request,
            HttpServletRequest httpRequest) {
        passportService.reviewSection(passportId, sectionId, principal.id(),
            request.approve(), getClientIp(httpRequest));
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/child-view-settings")
    public ResponseEntity<Void> updateChildViewSettings(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody ChildAccountDTO.ChildViewSettingsRequest request) {
        passportService.updateChildViewSettings(id, principal.id(), request.showHates());
        return ResponseEntity.ok().build();
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
            passport.getUpdatedAt(),
            passport.isChildViewShowHates(),
            passport.getSubjectUser() != null ? passport.getSubjectUser().getId() : null
        );
    }

    private PassportSummaryResponse toSummaryResponse(Passport passport) {
        return new PassportSummaryResponse(
            passport.getId(),
            passport.getChildFirstName(),
            passport.getChildDateOfBirth(),
            passport.getChildAvatar(),
            passport.isWizardComplete(),
            passport.getCreatedAt(),
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
            section.getUpdatedAt(),
            section.getStatus().name(),
            section.isChildModeContribution()
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

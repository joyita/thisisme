package com.thisisme.service;

import com.thisisme.exception.ResourceNotFoundException;
import com.thisisme.model.dto.PassportDTO.*;
import com.thisisme.model.entity.CustomRole;
import com.thisisme.model.entity.Passport;
import com.thisisme.model.entity.User;
import com.thisisme.repository.CustomRoleRepository;
import com.thisisme.repository.PassportRepository;
import com.thisisme.repository.UserRepository;
import com.thisisme.security.PermissionEvaluator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class CustomRoleService {

    private final CustomRoleRepository customRoleRepository;
    private final PassportRepository passportRepository;
    private final UserRepository userRepository;
    private final PermissionEvaluator permissionEvaluator;
    private final AuditService auditService;

    public CustomRoleService(
            CustomRoleRepository customRoleRepository,
            PassportRepository passportRepository,
            UserRepository userRepository,
            PermissionEvaluator permissionEvaluator,
            AuditService auditService) {
        this.customRoleRepository = customRoleRepository;
        this.passportRepository = passportRepository;
        this.userRepository = userRepository;
        this.permissionEvaluator = permissionEvaluator;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<CustomRoleResponse> listCustomRoles(UUID passportId, UUID userId) {
        if (!permissionEvaluator.canManageAccess(passportId, userId)) {
            throw new SecurityException("Access denied - cannot manage permissions");
        }
        return customRoleRepository.findByPassportId(passportId).stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Transactional
    public CustomRoleResponse createCustomRole(UUID passportId, UUID userId,
                                                CreateCustomRoleRequest request, String ipAddress) {
        if (!permissionEvaluator.canManageAccess(passportId, userId)) {
            throw new SecurityException("Access denied - cannot manage permissions");
        }

        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport", passportId));

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        // Name uniqueness within passport
        customRoleRepository.findByPassportIdAndName(passportId, request.name())
            .ifPresent(existing -> {
                throw new IllegalStateException("A custom role with this name already exists");
            });

        CustomRole role = new CustomRole(passport, request.name(), request.description(), user);
        applyRequestFlags(role, request);

        CustomRole saved = customRoleRepository.save(role);

        auditService.log(com.thisisme.model.enums.AuditAction.PERMISSION_CHANGED, userId, user.getName(), ipAddress)
            .withPassport(passportId)
            .withEntity("CustomRole", saved.getId())
            .withDescription("Created custom role '" + saved.getName() + "'")
            .save();

        return toResponse(saved);
    }

    @Transactional
    public CustomRoleResponse updateCustomRole(UUID passportId, UUID customRoleId, UUID userId,
                                                UpdateCustomRoleRequest request, String ipAddress) {
        if (!permissionEvaluator.canManageAccess(passportId, userId)) {
            throw new SecurityException("Access denied - cannot manage permissions");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        CustomRole role = customRoleRepository.findById(customRoleId)
            .orElseThrow(() -> new ResourceNotFoundException("CustomRole", customRoleId));

        if (!role.getPassport().getId().equals(passportId)) {
            throw new IllegalArgumentException("Custom role does not belong to this passport");
        }

        // If name is changing, check uniqueness
        if (request.name() != null && !request.name().equals(role.getName())) {
            customRoleRepository.findByPassportIdAndName(passportId, request.name())
                .ifPresent(existing -> {
                    throw new IllegalStateException("A custom role with this name already exists");
                });
            role.setName(request.name());
        }

        if (request.description() != null) {
            role.setDescription(request.description());
        }

        applyUpdateFlags(role, request);

        CustomRole saved = customRoleRepository.save(role);

        auditService.log(com.thisisme.model.enums.AuditAction.PERMISSION_CHANGED, userId, user.getName(), ipAddress)
            .withPassport(passportId)
            .withEntity("CustomRole", saved.getId())
            .withDescription("Updated custom role '" + saved.getName() + "'")
            .save();

        return toResponse(saved);
    }

    @Transactional
    public void deleteCustomRole(UUID passportId, UUID customRoleId, UUID userId, String ipAddress) {
        if (!permissionEvaluator.canManageAccess(passportId, userId)) {
            throw new SecurityException("Access denied - cannot manage permissions");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        CustomRole role = customRoleRepository.findById(customRoleId)
            .orElseThrow(() -> new ResourceNotFoundException("CustomRole", customRoleId));

        if (!role.getPassport().getId().equals(passportId)) {
            throw new IllegalArgumentException("Custom role does not belong to this passport");
        }

        customRoleRepository.delete(role);

        auditService.log(com.thisisme.model.enums.AuditAction.PERMISSION_CHANGED, userId, user.getName(), ipAddress)
            .withPassport(passportId)
            .withEntity("CustomRole", customRoleId)
            .withDescription("Deleted custom role '" + role.getName() + "'")
            .save();
    }

    // Package-private: used by PassportService / InvitationService to resolve a custom role
    @Transactional(readOnly = true)
    public CustomRole getCustomRole(UUID passportId, UUID customRoleId) {
        CustomRole role = customRoleRepository.findById(customRoleId)
            .orElseThrow(() -> new ResourceNotFoundException("CustomRole", customRoleId));
        if (!role.getPassport().getId().equals(passportId)) {
            throw new IllegalArgumentException("Custom role does not belong to this passport");
        }
        return role;
    }

    private void applyRequestFlags(CustomRole role, CreateCustomRoleRequest r) {
        role.setCanViewPassport(r.canViewPassport());
        role.setCanEditPassport(r.canEditPassport());
        role.setCanDeletePassport(r.canDeletePassport());
        role.setCanManagePermissions(r.canManagePermissions());
        role.setCanCreateShareLinks(r.canCreateShareLinks());
        role.setCanViewSections(r.canViewSections());
        role.setCanEditSections(r.canEditSections());
        role.setCanDeleteSections(r.canDeleteSections());
        role.setCanPublishSections(r.canPublishSections());
        role.setCanReorderSections(r.canReorderSections());
        role.setCanViewTimeline(r.canViewTimeline());
        role.setCanAddTimelineEntries(r.canAddTimelineEntries());
        role.setCanEditTimelineEntries(r.canEditTimelineEntries());
        role.setCanDeleteTimelineEntries(r.canDeleteTimelineEntries());
        role.setCanCommentOnTimeline(r.canCommentOnTimeline());
        role.setCanReactOnTimeline(r.canReactOnTimeline());
        role.setCanViewDocuments(r.canViewDocuments());
        role.setCanUploadDocuments(r.canUploadDocuments());
        role.setCanDownloadDocuments(r.canDownloadDocuments());
        role.setCanDeleteDocuments(r.canDeleteDocuments());
    }

    private void applyUpdateFlags(CustomRole role, UpdateCustomRoleRequest r) {
        if (r.canViewPassport() != null)           role.setCanViewPassport(r.canViewPassport());
        if (r.canEditPassport() != null)           role.setCanEditPassport(r.canEditPassport());
        if (r.canDeletePassport() != null)         role.setCanDeletePassport(r.canDeletePassport());
        if (r.canManagePermissions() != null)      role.setCanManagePermissions(r.canManagePermissions());
        if (r.canCreateShareLinks() != null)       role.setCanCreateShareLinks(r.canCreateShareLinks());
        if (r.canViewSections() != null)           role.setCanViewSections(r.canViewSections());
        if (r.canEditSections() != null)           role.setCanEditSections(r.canEditSections());
        if (r.canDeleteSections() != null)         role.setCanDeleteSections(r.canDeleteSections());
        if (r.canPublishSections() != null)        role.setCanPublishSections(r.canPublishSections());
        if (r.canReorderSections() != null)        role.setCanReorderSections(r.canReorderSections());
        if (r.canViewTimeline() != null)           role.setCanViewTimeline(r.canViewTimeline());
        if (r.canAddTimelineEntries() != null)     role.setCanAddTimelineEntries(r.canAddTimelineEntries());
        if (r.canEditTimelineEntries() != null)    role.setCanEditTimelineEntries(r.canEditTimelineEntries());
        if (r.canDeleteTimelineEntries() != null)  role.setCanDeleteTimelineEntries(r.canDeleteTimelineEntries());
        if (r.canCommentOnTimeline() != null)      role.setCanCommentOnTimeline(r.canCommentOnTimeline());
        if (r.canReactOnTimeline() != null)        role.setCanReactOnTimeline(r.canReactOnTimeline());
        if (r.canViewDocuments() != null)          role.setCanViewDocuments(r.canViewDocuments());
        if (r.canUploadDocuments() != null)        role.setCanUploadDocuments(r.canUploadDocuments());
        if (r.canDownloadDocuments() != null)      role.setCanDownloadDocuments(r.canDownloadDocuments());
        if (r.canDeleteDocuments() != null)        role.setCanDeleteDocuments(r.canDeleteDocuments());
    }

    CustomRoleResponse toResponse(CustomRole cr) {
        return new CustomRoleResponse(
            cr.getId(),
            cr.getName(),
            cr.getDescription(),
            cr.getCreatedBy().getName(),
            cr.getCreatedAt(),
            cr.getUpdatedAt(),
            cr.canViewPassport(),
            cr.canEditPassport(),
            cr.canDeletePassport(),
            cr.canManagePermissions(),
            cr.canCreateShareLinks(),
            cr.canViewSections(),
            cr.canEditSections(),
            cr.canDeleteSections(),
            cr.canPublishSections(),
            cr.canReorderSections(),
            cr.canViewTimeline(),
            cr.canAddTimelineEntries(),
            cr.canEditTimelineEntries(),
            cr.canDeleteTimelineEntries(),
            cr.canCommentOnTimeline(),
            cr.canReactOnTimeline(),
            cr.canViewDocuments(),
            cr.canUploadDocuments(),
            cr.canDownloadDocuments(),
            cr.canDeleteDocuments()
        );
    }
}

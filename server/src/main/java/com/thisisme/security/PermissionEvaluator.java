package com.thisisme.security;

import com.thisisme.model.enums.Role;
import com.thisisme.repository.PassportPermissionRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Evaluates user permissions for passport access.
 */
@Component
public class PermissionEvaluator {

    private final PassportPermissionRepository permissionRepository;

    public PermissionEvaluator(PassportPermissionRepository permissionRepository) {
        this.permissionRepository = permissionRepository;
    }

    /**
     * Check if user is an owner of the passport
     */
    public boolean isOwner(UUID passportId, UUID userId) {
        return permissionRepository.hasAnyRole(passportId, userId, List.of(Role.OWNER, Role.CO_OWNER));
    }

    /**
     * Alias for isOwner — check if user is OWNER or CO_OWNER
     */
    public boolean isOwnerOrCoOwner(UUID passportId, UUID userId) {
        return isOwner(passportId, userId);
    }

    /**
     * Check if user can view the passport
     */
    public boolean canView(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.canViewPassport())
                .orElse(false);
    }

    // --- Passport-level ---

    public boolean canEdit(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.canEditPassport())
                .orElse(false);
    }

    public boolean canDeletePassport(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.canDeletePassport())
                .orElse(false);
    }

    public boolean canManageAccess(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.canManagePermissions())
                .orElse(false);
    }

    public boolean canCreateShareLinks(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.canCreateShareLinks())
                .orElse(false);
    }

    // --- Section-level ---

    public boolean canViewSections(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.canViewSections())
                .orElse(false);
    }

    public boolean canEditSections(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.canEditSections())
                .orElse(false);
    }

    public boolean canDeleteSections(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.canDeleteSections())
                .orElse(false);
    }

    public boolean canPublish(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.canPublishSections())
                .orElse(false);
    }

    public boolean canReorderSections(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.canReorderSections())
                .orElse(false);
    }

    // --- Timeline-level ---

    public boolean canViewTimeline(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.canViewTimeline())
                .orElse(false);
    }

    public boolean canAddTimelineEntries(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.canAddTimelineEntries())
                .orElse(false);
    }

    public boolean canEditTimelineEntries(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.canEditTimelineEntries())
                .orElse(false);
    }

    public boolean canDeleteTimelineEntries(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.canDeleteTimelineEntries())
                .orElse(false);
    }

    public boolean canCommentOnTimeline(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.canCommentOnTimeline())
                .orElse(false);
    }

    public boolean canReactOnTimeline(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.canReactOnTimeline())
                .orElse(false);
    }

    // --- Document-level ---

    public boolean canViewDocuments(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.canViewDocuments())
                .orElse(false);
    }

    public boolean canUploadDocuments(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.canUploadDocuments())
                .orElse(false);
    }

    public boolean canDownloadDocuments(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.canDownloadDocuments())
                .orElse(false);
    }

    public boolean canDeleteDocuments(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.canDeleteDocuments())
                .orElse(false);
    }

    /**
     * Get user's role for a passport
     */
    public Role getRole(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.getRole())
                .orElse(null);
    }
}

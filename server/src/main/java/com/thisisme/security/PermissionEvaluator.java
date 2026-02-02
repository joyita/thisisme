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
     * Check if user can view the passport
     */
    public boolean canView(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId).isPresent();
    }

    /**
     * Check if user can edit the passport
     */
    public boolean canEdit(UUID passportId, UUID userId) {
        return permissionRepository.hasAnyRole(passportId, userId, List.of(Role.OWNER, Role.CO_OWNER));
    }

    /**
     * Check if user can add timeline entries
     */
    public boolean canAddTimelineEntries(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.canAddTimelineEntries())
                .orElse(false);
    }

    /**
     * Check if user can view timeline
     */
    public boolean canViewTimeline(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.canViewTimeline())
                .orElse(false);
    }

    /**
     * Check if user can view documents
     */
    public boolean canViewDocuments(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.canViewDocuments())
                .orElse(false);
    }

    /**
     * Check if user can upload documents
     */
    public boolean canUploadDocuments(UUID passportId, UUID userId) {
        return permissionRepository.findActivePermission(passportId, userId)
                .map(p -> p.canUploadDocuments())
                .orElse(false);
    }

    /**
     * Check if user can publish or unpublish sections (owner only, not co-owner)
     */
    public boolean canPublish(UUID passportId, UUID userId) {
        return permissionRepository.hasAnyRole(passportId, userId, List.of(Role.OWNER));
    }

    /**
     * Check if user can manage access (invite others)
     */
    public boolean canManageAccess(UUID passportId, UUID userId) {
        return isOwner(passportId, userId);
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

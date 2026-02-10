package com.thisisme.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.thisisme.exception.ResourceNotFoundException;
import com.thisisme.model.dto.ChildAccountDTO;
import com.thisisme.model.dto.PassportDTO.*;
import com.thisisme.model.entity.*;
import com.thisisme.model.entity.SectionRevision.ChangeType;
import com.thisisme.model.enums.*;
import com.thisisme.repository.*;
import com.thisisme.security.PermissionEvaluator;
import org.hibernate.Hibernate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class PassportService {

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(PassportService.class);

    private final PassportRepository passportRepository;
    private final PassportPermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final ConsentService consentService;
    private final AuditService auditService;
    private final PermissionEvaluator permissionEvaluator;
    private final ObjectMapper objectMapper;
    private final NotificationService notificationService;
    private final SectionRevisionRepository sectionRevisionRepository;
    private final InvitationService invitationService;
    private final CustomRoleService customRoleService;
    private final TimelineEntryRepository timelineEntryRepository;

    public PassportService(
            PassportRepository passportRepository,
            PassportPermissionRepository permissionRepository,
            UserRepository userRepository,
            ConsentService consentService,
            AuditService auditService,
            PermissionEvaluator permissionEvaluator,
            ObjectMapper objectMapper,
            NotificationService notificationService,
            SectionRevisionRepository sectionRevisionRepository,
            InvitationService invitationService,
            CustomRoleService customRoleService,
            TimelineEntryRepository timelineEntryRepository) {
        this.passportRepository = passportRepository;
        this.permissionRepository = permissionRepository;
        this.userRepository = userRepository;
        this.consentService = consentService;
        this.auditService = auditService;
        this.permissionEvaluator = permissionEvaluator;
        this.objectMapper = objectMapper;
        this.notificationService = notificationService;
        this.sectionRevisionRepository = sectionRevisionRepository;
        this.invitationService = invitationService;
        this.customRoleService = customRoleService;
        this.timelineEntryRepository = timelineEntryRepository;
    }

    @Transactional
    public Passport createPassport(UUID userId, CreatePassportRequest request,
                                   String ipAddress, String userAgent) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        // Create passport
        Passport passport = new Passport(request.childFirstName(), user);
        passport.setChildDateOfBirth(request.childDateOfBirth());

        Passport saved = passportRepository.save(passport);

        // Grant owner permission to creator
        PassportPermission ownerPermission = new PassportPermission(saved, user, Role.OWNER, user);
        permissionRepository.save(ownerPermission);

        // Record consent if provided
        if (request.consentToHealthDataProcessing()) {
            consentService.recordChildHealthDataConsent(
                user, saved, request.childFirstName(), ipAddress, userAgent);
        }

        // Audit
        auditService.log(AuditAction.PASSPORT_CREATED, userId, user.getName(), ipAddress)
            .withPassport(saved.getId())
            .withEntity("Passport", saved.getId())
            .withDescription("Created passport for " + request.childFirstName())
            .withDataCategories("CHILD_PROFILE")
            .save();

        return saved;
    }

    @Transactional(readOnly = true)
    public Passport getPassport(UUID passportId, UUID userId, String ipAddress) {
        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport", passportId));

        if (!permissionEvaluator.canView(passportId, userId)) {
            throw new SecurityException("Access denied to passport");
        }

        User user = userRepository.findById(userId).orElse(null);
        String userName = user != null ? user.getName() : "Unknown";

        auditService.log(AuditAction.PASSPORT_VIEWED, userId, userName, ipAddress)
            .withPassport(passportId)
            .withDescription("Viewed passport")
            .withDataCategories("CHILD_PROFILE", "HEALTH")
            .save();

        return passport;
    }

    @Transactional(readOnly = true)
    public List<Passport> getAccessiblePassports(UUID userId) {
        return passportRepository.findAllAccessibleByUser(userId);
    }

    @Transactional
    public PassportResponse updatePassport(UUID passportId, UUID userId, UpdatePassportRequest request,
                                   String ipAddress) {
        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport", passportId));

        if (!permissionEvaluator.canEdit(passportId, userId)) {
            throw new SecurityException("Access denied - cannot edit passport");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        // Track old values for audit
        String oldName = passport.getChildFirstName();

        // Update fields
        if (request.childFirstName() != null) {
            passport.setChildFirstName(request.childFirstName());
        }
        if (request.childDateOfBirth() != null) {
            passport.setChildDateOfBirth(request.childDateOfBirth());
        }
        if (request.childAvatar() != null) {
            passport.setChildAvatar(request.childAvatar());
        }

        Passport saved = passportRepository.save(passport);

        auditService.log(AuditAction.PASSPORT_UPDATED, userId, user.getName(), ipAddress)
            .withPassport(passportId)
            .withEntity("Passport", passportId)
            .withDescription("Updated passport: " + oldName + " -> " + saved.getChildFirstName())
            .save();

        // Build response inside transaction to avoid LazyInitializationException
        Role userRole = permissionEvaluator.getRole(passportId, userId);
        Map<SectionType, List<SectionResponse>> filteredSections = saved.getSections().stream()
            .filter(section -> isSectionVisibleToRole(section, userRole))
            .map(this::toSectionResponse)
            .collect(Collectors.groupingBy(SectionResponse::type));

        return new PassportResponse(
            saved.getId(),
            saved.getChildFirstName(),
            saved.getChildDateOfBirth(),
            saved.getChildAvatar(),
            saved.getCreatedBy().getId(),
            saved.getCreatedBy().getName(),
            saved.isWizardComplete(),
            filteredSections,
            userRole.toApiName(),
            saved.getCreatedAt(),
            saved.getUpdatedAt(),
            saved.isChildViewShowHates(),
            saved.getSubjectUser() != null ? saved.getSubjectUser().getId() : null
        );
    }

    @Transactional
    public PassportSection addSection(UUID passportId, UUID userId, CreateSectionRequest request,
                                      String ipAddress) {
        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport", passportId));

        if (!permissionEvaluator.canEditSections(passportId, userId)) {
            throw new SecurityException("Access denied - cannot edit sections");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        PassportSection section = new PassportSection(
            passport,
            request.type(),
            request.content(),
            user
        );

        if (request.remedialSuggestion() != null) {
            section.setRemedialSuggestion(request.remedialSuggestion());
        }
        if (request.visibilityLevel() != null) {
            section.setVisibilityLevel(request.visibilityLevel());
        }

        // Child role or child-mode contributions require review
        Role userRole = permissionEvaluator.getRole(passportId, userId);
        logger.info("addSection: userRole={}, childModeContribution={}, sectionId={}",
            userRole, request.childModeContribution(), section.getId());
        if (userRole == Role.CHILD || Boolean.TRUE.equals(request.childModeContribution())) {
            section.setStatus(ContentStatus.PENDING_REVIEW);
            section.setChildModeContribution(true);
            logger.info("addSection: set status=PENDING_REVIEW for section type={}", request.type());
        }

        long sameTypeCount = passport.getSections().stream()
            .filter(s -> s.getType() == request.type()).count();
        section.setDisplayOrder((int) sameTypeCount);

        passport.addSection(section);
        passportRepository.save(passport);

        String typeName = request.type().name().charAt(0) + request.type().name().substring(1).toLowerCase();
        createRevision(passport, userId, "Added item to " + typeName);

        auditService.log(AuditAction.SECTION_CREATED, userId, user.getName(), ipAddress)
            .withPassport(passportId)
            .withEntity("PassportSection", section.getId())
            .withDescription("Added " + request.type() + " section")
            .withDataCategories("HEALTH", "BEHAVIORAL")
            .save();

        return section;
    }

    @Transactional
    public PassportSection updateSection(UUID passportId, UUID sectionId, UUID userId,
                                         UpdateSectionRequest request, String ipAddress) {
        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport", passportId));

        if (!permissionEvaluator.canEditSections(passportId, userId)) {
            throw new SecurityException("Access denied - cannot edit sections");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        PassportSection section = passport.getSections().stream()
            .filter(s -> s.getId().equals(sectionId))
            .findFirst()
            .orElseThrow(() -> new ResourceNotFoundException("Section", sectionId));

        // Store old value for audit
        String oldContent = section.getContent();

        // Track content change as EDIT revision before applying
        boolean contentChanging = request.content() != null && !request.content().equals(section.getContent());
        boolean remedialChanging = request.remedialSuggestion() != null &&
            !request.remedialSuggestion().equals(section.getRemedialSuggestion() != null ? section.getRemedialSuggestion() : "");
        if (contentChanging || remedialChanging) {
            sectionRevisionRepository.save(new SectionRevision(
                section, passport,
                section.getContent(), section.getRemedialSuggestion(),
                ChangeType.EDIT, user
            ));
        }

        // Track publish/unpublish as non-restorable revision
        boolean publishChanging = request.published() != null && request.published() != section.isPublished();
        if (publishChanging) {
            if (!permissionEvaluator.canPublish(passportId, userId)) {
                throw new SecurityException("Only the passport owner can publish or unpublish sections");
            }
            sectionRevisionRepository.save(new SectionRevision(
                section, passport,
                section.getContent(), section.getRemedialSuggestion(),
                request.published() ? ChangeType.PUBLISH : ChangeType.UNPUBLISH,
                user
            ));
        }

        // Child role or child-mode edits require review
        Role userRole = permissionEvaluator.getRole(passportId, userId);
        logger.info("updateSection: sectionId={}, currentStatus={}, userRole={}, childModeContribution={}",
            sectionId, section.getStatus(), userRole, request.childModeContribution());
        if (userRole == Role.CHILD || Boolean.TRUE.equals(request.childModeContribution())) {
            section.setStatus(ContentStatus.PENDING_REVIEW);
            section.setChildModeContribution(true);
            logger.info("updateSection: set status=PENDING_REVIEW for sectionId={}", sectionId);
        }

        if (request.content() != null) {
            section.setContent(request.content());
        }
        if (request.remedialSuggestion() != null) {
            section.setRemedialSuggestion(request.remedialSuggestion());
        }
        if (request.published() != null) {
            section.setPublished(request.published());
        }
        if (request.visibilityLevel() != null) {
            section.setVisibilityLevel(request.visibilityLevel());
        }
        if (request.displayOrder() != null) {
            section.setDisplayOrder(request.displayOrder());
        }

        section.setLastEditedBy(user);
        passportRepository.save(passport);

        if (contentChanging || remedialChanging || publishChanging) {
            String typeName = section.getType().name().charAt(0) + section.getType().name().substring(1).toLowerCase();
            StringBuilder desc = new StringBuilder();
            if (publishChanging) desc.append(request.published() ? "Published" : "Unpublished");
            if (contentChanging || remedialChanging) {
                if (desc.length() > 0) desc.append(" and edited");
                else desc.append("Edited");
            }
            desc.append(" item in ").append(typeName);
            createRevision(passport, userId, desc.toString());
        }

        auditService.log(AuditAction.SECTION_UPDATED, userId, user.getName(), ipAddress)
            .withPassport(passportId)
            .withEntity("PassportSection", sectionId)
            .withOldValue(oldContent)
            .withNewValue(section.getContent())
            .withDescription("Updated " + section.getType() + " section")
            .save();

        return section;
    }

    @Transactional
    public void deleteSection(UUID passportId, UUID sectionId, UUID userId, String ipAddress) {
        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport", passportId));

        if (!permissionEvaluator.canDeleteSections(passportId, userId)) {
            throw new SecurityException("Access denied - cannot delete sections");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        PassportSection section = passport.getSections().stream()
            .filter(s -> s.getId().equals(sectionId))
            .findFirst()
            .orElseThrow(() -> new ResourceNotFoundException("Section", sectionId));

        passport.getSections().remove(section);
        passportRepository.save(passport);

        String typeName = section.getType().name().charAt(0) + section.getType().name().substring(1).toLowerCase();
        createRevision(passport, userId, "Removed item from " + typeName);

        auditService.log(AuditAction.SECTION_DELETED, userId, user.getName(), ipAddress)
            .withPassport(passportId)
            .withEntity("PassportSection", sectionId)
            .withDescription("Deleted " + section.getType() + " section")
            .save();
    }

    /**
     * Adds a permission or creates a pending invitation.
     * If the email belongs to a registered user, permission is granted immediately.
     * If not, an invitation is created and an email is sent.
     */
    @Transactional
    public PermissionResponse addPermission(UUID passportId, UUID userId, AddPermissionRequest request,
                                            String ipAddress) {
        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport", passportId));

        if (!permissionEvaluator.canManageAccess(passportId, userId)) {
            throw new SecurityException("Access denied - cannot manage permissions");
        }

        User granter = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        String normalizedEmail = request.email().trim().toLowerCase();
        Optional<User> targetUser = userRepository.findByEmail(normalizedEmail);

        // No account exists — create a pending invitation instead
        if (targetUser.isEmpty()) {
            invitationService.createInvitation(passportId, userId, normalizedEmail, request.role(), request.notes(), request.customRoleId(), ipAddress);
            // Return a sentinel response indicating pending status; controller wraps this
            return null;
        }

        // User exists — check for duplicate permission
        Optional<PassportPermission> existing = permissionRepository.findActivePermission(passportId, targetUser.get().getId());
        if (existing.isPresent()) {
            throw new IllegalStateException("User already has access to this passport");
        }

        Role role = Role.fromString(request.role());
        PassportPermission permission = new PassportPermission(passport, targetUser.get(), role, granter);
        if (request.notes() != null) {
            permission.setNotes(request.notes());
        }

        // If a custom role was specified, copy its flags over the role defaults
        if (request.customRoleId() != null) {
            com.thisisme.model.entity.CustomRole customRole = customRoleService.getCustomRole(passportId, request.customRoleId());
            permission.applyFromCustomRole(customRole);
        }

        PassportPermission saved = permissionRepository.save(permission);

        AuditAction action = role == Role.CO_OWNER ?
            AuditAction.CO_OWNER_ADDED : AuditAction.PROFESSIONAL_ACCESS_GRANTED;

        auditService.log(action, userId, granter.getName(), ipAddress)
            .withPassport(passportId)
            .withEntity("PassportPermission", saved.getId())
            .withDescription("Granted " + role + " access to " + targetUser.get().getEmail())
            .save();

        try {
            notificationService.notifyPermissionGranted(
                targetUser.get().getId(),
                granter,
                passportId,
                passport.getChildFirstName(),
                role.toApiName()
            );
        } catch (Exception e) {
            logger.warn("Failed to send permission granted notification: {}", e.getMessage());
        }

        return toPermissionResponse(saved);
    }

    @Transactional
    public void revokePermission(UUID passportId, UUID permissionId, UUID userId, String ipAddress) {
        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport", passportId));

        if (!permissionEvaluator.canManageAccess(passportId, userId)) {
            throw new SecurityException("Access denied - cannot manage permissions");
        }

        User revoker = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        PassportPermission permission = permissionRepository.findById(permissionId)
            .orElseThrow(() -> new ResourceNotFoundException("Permission", permissionId));

        if (!permission.getPassport().getId().equals(passportId)) {
            throw new IllegalArgumentException("Permission does not belong to this passport");
        }

        // Cannot revoke your own owner permission
        if (permission.getUser().getId().equals(userId) && permission.getRole() == Role.OWNER) {
            throw new IllegalStateException("Cannot revoke your own owner permission");
        }

        UUID targetUserId = permission.getUser().getId();
        String childName = passport.getChildFirstName();

        permission.setRevokedAt(java.time.Instant.now());
        permissionRepository.save(permission);

        AuditAction action = permission.getRole() == Role.CO_OWNER ?
            AuditAction.CO_OWNER_REMOVED : AuditAction.PROFESSIONAL_ACCESS_REVOKED;

        auditService.log(action, userId, revoker.getName(), ipAddress)
            .withPassport(passportId)
            .withEntity("PassportPermission", permissionId)
            .withDescription("Revoked " + permission.getRole() + " access from " + permission.getUser().getEmail())
            .save();

        // Send notification to the user whose access was revoked
        try {
            notificationService.notifyPermissionRevoked(
                targetUserId,
                revoker,
                passportId,
                childName
            );
        } catch (Exception e) {
            logger.warn("Failed to send permission revoked notification: {}", e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<PermissionResponse> getPermissions(UUID passportId, UUID userId) {
        if (!permissionEvaluator.canManageAccess(passportId, userId)) {
            throw new SecurityException("Access denied - cannot view permissions");
        }

        return permissionRepository.findActiveByPassportId(passportId).stream()
            .map(this::toPermissionResponse)
            .toList();
    }

    @Transactional
    public PermissionResponse updatePermission(UUID passportId, UUID permissionId, UUID userId,
                                               UpdatePermissionRequest request, String ipAddress) {
        if (!permissionEvaluator.canManageAccess(passportId, userId)) {
            throw new SecurityException("Access denied - cannot manage permissions");
        }

        User updater = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        PassportPermission permission = permissionRepository.findById(permissionId)
            .orElseThrow(() -> new ResourceNotFoundException("Permission", permissionId));

        if (!permission.getPassport().getId().equals(passportId)) {
            throw new IllegalArgumentException("Permission does not belong to this passport");
        }

        if (permission.getRole() == Role.OWNER) {
            throw new IllegalStateException("Cannot modify owner permissions");
        }

        // Apply each non-null field
        if (request.canViewPassport() != null)           permission.setCanViewPassport(request.canViewPassport());
        if (request.canEditPassport() != null)           permission.setCanEditPassport(request.canEditPassport());
        if (request.canDeletePassport() != null)         permission.setCanDeletePassport(request.canDeletePassport());
        if (request.canManagePermissions() != null)      permission.setCanManagePermissions(request.canManagePermissions());
        if (request.canCreateShareLinks() != null)       permission.setCanCreateShareLinks(request.canCreateShareLinks());
        if (request.canViewSections() != null)           permission.setCanViewSections(request.canViewSections());
        if (request.canEditSections() != null)           permission.setCanEditSections(request.canEditSections());
        if (request.canDeleteSections() != null)         permission.setCanDeleteSections(request.canDeleteSections());
        if (request.canPublishSections() != null)        permission.setCanPublishSections(request.canPublishSections());
        if (request.canReorderSections() != null)        permission.setCanReorderSections(request.canReorderSections());
        if (request.canViewTimeline() != null)           permission.setCanViewTimeline(request.canViewTimeline());
        if (request.canAddTimelineEntries() != null)     permission.setCanAddTimelineEntries(request.canAddTimelineEntries());
        if (request.canEditTimelineEntries() != null)    permission.setCanEditTimelineEntries(request.canEditTimelineEntries());
        if (request.canDeleteTimelineEntries() != null)  permission.setCanDeleteTimelineEntries(request.canDeleteTimelineEntries());
        if (request.canCommentOnTimeline() != null)      permission.setCanCommentOnTimeline(request.canCommentOnTimeline());
        if (request.canReactOnTimeline() != null)        permission.setCanReactOnTimeline(request.canReactOnTimeline());
        if (request.canViewDocuments() != null)          permission.setCanViewDocuments(request.canViewDocuments());
        if (request.canUploadDocuments() != null)        permission.setCanUploadDocuments(request.canUploadDocuments());
        if (request.canDownloadDocuments() != null)      permission.setCanDownloadDocuments(request.canDownloadDocuments());
        if (request.canDeleteDocuments() != null)        permission.setCanDeleteDocuments(request.canDeleteDocuments());

        PassportPermission saved = permissionRepository.save(permission);

        auditService.log(AuditAction.PERMISSION_CHANGED, userId, updater.getName(), ipAddress)
            .withPassport(passportId)
            .withEntity("PassportPermission", permissionId)
            .withDescription("Updated permissions for " + permission.getUser().getEmail())
            .save();

        return toPermissionResponse(saved);
    }

    private PermissionResponse toPermissionResponse(PassportPermission p) {
        return new PermissionResponse(
            p.getId(),
            p.getUser().getId(),
            p.getUser().getName(),
            p.getUser().getEmail(),
            p.getRole().toApiName(),
            p.getCustomRole() != null ? p.getCustomRole().getName() : null,
            p.canViewPassport(),
            p.canEditPassport(),
            p.canDeletePassport(),
            p.canManagePermissions(),
            p.canCreateShareLinks(),
            p.canViewSections(),
            p.canEditSections(),
            p.canDeleteSections(),
            p.canPublishSections(),
            p.canReorderSections(),
            p.canViewTimeline(),
            p.canAddTimelineEntries(),
            p.canEditTimelineEntries(),
            p.canDeleteTimelineEntries(),
            p.canCommentOnTimeline(),
            p.canReactOnTimeline(),
            p.canViewDocuments(),
            p.canUploadDocuments(),
            p.canDownloadDocuments(),
            p.canDeleteDocuments(),
            p.getGrantedAt(),
            p.getNotes()
        );
    }

    @Transactional
    public void completeWizard(UUID passportId, UUID userId, String ipAddress) {
        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport", passportId));

        if (!permissionEvaluator.canEdit(passportId, userId)) {
            throw new SecurityException("Access denied");
        }

        passport.setWizardComplete(true);

        // Create initial revision
        createRevision(passport, userId, "Completed initial setup wizard");

        passportRepository.save(passport);
    }

    @Transactional
    public PassportRevision createRevision(Passport passport, UUID userId, String description) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        int nextRevisionNumber = passport.getRevisions().size() + 1;

        // Serialize sections to JSON
        String sectionsJson;
        try {
            sectionsJson = objectMapper.writeValueAsString(
                passport.getSections().stream()
                    .map(s -> Map.of(
                        "type", s.getType(),
                        "content", s.getContent(),
                        "remedialSuggestion", s.getRemedialSuggestion() != null ? s.getRemedialSuggestion() : "",
                        "published", s.isPublished(),
                        "visibilityLevel", s.getVisibilityLevel()
                    ))
                    .toList()
            );
        } catch (JsonProcessingException e) {
            sectionsJson = "[]";
        }

        PassportRevision revision = new PassportRevision(
            passport,
            nextRevisionNumber,
            sectionsJson,
            user,
            description
        );

        passport.addRevision(revision);
        return revision;
    }

    @Transactional(readOnly = true)
    public List<PassportRevision> getRevisionHistory(UUID passportId, UUID userId) {
        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport", passportId));

        if (!permissionEvaluator.canView(passportId, userId)) {
            throw new SecurityException("Access denied");
        }

        List<PassportRevision> revisions = new ArrayList<>(passport.getRevisions());
        revisions.forEach(r -> Hibernate.initialize(r.getCreatedBy()));
        return revisions;
    }

    /**
     * Get passport filtered by user's role (for different views)
     */
    @Transactional(readOnly = true)
    public PassportResponse getPassportForRole(UUID passportId, UUID userId, String ipAddress) {
        Passport passport = getPassport(passportId, userId, ipAddress);
        Role userRole = permissionEvaluator.getRole(passportId, userId);

        // Filter sections: hide all if canViewSections is false, then apply visibility rules
        boolean canViewSections = permissionEvaluator.canViewSections(passportId, userId);
        Map<SectionType, List<SectionResponse>> filteredSections = canViewSections
            ? passport.getSections().stream()
                .filter(section -> isSectionVisibleToRole(section, userRole))
                .map(this::toSectionResponse)
                .collect(Collectors.groupingBy(SectionResponse::type))
            : Collections.emptyMap();

        return new PassportResponse(
            passport.getId(),
            passport.getChildFirstName(),
            passport.getChildDateOfBirth(),
            passport.getChildAvatar(),
            passport.getCreatedBy().getId(),
            passport.getCreatedBy().getName(),
            passport.isWizardComplete(),
            filteredSections,
            userRole.toApiName(),
            passport.getCreatedAt(),
            passport.getUpdatedAt(),
            passport.isChildViewShowHates(),
            passport.getSubjectUser() != null ? passport.getSubjectUser().getId() : null
        );
    }

    private boolean isSectionVisibleToRole(PassportSection section, Role role) {
        return switch (section.getVisibilityLevel()) {
            case OWNERS_ONLY -> role == Role.OWNER || role == Role.CO_OWNER;
            case PROFESSIONALS -> role == Role.OWNER || role == Role.CO_OWNER || role == Role.PROFESSIONAL;
            case ALL -> true;
            case CUSTOM -> true; // Would need to check custom roles
        };
    }

    @Transactional(readOnly = true)
    public List<SectionRevisionResponse> getSectionHistory(UUID passportId, UUID sectionId, UUID userId) {
        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport", passportId));

        if (!permissionEvaluator.canView(passportId, userId)) {
            throw new SecurityException("Access denied");
        }

        if (!permissionEvaluator.canViewSections(passportId, userId)) {
            throw new SecurityException("Access denied - cannot view sections");
        }

        passport.getSections().stream()
            .filter(s -> s.getId().equals(sectionId))
            .findFirst()
            .orElseThrow(() -> new ResourceNotFoundException("Section", sectionId));

        return sectionRevisionRepository.findBySectionIdOrderByCreatedAtDesc(sectionId).stream()
            .map(r -> new SectionRevisionResponse(
                r.getId(),
                r.getContent(),
                r.getRemedialSuggestion(),
                r.getChangeType().name(),
                r.getAuthor().getId(),
                r.getAuthorName(),
                r.getCreatedAt()
            ))
            .toList();
    }

    @Transactional
    public PassportSection restoreSectionRevision(UUID passportId, UUID sectionId, UUID revisionId, UUID userId, String ipAddress) {
        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport", passportId));

        if (!permissionEvaluator.canEditSections(passportId, userId)) {
            throw new SecurityException("Access denied - cannot edit sections");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        PassportSection section = passport.getSections().stream()
            .filter(s -> s.getId().equals(sectionId))
            .findFirst()
            .orElseThrow(() -> new ResourceNotFoundException("Section", sectionId));

        SectionRevision revision = sectionRevisionRepository.findById(revisionId)
            .orElseThrow(() -> new ResourceNotFoundException("Revision", revisionId));

        if (!revision.getSection().getId().equals(sectionId)) {
            throw new IllegalArgumentException("Revision does not belong to this section");
        }
        if (revision.getChangeType() != ChangeType.EDIT) {
            throw new IllegalStateException("Only EDIT revisions can be restored");
        }

        // Non-destructive: save current state as EDIT revision before overwriting
        sectionRevisionRepository.save(new SectionRevision(
            section, passport,
            section.getContent(), section.getRemedialSuggestion(),
            ChangeType.EDIT, user
        ));

        // Apply the old revision's content
        section.setContent(revision.getContent());
        section.setRemedialSuggestion(revision.getRemedialSuggestion());
        section.setLastEditedBy(user);
        passportRepository.save(passport);

        String typeName = section.getType().name().charAt(0) + section.getType().name().substring(1).toLowerCase();
        createRevision(passport, userId, "Restored item in " + typeName + " from previous version");

        auditService.log(AuditAction.SECTION_UPDATED, userId, user.getName(), ipAddress)
            .withPassport(passportId)
            .withEntity("PassportSection", sectionId)
            .withDescription("Restored section from revision " + revisionId)
            .save();

        return section;
    }

    @Transactional
    public void reorderSections(UUID passportId, UUID userId, ReorderSectionsRequest request, String ipAddress) {
        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport", passportId));

        if (!permissionEvaluator.canReorderSections(passportId, userId)) {
            throw new SecurityException("Access denied - cannot reorder sections");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        Map<UUID, Integer> orderMap = request.items().stream()
            .collect(Collectors.toMap(ReorderItem::sectionId, ReorderItem::displayOrder));

        for (PassportSection section : passport.getSections()) {
            Integer newOrder = orderMap.get(section.getId());
            if (newOrder != null) {
                section.setDisplayOrder(newOrder);
            }
        }

        passportRepository.save(passport);

        auditService.log(AuditAction.SECTION_UPDATED, userId, user.getName(), ipAddress)
            .withPassport(passportId)
            .withDescription("Reordered sections")
            .save();
    }

    private SectionResponse toSectionResponse(PassportSection section) {
        int revisionCount = (int) sectionRevisionRepository.countBySectionId(section.getId());
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
            revisionCount,
            section.getCreatedAt(),
            section.getUpdatedAt(),
            section.getStatus().name(),
            section.isChildModeContribution()
        );
    }

    // ── Child View Methods ──

    @Transactional(readOnly = true)
    public PassportResponse getPassportForChildView(UUID passportId, UUID userId) {
        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport", passportId));

        if (!permissionEvaluator.canView(passportId, userId)) {
            throw new SecurityException("Access denied");
        }

        // Filter to LOVES, STRENGTHS, and conditionally HATES
        java.util.Set<SectionType> allowedTypes = new java.util.HashSet<>();
        allowedTypes.add(SectionType.LOVES);
        allowedTypes.add(SectionType.STRENGTHS);
        if (passport.isChildViewShowHates()) {
            allowedTypes.add(SectionType.HATES);
        }

        Map<SectionType, List<SectionResponse>> filteredSections = passport.getSections().stream()
            .filter(s -> allowedTypes.contains(s.getType()))
            .filter(s -> s.getStatus() == com.thisisme.model.enums.ContentStatus.PUBLISHED
                         || s.getCreatedBy().getId().equals(userId))
            .map(this::toSectionResponse)
            .collect(Collectors.groupingBy(SectionResponse::type));

        Role userRole = permissionEvaluator.getRole(passportId, userId);

        return new PassportResponse(
            passport.getId(),
            passport.getChildFirstName(),
            passport.getChildDateOfBirth(),
            passport.getChildAvatar(),
            passport.getCreatedBy().getId(),
            passport.getCreatedBy().getName(),
            passport.isWizardComplete(),
            filteredSections,
            userRole != null ? userRole.toApiName() : "VIEWER",
            passport.getCreatedAt(),
            passport.getUpdatedAt(),
            passport.isChildViewShowHates(),
            passport.getSubjectUser() != null ? passport.getSubjectUser().getId() : null
        );
    }

    @Transactional(readOnly = true)
    public ChildAccountDTO.PendingReviewsResponse getPendingReviews(UUID passportId, UUID userId) {
        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport", passportId));

        if (!permissionEvaluator.isOwnerOrCoOwner(passportId, userId)) {
            throw new SecurityException("Only owners can view pending reviews");
        }

        logger.info("getPendingReviews: passportId={}, totalSections={}, statuses={}",
            passportId, passport.getSections().size(),
            passport.getSections().stream().map(s -> s.getId() + ":" + s.getStatus()).toList());
        List<ChildAccountDTO.PendingSection> pendingSections = passport.getSections().stream()
            .filter(s -> s.getStatus() == com.thisisme.model.enums.ContentStatus.PENDING_REVIEW)
            .map(s -> new ChildAccountDTO.PendingSection(
                s.getId(), s.getType().name(), s.getContent(), s.getRemedialSuggestion(),
                s.getCreatedBy().getName(), s.getCreatedAt()))
            .toList();

        List<ChildAccountDTO.PendingTimelineEntry> pendingEntries = timelineEntryRepository
            .findByPassportIdAndStatus(passportId, com.thisisme.model.enums.ContentStatus.PENDING_REVIEW).stream()
            .map(e -> new ChildAccountDTO.PendingTimelineEntry(
                e.getId(), e.getEntryType().name(), e.getTitle(), e.getContent(),
                e.getAuthor().getName(), e.getCreatedAt()))
            .toList();

        return new ChildAccountDTO.PendingReviewsResponse(pendingSections, pendingEntries);
    }

    @Transactional
    public void reviewSection(UUID passportId, UUID sectionId, UUID userId, boolean approve, String ipAddress) {
        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport", passportId));

        if (!permissionEvaluator.isOwnerOrCoOwner(passportId, userId)) {
            throw new SecurityException("Only owners can review contributions");
        }

        PassportSection section = passport.getSections().stream()
            .filter(s -> s.getId().equals(sectionId))
            .findFirst()
            .orElseThrow(() -> new ResourceNotFoundException("Section", sectionId));

        logger.info("reviewSection: sectionId={}, status={}, childModeContribution={}, approve={}",
            sectionId, section.getStatus(), section.isChildModeContribution(), approve);
        if (section.getStatus() != com.thisisme.model.enums.ContentStatus.PENDING_REVIEW) {
            logger.warn("reviewSection: REJECTING - section {} has status {} (expected PENDING_REVIEW)",
                sectionId, section.getStatus());
            throw new IllegalStateException("Section is not pending review");
        }

        if (approve) {
            section.setStatus(com.thisisme.model.enums.ContentStatus.PUBLISHED);
        } else {
            passport.getSections().remove(section);
        }
        passportRepository.save(passport);
    }

    @Transactional
    public void updateChildViewSettings(UUID passportId, UUID userId, boolean showHates) {
        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport", passportId));

        if (!permissionEvaluator.isOwnerOrCoOwner(passportId, userId)) {
            throw new SecurityException("Only owners can update child view settings");
        }

        passport.setChildViewShowHates(showHates);
        passportRepository.save(passport);
    }
}

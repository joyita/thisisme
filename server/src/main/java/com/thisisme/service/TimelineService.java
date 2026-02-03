package com.thisisme.service;

import com.thisisme.exception.ResourceNotFoundException;
import com.thisisme.model.dto.TimelineDTO.*;
import com.thisisme.model.entity.Passport;
import com.thisisme.model.entity.TimelineEntry;
import com.thisisme.model.entity.User;
import com.thisisme.model.enums.AuditAction;
import com.thisisme.model.enums.EntryType;
import com.thisisme.model.enums.Role;
import com.thisisme.model.enums.VisibilityLevel;
import com.thisisme.repository.PassportRepository;
import com.thisisme.repository.TimelineEntryRepository;
import com.thisisme.repository.UserRepository;
import com.thisisme.security.PermissionEvaluator;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class TimelineService {

    private final TimelineEntryRepository timelineRepository;
    private final PassportRepository passportRepository;
    private final UserRepository userRepository;
    private final PermissionEvaluator permissionEvaluator;
    private final AuditService auditService;

    public TimelineService(
            TimelineEntryRepository timelineRepository,
            PassportRepository passportRepository,
            UserRepository userRepository,
            PermissionEvaluator permissionEvaluator,
            AuditService auditService) {
        this.timelineRepository = timelineRepository;
        this.passportRepository = passportRepository;
        this.userRepository = userRepository;
        this.permissionEvaluator = permissionEvaluator;
        this.auditService = auditService;
    }

    /**
     * Create a new timeline entry
     */
    @Transactional
    public TimelineEntryResponse createEntry(UUID passportId, UUID userId,
                                     CreateTimelineEntryRequest request, String ipAddress) {
        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport not found"));

        if (!permissionEvaluator.canAddTimelineEntries(passportId, userId)) {
            throw new SecurityException("You don't have permission to add timeline entries");
        }

        User author = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        TimelineEntry entry = new TimelineEntry(
            passport,
            author,
            request.entryType(),
            request.title(),
            request.content(),
            request.entryDate()
        );

        if (request.visibilityLevel() != null) {
            entry.setVisibilityLevel(request.visibilityLevel());
        }

        if (request.visibleToRoles() != null) {
            entry.setVisibleToRoles(request.visibleToRoles());
        }

        if (request.tags() != null) {
            request.tags().forEach(entry::addTag);
        }

        TimelineEntry saved = timelineRepository.save(entry);

        auditService.log(AuditAction.TIMELINE_ENTRY_CREATED, userId, author.getName(), ipAddress)
            .withPassport(passport)
            .withEntity("TimelineEntry", saved.getId())
            .withDescription("Created timeline entry: " + request.title())
            .withDataCategories("BEHAVIORAL", "ACTIVITIES");

        return toResponse(saved, permissionEvaluator.getRole(passportId, userId));
    }

    /**
     * Get timeline entries for a passport with filtering and visibility rules
     */
    @Transactional(readOnly = true)
    public TimelinePageResponse getTimelineEntries(UUID passportId, UUID userId,
                                                   TimelineFilterRequest filter, String ipAddress) {
        if (!permissionEvaluator.canViewTimeline(passportId, userId)) {
            throw new SecurityException("You don't have permission to view this timeline");
        }

        Role userRole = permissionEvaluator.getRole(passportId, userId);
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Pageable pageable = PageRequest.of(
            filter.page(),
            filter.size(),
            Sort.by(Sort.Direction.DESC, "entryDate", "createdAt")
        );

        Page<TimelineEntry> entriesPage;

        if (filter.pinnedOnly() != null && filter.pinnedOnly()) {
            List<TimelineEntry> pinned = timelineRepository.findPinnedByPassportId(passportId);
            entriesPage = new org.springframework.data.domain.PageImpl<>(
                pinned, pageable, pinned.size());
        } else if (filter.startDate() != null && filter.endDate() != null) {
            List<TimelineEntry> entries = timelineRepository.findByPassportIdAndDateRange(
                passportId, filter.startDate(), filter.endDate());
            entriesPage = new org.springframework.data.domain.PageImpl<>(
                entries, pageable, entries.size());
        } else {
            entriesPage = timelineRepository.findByPassportId(passportId, pageable);
        }

        // Filter by visibility based on user's role
        List<TimelineEntryResponse> visibleEntries = entriesPage.getContent().stream()
            .filter(entry -> entry.isVisibleTo(userRole))
            .filter(entry -> filterByType(entry, filter.entryTypes()))
            .filter(entry -> filterByTags(entry, filter.tags()))
            .map(entry -> toResponse(entry, userRole))
            .collect(Collectors.toList());

        auditService.log(AuditAction.TIMELINE_ENTRY_VIEWED, userId, user.getName(), ipAddress)
            .withPassport(passportRepository.findActiveById(passportId).orElse(null))
            .withDescription("Viewed timeline page " + filter.page());

        return new TimelinePageResponse(
            visibleEntries,
            entriesPage.getNumber(),
            entriesPage.getTotalPages(),
            entriesPage.getTotalElements(),
            entriesPage.hasNext(),
            entriesPage.hasPrevious()
        );
    }

    /**
     * Get a single timeline entry
     */
    @Transactional(readOnly = true)
    public TimelineEntryResponse getEntry(UUID entryId, UUID userId, String ipAddress) {
        TimelineEntry entry = timelineRepository.findById(entryId)
            .orElseThrow(() -> new ResourceNotFoundException("Timeline entry not found"));

        if (entry.isDeleted()) {
            throw new ResourceNotFoundException("Timeline entry not found");
        }

        UUID passportId = entry.getPassport().getId();
        if (!permissionEvaluator.canViewTimeline(passportId, userId)) {
            throw new SecurityException("You don't have permission to view this entry");
        }

        Role userRole = permissionEvaluator.getRole(passportId, userId);
        if (!entry.isVisibleTo(userRole)) {
            throw new SecurityException("You don't have permission to view this entry");
        }

        return toResponse(entry, userRole);
    }

    /**
     * Update a timeline entry
     */
    @Transactional
    public TimelineEntryResponse updateEntry(UUID entryId, UUID userId,
                                     UpdateTimelineEntryRequest request, String ipAddress) {
        TimelineEntry entry = timelineRepository.findById(entryId)
            .orElseThrow(() -> new ResourceNotFoundException("Timeline entry not found"));

        if (entry.isDeleted()) {
            throw new ResourceNotFoundException("Timeline entry not found");
        }

        UUID passportId = entry.getPassport().getId();
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean isAuthor = entry.getAuthor().getId().equals(userId);
        boolean canEdit = permissionEvaluator.canEditTimelineEntries(passportId, userId);

        if (!isAuthor && !canEdit) {
            throw new SecurityException("You don't have permission to edit this entry");
        }

        if (request.title() != null) {
            entry.setTitle(request.title());
        }
        if (request.content() != null) {
            entry.setContent(request.content());
        }
        if (request.entryType() != null) {
            entry.setEntryType(request.entryType());
        }
        if (request.entryDate() != null) {
            entry.setEntryDate(request.entryDate());
        }
        if (request.visibilityLevel() != null) {
            entry.setVisibilityLevel(request.visibilityLevel());
        }
        if (request.visibleToRoles() != null) {
            entry.setVisibleToRoles(request.visibleToRoles());
        }
        if (request.tags() != null) {
            entry.getTags().clear();
            request.tags().forEach(entry::addTag);
        }
        if (request.pinned() != null) {
            entry.setPinned(request.pinned());
        }

        TimelineEntry saved = timelineRepository.save(entry);

        auditService.log(AuditAction.TIMELINE_ENTRY_UPDATED, userId, user.getName(), ipAddress)
            .withPassport(entry.getPassport())
            .withEntity("TimelineEntry", entryId)
            .withDescription("Updated timeline entry: " + entry.getTitle());

        return toResponse(saved, permissionEvaluator.getRole(passportId, userId));
    }

    /**
     * Soft delete a timeline entry
     */
    @Transactional
    public void deleteEntry(UUID entryId, UUID userId, String ipAddress) {
        TimelineEntry entry = timelineRepository.findById(entryId)
            .orElseThrow(() -> new ResourceNotFoundException("Timeline entry not found"));

        UUID passportId = entry.getPassport().getId();
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean isAuthor = entry.getAuthor().getId().equals(userId);
        boolean canDelete = permissionEvaluator.canDeleteTimelineEntries(passportId, userId);

        if (!isAuthor && !canDelete) {
            throw new SecurityException("You don't have permission to delete this entry");
        }

        entry.setDeletedAt(Instant.now());
        timelineRepository.save(entry);

        auditService.log(AuditAction.TIMELINE_ENTRY_DELETED, userId, user.getName(), ipAddress)
            .withPassport(entry.getPassport())
            .withEntity("TimelineEntry", entryId)
            .withDescription("Deleted timeline entry: " + entry.getTitle());
    }

    /**
     * Get entries by type
     */
    @Transactional(readOnly = true)
    public List<TimelineEntryResponse> getEntriesByType(UUID passportId, UUID userId,
                                                 EntryType type, String ipAddress) {
        if (!permissionEvaluator.canViewTimeline(passportId, userId)) {
            throw new SecurityException("You don't have permission to view this timeline");
        }

        Role userRole = permissionEvaluator.getRole(passportId, userId);

        return timelineRepository.findByPassportIdAndType(passportId, type).stream()
            .filter(entry -> entry.isVisibleTo(userRole))
            .map(entry -> toResponse(entry, userRole))
            .collect(Collectors.toList());
    }

    /**
     * Toggle pin status
     */
    @Transactional
    public TimelineEntryResponse togglePin(UUID entryId, UUID userId, String ipAddress) {
        TimelineEntry entry = timelineRepository.findById(entryId)
            .orElseThrow(() -> new ResourceNotFoundException("Timeline entry not found"));

        UUID passportId = entry.getPassport().getId();
        if (!permissionEvaluator.isOwner(passportId, userId)) {
            throw new SecurityException("Only owners can pin entries");
        }

        entry.setPinned(!entry.isPinned());
        TimelineEntry saved = timelineRepository.save(entry);
        return toResponse(saved, permissionEvaluator.getRole(passportId, userId));
    }

    // Helper methods

    private boolean filterByType(TimelineEntry entry, Set<EntryType> types) {
        if (types == null || types.isEmpty()) {
            return true;
        }
        return types.contains(entry.getEntryType());
    }

    private boolean filterByTags(TimelineEntry entry, Set<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return true;
        }
        return entry.getTags().stream().anyMatch(tags::contains);
    }

    private TimelineEntryResponse toResponse(TimelineEntry entry, Role viewerRole) {
        // Make defensive copies of collections to avoid LazyInitializationException during JSON serialization
        Set<Role> visibleToRoles = entry.getVisibleToRoles() != null ? new java.util.HashSet<>(entry.getVisibleToRoles()) : Set.of();
        Set<String> tags = entry.getTags() != null ? new java.util.HashSet<>(entry.getTags()) : Set.of();
        int attachmentCount = entry.getAttachments() != null ? entry.getAttachments().size() : 0;

        return new TimelineEntryResponse(
            entry.getId(),
            entry.getPassport().getId(),
            new AuthorInfo(
                entry.getAuthor().getId(),
                entry.getAuthor().getName(),
                permissionEvaluator.getRole(entry.getPassport().getId(), entry.getAuthor().getId()) != null
                    ? permissionEvaluator.getRole(entry.getPassport().getId(), entry.getAuthor().getId()).toApiName()
                    : "VIEWER"
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

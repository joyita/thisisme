package com.thisisme.service;

import com.thisisme.exception.ResourceNotFoundException;
import com.thisisme.model.dto.TimelineDTO.*;
import com.thisisme.model.entity.Passport;
import com.thisisme.model.entity.TimelineEntry;
import com.thisisme.model.entity.User;
import com.thisisme.model.enums.EntryType;
import com.thisisme.model.enums.Role;
import com.thisisme.model.enums.VisibilityLevel;
import com.thisisme.repository.PassportPermissionRepository;
import com.thisisme.repository.PassportRepository;
import com.thisisme.repository.TimelineEntryRepository;
import com.thisisme.repository.UserRepository;
import com.thisisme.security.PermissionEvaluator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TimelineServiceTest {

    @Mock private TimelineEntryRepository timelineRepository;
    @Mock private PassportRepository passportRepository;
    @Mock private UserRepository userRepository;
    @Mock private PassportPermissionRepository permissionRepository;
    @Mock private PermissionEvaluator permissionEvaluator;
    @Mock private AuditService auditService;
    @Mock private AuditService.AuditLogBuilder auditLogBuilder;
    @Mock private NotificationService notificationService;

    private TimelineService timelineService;
    private User testUser;
    private Passport testPassport;
    private TimelineEntry testEntry;

    @BeforeEach
    void setUp() {
        timelineService = new TimelineService(
            timelineRepository,
            passportRepository,
            userRepository,
            permissionRepository,
            permissionEvaluator,
            auditService,
            notificationService
        );

        testUser = new User("Test User", "test@example.com", "hashedPassword");
        ReflectionTestUtils.setField(testUser, "id", UUID.randomUUID());

        testPassport = new Passport("Test Child", testUser);
        ReflectionTestUtils.setField(testPassport, "id", UUID.randomUUID());

        testEntry = new TimelineEntry(
            testPassport,
            testUser,
            EntryType.MILESTONE,
            "Test Entry",
            "Test content",
            LocalDate.now()
        );
        ReflectionTestUtils.setField(testEntry, "id", UUID.randomUUID());

        // Setup audit mock chain
        lenient().when(auditService.log(any(), any(), any(), any())).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withPassport(any(com.thisisme.model.entity.Passport.class))).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withPassport(any(UUID.class))).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withEntity(any(), any())).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withDescription(any())).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withDataCategories(any(String[].class))).thenReturn(auditLogBuilder);
    }

    @Test
    void createEntry_ShouldCreateEntryWhenUserHasPermission() {
        CreateTimelineEntryRequest request = new CreateTimelineEntryRequest(
            EntryType.MILESTONE,
            "First Steps",
            "Child took first steps today!",
            LocalDate.now(),
            VisibilityLevel.PROFESSIONALS,
            null,
            Set.of("development", "motor-skills"),
            null
        );

        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));
        when(permissionEvaluator.canAddTimelineEntries(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(permissionEvaluator.getRole(testPassport.getId(), testUser.getId())).thenReturn(Role.OWNER);
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(timelineRepository.save(any(TimelineEntry.class))).thenAnswer(i -> {
            TimelineEntry e = i.getArgument(0);
            ReflectionTestUtils.setField(e, "id", UUID.randomUUID());
            ReflectionTestUtils.setField(e, "createdAt", java.time.Instant.now());
            ReflectionTestUtils.setField(e, "updatedAt", java.time.Instant.now());
            return e;
        });

        TimelineEntryResponse result = timelineService.createEntry(
            testPassport.getId(),
            testUser.getId(),
            request,
            "192.168.1.1"
        );

        assertNotNull(result);
        assertEquals("First Steps", result.title());
        assertEquals(EntryType.MILESTONE, result.entryType());
        assertEquals(VisibilityLevel.PROFESSIONALS, result.visibilityLevel());
        assertTrue(result.tags().contains("development"));

        verify(timelineRepository).save(any(TimelineEntry.class));
    }

    @Test
    void createEntry_ShouldThrowWhenUserLacksPermission() {
        CreateTimelineEntryRequest request = new CreateTimelineEntryRequest(
            EntryType.NOTE,
            "Test",
            "Content",
            LocalDate.now(),
            null,
            null,
            null,
            null
        );

        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));
        when(permissionEvaluator.canAddTimelineEntries(testPassport.getId(), testUser.getId())).thenReturn(false);

        assertThrows(SecurityException.class, () ->
            timelineService.createEntry(testPassport.getId(), testUser.getId(), request, "192.168.1.1")
        );
    }

    @Test
    void getTimelineEntries_ShouldReturnFilteredByVisibility() {
        TimelineFilterRequest filter = new TimelineFilterRequest(
            null, null, null, null, null, null, null, 0, 20
        );

        TimelineEntry ownersOnlyEntry = new TimelineEntry(
            testPassport, testUser, EntryType.MEDICAL, "Medical Note", "Private", LocalDate.now()
        );
        ownersOnlyEntry.setVisibilityLevel(VisibilityLevel.OWNERS_ONLY);
        ReflectionTestUtils.setField(ownersOnlyEntry, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(ownersOnlyEntry, "createdAt", java.time.Instant.now());
        ReflectionTestUtils.setField(ownersOnlyEntry, "updatedAt", java.time.Instant.now());

        TimelineEntry publicEntry = new TimelineEntry(
            testPassport, testUser, EntryType.MILESTONE, "Public Entry", "Visible to all", LocalDate.now()
        );
        publicEntry.setVisibilityLevel(VisibilityLevel.ALL);
        ReflectionTestUtils.setField(publicEntry, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(publicEntry, "createdAt", java.time.Instant.now());
        ReflectionTestUtils.setField(publicEntry, "updatedAt", java.time.Instant.now());

        Page<TimelineEntry> page = new PageImpl<>(List.of(ownersOnlyEntry, publicEntry));

        when(permissionEvaluator.canViewTimeline(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(permissionEvaluator.getRole(testPassport.getId(), testUser.getId())).thenReturn(Role.VIEWER);
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(timelineRepository.findByPassportId(eq(testPassport.getId()), any(Pageable.class))).thenReturn(page);
        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));

        TimelinePageResponse result = timelineService.getTimelineEntries(
            testPassport.getId(), testUser.getId(), filter, "192.168.1.1"
        );

        // Viewer should only see the ALL visibility entry
        assertEquals(1, result.entries().size());
        assertEquals("Public Entry", result.entries().get(0).title());
    }

    @Test
    void getTimelineEntries_ShouldShowAllForOwner() {
        TimelineFilterRequest filter = new TimelineFilterRequest(
            null, null, null, null, null, null, null, 0, 20
        );

        TimelineEntry privateEntry = new TimelineEntry(
            testPassport, testUser, EntryType.MEDICAL, "Private", "Content", LocalDate.now()
        );
        privateEntry.setVisibilityLevel(VisibilityLevel.OWNERS_ONLY);
        ReflectionTestUtils.setField(privateEntry, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(privateEntry, "createdAt", java.time.Instant.now());
        ReflectionTestUtils.setField(privateEntry, "updatedAt", java.time.Instant.now());

        Page<TimelineEntry> page = new PageImpl<>(List.of(privateEntry));

        when(permissionEvaluator.canViewTimeline(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(permissionEvaluator.getRole(testPassport.getId(), testUser.getId())).thenReturn(Role.OWNER);
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(timelineRepository.findByPassportId(eq(testPassport.getId()), any(Pageable.class))).thenReturn(page);
        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));

        TimelinePageResponse result = timelineService.getTimelineEntries(
            testPassport.getId(), testUser.getId(), filter, "192.168.1.1"
        );

        assertEquals(1, result.entries().size());
        assertEquals("Private", result.entries().get(0).title());
    }

    @Test
    void getTimelineEntries_ShouldUseFtsWhenSearchQueryProvided() {
        TimelineFilterRequest filter = new TimelineFilterRequest(
            null, null, null, null, null, null, "first steps", 0, 20
        );

        TimelineEntry matchEntry = new TimelineEntry(
            testPassport, testUser, EntryType.MILESTONE, "First Steps", "Content", LocalDate.now()
        );
        matchEntry.setVisibilityLevel(VisibilityLevel.ALL);
        ReflectionTestUtils.setField(matchEntry, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(matchEntry, "createdAt", java.time.Instant.now());
        ReflectionTestUtils.setField(matchEntry, "updatedAt", java.time.Instant.now());

        when(permissionEvaluator.canViewTimeline(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(permissionEvaluator.getRole(testPassport.getId(), testUser.getId())).thenReturn(Role.OWNER);
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(timelineRepository.searchByPassportId(testPassport.getId(), "first:* & steps:*"))
            .thenReturn(List.of(matchEntry));
        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));

        TimelinePageResponse result = timelineService.getTimelineEntries(
            testPassport.getId(), testUser.getId(), filter, "192.168.1.1"
        );

        assertEquals(1, result.entries().size());
        assertEquals("First Steps", result.entries().get(0).title());
        verify(timelineRepository).searchByPassportId(testPassport.getId(), "first:* & steps:*");
        verify(timelineRepository, never()).findByPassportId(any(), any());
    }

    @Test
    void updateEntry_ShouldUpdateWhenUserIsAuthor() {
        UpdateTimelineEntryRequest request = new UpdateTimelineEntryRequest(
            "Updated Title",
            "Updated content",
            null,
            null,
            null,
            null,
            null,
            true,
            null
        );

        when(timelineRepository.findById(testEntry.getId())).thenReturn(Optional.of(testEntry));
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(permissionEvaluator.canEditTimelineEntries(testPassport.getId(), testUser.getId())).thenReturn(false);
        when(permissionEvaluator.getRole(testPassport.getId(), testUser.getId())).thenReturn(Role.OWNER);
        when(timelineRepository.save(any(TimelineEntry.class))).thenAnswer(i -> {
            TimelineEntry e = i.getArgument(0);
            ReflectionTestUtils.setField(e, "createdAt", java.time.Instant.now());
            ReflectionTestUtils.setField(e, "updatedAt", java.time.Instant.now());
            return e;
        });

        TimelineEntryResponse result = timelineService.updateEntry(
            testEntry.getId(), testUser.getId(), request, "192.168.1.1"
        );

        assertEquals("Updated Title", result.title());
        assertEquals("Updated content", result.content());
        assertTrue(result.pinned());
    }

    @Test
    void updateEntry_ShouldThrowWhenNotAuthorOrOwner() {
        User otherUser = new User("Other User", "other@example.com", "hash");
        ReflectionTestUtils.setField(otherUser, "id", UUID.randomUUID());

        UpdateTimelineEntryRequest request = new UpdateTimelineEntryRequest(
            "Updated", null, null, null, null, null, null, null, null
        );

        when(timelineRepository.findById(testEntry.getId())).thenReturn(Optional.of(testEntry));
        when(userRepository.findById(otherUser.getId())).thenReturn(Optional.of(otherUser));
        when(permissionEvaluator.canEditTimelineEntries(testPassport.getId(), otherUser.getId())).thenReturn(false);

        assertThrows(SecurityException.class, () ->
            timelineService.updateEntry(testEntry.getId(), otherUser.getId(), request, "192.168.1.1")
        );
    }

    @Test
    void deleteEntry_ShouldSoftDeleteEntry() {
        when(timelineRepository.findById(testEntry.getId())).thenReturn(Optional.of(testEntry));
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(permissionEvaluator.canDeleteTimelineEntries(testPassport.getId(), testUser.getId())).thenReturn(false);
        when(timelineRepository.save(any(TimelineEntry.class))).thenAnswer(i -> i.getArgument(0));

        timelineService.deleteEntry(testEntry.getId(), testUser.getId(), "192.168.1.1");

        verify(timelineRepository).save(argThat(entry -> entry.getDeletedAt() != null));
    }

    @Test
    void togglePin_ShouldTogglePinStatus() {
        assertFalse(testEntry.isPinned());

        when(timelineRepository.findById(testEntry.getId())).thenReturn(Optional.of(testEntry));
        when(permissionEvaluator.isOwner(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(permissionEvaluator.getRole(testPassport.getId(), testUser.getId())).thenReturn(Role.OWNER);
        when(timelineRepository.save(any(TimelineEntry.class))).thenAnswer(i -> {
            TimelineEntry e = i.getArgument(0);
            ReflectionTestUtils.setField(e, "createdAt", java.time.Instant.now());
            ReflectionTestUtils.setField(e, "updatedAt", java.time.Instant.now());
            return e;
        });

        TimelineEntryResponse result = timelineService.togglePin(testEntry.getId(), testUser.getId(), "192.168.1.1");

        assertTrue(result.pinned());
    }

    @Test
    void togglePin_ShouldThrowWhenNotOwner() {
        when(timelineRepository.findById(testEntry.getId())).thenReturn(Optional.of(testEntry));
        when(permissionEvaluator.isOwner(testPassport.getId(), testUser.getId())).thenReturn(false);

        assertThrows(SecurityException.class, () ->
            timelineService.togglePin(testEntry.getId(), testUser.getId(), "192.168.1.1")
        );
    }

    @Test
    void flagEntry_ShouldSetFlagAndDueDate() {
        FlagEntryRequest request = new FlagEntryRequest(true, LocalDate.now().plusDays(7));

        when(timelineRepository.findById(testEntry.getId())).thenReturn(Optional.of(testEntry));
        when(permissionEvaluator.canAddTimelineEntries(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(permissionEvaluator.getRole(testPassport.getId(), testUser.getId())).thenReturn(Role.OWNER);
        when(timelineRepository.save(any(TimelineEntry.class))).thenAnswer(i -> {
            TimelineEntry e = i.getArgument(0);
            ReflectionTestUtils.setField(e, "createdAt", java.time.Instant.now());
            ReflectionTestUtils.setField(e, "updatedAt", java.time.Instant.now());
            return e;
        });

        TimelineEntryResponse result = timelineService.flagEntry(
            testEntry.getId(), testUser.getId(), request, "192.168.1.1"
        );

        assertTrue(result.flaggedForFollowup());
        assertNotNull(result.followupDueDate());
    }

    @Test
    void flagEntry_ShouldThrowWhenNoEditPermission() {
        FlagEntryRequest request = new FlagEntryRequest(true, null);

        when(timelineRepository.findById(testEntry.getId())).thenReturn(Optional.of(testEntry));
        when(permissionEvaluator.canAddTimelineEntries(testPassport.getId(), testUser.getId())).thenReturn(false);

        assertThrows(SecurityException.class, () ->
            timelineService.flagEntry(testEntry.getId(), testUser.getId(), request, "192.168.1.1")
        );
    }

    @Test
    void getEntriesByType_ShouldFilterByType() {
        TimelineEntry milestoneEntry = new TimelineEntry(
            testPassport, testUser, EntryType.MILESTONE, "Milestone", "Content", LocalDate.now()
        );
        milestoneEntry.setVisibilityLevel(VisibilityLevel.ALL);
        ReflectionTestUtils.setField(milestoneEntry, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(milestoneEntry, "createdAt", java.time.Instant.now());
        ReflectionTestUtils.setField(milestoneEntry, "updatedAt", java.time.Instant.now());

        when(permissionEvaluator.canViewTimeline(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(permissionEvaluator.getRole(testPassport.getId(), testUser.getId())).thenReturn(Role.OWNER);
        when(timelineRepository.findByPassportIdAndType(testPassport.getId(), EntryType.MILESTONE))
            .thenReturn(List.of(milestoneEntry));

        List<TimelineEntryResponse> result = timelineService.getEntriesByType(
            testPassport.getId(), testUser.getId(), EntryType.MILESTONE, "192.168.1.1"
        );

        assertEquals(1, result.size());
        assertEquals(EntryType.MILESTONE, result.get(0).entryType());
    }

    @Test
    void getTimelineEntries_ShouldComposeSearchWithFlaggedFilter() {
        TimelineFilterRequest filter = new TimelineFilterRequest(
            null, null, null, null, null, true, "steps", 0, 20
        );

        TimelineEntry flaggedMatch = new TimelineEntry(
            testPassport, testUser, EntryType.MILESTONE, "First Steps", "Content", LocalDate.now()
        );
        flaggedMatch.setVisibilityLevel(VisibilityLevel.ALL);
        flaggedMatch.setFlaggedForFollowup(true);
        ReflectionTestUtils.setField(flaggedMatch, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(flaggedMatch, "createdAt", java.time.Instant.now());
        ReflectionTestUtils.setField(flaggedMatch, "updatedAt", java.time.Instant.now());

        TimelineEntry unflaggedMatch = new TimelineEntry(
            testPassport, testUser, EntryType.NOTE, "Baby Steps", "Content", LocalDate.now()
        );
        unflaggedMatch.setVisibilityLevel(VisibilityLevel.ALL);
        ReflectionTestUtils.setField(unflaggedMatch, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(unflaggedMatch, "createdAt", java.time.Instant.now());
        ReflectionTestUtils.setField(unflaggedMatch, "updatedAt", java.time.Instant.now());

        when(permissionEvaluator.canViewTimeline(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(permissionEvaluator.getRole(testPassport.getId(), testUser.getId())).thenReturn(Role.OWNER);
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(timelineRepository.searchByPassportId(testPassport.getId(), "steps:*"))
            .thenReturn(List.of(flaggedMatch, unflaggedMatch));
        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));

        TimelinePageResponse result = timelineService.getTimelineEntries(
            testPassport.getId(), testUser.getId(), filter, "192.168.1.1"
        );

        // Only the flagged entry should pass through the composed filters
        assertEquals(1, result.entries().size());
        assertEquals("First Steps", result.entries().get(0).title());
        assertTrue(result.entries().get(0).flaggedForFollowup());
    }

    @Test
    void getEntry_ShouldThrowWhenEntryDeleted() {
        testEntry.setDeletedAt(java.time.Instant.now());

        when(timelineRepository.findById(testEntry.getId())).thenReturn(Optional.of(testEntry));

        assertThrows(ResourceNotFoundException.class, () ->
            timelineService.getEntry(testEntry.getId(), testUser.getId(), "192.168.1.1")
        );
    }
}

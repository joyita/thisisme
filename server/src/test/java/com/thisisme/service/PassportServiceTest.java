package com.thisisme.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.thisisme.exception.ResourceNotFoundException;
import com.thisisme.model.dto.PassportDTO.*;
import com.thisisme.model.entity.*;
import com.thisisme.model.enums.Role;
import com.thisisme.model.enums.SectionType;
import com.thisisme.model.enums.VisibilityLevel;
import com.thisisme.repository.*;
import com.thisisme.security.PermissionEvaluator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PassportServiceTest {

    @Mock private PassportRepository passportRepository;
    @Mock private PassportPermissionRepository permissionRepository;
    @Mock private UserRepository userRepository;
    @Mock private ConsentService consentService;
    @Mock private AuditService auditService;
    @Mock private PermissionEvaluator permissionEvaluator;
    @Mock private AuditService.AuditLogBuilder auditLogBuilder;
    @Mock private NotificationService notificationService;
    @Mock private SectionRevisionRepository sectionRevisionRepository;
    @Mock private InvitationService invitationService;
    @Mock private CustomRoleService customRoleService;

    private PassportService passportService;
    private User testUser;
    private Passport testPassport;

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper();
        passportService = new PassportService(
            passportRepository,
            permissionRepository,
            userRepository,
            consentService,
            auditService,
            permissionEvaluator,
            objectMapper, notificationService, sectionRevisionRepository, invitationService, customRoleService
        );

        testUser = new User("Test User", "test@example.com", "hashedPassword");
        ReflectionTestUtils.setField(testUser, "id", UUID.randomUUID());

        testPassport = new Passport("Test Child", testUser);
        ReflectionTestUtils.setField(testPassport, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(testPassport, "sections", new ArrayList<>());
        ReflectionTestUtils.setField(testPassport, "revisions", new ArrayList<>());

        // Setup audit mock chain with lenient stubbing
        lenient().when(auditService.log(any(), any(), any(), any())).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withPassport(any(com.thisisme.model.entity.Passport.class))).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withPassport(any(UUID.class))).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withEntity(any(), any())).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withDescription(any())).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withDataCategories(any(String[].class))).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withOldValue(any())).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withNewValue(any())).thenReturn(auditLogBuilder);
    }

    @Test
    void createPassport_ShouldCreatePassportAndGrantOwnerPermission() {
        CreatePassportRequest request = new CreatePassportRequest(
            "Child Name",
            LocalDate.of(2020, 1, 1),
            true
        );

        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(passportRepository.save(any(Passport.class))).thenAnswer(i -> {
            Passport p = i.getArgument(0);
            ReflectionTestUtils.setField(p, "id", UUID.randomUUID());
            return p;
        });
        when(permissionRepository.save(any(PassportPermission.class))).thenAnswer(i -> i.getArgument(0));

        Passport result = passportService.createPassport(
            testUser.getId(), request, "192.168.1.1", "Mozilla/5.0");

        assertNotNull(result);
        assertEquals("Child Name", result.getChildFirstName());

        verify(passportRepository).save(any(Passport.class));
        verify(permissionRepository).save(any(PassportPermission.class));
        verify(consentService).recordChildHealthDataConsent(any(), any(), eq("Child Name"), any(), any());
    }

    @Test
    void createPassport_ShouldNotRecordConsentWhenNotProvided() {
        CreatePassportRequest request = new CreatePassportRequest(
            "Child Name",
            LocalDate.of(2020, 1, 1),
            false
        );

        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(passportRepository.save(any(Passport.class))).thenAnswer(i -> {
            Passport p = i.getArgument(0);
            ReflectionTestUtils.setField(p, "id", UUID.randomUUID());
            return p;
        });
        when(permissionRepository.save(any(PassportPermission.class))).thenAnswer(i -> i.getArgument(0));

        passportService.createPassport(testUser.getId(), request, "192.168.1.1", "Mozilla/5.0");

        verify(consentService, never()).recordChildHealthDataConsent(any(), any(), any(), any(), any());
    }

    @Test
    void getPassport_ShouldThrowWhenUserCannotView() {
        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));
        when(permissionEvaluator.canView(testPassport.getId(), testUser.getId())).thenReturn(false);

        assertThrows(SecurityException.class, () ->
            passportService.getPassport(testPassport.getId(), testUser.getId(), "192.168.1.1")
        );
    }

    @Test
    void getPassport_ShouldReturnPassportWhenUserCanView() {
        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));
        when(permissionEvaluator.canView(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));

        Passport result = passportService.getPassport(testPassport.getId(), testUser.getId(), "192.168.1.1");

        assertNotNull(result);
        assertEquals(testPassport.getId(), result.getId());
    }

    @Test
    void updatePassport_ShouldThrowWhenUserCannotEdit() {
        UpdatePassportRequest request = new UpdatePassportRequest("New Name", null, null);

        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));
        when(permissionEvaluator.canEdit(testPassport.getId(), testUser.getId())).thenReturn(false);

        assertThrows(SecurityException.class, () ->
            passportService.updatePassport(testPassport.getId(), testUser.getId(), request, "192.168.1.1")
        );
    }

    @Test
    void updatePassport_ShouldUpdateFields() {
        UpdatePassportRequest request = new UpdatePassportRequest("New Name", LocalDate.of(2019, 5, 15), null);

        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));
        when(permissionEvaluator.canEdit(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(permissionEvaluator.getRole(testPassport.getId(), testUser.getId())).thenReturn(Role.OWNER);
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(passportRepository.save(any(Passport.class))).thenAnswer(i -> i.getArgument(0));

        PassportResponse result = passportService.updatePassport(
            testPassport.getId(), testUser.getId(), request, "192.168.1.1");

        assertEquals("New Name", result.childFirstName());
        assertEquals(LocalDate.of(2019, 5, 15), result.childDateOfBirth());
    }

    @Test
    void addSection_ShouldCreateSection() {
        CreateSectionRequest request = new CreateSectionRequest(
            SectionType.LOVES,
            "Loves dinosaurs",
            null,
            VisibilityLevel.ALL
        );

        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));
        when(permissionEvaluator.canEditSections(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(passportRepository.save(any(Passport.class))).thenAnswer(i -> i.getArgument(0));

        PassportSection result = passportService.addSection(
            testPassport.getId(), testUser.getId(), request, "192.168.1.1");

        assertNotNull(result);
        assertEquals(SectionType.LOVES, result.getType());
        assertEquals("Loves dinosaurs", result.getContent());
        assertEquals(VisibilityLevel.ALL, result.getVisibilityLevel());
    }

    @Test
    void addPermission_ShouldGrantAccess() {
        User targetUser = new User("Target User", "target@example.com", "hash");
        ReflectionTestUtils.setField(targetUser, "id", UUID.randomUUID());

        AddPermissionRequest request = new AddPermissionRequest(
            "target@example.com",
            "PROFESSIONAL",
            "Child's therapist",
            null
        );

        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));
        when(permissionEvaluator.canManageAccess(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(userRepository.findByEmail("target@example.com")).thenReturn(Optional.of(targetUser));
        when(permissionRepository.findActivePermission(testPassport.getId(), targetUser.getId()))
            .thenReturn(Optional.empty());
        when(permissionRepository.save(any(PassportPermission.class))).thenAnswer(i -> {
            PassportPermission p = i.getArgument(0);
            ReflectionTestUtils.setField(p, "id", UUID.randomUUID());
            return p;
        });

        PermissionResponse result = passportService.addPermission(
            testPassport.getId(), testUser.getId(), request, "192.168.1.1");

        assertNotNull(result);
        assertEquals("PROFESSIONAL", result.role());
        assertEquals("Child's therapist", result.notes());
    }

    @Test
    void addPermission_ShouldThrowWhenUserAlreadyHasAccess() {
        User targetUser = new User("Target User", "target@example.com", "hash");
        ReflectionTestUtils.setField(targetUser, "id", UUID.randomUUID());

        AddPermissionRequest request = new AddPermissionRequest("target@example.com", "PROFESSIONAL", null, null);

        PassportPermission existingPermission = new PassportPermission(testPassport, targetUser, Role.VIEWER, testUser);

        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));
        when(permissionEvaluator.canManageAccess(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(userRepository.findByEmail("target@example.com")).thenReturn(Optional.of(targetUser));
        when(permissionRepository.findActivePermission(testPassport.getId(), targetUser.getId()))
            .thenReturn(Optional.of(existingPermission));

        assertThrows(IllegalStateException.class, () ->
            passportService.addPermission(testPassport.getId(), testUser.getId(), request, "192.168.1.1")
        );
    }

    @Test
    void revokePermission_ShouldNotAllowRevokingOwnOwnerPermission() {
        PassportPermission ownerPermission = new PassportPermission(testPassport, testUser, Role.OWNER, testUser);
        ReflectionTestUtils.setField(ownerPermission, "id", UUID.randomUUID());

        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));
        when(permissionEvaluator.canManageAccess(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(permissionRepository.findById(ownerPermission.getId())).thenReturn(Optional.of(ownerPermission));

        assertThrows(IllegalStateException.class, () ->
            passportService.revokePermission(testPassport.getId(), ownerPermission.getId(),
                testUser.getId(), "192.168.1.1")
        );
    }

    @Test
    void createPassport_ShouldThrowWhenUserNotFound() {
        UUID nonExistentUserId = UUID.randomUUID();
        CreatePassportRequest request = new CreatePassportRequest("Child", null, false);

        when(userRepository.findById(nonExistentUserId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
            passportService.createPassport(nonExistentUserId, request, "192.168.1.1", "Mozilla/5.0")
        );
    }
}

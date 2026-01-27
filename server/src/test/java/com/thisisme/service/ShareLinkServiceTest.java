package com.thisisme.service;

import com.thisisme.exception.ResourceNotFoundException;
import com.thisisme.model.dto.ShareDTO.*;
import com.thisisme.model.entity.Passport;
import com.thisisme.model.entity.ShareLink;
import com.thisisme.model.entity.User;
import com.thisisme.model.enums.SectionType;
import com.thisisme.repository.*;
import com.thisisme.security.PermissionEvaluator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ShareLinkServiceTest {

    @Mock private ShareLinkRepository shareLinkRepository;
    @Mock private PassportRepository passportRepository;
    @Mock private UserRepository userRepository;
    @Mock private TimelineEntryRepository timelineRepository;
    @Mock private DocumentRepository documentRepository;
    @Mock private PermissionEvaluator permissionEvaluator;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuditService auditService;
    @Mock private AuditService.AuditLogBuilder auditLogBuilder;

    private ShareLinkService shareLinkService;
    private User testUser;
    private Passport testPassport;
    private ShareLink testLink;

    @BeforeEach
    void setUp() {
        shareLinkService = new ShareLinkService(
            shareLinkRepository,
            passportRepository,
            userRepository,
            timelineRepository,
            documentRepository,
            permissionEvaluator,
            passwordEncoder,
            auditService
        );

        ReflectionTestUtils.setField(shareLinkService, "shareBaseUrl", "https://thisisme.app/share");

        testUser = new User("Test User", "test@example.com", "hashedPassword");
        ReflectionTestUtils.setField(testUser, "id", UUID.randomUUID());

        testPassport = new Passport("Test Child", testUser);
        ReflectionTestUtils.setField(testPassport, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(testPassport, "sections", new java.util.ArrayList<>());

        testLink = new ShareLink(testPassport, "abc123xyz", testUser);
        ReflectionTestUtils.setField(testLink, "id", UUID.randomUUID());
        ReflectionTestUtils.setField(testLink, "createdAt", Instant.now());

        // Setup audit mock chain
        lenient().when(auditService.log(any(), any(), any(), any())).thenReturn(auditLogBuilder);
        lenient().when(auditService.logSystem(any(), any())).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withPassport(any(Passport.class))).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withPassport(any(UUID.class))).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withEntity(any(), any())).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withDescription(any())).thenReturn(auditLogBuilder);
    }

    @Test
    void createShareLink_ShouldCreateLinkWhenUserHasPermission() {
        CreateShareLinkRequest request = new CreateShareLinkRequest(
            "For Dr. Smith",
            Set.of(SectionType.LOVES, SectionType.NEEDS),
            true,
            false,
            30,
            null
        );

        when(permissionEvaluator.canManageAccess(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(shareLinkRepository.findByToken(any())).thenReturn(Optional.empty());
        when(shareLinkRepository.save(any(ShareLink.class))).thenAnswer(i -> {
            ShareLink link = i.getArgument(0);
            ReflectionTestUtils.setField(link, "id", UUID.randomUUID());
            return link;
        });

        ShareLink result = shareLinkService.createShareLink(
            testPassport.getId(),
            testUser.getId(),
            request,
            "192.168.1.1"
        );

        assertNotNull(result);
        assertEquals("For Dr. Smith", result.getLabel());
        assertTrue(result.isShowTimeline());
        assertFalse(result.isShowDocuments());
        assertNotNull(result.getExpiresAt());
    }

    @Test
    void createShareLink_ShouldThrowWhenUserLacksPermission() {
        CreateShareLinkRequest request = new CreateShareLinkRequest(
            null, null, false, false, null, null
        );

        when(permissionEvaluator.canManageAccess(testPassport.getId(), testUser.getId())).thenReturn(false);

        assertThrows(SecurityException.class, () ->
            shareLinkService.createShareLink(testPassport.getId(), testUser.getId(), request, "192.168.1.1")
        );
    }

    @Test
    void createShareLink_ShouldHashPassword() {
        CreateShareLinkRequest request = new CreateShareLinkRequest(
            null, null, false, false, null, "secret123"
        );

        when(permissionEvaluator.canManageAccess(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(passportRepository.findActiveById(testPassport.getId())).thenReturn(Optional.of(testPassport));
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(shareLinkRepository.findByToken(any())).thenReturn(Optional.empty());
        when(passwordEncoder.encode("secret123")).thenReturn("hashed_password");
        when(shareLinkRepository.save(any(ShareLink.class))).thenAnswer(i -> {
            ShareLink link = i.getArgument(0);
            ReflectionTestUtils.setField(link, "id", UUID.randomUUID());
            return link;
        });

        ShareLink result = shareLinkService.createShareLink(
            testPassport.getId(), testUser.getId(), request, "192.168.1.1"
        );

        assertEquals("hashed_password", result.getPasswordHash());
        verify(passwordEncoder).encode("secret123");
    }

    @Test
    void getShareLinks_ShouldReturnLinksForPassport() {
        when(permissionEvaluator.canManageAccess(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(shareLinkRepository.findAllByPassportId(testPassport.getId())).thenReturn(List.of(testLink));

        List<ShareLink> result = shareLinkService.getShareLinks(testPassport.getId(), testUser.getId());

        assertEquals(1, result.size());
        assertEquals(testLink.getToken(), result.get(0).getToken());
    }

    @Test
    void revokeShareLink_ShouldRevokeLink() {
        when(shareLinkRepository.findById(testLink.getId())).thenReturn(Optional.of(testLink));
        when(permissionEvaluator.canManageAccess(testPassport.getId(), testUser.getId())).thenReturn(true);
        when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        when(shareLinkRepository.save(any(ShareLink.class))).thenAnswer(i -> i.getArgument(0));

        shareLinkService.revokeShareLink(testLink.getId(), testUser.getId(), "192.168.1.1");

        verify(shareLinkRepository).save(argThat(link -> !link.isActive() && link.getRevokedAt() != null));
    }

    @Test
    void checkAccess_ShouldReturnAccessInfo() {
        when(shareLinkRepository.findByToken("abc123xyz")).thenReturn(Optional.of(testLink));

        ShareAccessResponse response = shareLinkService.checkAccess("abc123xyz");

        assertFalse(response.requiresPassword());
        assertFalse(response.isExpired());
        assertEquals("Test Child", response.passportChildName());
    }

    @Test
    void checkAccess_ShouldThrowWhenTokenNotFound() {
        when(shareLinkRepository.findByToken("invalid")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () ->
            shareLinkService.checkAccess("invalid")
        );
    }

    @Test
    void verifyPassword_ShouldReturnTrueForCorrectPassword() {
        testLink.setPasswordHash("hashed_password");

        when(shareLinkRepository.findByToken("abc123xyz")).thenReturn(Optional.of(testLink));
        when(passwordEncoder.matches("correct", "hashed_password")).thenReturn(true);

        boolean result = shareLinkService.verifyPassword("abc123xyz", "correct");

        assertTrue(result);
    }

    @Test
    void verifyPassword_ShouldReturnFalseForIncorrectPassword() {
        testLink.setPasswordHash("hashed_password");

        when(shareLinkRepository.findByToken("abc123xyz")).thenReturn(Optional.of(testLink));
        when(passwordEncoder.matches("wrong", "hashed_password")).thenReturn(false);

        boolean result = shareLinkService.verifyPassword("abc123xyz", "wrong");

        assertFalse(result);
    }

    @Test
    void verifyPassword_ShouldReturnTrueWhenNoPassword() {
        when(shareLinkRepository.findByToken("abc123xyz")).thenReturn(Optional.of(testLink));

        boolean result = shareLinkService.verifyPassword("abc123xyz", "anything");

        assertTrue(result);
    }

    @Test
    void toResponse_ShouldConvertToDTO() {
        ShareLinkResponse response = shareLinkService.toResponse(testLink);

        assertEquals(testLink.getId(), response.id());
        assertEquals(testLink.getToken(), response.token());
        assertTrue(response.shareUrl().contains(testLink.getToken()));
    }
}

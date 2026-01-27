package com.thisisme.service;

import com.thisisme.model.entity.Consent;
import com.thisisme.model.entity.Passport;
import com.thisisme.model.entity.User;
import com.thisisme.model.enums.ConsentType;
import com.thisisme.model.enums.LawfulBasis;
import com.thisisme.repository.ConsentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConsentServiceTest {

    @Mock
    private ConsentRepository consentRepository;

    @Mock
    private AuditService auditService;

    @Mock
    private AuditService.AuditLogBuilder auditLogBuilder;

    private ConsentService consentService;

    private User testUser;
    private Passport testPassport;

    @BeforeEach
    void setUp() {
        consentService = new ConsentService(consentRepository, auditService);
        ReflectionTestUtils.setField(consentService, "currentPolicyVersion", "1.0.0");

        testUser = new User("Test User", "test@example.com", "hashedPassword");
        ReflectionTestUtils.setField(testUser, "id", UUID.randomUUID());

        testPassport = new Passport("Test Child", testUser);
        ReflectionTestUtils.setField(testPassport, "id", UUID.randomUUID());

        // Setup audit service mock chain with lenient stubbing
        lenient().when(auditService.log(any(), any(), any(), any())).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withPassport(any(com.thisisme.model.entity.Passport.class))).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withPassport(any(UUID.class))).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withEntity(any(), any())).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withDescription(any())).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withDataCategories(any(String[].class))).thenReturn(auditLogBuilder);
    }

    @Test
    void recordChildHealthDataConsent_ShouldCreateConsentWithCorrectDetails() {
        when(consentRepository.save(any(Consent.class))).thenAnswer(i -> {
            Consent c = i.getArgument(0);
            ReflectionTestUtils.setField(c, "id", UUID.randomUUID());
            return c;
        });

        Consent result = consentService.recordChildHealthDataConsent(
            testUser,
            testPassport,
            "Test Child",
            "192.168.1.1",
            "Mozilla/5.0"
        );

        assertNotNull(result);
        assertEquals(ConsentType.CHILD_HEALTH_DATA, result.getType());
        assertEquals(LawfulBasis.EXPLICIT_CONSENT, result.getLawfulBasis());
        assertEquals("1.0.0", result.getPolicyVersion());
        assertTrue(result.getConsentText().contains("Test Child"));
        assertNotNull(result.getEvidenceHash());

        verify(consentRepository).save(any(Consent.class));
        verify(auditService).log(any(), eq(testUser.getId()), eq(testUser.getName()), eq("192.168.1.1"));
    }

    @Test
    void withdrawConsent_ShouldMarkConsentAsWithdrawn() {
        UUID consentId = UUID.randomUUID();
        Consent existingConsent = new Consent(
            testUser,
            ConsentType.CHILD_HEALTH_DATA,
            LawfulBasis.EXPLICIT_CONSENT,
            "1.0.0",
            "Test consent text",
            "hash",
            "192.168.1.1",
            "Mozilla/5.0"
        );
        existingConsent.setPassport(testPassport);
        ReflectionTestUtils.setField(existingConsent, "id", consentId);

        when(consentRepository.findById(consentId)).thenReturn(Optional.of(existingConsent));
        when(consentRepository.save(any(Consent.class))).thenAnswer(i -> i.getArgument(0));

        Consent result = consentService.withdrawConsent(
            consentId,
            testUser.getId(),
            "No longer needed",
            "192.168.1.1"
        );

        assertNotNull(result);
        assertFalse(result.isActive());
        assertNotNull(result.getWithdrawnAt());
        assertEquals("No longer needed", result.getWithdrawalReason());
    }

    @Test
    void withdrawConsent_ShouldThrowExceptionForOtherUsersConsent() {
        UUID consentId = UUID.randomUUID();
        User otherUser = new User("Other User", "other@example.com", "hash");
        ReflectionTestUtils.setField(otherUser, "id", UUID.randomUUID());

        Consent existingConsent = new Consent(
            otherUser,
            ConsentType.CHILD_HEALTH_DATA,
            LawfulBasis.EXPLICIT_CONSENT,
            "1.0.0",
            "Test consent text",
            "hash",
            "192.168.1.1",
            "Mozilla/5.0"
        );
        ReflectionTestUtils.setField(existingConsent, "id", consentId);

        when(consentRepository.findById(consentId)).thenReturn(Optional.of(existingConsent));

        assertThrows(SecurityException.class, () ->
            consentService.withdrawConsent(consentId, testUser.getId(), "reason", "192.168.1.1")
        );
    }

    @Test
    void hasActiveConsent_ShouldReturnTrueWhenConsentExists() {
        when(consentRepository.existsByUserIdAndTypeAndWithdrawnAtIsNull(
            testUser.getId(), ConsentType.CHILD_HEALTH_DATA)).thenReturn(true);

        boolean result = consentService.hasActiveConsent(testUser.getId(), ConsentType.CHILD_HEALTH_DATA);

        assertTrue(result);
    }

    @Test
    void hasActiveConsent_ShouldReturnFalseWhenNoConsent() {
        when(consentRepository.existsByUserIdAndTypeAndWithdrawnAtIsNull(
            testUser.getId(), ConsentType.CHILD_HEALTH_DATA)).thenReturn(false);

        boolean result = consentService.hasActiveConsent(testUser.getId(), ConsentType.CHILD_HEALTH_DATA);

        assertFalse(result);
    }

    @Test
    void getCurrentPolicyVersion_ShouldReturnConfiguredVersion() {
        assertEquals("1.0.0", consentService.getCurrentPolicyVersion());
    }
}

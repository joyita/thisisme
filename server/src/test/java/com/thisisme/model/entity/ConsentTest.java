package com.thisisme.model.entity;

import com.thisisme.model.enums.ConsentType;
import com.thisisme.model.enums.LawfulBasis;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ConsentTest {

    @Test
    void newConsent_ShouldBeActive() {
        Consent consent = createTestConsent();

        assertTrue(consent.isActive());
        assertNull(consent.getWithdrawnAt());
    }

    @Test
    void withdraw_ShouldSetWithdrawnAtAndReason() {
        Consent consent = createTestConsent();

        consent.withdraw("No longer needed");

        assertFalse(consent.isActive());
        assertNotNull(consent.getWithdrawnAt());
        assertEquals("No longer needed", consent.getWithdrawalReason());
    }

    @Test
    void consent_ShouldStoreAllRequiredFields() {
        User user = new User("Test User", "test@example.com", "hash");
        Consent consent = new Consent(
            user,
            ConsentType.CHILD_HEALTH_DATA,
            LawfulBasis.EXPLICIT_CONSENT,
            "1.0.0",
            "I consent to processing",
            "evidenceHash123",
            "192.168.1.1",
            "Mozilla/5.0"
        );

        assertEquals(user, consent.getUser());
        assertEquals(ConsentType.CHILD_HEALTH_DATA, consent.getType());
        assertEquals(LawfulBasis.EXPLICIT_CONSENT, consent.getLawfulBasis());
        assertEquals("1.0.0", consent.getPolicyVersion());
        assertEquals("I consent to processing", consent.getConsentText());
        assertEquals("evidenceHash123", consent.getEvidenceHash());
        assertEquals("192.168.1.1", consent.getIpAddress());
        assertEquals("Mozilla/5.0", consent.getUserAgent());
    }

    private Consent createTestConsent() {
        User user = new User("Test User", "test@example.com", "hash");
        return new Consent(
            user,
            ConsentType.CHILD_HEALTH_DATA,
            LawfulBasis.EXPLICIT_CONSENT,
            "1.0.0",
            "Test consent text",
            "hash",
            "192.168.1.1",
            "Mozilla/5.0"
        );
    }
}

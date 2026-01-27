package com.thisisme.service;

import com.thisisme.model.entity.Consent;
import com.thisisme.model.entity.Passport;
import com.thisisme.model.entity.User;
import com.thisisme.model.enums.AuditAction;
import com.thisisme.model.enums.ConsentType;
import com.thisisme.model.enums.LawfulBasis;
import com.thisisme.repository.ConsentRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service for managing user consent under UK GDPR.
 * Consent is granular, specific, informed, and freely given.
 */
@Service
public class ConsentService {

    private final ConsentRepository consentRepository;
    private final AuditService auditService;

    @Value("${app.privacy.policy-version:1.0.0}")
    private String currentPolicyVersion;

    // Consent text templates
    private static final String CHILD_HEALTH_DATA_CONSENT =
        "I consent to the processing of %s's health, behavioural, and developmental information " +
        "for the purpose of care coordination between myself, other authorised parents/guardians, " +
        "and healthcare/education professionals I choose to share with. " +
        "I understand this is special category data under UK GDPR Article 9 and I can withdraw " +
        "this consent at any time.";

    private static final String PROFESSIONAL_SHARING_CONSENT =
        "I consent to sharing %s's passport information with %s (%s) for the purpose of " +
        "coordinated care. I understand I can revoke this access at any time.";

    public ConsentService(ConsentRepository consentRepository, AuditService auditService) {
        this.consentRepository = consentRepository;
        this.auditService = auditService;
    }

    /**
     * Record consent for processing child health data (Art 9.2.a)
     */
    @Transactional
    public Consent recordChildHealthDataConsent(User user, Passport passport,
                                                 String childName, String ipAddress, String userAgent) {
        String consentText = String.format(CHILD_HEALTH_DATA_CONSENT, childName);
        String evidenceHash = generateEvidenceHash(user.getId(), ConsentType.CHILD_HEALTH_DATA,
                                                    consentText, ipAddress, Instant.now());

        Consent consent = new Consent(
            user,
            ConsentType.CHILD_HEALTH_DATA,
            LawfulBasis.EXPLICIT_CONSENT,
            currentPolicyVersion,
            consentText,
            evidenceHash,
            ipAddress,
            userAgent
        );
        consent.setPassport(passport);

        Consent saved = consentRepository.save(consent);

        auditService.log(AuditAction.CONSENT_GRANTED, user.getId(), user.getName(), ipAddress)
            .withPassport(passport.getId())
            .withEntity("Consent", saved.getId())
            .withDescription("Consent granted for child health data processing")
            .withDataCategories("HEALTH", "BEHAVIORAL");

        return saved;
    }

    /**
     * Record consent for sharing with a professional
     */
    @Transactional
    public Consent recordProfessionalSharingConsent(User user, Passport passport,
                                                     String childName, String professionalName,
                                                     String professionalRole,
                                                     String ipAddress, String userAgent) {
        String consentText = String.format(PROFESSIONAL_SHARING_CONSENT,
                                           childName, professionalName, professionalRole);
        String evidenceHash = generateEvidenceHash(user.getId(), ConsentType.PROFESSIONAL_SHARING,
                                                    consentText, ipAddress, Instant.now());

        Consent consent = new Consent(
            user,
            ConsentType.PROFESSIONAL_SHARING,
            LawfulBasis.CONSENT,
            currentPolicyVersion,
            consentText,
            evidenceHash,
            ipAddress,
            userAgent
        );
        consent.setPassport(passport);

        Consent saved = consentRepository.save(consent);

        auditService.log(AuditAction.CONSENT_GRANTED, user.getId(), user.getName(), ipAddress)
            .withPassport(passport.getId())
            .withEntity("Consent", saved.getId())
            .withDescription("Consent granted for professional sharing: " + professionalName);

        return saved;
    }

    /**
     * Withdraw consent - Art 7.3
     */
    @Transactional
    public Consent withdrawConsent(UUID consentId, UUID userId, String reason,
                                   String ipAddress) {
        Consent consent = consentRepository.findById(consentId)
            .orElseThrow(() -> new IllegalArgumentException("Consent not found"));

        if (!consent.getUser().getId().equals(userId)) {
            throw new SecurityException("Cannot withdraw another user's consent");
        }

        if (!consent.isActive()) {
            throw new IllegalStateException("Consent already withdrawn");
        }

        consent.withdraw(reason);
        Consent saved = consentRepository.save(consent);

        auditService.log(AuditAction.CONSENT_WITHDRAWN, userId, consent.getUser().getName(), ipAddress)
            .withPassport(consent.getPassport() != null ? consent.getPassport().getId() : null)
            .withEntity("Consent", consentId)
            .withDescription("Consent withdrawn: " + consent.getType() + " - Reason: " + reason);

        return saved;
    }

    /**
     * Check if user has active consent of a specific type
     */
    public boolean hasActiveConsent(UUID userId, ConsentType type) {
        return consentRepository.existsByUserIdAndTypeAndWithdrawnAtIsNull(userId, type);
    }

    /**
     * Check if user has active consent for a specific passport
     */
    public boolean hasActiveConsentForPassport(UUID userId, UUID passportId, ConsentType type) {
        return consentRepository.findActiveConsentForPassport(userId, passportId, type).isPresent();
    }

    /**
     * Get all active consents for a user
     */
    public List<Consent> getActiveConsents(UUID userId) {
        return consentRepository.findAllActiveByUser(userId);
    }

    /**
     * Get all consents (including withdrawn) for a user - for SAR
     */
    public List<Consent> getAllConsents(UUID userId) {
        return consentRepository.findAllByUser(userId);
    }

    /**
     * Get consent history for a passport
     */
    public List<Consent> getConsentHistoryForPassport(UUID passportId) {
        return consentRepository.findAllByPassport(passportId);
    }

    /**
     * Get the current privacy policy version
     */
    public String getCurrentPolicyVersion() {
        return currentPolicyVersion;
    }

    /**
     * Check if user's consent is on the current policy version
     */
    public boolean isConsentCurrent(UUID userId, ConsentType type) {
        Optional<Consent> consent = consentRepository.findActiveConsent(userId, type);
        return consent.map(c -> c.getPolicyVersion().equals(currentPolicyVersion)).orElse(false);
    }

    /**
     * Generate evidence hash for consent verification
     */
    private String generateEvidenceHash(UUID userId, ConsentType type, String consentText,
                                        String ipAddress, Instant timestamp) {
        try {
            String data = userId.toString() + type.name() + consentText + ipAddress + timestamp.toString();
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }
}

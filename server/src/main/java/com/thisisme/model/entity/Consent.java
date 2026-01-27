package com.thisisme.model.entity;

import com.thisisme.model.enums.ConsentType;
import com.thisisme.model.enums.LawfulBasis;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

/**
 * Records consent given by users for UK GDPR compliance.
 * Each consent record is immutable - withdrawal creates a new record.
 */
@Entity
@Table(name = "consents", indexes = {
    @Index(name = "idx_consents_user", columnList = "user_id"),
    @Index(name = "idx_consents_passport", columnList = "passport_id"),
    @Index(name = "idx_consents_type", columnList = "type"),
    @Index(name = "idx_consents_active", columnList = "withdrawn_at")
})
@EntityListeners(AuditingEntityListener.class)
public class Consent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * The user giving consent (parent)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * The passport this consent relates to (may be null for account-level consent)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passport_id")
    private Passport passport;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ConsentType type;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LawfulBasis lawfulBasis;

    /**
     * Version of privacy policy at time of consent
     */
    @Column(nullable = false)
    private String policyVersion;

    /**
     * The specific text the user agreed to
     */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String consentText;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant grantedAt;

    @Column
    private Instant withdrawnAt;

    @Column
    private String withdrawalReason;

    /**
     * SHA-256 hash of consent action for evidence
     */
    @Column(nullable = false)
    private String evidenceHash;

    /**
     * IP address at time of consent (for evidence)
     */
    @Column(nullable = false)
    private String ipAddress;

    /**
     * User agent at time of consent (for evidence)
     */
    @Column
    private String userAgent;

    protected Consent() {}

    public Consent(User user, ConsentType type, LawfulBasis lawfulBasis,
                   String policyVersion, String consentText, String evidenceHash,
                   String ipAddress, String userAgent) {
        this.user = user;
        this.type = type;
        this.lawfulBasis = lawfulBasis;
        this.policyVersion = policyVersion;
        this.consentText = consentText;
        this.evidenceHash = evidenceHash;
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;
    }

    // Getters
    public UUID getId() { return id; }
    public User getUser() { return user; }

    public Passport getPassport() { return passport; }
    public void setPassport(Passport passport) { this.passport = passport; }

    public ConsentType getType() { return type; }
    public LawfulBasis getLawfulBasis() { return lawfulBasis; }
    public String getPolicyVersion() { return policyVersion; }
    public String getConsentText() { return consentText; }
    public Instant getGrantedAt() { return grantedAt; }

    public Instant getWithdrawnAt() { return withdrawnAt; }

    public String getWithdrawalReason() { return withdrawalReason; }

    public String getEvidenceHash() { return evidenceHash; }
    public String getIpAddress() { return ipAddress; }
    public String getUserAgent() { return userAgent; }

    public boolean isActive() {
        return withdrawnAt == null;
    }

    public void withdraw(String reason) {
        this.withdrawnAt = Instant.now();
        this.withdrawalReason = reason;
    }
}

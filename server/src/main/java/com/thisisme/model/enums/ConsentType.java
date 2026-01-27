package com.thisisme.model.enums;

/**
 * Types of consent required under UK GDPR.
 * Each consent type maps to a specific lawful basis and purpose.
 */
public enum ConsentType {
    /**
     * Consent to create account - Lawful basis: CONTRACT (Art 6.1.b)
     */
    ACCOUNT_CREATION,

    /**
     * Consent to process child's health/behavioural data - Lawful basis: EXPLICIT CONSENT (Art 9.2.a)
     * Required as this is special category data.
     */
    CHILD_HEALTH_DATA,

    /**
     * Consent to share data with specific professional - Lawful basis: CONSENT (Art 6.1.a)
     */
    PROFESSIONAL_SHARING,

    /**
     * Consent to process uploaded documents via OCR - Lawful basis: CONSENT (Art 6.1.a)
     */
    DOCUMENT_OCR,

    /**
     * Consent to create shareable link - Lawful basis: CONSENT (Art 6.1.a)
     */
    SHAREABLE_LINK,

    /**
     * Consent to add co-owner (other parent) - Lawful basis: CONSENT (Art 6.1.a)
     */
    CO_OWNER_ACCESS
}

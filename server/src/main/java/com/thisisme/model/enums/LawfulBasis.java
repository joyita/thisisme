package com.thisisme.model.enums;

/**
 * UK GDPR Article 6 lawful bases for processing personal data.
 */
public enum LawfulBasis {
    /**
     * Art 6.1.a - The data subject has given consent
     */
    CONSENT,

    /**
     * Art 6.1.b - Processing is necessary for performance of a contract
     */
    CONTRACT,

    /**
     * Art 6.1.c - Processing is necessary for compliance with a legal obligation
     */
    LEGAL_OBLIGATION,

    /**
     * Art 6.1.d - Processing is necessary to protect vital interests
     */
    VITAL_INTERESTS,

    /**
     * Art 6.1.e - Processing is necessary for performance of a public task
     */
    PUBLIC_TASK,

    /**
     * Art 6.1.f - Processing is necessary for legitimate interests
     */
    LEGITIMATE_INTERESTS,

    /**
     * Art 9.2.a - Explicit consent for special category data (health)
     */
    EXPLICIT_CONSENT
}

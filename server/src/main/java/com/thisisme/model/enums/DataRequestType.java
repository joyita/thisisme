package com.thisisme.model.enums;

/**
 * UK GDPR data subject rights request types.
 */
public enum DataRequestType {
    /**
     * Art 15 - Right of access (Subject Access Request)
     */
    ACCESS,

    /**
     * Art 16 - Right to rectification
     */
    RECTIFICATION,

    /**
     * Art 17 - Right to erasure ('right to be forgotten')
     */
    ERASURE,

    /**
     * Art 18 - Right to restriction of processing
     */
    RESTRICTION,

    /**
     * Art 20 - Right to data portability
     */
    PORTABILITY,

    /**
     * Art 21 - Right to object
     */
    OBJECTION
}

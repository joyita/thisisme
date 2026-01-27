package com.thisisme.model.enums;

/**
 * Status of a data subject rights request.
 * UK GDPR requires response within 30 days (extendable to 90 for complex requests).
 */
public enum RequestStatus {
    PENDING,
    IN_PROGRESS,
    COMPLETED,
    REFUSED,
    EXTENDED
}

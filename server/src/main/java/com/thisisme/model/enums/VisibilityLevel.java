package com.thisisme.model.enums;

/**
 * Visibility levels for timeline entries and passport sections.
 * Controls who can see what content.
 */
public enum VisibilityLevel {
    /**
     * Visible only to owners (parents)
     */
    OWNERS_ONLY,

    /**
     * Visible to owners and professionals
     */
    PROFESSIONALS,

    /**
     * Visible to everyone including child view
     */
    ALL,

    /**
     * Custom visibility - check allowed roles
     */
    CUSTOM
}

package com.thisisme.model.enums;

/**
 * Timeline entry types for tracking child's journey.
 */
public enum EntryType {
    // Core types
    INCIDENT,
    SUCCESS,
    MILESTONE,
    NOTE,

    // Preference tracking
    LIKE,
    DISLIKE,

    // Professional categories
    MEDICAL,
    EDUCATIONAL,
    THERAPY,
    SCHOOL_REPORT,

    // Behavioral tracking
    BEHAVIOR,
    SENSORY,
    COMMUNICATION,
    SOCIAL,

    // Progress tracking
    GOAL_SET,
    GOAL_PROGRESS,
    GOAL_ACHIEVED
}

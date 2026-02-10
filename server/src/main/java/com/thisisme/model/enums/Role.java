package com.thisisme.model.enums;

public enum Role {
    OWNER,          // Parent with full control
    CO_OWNER,       // Other parent with full control
    PROFESSIONAL,   // Healthcare/education professional with limited access
    VIEWER,         // Read-only access (e.g., shared view)
    CHILD;          // Child's own account with filtered, reviewed contributions

    /** Accepts both CO_PARENT (frontend) and CO_OWNER (DB). */
    public static Role fromString(String value) {
        if ("CO_PARENT".equalsIgnoreCase(value)) {
            return CO_OWNER;
        }
        return valueOf(value.toUpperCase());
    }

    /** Returns the label the frontend expects. */
    public String toApiName() {
        return this == CO_OWNER ? "CO_PARENT" : name();
    }
}

package com.thisisme.model.enums;

public enum Role {
    OWNER,          // Parent with full control
    CO_OWNER,       // Other parent with full control
    PROFESSIONAL,   // Healthcare/education professional with limited access
    VIEWER          // Read-only access (e.g., child view)
}

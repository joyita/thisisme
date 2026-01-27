package com.thisisme.model.enums;

public enum NotificationType {
    COMMENT_ON_YOUR_ENTRY,    // Someone comments on your timeline entry
    MENTIONED_IN_COMMENT,     // @mentioned in a comment
    REACTION_ON_YOUR_ENTRY,   // Reaction on your entry
    PERMISSION_GRANTED,       // Someone shares passport with you
    PERMISSION_REVOKED,       // Access removed
    DOCUMENT_OCR_COMPLETE     // OCR processing finished
}

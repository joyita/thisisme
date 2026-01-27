-- V4: Notifications system

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    recipient_id UUID NOT NULL REFERENCES users(id),
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message VARCHAR(500) NOT NULL,
    actor_id UUID REFERENCES users(id),
    passport_id UUID,
    timeline_entry_id UUID,
    comment_id UUID,
    document_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_recipient_read ON notifications(recipient_id, read_at);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Notification preferences table
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    notification_type VARCHAR(50) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(user_id, notification_type)
);

CREATE INDEX idx_notification_prefs_user ON notification_preferences(user_id);

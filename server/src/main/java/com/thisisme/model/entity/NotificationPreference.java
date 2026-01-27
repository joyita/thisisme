package com.thisisme.model.entity;

import com.thisisme.model.enums.NotificationType;
import jakarta.persistence.*;

import java.util.UUID;

@Entity
@Table(name = "notification_preferences",
    uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "notification_type"}),
    indexes = {
        @Index(name = "idx_notification_prefs_user", columnList = "user_id")
    }
)
public class NotificationPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "notification_type", nullable = false, length = 50)
    private NotificationType notificationType;

    @Column(nullable = false)
    private boolean enabled = true;

    protected NotificationPreference() {}

    public NotificationPreference(User user, NotificationType notificationType, boolean enabled) {
        this.user = user;
        this.notificationType = notificationType;
        this.enabled = enabled;
    }

    // Getters
    public UUID getId() { return id; }
    public User getUser() { return user; }
    public NotificationType getNotificationType() { return notificationType; }
    public boolean isEnabled() { return enabled; }

    // Setters
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
}

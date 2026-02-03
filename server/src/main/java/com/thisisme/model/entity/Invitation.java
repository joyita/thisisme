package com.thisisme.model.entity;

import com.thisisme.model.enums.InvitationStatus;
import com.thisisme.model.enums.Role;
import jakarta.persistence.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "invitations",
    indexes = {
        @Index(name = "idx_invitations_passport", columnList = "passport_id"),
        @Index(name = "idx_invitations_email", columnList = "email"),
        @Index(name = "idx_invitations_token", columnList = "token", unique = true),
        @Index(name = "idx_invitations_status", columnList = "status")
    }
)
@EntityListeners(AuditingEntityListener.class)
public class Invitation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "passport_id", nullable = false)
    private Passport passport;

    @Column(nullable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Column
    private String notes;

    @Column(nullable = false, unique = true)
    private String token;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InvitationStatus status = InvitationStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invited_by_id", nullable = false)
    private User invitedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "accepted_by_id")
    private User acceptedBy;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant expiresAt;

    @Column
    private Instant acceptedAt;

    @Column
    private Instant revokedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "custom_role_id")
    private CustomRole customRole;

    protected Invitation() {}

    public Invitation(Passport passport, String email, Role role, String notes, User invitedBy, String token, Instant expiresAt) {
        this.passport = passport;
        this.email = email;
        this.role = role;
        this.notes = notes;
        this.invitedBy = invitedBy;
        this.token = token;
        this.expiresAt = expiresAt;
    }

    public boolean isExpired() {
        return status == InvitationStatus.PENDING && Instant.now().isAfter(expiresAt);
    }

    public void accept(User user) {
        this.status = InvitationStatus.ACCEPTED;
        this.acceptedBy = user;
        this.acceptedAt = Instant.now();
    }

    public void revoke() {
        this.status = InvitationStatus.REVOKED;
        this.revokedAt = Instant.now();
    }

    public void markExpired() {
        this.status = InvitationStatus.EXPIRED;
    }

    // Getters
    public UUID getId() { return id; }
    public Passport getPassport() { return passport; }
    public String getEmail() { return email; }
    public Role getRole() { return role; }
    public String getNotes() { return notes; }
    public String getToken() { return token; }
    public InvitationStatus getStatus() { return status; }
    public User getInvitedBy() { return invitedBy; }
    public User getAcceptedBy() { return acceptedBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getAcceptedAt() { return acceptedAt; }
    public Instant getRevokedAt() { return revokedAt; }

    public CustomRole getCustomRole() { return customRole; }
    public void setCustomRole(CustomRole customRole) { this.customRole = customRole; }
}

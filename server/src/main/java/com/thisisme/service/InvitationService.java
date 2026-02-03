package com.thisisme.service;

import com.thisisme.model.dto.PassportDTO.InvitationResponse;
import com.thisisme.model.entity.*;
import com.thisisme.model.enums.*;
import com.thisisme.repository.*;
import com.thisisme.security.PermissionEvaluator;
import com.thisisme.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.thisisme.model.entity.CustomRole;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/**
 * Manages the full lifecycle of email-based invitations:
 * create, resend, revoke, expire, and accept on signup.
 */
@Service
public class InvitationService {

    private static final Logger logger = LoggerFactory.getLogger(InvitationService.class);
    private static final int TOKEN_LENGTH = 32;
    private static final int EXPIRY_DAYS = 7;
    private static final String TOKEN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

    private final InvitationRepository invitationRepository;
    private final PassportRepository passportRepository;
    private final UserRepository userRepository;
    private final PassportPermissionRepository permissionRepository;
    private final EmailService emailService;
    private final AuditService auditService;
    private final PermissionEvaluator permissionEvaluator;
    private final CustomRoleService customRoleService;

    public InvitationService(
            InvitationRepository invitationRepository,
            PassportRepository passportRepository,
            UserRepository userRepository,
            PassportPermissionRepository permissionRepository,
            EmailService emailService,
            AuditService auditService,
            PermissionEvaluator permissionEvaluator,
            CustomRoleService customRoleService) {
        this.invitationRepository = invitationRepository;
        this.passportRepository = passportRepository;
        this.userRepository = userRepository;
        this.permissionRepository = permissionRepository;
        this.emailService = emailService;
        this.auditService = auditService;
        this.permissionEvaluator = permissionEvaluator;
        this.customRoleService = customRoleService;
    }

    @Transactional
    public InvitationResponse createInvitation(UUID passportId, UUID inviterId,
                                                String email, String roleStr, String notes,
                                                UUID customRoleId, String ipAddress) {
        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport", passportId));

        if (!permissionEvaluator.canManageAccess(passportId, inviterId)) {
            throw new SecurityException("Access denied - cannot manage permissions");
        }

        User inviter = userRepository.findById(inviterId)
            .orElseThrow(() -> new ResourceNotFoundException("User", inviterId));

        String normalizedEmail = email.trim().toLowerCase();

        // If a registered user already exists with this email, reject — caller should grant directly
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new IllegalStateException("User already registered - grant access directly");
        }

        // Check for an existing active invitation for this email on this passport
        invitationRepository.findActivePendingByPassportAndEmail(passportId, normalizedEmail, Instant.now())
            .ifPresent(existing -> {
                throw new IllegalStateException("An active invitation already exists for this email");
            });

        Role role = Role.fromString(roleStr);
        String token = generateToken();
        Instant expiresAt = Instant.now().plus(EXPIRY_DAYS, ChronoUnit.DAYS);

        Invitation invitation = new Invitation(passport, normalizedEmail, role, notes, inviter, token, expiresAt);
        if (customRoleId != null) {
            CustomRole customRole = customRoleService.getCustomRole(passportId, customRoleId);
            invitation.setCustomRole(customRole);
        }
        Invitation saved = invitationRepository.save(invitation);

        // Send the invitation email
        try {
            emailService.sendInvitationEmail(normalizedEmail, inviter.getName(),
                passport.getChildFirstName(), token, role.toApiName());
        } catch (Exception e) {
            logger.warn("Email send failed for invitation {}, invitation still created: {}", saved.getId(), e.getMessage());
        }

        auditService.log(AuditAction.INVITATION_SENT, inviterId, inviter.getName(), ipAddress)
            .withPassport(passportId)
            .withEntity("Invitation", saved.getId())
            .withDescription("Invitation sent to " + normalizedEmail + " as " + role)
            .save();

        return toResponse(saved);
    }

    @Transactional
    public InvitationResponse resendInvitation(UUID invitationId, UUID inviterId, String ipAddress) {
        Invitation invitation = invitationRepository.findById(invitationId)
            .orElseThrow(() -> new ResourceNotFoundException("Invitation", invitationId));

        if (!permissionEvaluator.canManageAccess(invitation.getPassport().getId(), inviterId)) {
            throw new SecurityException("Access denied - cannot manage permissions");
        }

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new IllegalStateException("Can only resend pending invitations");
        }

        // Check if expired — if so, update expiry and reset status
        if (invitation.isExpired()) {
            invitation.markExpired();
            // Re-create with fresh expiry by creating a new invitation record
            return createInvitation(
                invitation.getPassport().getId(), inviterId,
                invitation.getEmail(), invitation.getRole().name(),
                invitation.getNotes(),
                invitation.getCustomRole() != null ? invitation.getCustomRole().getId() : null,
                ipAddress
            );
        }

        User inviter = userRepository.findById(inviterId)
            .orElseThrow(() -> new ResourceNotFoundException("User", inviterId));

        // Resend with the same token
        try {
            emailService.sendInvitationEmail(invitation.getEmail(), inviter.getName(),
                invitation.getPassport().getChildFirstName(), invitation.getToken(), invitation.getRole().toApiName());
        } catch (Exception e) {
            logger.warn("Resend email failed for invitation {}: {}", invitationId, e.getMessage());
        }

        auditService.log(AuditAction.INVITATION_RESENT, inviterId, inviter.getName(), ipAddress)
            .withPassport(invitation.getPassport().getId())
            .withEntity("Invitation", invitationId)
            .withDescription("Invitation resent to " + invitation.getEmail())
            .save();

        return toResponse(invitation);
    }

    @Transactional
    public void revokeInvitation(UUID invitationId, UUID inviterId, String ipAddress) {
        Invitation invitation = invitationRepository.findById(invitationId)
            .orElseThrow(() -> new ResourceNotFoundException("Invitation", invitationId));

        if (!permissionEvaluator.canManageAccess(invitation.getPassport().getId(), inviterId)) {
            throw new SecurityException("Access denied - cannot manage permissions");
        }

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new IllegalStateException("Can only revoke pending invitations");
        }

        invitation.revoke();
        invitationRepository.save(invitation);

        User inviter = userRepository.findById(inviterId)
            .orElseThrow(() -> new ResourceNotFoundException("User", inviterId));

        auditService.log(AuditAction.INVITATION_REVOKED, inviterId, inviter.getName(), ipAddress)
            .withPassport(invitation.getPassport().getId())
            .withEntity("Invitation", invitationId)
            .withDescription("Invitation revoked for " + invitation.getEmail())
            .save();
    }

    /**
     * Called during signup: finds all pending (non-expired) invitations for the given email
     * and converts them into PassportPermission records.
     */
    @Transactional
    public void applyPendingInvitations(User newUser, String ipAddress) {
        List<Invitation> pending = invitationRepository.findActivePendingByEmail(
            newUser.getEmail(), Instant.now());

        for (Invitation invitation : pending) {
            PassportPermission permission = new PassportPermission(
                invitation.getPassport(), newUser, invitation.getRole(), invitation.getInvitedBy());
            if (invitation.getNotes() != null) {
                permission.setNotes(invitation.getNotes());
            }
            if (invitation.getCustomRole() != null) {
                permission.applyFromCustomRole(invitation.getCustomRole());
            }
            permissionRepository.save(permission);

            invitation.accept(newUser);
            invitationRepository.save(invitation);

            auditService.log(AuditAction.INVITATION_ACCEPTED, newUser.getId(), newUser.getName(), ipAddress)
                .withPassport(invitation.getPassport().getId())
                .withEntity("Invitation", invitation.getId())
                .withDescription("Invitation accepted — " + invitation.getRole() + " permission granted")
                .save();

            logger.info("Invitation {} accepted by user {}, {} permission granted on passport {}",
                invitation.getId(), newUser.getId(), invitation.getRole(), invitation.getPassport().getId());
        }
    }

    @Transactional(readOnly = true)
    public List<InvitationResponse> getPendingInvitations(UUID passportId, UUID userId) {
        if (!permissionEvaluator.canManageAccess(passportId, userId)) {
            throw new SecurityException("Access denied - cannot view permissions");
        }

        List<Invitation> invitations = invitationRepository.findByPassportIdAndStatus(
            passportId, InvitationStatus.PENDING);

        // Expire any that have passed their expiry time
        for (Invitation inv : invitations) {
            if (inv.isExpired()) {
                inv.markExpired();
                invitationRepository.save(inv);
            }
        }

        return invitations.stream()
            .filter(inv -> inv.getStatus() == InvitationStatus.PENDING)
            .map(this::toResponse)
            .toList();
    }

    /**
     * Validates that an invitation token exists and is still pending and not expired.
     * Returns the email address so the signup form can be pre-filled.
     */
    @Transactional(readOnly = true)
    public String validateInviteToken(String token) {
        Invitation invitation = invitationRepository.findByToken(token)
            .orElseThrow(() -> new IllegalArgumentException("Invalid invitation link"));

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new IllegalStateException("This invitation has already been used or revoked");
        }

        if (invitation.isExpired()) {
            throw new IllegalStateException("This invitation has expired");
        }

        return invitation.getEmail();
    }

    private InvitationResponse toResponse(Invitation inv) {
        return new InvitationResponse(
            inv.getId(),
            inv.getEmail(),
            inv.getRole().toApiName(),
            inv.getCustomRole() != null ? inv.getCustomRole().getName() : null,
            inv.isExpired() ? InvitationStatus.EXPIRED.name() : inv.getStatus().name(),
            inv.getInvitedBy().getName(),
            inv.getCreatedAt(),
            inv.getExpiresAt(),
            inv.getNotes()
        );
    }

    private String generateToken() {
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(TOKEN_LENGTH);
        for (int i = 0; i < TOKEN_LENGTH; i++) {
            sb.append(TOKEN_CHARS.charAt(random.nextInt(TOKEN_CHARS.length())));
        }
        return sb.toString();
    }
}

package com.thisisme.service;

import com.thisisme.exception.ResourceNotFoundException;
import com.thisisme.model.dto.ShareDTO.*;
import com.thisisme.model.entity.*;
import com.thisisme.model.enums.AuditAction;
import com.thisisme.model.enums.SectionType;
import com.thisisme.model.enums.VisibilityLevel;
import com.thisisme.repository.*;
import com.thisisme.security.PermissionEvaluator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ShareLinkService {

    private static final String TOKEN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    private static final int TOKEN_LENGTH = 12;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final ShareLinkRepository shareLinkRepository;
    private final PassportRepository passportRepository;
    private final UserRepository userRepository;
    private final TimelineEntryRepository timelineRepository;
    private final DocumentRepository documentRepository;
    private final PermissionEvaluator permissionEvaluator;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    @Value("${app.share-link-base-url:https://thisisme.app/share}")
    private String shareBaseUrl;

    public ShareLinkService(
            ShareLinkRepository shareLinkRepository,
            PassportRepository passportRepository,
            UserRepository userRepository,
            TimelineEntryRepository timelineRepository,
            DocumentRepository documentRepository,
            PermissionEvaluator permissionEvaluator,
            PasswordEncoder passwordEncoder,
            AuditService auditService) {
        this.shareLinkRepository = shareLinkRepository;
        this.passportRepository = passportRepository;
        this.userRepository = userRepository;
        this.timelineRepository = timelineRepository;
        this.documentRepository = documentRepository;
        this.permissionEvaluator = permissionEvaluator;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    /**
     * Create a new share link
     */
    @Transactional
    public ShareLink createShareLink(UUID passportId, UUID userId,
                                     CreateShareLinkRequest request, String ipAddress) {
        if (!permissionEvaluator.canManageAccess(passportId, userId)) {
            throw new SecurityException("You don't have permission to create share links");
        }

        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport not found"));

        User creator = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String token = generateUniqueToken();

        ShareLink link = new ShareLink(passport, token, creator);
        link.setLabel(request.label());

        if (request.visibleSections() != null && !request.visibleSections().isEmpty()) {
            link.setVisibleSections(request.visibleSections());
        }

        link.setShowTimeline(request.showTimeline());
        link.setShowDocuments(request.showDocuments());

        if (request.expiresInDays() != null && request.expiresInDays() > 0) {
            link.setExpiresAt(Instant.now().plus(request.expiresInDays(), ChronoUnit.DAYS));
        }

        if (request.password() != null && !request.password().isEmpty()) {
            link.setPasswordHash(passwordEncoder.encode(request.password()));
        }

        ShareLink saved = shareLinkRepository.save(link);

        auditService.log(AuditAction.SHARE_LINK_CREATED, userId, creator.getName(), ipAddress)
            .withPassport(passport)
            .withEntity("ShareLink", saved.getId())
            .withDescription("Created share link: " + (request.label() != null ? request.label() : token));

        return saved;
    }

    /**
     * Get all share links for a passport
     */
    @Transactional(readOnly = true)
    public List<ShareLink> getShareLinks(UUID passportId, UUID userId) {
        if (!permissionEvaluator.canManageAccess(passportId, userId)) {
            throw new SecurityException("You don't have permission to view share links");
        }

        return shareLinkRepository.findAllByPassportId(passportId);
    }

    /**
     * Revoke a share link
     */
    @Transactional
    public void revokeShareLink(UUID linkId, UUID userId, String ipAddress) {
        ShareLink link = shareLinkRepository.findById(linkId)
            .orElseThrow(() -> new ResourceNotFoundException("Share link not found"));

        UUID passportId = link.getPassport().getId();
        if (!permissionEvaluator.canManageAccess(passportId, userId)) {
            throw new SecurityException("You don't have permission to revoke share links");
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        link.revoke();
        shareLinkRepository.save(link);

        auditService.log(AuditAction.SHARE_LINK_REVOKED, userId, user.getName(), ipAddress)
            .withPassport(link.getPassport())
            .withEntity("ShareLink", linkId)
            .withDescription("Revoked share link: " + (link.getLabel() != null ? link.getLabel() : link.getToken()));
    }

    /**
     * Check share link access (before viewing)
     */
    @Transactional(readOnly = true)
    public ShareAccessResponse checkAccess(String token) {
        Optional<ShareLink> linkOpt = shareLinkRepository.findByToken(token);

        if (linkOpt.isEmpty()) {
            throw new ResourceNotFoundException("Share link not found");
        }

        ShareLink link = linkOpt.get();

        return new ShareAccessResponse(
            link.isPasswordProtected(),
            link.isExpired() || !link.isActive(),
            link.getPassport().getChildFirstName()
        );
    }

    /**
     * Verify password for protected link
     */
    @Transactional
    public boolean verifyPassword(String token, String password) {
        ShareLink link = shareLinkRepository.findByToken(token)
            .orElseThrow(() -> new ResourceNotFoundException("Share link not found"));

        if (!link.isPasswordProtected()) {
            return true;
        }

        return passwordEncoder.matches(password, link.getPasswordHash());
    }

    /**
     * Access shared passport data
     */
    @Transactional
    public SharedPassportResponse accessSharedPassport(String token, String ipAddress) {
        ShareLink link = shareLinkRepository.findValidByToken(token, Instant.now())
            .orElseThrow(() -> new ResourceNotFoundException("Share link not found or expired"));

        link.recordAccess();
        shareLinkRepository.save(link);

        Passport passport = link.getPassport();

        // Audit the access
        auditService.logSystem(AuditAction.SHARE_LINK_ACCESSED, ipAddress)
            .withPassport(passport)
            .withEntity("ShareLink", link.getId())
            .withDescription("Share link accessed: " + link.getToken());

        // Gather visible sections
        List<SectionInfo> sections = passport.getSections().stream()
            .filter(s -> link.getVisibleSections().contains(s.getType()))
            .map(s -> new SectionInfo(s.getType(), s.getContent()))
            .collect(Collectors.toList());

        // Gather timeline entries if enabled
        List<TimelineEntryInfo> timelineEntries = new ArrayList<>();
        if (link.isShowTimeline()) {
            timelineEntries = timelineRepository.findByPassportId(passport.getId(),
                    org.springframework.data.domain.PageRequest.of(0, 100)).getContent().stream()
                .filter(e -> e.getVisibilityLevel() == VisibilityLevel.ALL)
                .map(e -> new TimelineEntryInfo(
                    e.getTitle(),
                    e.getContent(),
                    e.getEntryType().name(),
                    e.getEntryDate()
                ))
                .collect(Collectors.toList());
        }

        // Gather documents if enabled
        List<DocumentInfo> documents = new ArrayList<>();
        if (link.isShowDocuments()) {
            documents = documentRepository.findByPassportId(passport.getId()).stream()
                .map(d -> new DocumentInfo(
                    d.getOriginalFileName(),
                    d.getMimeType(),
                    d.getFileSize()
                ))
                .collect(Collectors.toList());
        }

        return new SharedPassportResponse(
            passport.getId(),
            passport.getChildFirstName(),
            passport.getChildDateOfBirth(),
            sections,
            timelineEntries,
            documents
        );
    }

    /**
     * Convert to response DTO
     */
    public ShareLinkResponse toResponse(ShareLink link) {
        return new ShareLinkResponse(
            link.getId(),
            link.getToken(),
            shareBaseUrl + "/" + link.getToken(),
            link.getLabel(),
            link.getVisibleSections(),
            link.isShowTimeline(),
            link.isShowDocuments(),
            link.getExpiresAt(),
            link.isPasswordProtected(),
            link.getAccessCount(),
            link.getLastAccessedAt(),
            link.getCreatedAt(),
            link.isActive()
        );
    }

    // Helper methods

    private String generateUniqueToken() {
        String token;
        do {
            token = generateToken();
        } while (shareLinkRepository.findByToken(token).isPresent());
        return token;
    }

    private String generateToken() {
        StringBuilder sb = new StringBuilder(TOKEN_LENGTH);
        for (int i = 0; i < TOKEN_LENGTH; i++) {
            sb.append(TOKEN_CHARS.charAt(RANDOM.nextInt(TOKEN_CHARS.length())));
        }
        return sb.toString();
    }
}

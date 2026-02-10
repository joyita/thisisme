package com.thisisme.service;

import com.thisisme.model.dto.AuthResponse;
import com.thisisme.model.dto.LoginRequest;
import com.thisisme.model.dto.RegisterRequest;
import com.thisisme.model.entity.Passport;
import com.thisisme.model.entity.User;
import com.thisisme.model.enums.AccountType;
import com.thisisme.model.enums.AuditAction;
import com.thisisme.repository.PassportRepository;
import com.thisisme.repository.UserRepository;
import com.thisisme.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PassportRepository passportRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuditService auditService;
    private final InvitationService invitationService;

    public AuthService(UserRepository userRepository,
                      PassportRepository passportRepository,
                      PasswordEncoder passwordEncoder,
                      JwtTokenProvider tokenProvider,
                      AuditService auditService,
                      InvitationService invitationService) {
        this.userRepository = userRepository;
        this.passportRepository = passportRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.auditService = auditService;
        this.invitationService = invitationService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request, String ipAddress, String userAgent) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email already registered");
        }

        User user = new User(
            request.name(),
            request.email().toLowerCase(),
            passwordEncoder.encode(request.password())
        );

        user.setParentalResponsibilityConfirmed(request.parentalResponsibilityConfirmed());
        User saved = userRepository.save(user);

        auditService.log(AuditAction.USER_CREATED, saved.getId(), saved.getName(), ipAddress)
            .withEntity("User", saved.getId())
            .withRequestContext(null, userAgent)
            .withDescription("User registered")
            .save();

        // Auto-apply any pending invitations for this email address
        invitationService.applyPendingInvitations(saved, ipAddress);

        return createAuthResponse(saved);
    }

    @Transactional
    public AuthResponse login(LoginRequest request, String ipAddress, String userAgent) {
        String identifier = request.email().trim().toLowerCase();

        // Try direct email lookup first, then synthetic child email
        User user = userRepository.findByEmailAndActiveTrue(identifier).orElse(null);
        if (user == null) {
            // Try child account login: username → synthetic email
            String syntheticEmail = identifier + "@child.thisisme.local";
            user = userRepository.findByEmailAndActiveTrue(syntheticEmail).orElse(null);
        }

        if (user == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            auditService.logSystem(AuditAction.LOGIN_FAILED, ipAddress)
                .withDescription("Failed login attempt for: " + request.email())
                .withRequestContext(null, userAgent)
                .save();
            throw new IllegalArgumentException("Invalid email or password");
        }

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);

        auditService.log(AuditAction.LOGIN, user.getId(), user.getName(), ipAddress)
            .withEntity("User", user.getId())
            .withRequestContext(null, userAgent)
            .withDescription("User logged in")
            .save();

        return createAuthResponse(user);
    }

    public AuthResponse refreshToken(String refreshToken, String ipAddress) {
        if (!tokenProvider.validateToken(refreshToken) || !tokenProvider.isRefreshToken(refreshToken)) {
            throw new IllegalArgumentException("Invalid refresh token");
        }

        UUID userId = tokenProvider.getUserIdFromToken(refreshToken);
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (!user.isActive()) {
            throw new IllegalArgumentException("User account is disabled");
        }

        return createAuthResponse(user);
    }

    @Transactional
    public void logout(UUID userId, String ipAddress) {
        userRepository.findById(userId).ifPresent(user -> {
            auditService.log(AuditAction.LOGOUT, userId, user.getName(), ipAddress)
                .withEntity("User", userId)
                .withDescription("User logged out")
                .save();
        });
    }

    /**
     * Verify a user's password (used for exiting child mode).
     */
    public boolean verifyPassword(UUID userId, String password) {
        return userRepository.findById(userId)
            .map(user -> passwordEncoder.matches(password, user.getPasswordHash()))
            .orElse(false);
    }

    private AuthResponse createAuthResponse(User user) {
        String accessToken = tokenProvider.createAccessToken(user.getId(), user.getEmail());
        String refreshToken = tokenProvider.createRefreshToken(user.getId());

        // For child accounts, look up linked passport
        UUID passportId = null;
        if (user.getAccountType() == AccountType.CHILD) {
            passportId = passportRepository.findBySubjectUserId(user.getId())
                .map(Passport::getId)
                .orElse(null);
        }

        return new AuthResponse(
            accessToken,
            refreshToken,
            tokenProvider.getExpiration(accessToken),
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getAccountType().name(),
            passportId
        );
    }
}

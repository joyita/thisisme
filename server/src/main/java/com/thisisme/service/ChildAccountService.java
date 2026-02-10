package com.thisisme.service;

import com.thisisme.exception.ResourceNotFoundException;
import com.thisisme.model.dto.ChildAccountDTO.*;
import com.thisisme.model.entity.Passport;
import com.thisisme.model.entity.PassportPermission;
import com.thisisme.model.entity.User;
import com.thisisme.model.enums.AccountType;
import com.thisisme.model.enums.Role;
import com.thisisme.repository.PassportPermissionRepository;
import com.thisisme.repository.PassportRepository;
import com.thisisme.repository.UserRepository;
import com.thisisme.security.PermissionEvaluator;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class ChildAccountService {

    private final UserRepository userRepository;
    private final PassportRepository passportRepository;
    private final PassportPermissionRepository permissionRepository;
    private final PermissionEvaluator permissionEvaluator;
    private final PasswordEncoder passwordEncoder;

    public ChildAccountService(
            UserRepository userRepository,
            PassportRepository passportRepository,
            PassportPermissionRepository permissionRepository,
            PermissionEvaluator permissionEvaluator,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passportRepository = passportRepository;
        this.permissionRepository = permissionRepository;
        this.permissionEvaluator = permissionEvaluator;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public ChildAccountResponse createChildAccount(UUID parentId, UUID passportId,
                                                    CreateChildAccountRequest request) {
        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport", passportId));

        if (!permissionEvaluator.isOwnerOrCoOwner(passportId, parentId)) {
            throw new SecurityException("Only owners can create child accounts");
        }

        if (passport.getSubjectUser() != null) {
            throw new IllegalStateException("This passport already has a child account");
        }

        // Check username uniqueness via the synthetic email
        String syntheticEmail = request.username().toLowerCase() + "@child.thisisme.local";
        if (userRepository.existsByEmail(syntheticEmail)) {
            throw new IllegalArgumentException("Username already taken");
        }

        User parent = userRepository.findById(parentId)
            .orElseThrow(() -> new ResourceNotFoundException("User", parentId));

        // Create child user with synthetic email
        User childUser = new User(
            request.username(),
            syntheticEmail,
            passwordEncoder.encode(request.password())
        );
        childUser.setAccountType(AccountType.CHILD);
        childUser.setEmailVerified(true); // No email verification for child accounts
        childUser = userRepository.save(childUser);

        // Link passport to child user
        passport.setSubjectUser(childUser);
        passportRepository.save(passport);

        // Create CHILD permission
        PassportPermission permission = new PassportPermission(passport, childUser, Role.CHILD, parent);
        permissionRepository.save(permission);

        return new ChildAccountResponse(
            childUser.getId(),
            request.username(),
            childUser.isActive(),
            childUser.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public ChildAccountResponse getChildAccount(UUID parentId, UUID passportId) {
        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport", passportId));

        if (!permissionEvaluator.isOwnerOrCoOwner(passportId, parentId)) {
            throw new SecurityException("Only owners can view child account details");
        }

        User childUser = passport.getSubjectUser();
        if (childUser == null) {
            throw new ResourceNotFoundException("No child account exists for this passport");
        }

        // Extract username from synthetic email
        String username = childUser.getEmail().replace("@child.thisisme.local", "");

        return new ChildAccountResponse(
            childUser.getId(),
            username,
            childUser.isActive(),
            childUser.getCreatedAt()
        );
    }

    @Transactional
    public void resetChildPassword(UUID parentId, UUID passportId,
                                    ResetChildPasswordRequest request) {
        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport", passportId));

        if (!permissionEvaluator.isOwnerOrCoOwner(passportId, parentId)) {
            throw new SecurityException("Only owners can reset child passwords");
        }

        User childUser = passport.getSubjectUser();
        if (childUser == null) {
            throw new ResourceNotFoundException("No child account exists for this passport");
        }

        childUser.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(childUser);
    }

    @Transactional
    public void deactivateChildAccount(UUID parentId, UUID passportId) {
        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport", passportId));

        if (!permissionEvaluator.isOwnerOrCoOwner(passportId, parentId)) {
            throw new SecurityException("Only owners can deactivate child accounts");
        }

        User childUser = passport.getSubjectUser();
        if (childUser == null) {
            throw new ResourceNotFoundException("No child account exists for this passport");
        }

        childUser.setActive(false);
        userRepository.save(childUser);

        // Revoke permission
        permissionRepository.findActivePermission(passportId, childUser.getId())
            .ifPresent(p -> {
                p.setRevokedAt(Instant.now());
                permissionRepository.save(p);
            });
    }

    @Transactional
    public void deleteChildAccount(UUID parentId, UUID passportId) {
        Passport passport = passportRepository.findActiveById(passportId)
            .orElseThrow(() -> new ResourceNotFoundException("Passport", passportId));

        if (!permissionEvaluator.isOwnerOrCoOwner(passportId, parentId)) {
            throw new SecurityException("Only owners can delete child accounts");
        }

        User childUser = passport.getSubjectUser();
        if (childUser == null) {
            throw new ResourceNotFoundException("No child account exists for this passport");
        }

        // Remove passport link
        passport.setSubjectUser(null);
        passportRepository.save(passport);

        // Revoke permission
        permissionRepository.findActivePermission(passportId, childUser.getId())
            .ifPresent(p -> {
                p.setRevokedAt(Instant.now());
                permissionRepository.save(p);
            });

        // Deactivate user (soft delete)
        childUser.setActive(false);
        userRepository.save(childUser);
    }
}

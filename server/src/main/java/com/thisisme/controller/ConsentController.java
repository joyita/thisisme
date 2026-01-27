package com.thisisme.controller;

import com.thisisme.model.entity.Consent;
import com.thisisme.model.enums.ConsentType;
import com.thisisme.security.UserPrincipal;
import com.thisisme.service.ConsentService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/consents")
public class ConsentController {

    private final ConsentService consentService;

    public ConsentController(ConsentService consentService) {
        this.consentService = consentService;
    }

    /**
     * Get all consents for the current user
     */
    @GetMapping
    public ResponseEntity<List<ConsentResponse>> getConsents(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<Consent> consents = consentService.getAllConsents(principal.id());
        return ResponseEntity.ok(consents.stream().map(this::toResponse).toList());
    }

    /**
     * Get active consents only
     */
    @GetMapping("/active")
    public ResponseEntity<List<ConsentResponse>> getActiveConsents(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<Consent> consents = consentService.getActiveConsents(principal.id());
        return ResponseEntity.ok(consents.stream().map(this::toResponse).toList());
    }

    /**
     * Check if user has specific consent
     */
    @GetMapping("/check/{type}")
    public ResponseEntity<ConsentCheckResponse> checkConsent(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable ConsentType type) {
        boolean hasConsent = consentService.hasActiveConsent(principal.id(), type);
        boolean isCurrent = consentService.isConsentCurrent(principal.id(), type);
        return ResponseEntity.ok(new ConsentCheckResponse(hasConsent, isCurrent,
            consentService.getCurrentPolicyVersion()));
    }

    /**
     * Withdraw consent
     */
    @PostMapping("/{consentId}/withdraw")
    public ResponseEntity<ConsentResponse> withdrawConsent(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID consentId,
            @RequestBody WithdrawRequest request,
            HttpServletRequest httpRequest) {
        Consent consent = consentService.withdrawConsent(
            consentId,
            principal.id(),
            request.reason(),
            getClientIp(httpRequest)
        );
        return ResponseEntity.ok(toResponse(consent));
    }

    /**
     * Get current privacy policy version
     */
    @GetMapping("/policy-version")
    public ResponseEntity<PolicyVersionResponse> getPolicyVersion() {
        return ResponseEntity.ok(new PolicyVersionResponse(
            consentService.getCurrentPolicyVersion()));
    }

    private ConsentResponse toResponse(Consent consent) {
        return new ConsentResponse(
            consent.getId(),
            consent.getType(),
            consent.getLawfulBasis().name(),
            consent.getPolicyVersion(),
            consent.getConsentText(),
            consent.getGrantedAt(),
            consent.getWithdrawnAt(),
            consent.isActive()
        );
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    public record ConsentResponse(
        UUID id,
        ConsentType type,
        String lawfulBasis,
        String policyVersion,
        String consentText,
        java.time.Instant grantedAt,
        java.time.Instant withdrawnAt,
        boolean active
    ) {}

    public record ConsentCheckResponse(
        boolean hasConsent,
        boolean isCurrent,
        String currentPolicyVersion
    ) {}

    public record WithdrawRequest(String reason) {}

    public record PolicyVersionResponse(String version) {}
}

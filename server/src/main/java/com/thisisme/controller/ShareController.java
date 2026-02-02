package com.thisisme.controller;

import com.thisisme.model.dto.ShareDTO.*;
import com.thisisme.model.entity.ShareLink;
import com.thisisme.security.UserPrincipal;
import com.thisisme.service.ShareLinkService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
public class ShareController {

    private final ShareLinkService shareLinkService;

    public ShareController(ShareLinkService shareLinkService) {
        this.shareLinkService = shareLinkService;
    }

    /**
     * Create a new share link (authenticated)
     */
    @PostMapping("/api/v1/passports/{passportId}/share")
    public ResponseEntity<ShareLinkResponse> createShareLink(
            @PathVariable UUID passportId,
            @Valid @RequestBody CreateShareLinkRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        ShareLink link = shareLinkService.createShareLink(
            passportId,
            principal.id(),
            request,
            getClientIp(httpRequest)
        );

        return ResponseEntity.ok(shareLinkService.toResponse(link));
    }

    /**
     * Get all share links for a passport (authenticated)
     */
    @GetMapping("/api/v1/passports/{passportId}/share")
    public ResponseEntity<List<ShareLinkResponse>> getShareLinks(
            @PathVariable UUID passportId,
            @AuthenticationPrincipal UserPrincipal principal) {

        List<ShareLink> links = shareLinkService.getShareLinks(passportId, principal.id());

        List<ShareLinkResponse> responses = links.stream()
            .map(shareLinkService::toResponse)
            .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    /**
     * Revoke a share link (authenticated)
     */
    @DeleteMapping("/api/v1/passports/{passportId}/share/{linkId}")
    public ResponseEntity<Void> revokeShareLink(
            @PathVariable UUID passportId,
            @PathVariable UUID linkId,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        shareLinkService.revokeShareLink(linkId, principal.id(), getClientIp(httpRequest));
        return ResponseEntity.noContent().build();
    }

    // Public endpoints for accessing shared content

    /**
     * Check share link status (public)
     */
    @GetMapping("/share/{token}/check")
    public ResponseEntity<ShareAccessResponse> checkAccess(@PathVariable String token) {
        ShareAccessResponse response = shareLinkService.checkAccess(token);
        return ResponseEntity.ok(response);
    }

    /**
     * Verify password for protected link (public)
     */
    @PostMapping("/share/{token}/verify")
    public ResponseEntity<Boolean> verifyPassword(
            @PathVariable String token,
            @RequestBody VerifyPasswordRequest request) {

        boolean valid = shareLinkService.verifyPassword(token, request.password());
        return ResponseEntity.ok(valid);
    }

    /**
     * Access shared passport (public)
     */
    @GetMapping("/share/{token}")
    public ResponseEntity<SharedPassportResponse> accessSharedPassport(
            @PathVariable String token,
            HttpServletRequest httpRequest) {

        SharedPassportResponse response = shareLinkService.accessSharedPassport(
            token,
            getClientIp(httpRequest)
        );

        return ResponseEntity.ok(response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}

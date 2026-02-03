package com.thisisme.controller;

import com.thisisme.model.dto.AuthResponse;
import com.thisisme.model.dto.LoginRequest;
import com.thisisme.model.dto.RegisterRequest;
import com.thisisme.security.UserPrincipal;
import com.thisisme.service.AuthService;
import com.thisisme.service.InvitationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final InvitationService invitationService;

    public AuthController(AuthService authService, InvitationService invitationService) {
        this.authService = authService;
        this.invitationService = invitationService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse response = authService.register(
            request,
            getClientIp(httpRequest),
            httpRequest.getHeader("User-Agent")
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse response = authService.login(
            request,
            getClientIp(httpRequest),
            httpRequest.getHeader("User-Agent")
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @RequestBody RefreshRequest request,
            HttpServletRequest httpRequest) {
        AuthResponse response = authService.refreshToken(
            request.refreshToken(),
            getClientIp(httpRequest)
        );
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {
        if (principal != null) {
            authService.logout(principal.id(), getClientIp(httpRequest));
        }
        return ResponseEntity.ok().build();
    }

    /**
     * Public endpoint: validates an invite token and returns the pre-fill email.
     * Called by the frontend when the register page loads with ?invite=<token>.
     */
    @GetMapping("/invite/validate")
    public ResponseEntity<Map<String, String>> validateInvite(@RequestParam String token) {
        String email = invitationService.validateInviteToken(token);
        return ResponseEntity.ok(Map.of("email", email));
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    public record RefreshRequest(String refreshToken) {}
}

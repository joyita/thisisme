package com.thisisme.controller;

import com.thisisme.model.dto.AuthResponse;
import com.thisisme.model.dto.LoginRequest;
import com.thisisme.model.dto.RegisterRequest;
import com.thisisme.security.UserPrincipal;
import com.thisisme.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
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

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    public record RefreshRequest(String refreshToken) {}
}

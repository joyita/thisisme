package com.thisisme.service;

import com.thisisme.model.dto.AuthResponse;
import com.thisisme.model.dto.LoginRequest;
import com.thisisme.model.dto.RegisterRequest;
import com.thisisme.model.entity.User;
import com.thisisme.repository.UserRepository;
import com.thisisme.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private AuditService auditService;

    @Mock
    private AuditService.AuditLogBuilder auditLogBuilder;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, tokenProvider, auditService);

        // Setup audit service mock chain
        lenient().when(auditService.log(any(), any(), any(), any())).thenReturn(auditLogBuilder);
        lenient().when(auditService.logSystem(any(), any())).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withEntity(any(), any())).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withRequestContext(any(), any())).thenReturn(auditLogBuilder);
        lenient().when(auditLogBuilder.withDescription(any())).thenReturn(auditLogBuilder);
    }

    @Test
    void register_ShouldCreateUserAndReturnTokens() {
        RegisterRequest request = new RegisterRequest(
            "Test User",
            "test@example.com",
            "password123",
            true
        );

        UUID userId = UUID.randomUUID();
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashedPassword");
        when(userRepository.save(any(User.class))).thenAnswer(i -> {
            User u = i.getArgument(0);
            ReflectionTestUtils.setField(u, "id", userId);
            return u;
        });
        when(tokenProvider.createAccessToken(any(), anyString())).thenReturn("accessToken");
        when(tokenProvider.createRefreshToken(any())).thenReturn("refreshToken");
        when(tokenProvider.getExpiration(anyString())).thenReturn(Instant.now().plusSeconds(900));

        AuthResponse response = authService.register(request, "192.168.1.1", "Mozilla/5.0");

        assertNotNull(response);
        assertEquals("accessToken", response.accessToken());
        assertEquals("refreshToken", response.refreshToken());
        assertEquals(userId, response.userId());
        assertEquals("Test User", response.name());

        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_ShouldThrowExceptionForDuplicateEmail() {
        RegisterRequest request = new RegisterRequest(
            "Test User",
            "existing@example.com",
            "password123",
            true
        );

        when(userRepository.existsByEmail("existing@example.com")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () ->
            authService.register(request, "192.168.1.1", "Mozilla/5.0")
        );

        verify(userRepository, never()).save(any());
    }

    @Test
    void login_ShouldReturnTokensForValidCredentials() {
        LoginRequest request = new LoginRequest("test@example.com", "password123");

        UUID userId = UUID.randomUUID();
        User user = new User("Test User", "test@example.com", "hashedPassword");
        ReflectionTestUtils.setField(user, "id", userId);
        ReflectionTestUtils.setField(user, "active", true);

        when(userRepository.findByEmailAndActiveTrue("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "hashedPassword")).thenReturn(true);
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        when(tokenProvider.createAccessToken(any(), anyString())).thenReturn("accessToken");
        when(tokenProvider.createRefreshToken(any())).thenReturn("refreshToken");
        when(tokenProvider.getExpiration(anyString())).thenReturn(Instant.now().plusSeconds(900));

        AuthResponse response = authService.login(request, "192.168.1.1", "Mozilla/5.0");

        assertNotNull(response);
        assertEquals("accessToken", response.accessToken());
        assertEquals(userId, response.userId());
    }

    @Test
    void login_ShouldThrowExceptionForInvalidPassword() {
        LoginRequest request = new LoginRequest("test@example.com", "wrongPassword");

        User user = new User("Test User", "test@example.com", "hashedPassword");
        ReflectionTestUtils.setField(user, "id", UUID.randomUUID());

        when(userRepository.findByEmailAndActiveTrue("test@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongPassword", "hashedPassword")).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () ->
            authService.login(request, "192.168.1.1", "Mozilla/5.0")
        );
    }

    @Test
    void login_ShouldThrowExceptionForNonExistentUser() {
        LoginRequest request = new LoginRequest("nonexistent@example.com", "password123");

        when(userRepository.findByEmailAndActiveTrue("nonexistent@example.com")).thenReturn(Optional.empty());

        assertThrows(IllegalArgumentException.class, () ->
            authService.login(request, "192.168.1.1", "Mozilla/5.0")
        );
    }

    @Test
    void refreshToken_ShouldReturnNewTokensForValidRefreshToken() {
        UUID userId = UUID.randomUUID();
        User user = new User("Test User", "test@example.com", "hashedPassword");
        ReflectionTestUtils.setField(user, "id", userId);
        ReflectionTestUtils.setField(user, "active", true);

        when(tokenProvider.validateToken("validRefreshToken")).thenReturn(true);
        when(tokenProvider.isRefreshToken("validRefreshToken")).thenReturn(true);
        when(tokenProvider.getUserIdFromToken("validRefreshToken")).thenReturn(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(tokenProvider.createAccessToken(any(), anyString())).thenReturn("newAccessToken");
        when(tokenProvider.createRefreshToken(any())).thenReturn("newRefreshToken");
        when(tokenProvider.getExpiration(anyString())).thenReturn(Instant.now().plusSeconds(900));

        AuthResponse response = authService.refreshToken("validRefreshToken", "192.168.1.1");

        assertNotNull(response);
        assertEquals("newAccessToken", response.accessToken());
        assertEquals("newRefreshToken", response.refreshToken());
    }

    @Test
    void refreshToken_ShouldThrowExceptionForInvalidToken() {
        when(tokenProvider.validateToken("invalidToken")).thenReturn(false);

        assertThrows(IllegalArgumentException.class, () ->
            authService.refreshToken("invalidToken", "192.168.1.1")
        );
    }
}

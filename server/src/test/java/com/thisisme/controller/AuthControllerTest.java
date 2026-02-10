package com.thisisme.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.thisisme.model.dto.AuthResponse;
import com.thisisme.model.dto.LoginRequest;
import com.thisisme.model.dto.RegisterRequest;
import com.thisisme.exception.GlobalExceptionHandler;
import com.thisisme.service.AuthService;
import com.thisisme.service.InvitationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AuthControllerTest {

    private MockMvc mockMvc;

    private ObjectMapper objectMapper;

    @Mock
    private AuthService authService;

    @Mock
    private InvitationService invitationService;

    @InjectMocks
    private AuthController authController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(authController)
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
        objectMapper = new ObjectMapper();
        objectMapper.findAndRegisterModules();
    }

    @Test
    void register_ShouldReturnAuthResponse() throws Exception {
        RegisterRequest request = new RegisterRequest(
            "Test User",
            "test@example.com",
            "password123",
            true
        );

        UUID userId = UUID.randomUUID();
        AuthResponse response = new AuthResponse(
            "accessToken",
            "refreshToken",
            Instant.now().plusSeconds(900),
            userId,
            "Test User",
            "test@example.com",
            "STANDARD",
            null
        );

        when(authService.register(any(RegisterRequest.class), any(), any()))
            .thenReturn(response);

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").value("accessToken"))
            .andExpect(jsonPath("$.refreshToken").value("refreshToken"))
            .andExpect(jsonPath("$.userId").value(userId.toString()))
            .andExpect(jsonPath("$.name").value("Test User"));
    }

    @Test
    void login_ShouldReturnAuthResponse() throws Exception {
        LoginRequest request = new LoginRequest("test@example.com", "password123");

        UUID userId = UUID.randomUUID();
        AuthResponse response = new AuthResponse(
            "accessToken",
            "refreshToken",
            Instant.now().plusSeconds(900),
            userId,
            "Test User",
            "test@example.com",
            "STANDARD",
            null
        );

        when(authService.login(any(LoginRequest.class), any(), any()))
            .thenReturn(response);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").value("accessToken"))
            .andExpect(jsonPath("$.userId").value(userId.toString()));
    }

    @Test
    void login_ShouldReturnBadRequestForInvalidCredentials() throws Exception {
        LoginRequest request = new LoginRequest("test@example.com", "wrongPassword");

        when(authService.login(any(LoginRequest.class), any(), any()))
            .thenThrow(new IllegalArgumentException("Invalid email or password"));

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }

    @Test
    void refresh_ShouldReturnNewTokens() throws Exception {
        UUID userId = UUID.randomUUID();
        AuthResponse response = new AuthResponse(
            "newAccessToken",
            "newRefreshToken",
            Instant.now().plusSeconds(900),
            userId,
            "Test User",
            "test@example.com",
            "STANDARD",
            null
        );

        when(authService.refreshToken(any(), any())).thenReturn(response);

        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\": \"validRefreshToken\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").value("newAccessToken"));
    }

    @Test
    void logout_ShouldReturnOk() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
            .andExpect(status().isOk());
    }
}

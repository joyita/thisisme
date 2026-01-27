package com.thisisme.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider tokenProvider;
    private static final String TEST_SECRET = "TestSecretKeyForUnitTestsOnlyMustBeAtLeast256BitsLong!!";

    @BeforeEach
    void setUp() {
        tokenProvider = new JwtTokenProvider(TEST_SECRET, 15, 7);
    }

    @Test
    void createAccessToken_ShouldGenerateValidToken() {
        UUID userId = UUID.randomUUID();
        String email = "test@example.com";

        String token = tokenProvider.createAccessToken(userId, email);

        assertNotNull(token);
        assertTrue(tokenProvider.validateToken(token));
        assertTrue(tokenProvider.isAccessToken(token));
        assertFalse(tokenProvider.isRefreshToken(token));
    }

    @Test
    void createRefreshToken_ShouldGenerateValidToken() {
        UUID userId = UUID.randomUUID();

        String token = tokenProvider.createRefreshToken(userId);

        assertNotNull(token);
        assertTrue(tokenProvider.validateToken(token));
        assertTrue(tokenProvider.isRefreshToken(token));
        assertFalse(tokenProvider.isAccessToken(token));
    }

    @Test
    void getUserIdFromToken_ShouldReturnCorrectUserId() {
        UUID userId = UUID.randomUUID();
        String email = "test@example.com";

        String token = tokenProvider.createAccessToken(userId, email);
        UUID extractedUserId = tokenProvider.getUserIdFromToken(token);

        assertEquals(userId, extractedUserId);
    }

    @Test
    void getEmailFromToken_ShouldReturnCorrectEmail() {
        UUID userId = UUID.randomUUID();
        String email = "test@example.com";

        String token = tokenProvider.createAccessToken(userId, email);
        String extractedEmail = tokenProvider.getEmailFromToken(token);

        assertEquals(email, extractedEmail);
    }

    @Test
    void validateToken_ShouldReturnFalseForInvalidToken() {
        assertFalse(tokenProvider.validateToken("invalid.token.here"));
        assertFalse(tokenProvider.validateToken(""));
        assertFalse(tokenProvider.validateToken(null));
    }

    @Test
    void validateToken_ShouldReturnFalseForTamperedToken() {
        UUID userId = UUID.randomUUID();
        String token = tokenProvider.createAccessToken(userId, "test@example.com");

        // Tamper with the token
        String tamperedToken = token.substring(0, token.length() - 5) + "xxxxx";

        assertFalse(tokenProvider.validateToken(tamperedToken));
    }

    @Test
    void getExpiration_ShouldReturnFutureTime() {
        UUID userId = UUID.randomUUID();
        String token = tokenProvider.createAccessToken(userId, "test@example.com");

        var expiration = tokenProvider.getExpiration(token);

        assertNotNull(expiration);
        assertTrue(expiration.isAfter(java.time.Instant.now()));
    }
}

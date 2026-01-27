package com.thisisme.model.dto;

import java.time.Instant;
import java.util.UUID;

public record AuthResponse(
    String accessToken,
    String refreshToken,
    Instant expiresAt,
    UUID userId,
    String name,
    String email
) {}

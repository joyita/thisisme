package com.thisisme.security;

import java.security.Principal;
import java.util.UUID;

/**
 * Represents the authenticated user in the security context.
 */
public record UserPrincipal(UUID id, String email) implements Principal {

    @Override
    public String getName() {
        return email;
    }
}

package com.novamart.catalog.web;

import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Exposes the authenticated user's claims as returned by AWS Cognito.
 */
@RestController
public class AuthController {

    @GetMapping("/auth/me")
    public Map<String, Object> me(@AuthenticationPrincipal JwtAuthenticationToken principal) {
        if (principal == null || principal.getToken() == null) {
            throw new IllegalStateException("No authenticated principal found");
        }
        return principal.getToken().getClaims();
    }
}

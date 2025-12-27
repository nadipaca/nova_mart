package com.novamart.catalog.security;

import java.util.List;

import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

public class CognitoAudienceValidator implements OAuth2TokenValidator<Jwt> {

    private final String audience;

    public CognitoAudienceValidator(String audience) {
        this.audience = audience;
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
        List<String> audiences = token.getAudience();
        if (audiences != null && audiences.contains(audience)) {
            return OAuth2TokenValidatorResult.success();
        }

        String clientId = token.getClaimAsString("client_id");
        if (clientId != null && clientId.equals(audience)) {
            return OAuth2TokenValidatorResult.success();
        }
        OAuth2Error error = new OAuth2Error(
            "invalid_token",
            "The required audience/client_id " + audience + " is missing",
            null
        );
        return OAuth2TokenValidatorResult.failure(error);
    }
}

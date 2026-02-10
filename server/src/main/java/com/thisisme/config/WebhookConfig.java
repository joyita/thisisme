package com.thisisme.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * Webhook configuration for external integrations
 */
@Configuration
public class WebhookConfig {

    @Value("${app.webhook.secret}")
    private String webhookSecret;

    public String getWebhookSecret() {
        return webhookSecret;
    }

    public boolean validateWebhookSecret(String providedSecret) {
        return webhookSecret != null && webhookSecret.equals(providedSecret);
    }
}

package com.thisisme.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/**
 * Sends invitation emails. Falls back to console logging when no SMTP is
 * configured (JavaMailSender bean absent) or when running in dev profile.
 * Production: set spring.mail.* env vars to enable real sending.
 */
@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender; // null when spring.mail.host is not set

    @Value("${app.email.from:noreply@thisisme.app}")
    private String fromAddress;

    @Value("${app.email.from-name:ThisIsMe}")
    private String fromName;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

    public EmailService(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    private boolean shouldLogOnly() {
        return mailSender == null || activeProfile.contains("dev");
    }

    public void sendInvitationEmail(String recipientEmail, String inviterName,
                                    String childFirstName, String token, String roleName) {
        String signupUrl = frontendUrl + "/auth/register?invite=" + token;

        if (shouldLogOnly()) {
            logger.info("=== INVITATION EMAIL (no SMTP / dev mode) ===");
            logger.info("To: {}", recipientEmail);
            logger.info("Invited by: {}", inviterName);
            logger.info("Passport: {}", childFirstName);
            logger.info("Role: {}", roleName);
            logger.info("Signup URL: {}", signupUrl);
            logger.info("===============================================");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromAddress, fromName);
            helper.setTo(recipientEmail);
            helper.setSubject(inviterName + " has invited you to " + childFirstName + "'s ThisIsMe passport");

            String htmlBody = buildInvitationHtml(inviterName, childFirstName, roleName, signupUrl);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            logger.info("Invitation email sent to {}", recipientEmail);
        } catch (Exception e) {
            logger.error("Failed to send invitation email to {}: {}", recipientEmail, e.getMessage());
            throw new RuntimeException("Failed to send invitation email", e);
        }
    }

    private String buildInvitationHtml(String inviterName, String childName, String roleName, String signupUrl) {
        return """
            <html>
            <body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #581c87;">You've been invited to ThisIsMe</h2>
              <p><strong>%s</strong> has invited you to collaborate on <strong>%s's</strong> passport as a <strong>%s</strong>.</p>
              <p>Click the button below to create your account and get started:</p>
              <a href="%s" style="display: inline-block; background: #a855f7; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
                Accept Invitation &amp; Sign Up
              </a>
              <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
                This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
              </p>
            </body>
            </html>
            """.formatted(inviterName, childName, roleName.toLowerCase(), signupUrl);
    }
}

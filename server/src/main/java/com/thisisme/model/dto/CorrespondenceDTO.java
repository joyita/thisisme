package com.thisisme.model.dto;

import com.thisisme.model.enums.Role;
import com.thisisme.model.enums.VisibilityLevel;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;

public class CorrespondenceDTO {

    /**
     * Webhook payload from Cloudflare email worker
     */
    public record InboundEmailWebhookRequest(
        @NotBlank @Email String from,
        @Email String to,
        @NotBlank String subject,
        String body,
        @NotNull LocalDate date,
        List<AttachmentData> attachments
    ) {}

    /**
     * Manual email entry form
     */
    public record CreateCorrespondenceRequest(
        @NotBlank @Email String from,
        @Email String to,
        @NotNull LocalDate date,
        @NotBlank String subject,
        String body,
        VisibilityLevel visibilityLevel,
        Set<Role> visibleToRoles,
        Set<String> tags,
        List<UUID> attachmentIds
    ) {}

    /**
     * Attachment data from webhook
     */
    public record AttachmentData(
        @NotBlank String filename,
        @NotBlank String contentType,
        @NotBlank String content // base64 encoded
    ) {}

    /**
     * Response after creating correspondence entry
     */
    public record CorrespondenceResponse(
        UUID entryId,
        String from,
        String to,
        String subject,
        LocalDate date,
        String source,
        int attachmentCount
    ) {}
}

package com.thisisme.controller;

import com.thisisme.config.WebhookConfig;
import com.thisisme.model.dto.CorrespondenceDTO.*;
import com.thisisme.model.dto.PassportDTO.*;
import com.thisisme.model.dto.TimelineDTO.*;
import com.thisisme.model.entity.Document;
import com.thisisme.model.entity.PassportSection;
import com.thisisme.model.entity.TimelineEntry;
import com.thisisme.repository.TimelineEntryRepository;
import com.thisisme.repository.UserRepository;
import com.thisisme.security.UserPrincipal;
import com.thisisme.service.DocumentService;
import com.thisisme.service.PassportService;
import com.thisisme.service.TimelineService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v2/passports")
public class V2PassportController {

    private final PassportService passportService;
    private final TimelineService timelineService;
    private final DocumentService documentService;
    private final WebhookConfig webhookConfig;
    private final TimelineEntryRepository timelineRepository;
    private final UserRepository userRepository;

    public V2PassportController(
            PassportService passportService,
            TimelineService timelineService,
            DocumentService documentService,
            WebhookConfig webhookConfig,
            TimelineEntryRepository timelineRepository,
            UserRepository userRepository) {
        this.passportService = passportService;
        this.timelineService = timelineService;
        this.documentService = documentService;
        this.webhookConfig = webhookConfig;
        this.timelineRepository = timelineRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/{passportId}/sections/{sectionId}/history")
    public ResponseEntity<List<SectionRevisionResponse>> getSectionHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID passportId,
            @PathVariable UUID sectionId) {
        List<SectionRevisionResponse> history = passportService.getSectionHistory(
            passportId, sectionId, principal.id());
        return ResponseEntity.ok(history);
    }

    @PostMapping("/{passportId}/sections/{sectionId}/restore")
    public ResponseEntity<SectionResponse> restoreSection(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID passportId,
            @PathVariable UUID sectionId,
            @Valid @RequestBody RestoreSectionRequest request,
            HttpServletRequest httpRequest) {
        PassportSection section = passportService.restoreSectionRevision(
            passportId, sectionId, request.revisionId(), principal.id(), getClientIp(httpRequest));
        return ResponseEntity.ok(new SectionResponse(
            section.getId(),
            section.getType(),
            section.getContent(),
            section.getRemedialSuggestion(),
            section.isPublished(),
            section.getVisibilityLevel(),
            section.getDisplayOrder(),
            section.getCreatedBy().getName(),
            section.getLastEditedBy() != null ? section.getLastEditedBy().getName() : section.getCreatedBy().getName(),
            0,  // revisionCount not needed for immediate responses
            section.getCreatedAt(),
            section.getUpdatedAt()
        ));
    }

    @PatchMapping("/{passportId}/sections/reorder")
    public ResponseEntity<Void> reorderSections(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID passportId,
            @Valid @RequestBody ReorderSectionsRequest request,
            HttpServletRequest httpRequest) {
        passportService.reorderSections(passportId, principal.id(), request, getClientIp(httpRequest));
        return ResponseEntity.noContent().build();
    }

    /**
     * Webhook endpoint for inbound email from Cloudflare worker
     */
    @PostMapping("/{passportId}/correspondence/inbound")
    public ResponseEntity<?> handleInboundEmail(
            @PathVariable UUID passportId,
            @RequestHeader(value = "X-Webhook-Secret", required = false) String webhookSecret,
            @Valid @RequestBody InboundEmailWebhookRequest request,
            HttpServletRequest httpRequest) {

        // Authenticate webhook
        if (!webhookConfig.validateWebhookSecret(webhookSecret)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse("Invalid webhook secret"));
        }

        try {
            // Find a system user or the first owner to create the entry
            var owners = userRepository.findAll().stream()
                .filter(u -> u.getEmail().equals(request.from()))
                .findFirst()
                .or(() -> userRepository.findAll().stream().findFirst());

            if (owners.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(new ErrorResponse("No user found to create entry"));
            }

            UUID userId = owners.get().getId();

            // Create correspondence entry
            TimelineEntryResponse entry = timelineService.createCorrespondenceEntry(
                passportId,
                userId,
                request.from(),
                request.to(),
                request.subject(),
                request.body(),
                request.date(),
                "WEBHOOK",
                com.thisisme.model.enums.VisibilityLevel.OWNERS_ONLY,
                null,
                null,
                getClientIp(httpRequest)
            );

            // Handle attachments if present
            if (request.attachments() != null && !request.attachments().isEmpty()) {
                for (AttachmentData attachment : request.attachments()) {
                    try {
                        byte[] fileBytes = Base64.getDecoder().decode(attachment.content());
                        documentService.saveEmailAttachment(
                            passportId,
                            userId,
                            entry.id(),
                            attachment.filename(),
                            attachment.contentType(),
                            fileBytes
                        );
                    } catch (Exception e) {
                        // Log error but don't fail the whole request
                        System.err.println("Failed to save attachment '" + attachment.filename() + "': " + e.getMessage());
                        e.printStackTrace();
                    }
                }
            }

            return ResponseEntity.ok(new CorrespondenceResponse(
                entry.id(),
                request.from(),
                request.to(),
                request.subject(),
                request.date(),
                "WEBHOOK",
                request.attachments() != null ? request.attachments().size() : 0
            ));

        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(new ErrorResponse("Failed to process email: " + e.getMessage()));
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private record ErrorResponse(String error) {}
}

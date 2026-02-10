package com.thisisme.controller;

import com.thisisme.model.dto.DocumentDTO.*;
import com.thisisme.model.entity.Document;
import com.thisisme.security.UserPrincipal;
import com.thisisme.service.DocumentService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/passports/{passportId}/documents")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @PostMapping
    public ResponseEntity<DocumentResponse> uploadDocument(
            @PathVariable UUID passportId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) UUID timelineEntryId,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) throws IOException {

        Document document = documentService.uploadDocument(
            passportId,
            principal.id(),
            file,
            timelineEntryId,
            getClientIp(httpRequest)
        );

        return ResponseEntity.ok(toResponse(document));
    }

    @GetMapping
    public ResponseEntity<DocumentListResponse> getDocuments(
            @PathVariable UUID passportId,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        DocumentListResponse response = documentService.getDocuments(
            passportId,
            principal.id(),
            getClientIp(httpRequest)
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{documentId}")
    public ResponseEntity<DocumentResponse> getDocument(
            @PathVariable UUID passportId,
            @PathVariable UUID documentId,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        Document document = documentService.getDocument(
            documentId,
            principal.id(),
            getClientIp(httpRequest)
        );

        return ResponseEntity.ok(toResponse(document));
    }

    @GetMapping("/{documentId}/download")
    public ResponseEntity<Map<String, String>> getDownloadUrl(
            @PathVariable UUID passportId,
            @PathVariable UUID documentId,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        String url = documentService.getDownloadUrl(
            documentId,
            principal.id(),
            getClientIp(httpRequest)
        );

        return ResponseEntity.ok(Map.of("downloadUrl", url));
    }

    @GetMapping("/{documentId}/file")
    public ResponseEntity<byte[]> downloadFile(
            @PathVariable UUID passportId,
            @PathVariable UUID documentId,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) throws IOException {

        return documentService.downloadFile(
            documentId,
            principal.id(),
            getClientIp(httpRequest)
        );
    }

    @DeleteMapping("/{documentId}")
    public ResponseEntity<Void> deleteDocument(
            @PathVariable UUID passportId,
            @PathVariable UUID documentId,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        documentService.deleteDocument(
            documentId,
            principal.id(),
            getClientIp(httpRequest)
        );

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/timeline/{entryId}")
    public ResponseEntity<List<DocumentResponse>> getDocumentsForTimelineEntry(
            @PathVariable UUID passportId,
            @PathVariable UUID entryId,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        List<Document> documents = documentService.getDocumentsForTimelineEntry(
            entryId,
            principal.id(),
            getClientIp(httpRequest)
        );

        List<DocumentResponse> responses = documents.stream()
            .map(this::toResponse)
            .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private DocumentResponse toResponse(Document doc) {
        return new DocumentResponse(
            doc.getId(),
            doc.getPassport().getId(),
            doc.getTimelineEntry() != null ? doc.getTimelineEntry().getId() : null,
            doc.getFileName(),
            doc.getOriginalFileName(),
            doc.getMimeType(),
            doc.getFileSize(),
            null, // URL generated on-demand
            doc.getOcrText() != null,
            doc.getOcrError(),
            doc.getUploadedAt(),
            new UploaderInfo(doc.getUploadedBy().getId(), doc.getUploadedBy().getName())
        );
    }
}

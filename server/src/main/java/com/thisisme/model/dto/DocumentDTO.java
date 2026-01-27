package com.thisisme.model.dto;

import java.time.Instant;
import java.util.UUID;

public class DocumentDTO {

    public record DocumentResponse(
        UUID id,
        UUID passportId,
        UUID timelineEntryId,
        String fileName,
        String originalFileName,
        String mimeType,
        long fileSize,
        String downloadUrl,
        boolean hasOcrText,
        String ocrError,
        Instant uploadedAt,
        UploaderInfo uploadedBy
    ) {}

    public record UploaderInfo(
        UUID id,
        String name
    ) {}

    public record DocumentUploadResponse(
        UUID documentId,
        String uploadUrl,
        String contentType,
        long maxFileSize
    ) {}

    public record DocumentListResponse(
        java.util.List<DocumentResponse> documents,
        long totalStorageBytes,
        long storageQuotaBytes
    ) {}
}

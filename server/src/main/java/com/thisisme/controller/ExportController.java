package com.thisisme.controller;

import com.thisisme.security.UserPrincipal;
import com.thisisme.service.ExportService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/passports/{passportId}/export")
public class ExportController {

    private final ExportService exportService;

    public ExportController(ExportService exportService) {
        this.exportService = exportService;
    }

    @GetMapping("/json")
    public ResponseEntity<byte[]> exportJson(
            @PathVariable UUID passportId,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        String json = exportService.exportAsJson(
            passportId,
            principal.id(),
            getClientIp(httpRequest)
        );

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"passport-" + passportId + "-" + LocalDate.now() + ".json\"")
            .contentType(MediaType.APPLICATION_JSON)
            .body(json.getBytes(StandardCharsets.UTF_8));
    }

    @GetMapping("/csv")
    public ResponseEntity<byte[]> exportCsv(
            @PathVariable UUID passportId,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        String csv = exportService.exportAsCsv(
            passportId,
            principal.id(),
            getClientIp(httpRequest)
        );

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"passport-" + passportId + "-" + LocalDate.now() + ".csv\"")
            .contentType(MediaType.parseMediaType("text/csv"))
            .body(csv.getBytes(StandardCharsets.UTF_8));
    }

    @GetMapping("/markdown")
    public ResponseEntity<byte[]> exportMarkdown(
            @PathVariable UUID passportId,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        String markdown = exportService.exportAsMarkdown(
            passportId,
            principal.id(),
            getClientIp(httpRequest)
        );

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"passport-" + passportId + "-" + LocalDate.now() + ".md\"")
            .contentType(MediaType.parseMediaType("text/markdown"))
            .body(markdown.getBytes(StandardCharsets.UTF_8));
    }

    @GetMapping("/html")
    public ResponseEntity<byte[]> exportHtml(
            @PathVariable UUID passportId,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest httpRequest) {

        String html = exportService.exportAsHtml(
            passportId,
            principal.id(),
            getClientIp(httpRequest)
        );

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"passport-" + passportId + "-" + LocalDate.now() + ".html\"")
            .contentType(MediaType.TEXT_HTML)
            .body(html.getBytes(StandardCharsets.UTF_8));
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}

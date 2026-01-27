package com.thisisme.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.util.*;

/**
 * Client for the OCR microservice.
 * Processes document images and returns structured form data.
 */
@Service
public class OcrService {

    private static final Logger logger = LoggerFactory.getLogger(OcrService.class);

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.ocr.service-url:http://localhost:8081}")
    private String ocrServiceUrl;

    @Value("${app.ocr.enabled:true}")
    private boolean ocrEnabled;

    public OcrService(ObjectMapper objectMapper) {
        this.restTemplate = new RestTemplate();
        this.objectMapper = objectMapper;
    }

    /**
     * Check if OCR service is available.
     */
    public boolean isAvailable() {
        if (!ocrEnabled) {
            return false;
        }
        try {
            ResponseEntity<String> response = restTemplate.getForEntity(
                ocrServiceUrl + "/health", String.class);
            return response.getStatusCode() == HttpStatus.OK;
        } catch (Exception e) {
            logger.warn("OCR service not available: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Process an image and extract form data.
     *
     * @param imageBytes The image content
     * @param fileName The original file name
     * @param mimeType The MIME type
     * @return OCR result with metadata and form data, or null if processing failed
     */
    public OcrResult processImage(byte[] imageBytes, String fileName, String mimeType) {
        if (!ocrEnabled) {
            logger.debug("OCR is disabled");
            return null;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            // Create multipart request
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", new ByteArrayResource(imageBytes) {
                @Override
                public String getFilename() {
                    return fileName;
                }
            });

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                ocrServiceUrl + "/ocr",
                HttpMethod.POST,
                requestEntity,
                String.class
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return parseOcrResponse(response.getBody());
            }

            logger.warn("OCR service returned status: {}", response.getStatusCode());
            return null;

        } catch (Exception e) {
            logger.error("OCR processing failed for {}: {}", fileName, e.getMessage());
            return null;
        }
    }

    private OcrResult parseOcrResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);

            if (!root.path("success").asBoolean(false)) {
                String error = root.path("data").path("error").asText("Unknown error");
                return new OcrResult(false, null, null, null, null, error);
            }

            JsonNode data = root.path("data");
            JsonNode metadata = data.path("metadata");
            JsonNode form = data.path("form");

            // Extract document classification
            String documentType = metadata.path("document_type").asText(null);
            String documentSubtype = metadata.path("document_subtype").asText(null);
            double confidence = metadata.path("confidence").asDouble(0.0);

            // Extract detected names
            List<String> detectedNames = new ArrayList<>();
            JsonNode names = metadata.path("detected_names");
            if (names.isArray()) {
                for (JsonNode name : names) {
                    detectedNames.add(name.asText());
                }
            }

            // Extract form fields
            Map<String, String> formFields = new LinkedHashMap<>();
            Iterator<Map.Entry<String, JsonNode>> fields = form.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> field = fields.next();
                formFields.put(field.getKey(), field.getValue().asText(""));
            }

            // Build raw text from form fields for storage
            StringBuilder rawText = new StringBuilder();
            for (Map.Entry<String, String> entry : formFields.entrySet()) {
                rawText.append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
            }

            return new OcrResult(
                true,
                documentType,
                documentSubtype,
                formFields,
                detectedNames,
                rawText.toString()
            );

        } catch (Exception e) {
            logger.error("Failed to parse OCR response: {}", e.getMessage());
            return new OcrResult(false, null, null, null, null, "Failed to parse OCR response");
        }
    }

    /**
     * Result from OCR processing.
     */
    public record OcrResult(
        boolean success,
        String documentType,
        String documentSubtype,
        Map<String, String> formFields,
        List<String> detectedNames,
        String rawTextOrError
    ) {
        public String getTitle() {
            if (documentType != null && documentSubtype != null) {
                return documentSubtype + " - " + documentType;
            }
            if (documentType != null) {
                return documentType;
            }
            return "Scanned Document";
        }

        public String getContent() {
            if (!success) {
                return "OCR processing failed: " + rawTextOrError;
            }
            if (formFields == null || formFields.isEmpty()) {
                return "No form data extracted";
            }

            StringBuilder sb = new StringBuilder();
            for (Map.Entry<String, String> entry : formFields.entrySet()) {
                if (!entry.getValue().isEmpty()) {
                    sb.append("**").append(entry.getKey()).append("**: ")
                      .append(entry.getValue()).append("\n");
                }
            }
            return sb.toString().trim();
        }
    }
}

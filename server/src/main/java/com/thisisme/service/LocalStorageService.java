package com.thisisme.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Local filesystem storage implementation.
 * Used for development and testing when S3 is not available.
 */
@Service
@ConditionalOnProperty(name = "app.storage.type", havingValue = "local", matchIfMissing = true)
public class LocalStorageService implements StorageService {

    private static final Logger logger = LoggerFactory.getLogger(LocalStorageService.class);

    @Value("${app.storage.local.path:./uploads}")
    private String storagePath;

    private Path basePath;

    @PostConstruct
    public void init() throws IOException {
        basePath = Paths.get(storagePath).toAbsolutePath();
        Files.createDirectories(basePath);
        logger.info("Local storage initialized at: {}", basePath);
    }

    @Override
    public void upload(String key, byte[] data, String contentType) throws IOException {
        Path filePath = resolveAndValidatePath(key);
        Files.createDirectories(filePath.getParent());
        Files.write(filePath, data);
        logger.debug("Uploaded file to local storage: {}", key);
    }

    @Override
    public byte[] download(String key) throws IOException {
        Path filePath = resolveAndValidatePath(key);
        if (!Files.exists(filePath)) {
            throw new IOException("File not found: " + key);
        }
        return Files.readAllBytes(filePath);
    }

    @Override
    public void delete(String key) throws IOException {
        Path filePath = resolveAndValidatePath(key);
        Files.deleteIfExists(filePath);
        logger.debug("Deleted file from local storage: {}", key);
    }

    @Override
    public String getDownloadUrl(String key, String originalFilename) {
        // Return a relative URL that the frontend can use
        // The actual file serving would be handled by a controller
        String encodedFilename = URLEncoder.encode(originalFilename, StandardCharsets.UTF_8);
        return "/api/documents/download/" + key + "?filename=" + encodedFilename;
    }

    @Override
    public boolean exists(String key) {
        try {
            Path filePath = resolveAndValidatePath(key);
            return Files.exists(filePath);
        } catch (IOException e) {
            return false;
        }
    }

    /**
     * Resolve and validate path to prevent path traversal attacks
     */
    private Path resolveAndValidatePath(String key) throws IOException {
        Path resolved = basePath.resolve(key).normalize();
        if (!resolved.startsWith(basePath)) {
            throw new IOException("Invalid path: path traversal attempt detected");
        }
        return resolved;
    }
}

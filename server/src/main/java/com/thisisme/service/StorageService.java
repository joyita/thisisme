package com.thisisme.service;

import java.io.IOException;

/**
 * Storage service interface for document storage abstraction.
 * Implementations can use local filesystem, S3, or other storage backends.
 */
public interface StorageService {

    /**
     * Upload a file to storage
     * @param key the storage key/path
     * @param data the file content
     * @param contentType MIME type of the file
     */
    void upload(String key, byte[] data, String contentType) throws IOException;

    /**
     * Download a file from storage
     * @param key the storage key/path
     * @return the file content
     */
    byte[] download(String key) throws IOException;

    /**
     * Delete a file from storage
     * @param key the storage key/path
     */
    void delete(String key) throws IOException;

    /**
     * Generate a URL for downloading the file
     * For local storage, this returns a relative URL
     * For S3, this returns a pre-signed URL
     * @param key the storage key/path
     * @param originalFilename the original filename for Content-Disposition
     * @return download URL
     */
    String getDownloadUrl(String key, String originalFilename);

    /**
     * Check if a file exists
     * @param key the storage key/path
     * @return true if file exists
     */
    boolean exists(String key);
}

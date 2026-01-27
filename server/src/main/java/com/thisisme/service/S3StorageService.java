package com.thisisme.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.core.sync.ResponseTransformer;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.time.Duration;

/**
 * AWS S3 storage implementation.
 * Used for production deployments.
 */
@Service
@ConditionalOnProperty(name = "app.storage.type", havingValue = "s3")
public class S3StorageService implements StorageService {

    private static final Logger logger = LoggerFactory.getLogger(S3StorageService.class);

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${app.storage.s3.bucket}")
    private String bucketName;

    public S3StorageService(S3Client s3Client, S3Presigner s3Presigner) {
        this.s3Client = s3Client;
        this.s3Presigner = s3Presigner;
    }

    @Override
    public void upload(String key, byte[] data, String contentType) throws IOException {
        try {
            PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType)
                .serverSideEncryption(ServerSideEncryption.AES256)
                .build();

            s3Client.putObject(request, RequestBody.fromBytes(data));
            logger.debug("Uploaded file to S3: {}", key);
        } catch (S3Exception e) {
            throw new IOException("Failed to upload to S3: " + e.getMessage(), e);
        }
    }

    @Override
    public byte[] download(String key) throws IOException {
        try {
            GetObjectRequest request = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

            return s3Client.getObject(request, ResponseTransformer.toBytes()).asByteArray();
        } catch (S3Exception e) {
            throw new IOException("Failed to download from S3: " + e.getMessage(), e);
        }
    }

    @Override
    public void delete(String key) throws IOException {
        try {
            DeleteObjectRequest request = DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

            s3Client.deleteObject(request);
            logger.debug("Deleted file from S3: {}", key);
        } catch (S3Exception e) {
            throw new IOException("Failed to delete from S3: " + e.getMessage(), e);
        }
    }

    @Override
    public String getDownloadUrl(String key, String originalFilename) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
            .bucket(bucketName)
            .key(key)
            .responseContentDisposition("attachment; filename=\"" + originalFilename + "\"")
            .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
            .signatureDuration(Duration.ofMinutes(15))
            .getObjectRequest(getObjectRequest)
            .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }

    @Override
    public boolean exists(String key) {
        try {
            HeadObjectRequest request = HeadObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

            s3Client.headObject(request);
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        }
    }
}

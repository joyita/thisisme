package com.thisisme.repository;

import com.thisisme.model.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID> {

    @Query("SELECT d FROM Document d WHERE d.passport.id = :passportId " +
           "AND d.deletedAt IS NULL ORDER BY d.uploadedAt DESC")
    List<Document> findByPassportId(@Param("passportId") UUID passportId);

    @Query("SELECT d FROM Document d WHERE d.timelineEntry.id = :entryId " +
           "AND d.deletedAt IS NULL")
    List<Document> findByTimelineEntryId(@Param("entryId") UUID entryId);

    @Query("SELECT d FROM Document d WHERE d.ocrText IS NULL " +
           "AND d.ocrError IS NULL AND d.deletedAt IS NULL " +
           "AND (d.mimeType LIKE 'image/%' OR d.mimeType = 'application/pdf')")
    List<Document> findPendingOcr();

    @Query("SELECT d FROM Document d WHERE d.expiresAt IS NOT NULL " +
           "AND d.expiresAt <= :now AND d.deletedAt IS NULL")
    List<Document> findExpired(@Param("now") Instant now);

    @Query("SELECT SUM(d.fileSize) FROM Document d WHERE d.passport.id = :passportId " +
           "AND d.deletedAt IS NULL")
    Long getTotalStorageByPassport(@Param("passportId") UUID passportId);
}

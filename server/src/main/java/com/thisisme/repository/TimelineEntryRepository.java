package com.thisisme.repository;

import com.thisisme.model.entity.TimelineEntry;
import com.thisisme.model.enums.EntryType;
import com.thisisme.model.enums.VisibilityLevel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface TimelineEntryRepository extends JpaRepository<TimelineEntry, UUID> {

    @Query("SELECT t FROM TimelineEntry t WHERE t.passport.id = :passportId " +
           "AND t.deletedAt IS NULL ORDER BY t.entryDate DESC, t.createdAt DESC")
    Page<TimelineEntry> findByPassportId(@Param("passportId") UUID passportId, Pageable pageable);

    @Query("SELECT t FROM TimelineEntry t WHERE t.passport.id = :passportId " +
           "AND t.entryType = :type AND t.deletedAt IS NULL " +
           "ORDER BY t.entryDate DESC")
    List<TimelineEntry> findByPassportIdAndType(
        @Param("passportId") UUID passportId,
        @Param("type") EntryType type);

    @Query("SELECT t FROM TimelineEntry t WHERE t.passport.id = :passportId " +
           "AND t.visibilityLevel IN :levels AND t.deletedAt IS NULL " +
           "ORDER BY t.entryDate DESC")
    Page<TimelineEntry> findByPassportIdAndVisibility(
        @Param("passportId") UUID passportId,
        @Param("levels") List<VisibilityLevel> levels,
        Pageable pageable);

    @Query("SELECT t FROM TimelineEntry t WHERE t.passport.id = :passportId " +
           "AND t.entryDate BETWEEN :startDate AND :endDate AND t.deletedAt IS NULL " +
           "ORDER BY t.entryDate DESC")
    List<TimelineEntry> findByPassportIdAndDateRange(
        @Param("passportId") UUID passportId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate);

    @Query("SELECT t FROM TimelineEntry t WHERE t.passport.id = :passportId " +
           "AND t.pinned = true AND t.deletedAt IS NULL ORDER BY t.entryDate DESC")
    List<TimelineEntry> findPinnedByPassportId(@Param("passportId") UUID passportId);

    @Query("SELECT t FROM TimelineEntry t WHERE t.author.id = :authorId " +
           "AND t.deletedAt IS NULL ORDER BY t.createdAt DESC")
    Page<TimelineEntry> findByAuthorId(@Param("authorId") UUID authorId, Pageable pageable);
}

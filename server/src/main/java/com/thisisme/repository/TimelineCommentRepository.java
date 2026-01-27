package com.thisisme.repository;

import com.thisisme.model.entity.TimelineComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TimelineCommentRepository extends JpaRepository<TimelineComment, UUID> {

    @Query("SELECT c FROM TimelineComment c WHERE c.entry.id = :entryId AND c.deletedAt IS NULL ORDER BY c.createdAt ASC")
    List<TimelineComment> findByEntryId(UUID entryId);

    @Query("SELECT COUNT(c) FROM TimelineComment c WHERE c.entry.id = :entryId AND c.deletedAt IS NULL")
    long countByEntryId(UUID entryId);
}

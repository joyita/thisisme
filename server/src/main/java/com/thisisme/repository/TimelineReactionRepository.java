package com.thisisme.repository;

import com.thisisme.model.entity.TimelineReaction;
import com.thisisme.model.enums.ReactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TimelineReactionRepository extends JpaRepository<TimelineReaction, UUID> {

    @Query("SELECT r FROM TimelineReaction r WHERE r.entry.id = :entryId")
    List<TimelineReaction> findByEntryId(UUID entryId);

    Optional<TimelineReaction> findByEntryIdAndUserIdAndReactionType(UUID entryId, UUID userId, ReactionType reactionType);

    @Query("SELECT r.reactionType, COUNT(r) FROM TimelineReaction r WHERE r.entry.id = :entryId GROUP BY r.reactionType")
    List<Object[]> countByEntryIdGroupByType(UUID entryId);

    void deleteByEntryIdAndUserIdAndReactionType(UUID entryId, UUID userId, ReactionType reactionType);
}

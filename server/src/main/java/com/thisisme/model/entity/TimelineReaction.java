package com.thisisme.model.entity;

import com.thisisme.model.enums.ReactionType;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * Reactions (emoji) on timeline entries.
 */
@Entity
@Table(name = "timeline_reactions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"entry_id", "user_id", "reaction_type"}))
public class TimelineReaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "entry_id", nullable = false)
    private TimelineEntry entry;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "reaction_type", nullable = false)
    private ReactionType reactionType;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected TimelineReaction() {}

    public TimelineReaction(TimelineEntry entry, User user, ReactionType reactionType) {
        this.entry = entry;
        this.user = user;
        this.reactionType = reactionType;
        this.createdAt = Instant.now();
    }

    // Getters
    public UUID getId() { return id; }
    public TimelineEntry getEntry() { return entry; }
    public User getUser() { return user; }
    public ReactionType getReactionType() { return reactionType; }
    public Instant getCreatedAt() { return createdAt; }
}

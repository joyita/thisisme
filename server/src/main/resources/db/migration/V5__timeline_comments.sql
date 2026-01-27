-- V5: Timeline comments for collaboration

-- Comments on timeline entries
CREATE TABLE timeline_comments (
    id UUID PRIMARY KEY,
    entry_id UUID NOT NULL REFERENCES timeline_entries(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    content VARCHAR(2000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_comments_entry ON timeline_comments(entry_id);
CREATE INDEX idx_comments_author ON timeline_comments(author_id);
CREATE INDEX idx_comments_created ON timeline_comments(created_at DESC);

-- Mentioned users in comments (element collection)
CREATE TABLE comment_mentions (
    comment_id UUID NOT NULL REFERENCES timeline_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX idx_mentions_user ON comment_mentions(user_id);

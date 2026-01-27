-- V6: Timeline reactions (emoji responses)

CREATE TABLE timeline_reactions (
    id UUID PRIMARY KEY,
    entry_id UUID NOT NULL REFERENCES timeline_entries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    reaction_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(entry_id, user_id, reaction_type)
);

CREATE INDEX idx_reactions_entry ON timeline_reactions(entry_id);
CREATE INDEX idx_reactions_user ON timeline_reactions(user_id);

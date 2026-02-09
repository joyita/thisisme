-- V13: Full-text search, follow-up flags, and entry-level @mentions

-- Full-text search vector column
ALTER TABLE timeline_entries ADD COLUMN content_search_vector tsvector;
CREATE INDEX idx_timeline_entries_search ON timeline_entries USING GIN(content_search_vector);

-- Helper: recompute search vector for one entry (includes tags)
CREATE OR REPLACE FUNCTION refresh_timeline_search_vector(p_entry_id UUID) RETURNS void AS $$
DECLARE
    v_tags text;
BEGIN
    SELECT string_agg(tag, ' ') INTO v_tags
    FROM timeline_entry_tags WHERE entry_id = p_entry_id;

    UPDATE timeline_entries
    SET content_search_vector =
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(content, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(v_tags, '')), 'C')
    WHERE id = p_entry_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger: refresh when title or content changes
CREATE OR REPLACE FUNCTION tg_timeline_entry_search() RETURNS trigger AS $$
BEGIN
    PERFORM refresh_timeline_search_vector(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_timeline_entry_search
AFTER INSERT OR UPDATE OF title, content ON timeline_entries
FOR EACH ROW EXECUTE FUNCTION tg_timeline_entry_search();

-- Trigger: refresh when tags change
CREATE OR REPLACE FUNCTION tg_timeline_tag_search() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM refresh_timeline_search_vector(OLD.entry_id);
    ELSE
        PERFORM refresh_timeline_search_vector(NEW.entry_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_timeline_tag_search
AFTER INSERT OR UPDATE OR DELETE ON timeline_entry_tags
FOR EACH ROW EXECUTE FUNCTION tg_timeline_tag_search();

-- Backfill existing entries
UPDATE timeline_entries t
SET content_search_vector =
    setweight(to_tsvector('english', coalesce(t.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(t.content, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(
        (SELECT string_agg(tag, ' ') FROM timeline_entry_tags WHERE entry_id = t.id), ''
    )), 'C');

-- Follow-up flags
ALTER TABLE timeline_entries ADD COLUMN flagged BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE timeline_entries ADD COLUMN follow_up_due_date DATE;

CREATE INDEX idx_timeline_entries_flagged ON timeline_entries(passport_id) WHERE flagged = TRUE;

-- Entry-level @mentions
CREATE TABLE timeline_entry_mentions (
    entry_id UUID NOT NULL REFERENCES timeline_entries(id) ON DELETE CASCADE,
    user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (entry_id, user_id)
);

CREATE INDEX idx_entry_mentions_user ON timeline_entry_mentions(user_id);

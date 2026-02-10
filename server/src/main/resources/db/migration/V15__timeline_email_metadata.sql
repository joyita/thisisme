-- Add metadata JSONB column to timeline_entries for email correspondence
-- Stores email headers: from, to, date, subject, source

ALTER TABLE timeline_entries
ADD COLUMN metadata JSONB;

-- Create index for metadata queries (e.g., filtering by email sender)
CREATE INDEX idx_timeline_entries_metadata ON timeline_entries USING GIN (metadata);

-- Add comment for documentation
COMMENT ON COLUMN timeline_entries.metadata IS 'JSONB metadata for entry types like CORRESPONDENCE. Stores email headers: from, to, date, subject, source (WEBHOOK|MANUAL)';

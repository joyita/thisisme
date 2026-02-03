-- Make timeline entry content optional
ALTER TABLE timeline_entries ALTER COLUMN content DROP NOT NULL;

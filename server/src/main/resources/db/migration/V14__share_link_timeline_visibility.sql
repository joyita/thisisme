ALTER TABLE share_links
    ADD COLUMN timeline_visibility_level VARCHAR(50) NOT NULL DEFAULT 'ALL';

-- Per-section revision history for field-level edit tracking.
-- Enables non-destructive restore of individual passport fields.
-- EDIT revisions are restorable; PUBLISH/UNPUBLISH are audit-only.

CREATE TABLE section_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES passport_sections(id) ON DELETE CASCADE,
    passport_id UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    remedial_suggestion TEXT,
    change_type VARCHAR(20) NOT NULL DEFAULT 'EDIT',
    author_id UUID NOT NULL REFERENCES users(id),
    author_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_section_revisions_section ON section_revisions(section_id, created_at DESC);
CREATE INDEX idx_section_revisions_passport ON section_revisions(passport_id);

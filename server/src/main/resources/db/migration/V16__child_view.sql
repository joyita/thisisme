-- V16: Child View feature
-- Adds child accounts, child view filtering, and pending review workflow

-- Users: distinguish child accounts from standard accounts
ALTER TABLE users ADD COLUMN account_type VARCHAR(20) NOT NULL DEFAULT 'STANDARD';

-- Passports: link to child's user account
ALTER TABLE passports ADD COLUMN subject_user_id UUID REFERENCES users(id);
CREATE INDEX idx_passports_subject_user ON passports(subject_user_id);

-- Passports: control whether HATES section shows in child view
ALTER TABLE passports ADD COLUMN child_view_show_hates BOOLEAN NOT NULL DEFAULT FALSE;

-- Sections: review status for child contributions
ALTER TABLE passport_sections ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE passport_sections ADD COLUMN child_mode_contribution BOOLEAN NOT NULL DEFAULT FALSE;

-- Timeline: review status for child contributions
ALTER TABLE timeline_entries ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED';
ALTER TABLE timeline_entries ADD COLUMN child_mode_contribution BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX idx_timeline_entries_status ON timeline_entries(status);

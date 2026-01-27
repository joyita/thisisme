-- ThisIsMe Database Schema
-- UK GDPR Compliant Design

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    parental_responsibility_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(active);

-- Passports table
CREATE TABLE passports (
    id UUID PRIMARY KEY,
    child_first_name VARCHAR(100) NOT NULL,
    child_date_of_birth DATE,
    child_avatar TEXT,
    created_by_id UUID NOT NULL REFERENCES users(id),
    wizard_complete BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    scheduled_for_deletion_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_passports_created_by ON passports(created_by_id);
CREATE INDEX idx_passports_active ON passports(active);

-- Passport sections
CREATE TABLE passport_sections (
    id UUID PRIMARY KEY,
    passport_id UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    remedial_suggestion TEXT,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    visibility_level VARCHAR(50) NOT NULL DEFAULT 'OWNERS_ONLY',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_by_id UUID NOT NULL REFERENCES users(id),
    last_edited_by_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sections_passport ON passport_sections(passport_id);
CREATE INDEX idx_sections_type ON passport_sections(type);

-- Passport permissions (RBAC)
CREATE TABLE passport_permissions (
    id UUID PRIMARY KEY,
    passport_id UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(50) NOT NULL,
    can_view_timeline BOOLEAN NOT NULL DEFAULT TRUE,
    can_add_timeline_entries BOOLEAN NOT NULL DEFAULT FALSE,
    can_view_documents BOOLEAN NOT NULL DEFAULT FALSE,
    can_upload_documents BOOLEAN NOT NULL DEFAULT FALSE,
    granted_by_id UUID NOT NULL REFERENCES users(id),
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    UNIQUE(passport_id, user_id)
);

CREATE INDEX idx_permissions_passport ON passport_permissions(passport_id);
CREATE INDEX idx_permissions_user ON passport_permissions(user_id);

-- Passport revisions (version history)
CREATE TABLE passport_revisions (
    id UUID PRIMARY KEY,
    passport_id UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL,
    sections_snapshot JSONB NOT NULL,
    created_by_id UUID NOT NULL REFERENCES users(id),
    change_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revisions_passport ON passport_revisions(passport_id);
CREATE INDEX idx_revisions_created_at ON passport_revisions(created_at);

-- Consents (UK GDPR Article 7)
CREATE TABLE consents (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    passport_id UUID REFERENCES passports(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    lawful_basis VARCHAR(50) NOT NULL,
    policy_version VARCHAR(20) NOT NULL,
    consent_text TEXT NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    withdrawal_reason TEXT,
    evidence_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT
);

CREATE INDEX idx_consents_user ON consents(user_id);
CREATE INDEX idx_consents_passport ON consents(passport_id);
CREATE INDEX idx_consents_type ON consents(type);
CREATE INDEX idx_consents_active ON consents(withdrawn_at);

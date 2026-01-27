-- Timeline entries
CREATE TABLE timeline_entries (
    id UUID PRIMARY KEY,
    passport_id UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),
    entry_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    entry_date DATE NOT NULL,
    visibility_level VARCHAR(50) NOT NULL DEFAULT 'OWNERS_ONLY',
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_timeline_passport ON timeline_entries(passport_id);
CREATE INDEX idx_timeline_author ON timeline_entries(author_id);
CREATE INDEX idx_timeline_type ON timeline_entries(entry_type);
CREATE INDEX idx_timeline_date ON timeline_entries(entry_date);
CREATE INDEX idx_timeline_visibility ON timeline_entries(visibility_level);

-- Timeline entry visible roles (for CUSTOM visibility)
CREATE TABLE timeline_entry_visible_roles (
    entry_id UUID NOT NULL REFERENCES timeline_entries(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    PRIMARY KEY (entry_id, role)
);

-- Timeline entry tags
CREATE TABLE timeline_entry_tags (
    entry_id UUID NOT NULL REFERENCES timeline_entries(id) ON DELETE CASCADE,
    tag VARCHAR(100) NOT NULL,
    PRIMARY KEY (entry_id, tag)
);

CREATE INDEX idx_timeline_tags_tag ON timeline_entry_tags(tag);

-- Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    passport_id UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
    timeline_entry_id UUID REFERENCES timeline_entries(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    encryption_key_id VARCHAR(100) NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    ocr_text TEXT,
    ocr_processed_at TIMESTAMP WITH TIME ZONE,
    ocr_error TEXT,
    uploaded_by_id UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_documents_passport ON documents(passport_id);
CREATE INDEX idx_documents_timeline ON documents(timeline_entry_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by_id);

-- Share links
CREATE TABLE share_links (
    id UUID PRIMARY KEY,
    passport_id UUID NOT NULL REFERENCES passports(id) ON DELETE CASCADE,
    token VARCHAR(100) NOT NULL UNIQUE,
    created_by_id UUID NOT NULL REFERENCES users(id),
    label VARCHAR(255),
    show_timeline BOOLEAN NOT NULL DEFAULT FALSE,
    show_documents BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    password_hash VARCHAR(255),
    access_count INTEGER NOT NULL DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_share_token ON share_links(token);
CREATE INDEX idx_share_passport ON share_links(passport_id);
CREATE INDEX idx_share_expires ON share_links(expires_at);

-- Share link visible sections
CREATE TABLE share_link_sections (
    share_link_id UUID NOT NULL REFERENCES share_links(id) ON DELETE CASCADE,
    section_type VARCHAR(50) NOT NULL,
    PRIMARY KEY (share_link_id, section_type)
);

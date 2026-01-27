-- Audit logs (UK GDPR Article 30 - 6 year retention)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID,
    user_name VARCHAR(255),
    passport_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    description TEXT,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    request_id VARCHAR(100),
    child_data_accessed BOOLEAN NOT NULL DEFAULT FALSE,
    data_categories VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for audit log queries
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_passport ON audit_logs(passport_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_child_data ON audit_logs(child_data_accessed, timestamp);

-- Data subject requests (UK GDPR Articles 15-21)
CREATE TABLE data_requests (
    id UUID PRIMARY KEY,
    requester_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    request_details TEXT,
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    due_by TIMESTAMP WITH TIME ZONE NOT NULL,
    extended_due_by TIMESTAMP WITH TIME ZONE,
    extension_reason TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    refusal_reason TEXT,
    completion_notes TEXT,
    export_file_location TEXT,
    handled_by_id UUID REFERENCES users(id)
);

CREATE INDEX idx_data_request_user ON data_requests(requester_id);
CREATE INDEX idx_data_request_status ON data_requests(status);
CREATE INDEX idx_data_request_due ON data_requests(due_by);
CREATE INDEX idx_data_request_type ON data_requests(type);

-- Retention policies (for automated data lifecycle management)
CREATE TABLE retention_policies (
    id UUID PRIMARY KEY,
    data_category VARCHAR(100) NOT NULL UNIQUE,
    retention_days INTEGER NOT NULL,
    description TEXT,
    legal_basis TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default retention policies
INSERT INTO retention_policies (id, data_category, retention_days, description, legal_basis) VALUES
    (gen_random_uuid(), 'AUDIT_LOGS', 2190, 'Audit logs retained for 6 years', 'UK GDPR Article 30'),
    (gen_random_uuid(), 'CONSENT_RECORDS', 2190, 'Consent records retained for 6 years after withdrawal', 'UK GDPR Article 7'),
    (gen_random_uuid(), 'DELETED_ACCOUNTS', 30, 'Deleted account data retained for 30 days before permanent deletion', 'UK GDPR Article 17'),
    (gen_random_uuid(), 'SHARE_LINKS', 90, 'Inactive share links expire after 90 days', 'Data minimisation'),
    (gen_random_uuid(), 'UPLOADED_DOCUMENTS', 0, 'Documents retained while passport is active', 'User consent');

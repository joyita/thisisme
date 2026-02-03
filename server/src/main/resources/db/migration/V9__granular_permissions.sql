-- Stage 2: Granular action-level permissions
-- Expands passport_permissions from 4 booleans to full action-level control

-- Passport-level permissions
ALTER TABLE passport_permissions ADD COLUMN can_edit_passport BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE passport_permissions ADD COLUMN can_delete_passport BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE passport_permissions ADD COLUMN can_manage_permissions BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE passport_permissions ADD COLUMN can_create_share_links BOOLEAN NOT NULL DEFAULT FALSE;

-- Section-level permissions
ALTER TABLE passport_permissions ADD COLUMN can_edit_sections BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE passport_permissions ADD COLUMN can_delete_sections BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE passport_permissions ADD COLUMN can_publish_sections BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE passport_permissions ADD COLUMN can_reorder_sections BOOLEAN NOT NULL DEFAULT FALSE;

-- Timeline-level permissions (can_view_timeline and can_add_timeline_entries already exist)
ALTER TABLE passport_permissions ADD COLUMN can_edit_timeline_entries BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE passport_permissions ADD COLUMN can_delete_timeline_entries BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE passport_permissions ADD COLUMN can_comment_on_timeline BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE passport_permissions ADD COLUMN can_react_on_timeline BOOLEAN NOT NULL DEFAULT FALSE;

-- Document-level permissions (can_view_documents and can_upload_documents already exist)
ALTER TABLE passport_permissions ADD COLUMN can_download_documents BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE passport_permissions ADD COLUMN can_delete_documents BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill existing rows based on current role
-- OWNER / CO_OWNER: all true
UPDATE passport_permissions SET
    can_edit_passport = TRUE,
    can_delete_passport = CASE WHEN role = 'OWNER' THEN TRUE ELSE FALSE END,
    can_manage_permissions = TRUE,
    can_create_share_links = TRUE,
    can_edit_sections = TRUE,
    can_delete_sections = CASE WHEN role = 'OWNER' THEN TRUE ELSE FALSE END,
    can_publish_sections = CASE WHEN role = 'OWNER' THEN TRUE ELSE FALSE END,
    can_reorder_sections = TRUE,
    can_edit_timeline_entries = TRUE,
    can_delete_timeline_entries = CASE WHEN role = 'OWNER' THEN TRUE ELSE FALSE END,
    can_comment_on_timeline = TRUE,
    can_react_on_timeline = TRUE,
    can_download_documents = TRUE,
    can_delete_documents = CASE WHEN role = 'OWNER' THEN TRUE ELSE FALSE END
WHERE role IN ('OWNER', 'CO_OWNER') AND revoked_at IS NULL;

-- PROFESSIONAL: view + comment + add timeline, no edit/delete/manage
UPDATE passport_permissions SET
    can_edit_passport = FALSE,
    can_delete_passport = FALSE,
    can_manage_permissions = FALSE,
    can_create_share_links = FALSE,
    can_edit_sections = FALSE,
    can_delete_sections = FALSE,
    can_publish_sections = FALSE,
    can_reorder_sections = FALSE,
    can_edit_timeline_entries = FALSE,
    can_delete_timeline_entries = FALSE,
    can_comment_on_timeline = TRUE,
    can_react_on_timeline = TRUE,
    can_download_documents = TRUE,
    can_delete_documents = FALSE
WHERE role = 'PROFESSIONAL' AND revoked_at IS NULL;

-- VIEWER: view-only, no mutations
UPDATE passport_permissions SET
    can_edit_passport = FALSE,
    can_delete_passport = FALSE,
    can_manage_permissions = FALSE,
    can_create_share_links = FALSE,
    can_edit_sections = FALSE,
    can_delete_sections = FALSE,
    can_publish_sections = FALSE,
    can_reorder_sections = FALSE,
    can_edit_timeline_entries = FALSE,
    can_delete_timeline_entries = FALSE,
    can_comment_on_timeline = FALSE,
    can_react_on_timeline = FALSE,
    can_download_documents = TRUE,
    can_delete_documents = FALSE
WHERE role = 'VIEWER' AND revoked_at IS NULL;

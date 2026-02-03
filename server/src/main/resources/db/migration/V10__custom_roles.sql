-- Stage 3: Custom per-passport roles
-- Owners can create named permission templates per passport.
-- When a custom role is used to grant access, its 18 flags are copied onto the
-- passport_permissions row at grant time.  The permission row remains the runtime
-- source of truth; custom_role_id is recorded for audit / display only.

CREATE TABLE custom_roles (
    id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    passport_id               UUID        NOT NULL REFERENCES passports(id),
    name                      VARCHAR(64) NOT NULL,
    description               VARCHAR(256),
    created_by_id             UUID        NOT NULL REFERENCES users(id),
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Passport-level
    can_view_passport         BOOLEAN NOT NULL DEFAULT TRUE,
    can_edit_passport         BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete_passport       BOOLEAN NOT NULL DEFAULT FALSE,
    can_manage_permissions    BOOLEAN NOT NULL DEFAULT FALSE,
    can_create_share_links    BOOLEAN NOT NULL DEFAULT FALSE,

    -- Section-level
    can_view_sections         BOOLEAN NOT NULL DEFAULT TRUE,
    can_edit_sections         BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete_sections       BOOLEAN NOT NULL DEFAULT FALSE,
    can_publish_sections      BOOLEAN NOT NULL DEFAULT FALSE,
    can_reorder_sections      BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timeline-level
    can_view_timeline         BOOLEAN NOT NULL DEFAULT TRUE,
    can_add_timeline_entries  BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit_timeline_entries BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete_timeline_entries BOOLEAN NOT NULL DEFAULT FALSE,
    can_comment_on_timeline   BOOLEAN NOT NULL DEFAULT FALSE,
    can_react_on_timeline     BOOLEAN NOT NULL DEFAULT FALSE,

    -- Document-level
    can_view_documents        BOOLEAN NOT NULL DEFAULT FALSE,
    can_upload_documents      BOOLEAN NOT NULL DEFAULT FALSE,
    can_download_documents    BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete_documents      BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT uq_custom_role_name UNIQUE (passport_id, name)
);

CREATE INDEX idx_custom_roles_passport ON custom_roles (passport_id);

-- FK on passport_permissions: records which custom role was used at grant time
ALTER TABLE passport_permissions
    ADD COLUMN custom_role_id UUID REFERENCES custom_roles(id);

CREATE INDEX idx_permissions_custom_role ON passport_permissions (custom_role_id);

-- FK on invitations: records which custom role the invitation was created for
ALTER TABLE invitations
    ADD COLUMN custom_role_id UUID REFERENCES custom_roles(id);

CREATE INDEX idx_invitations_custom_role ON invitations (custom_role_id);

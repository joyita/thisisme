-- Fix CHILD role permission defaults for any permissions created before the
-- CHILD case was added to applyRoleDefaults()
UPDATE passport_permissions
SET can_view_passport = true,
    can_edit_passport = false,
    can_delete_passport = false,
    can_manage_permissions = false,
    can_create_share_links = false,
    can_view_sections = true,
    can_edit_sections = true,
    can_delete_sections = false,
    can_publish_sections = false,
    can_reorder_sections = false,
    can_view_timeline = true,
    can_add_timeline_entries = true,
    can_edit_timeline_entries = false,
    can_delete_timeline_entries = false,
    can_comment_on_timeline = false,
    can_react_on_timeline = true,
    can_view_documents = false,
    can_upload_documents = false,
    can_download_documents = false,
    can_delete_documents = false
WHERE role = 'CHILD' AND revoked_at IS NULL;

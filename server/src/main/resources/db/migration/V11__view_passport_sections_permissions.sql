-- Add canViewPassport and canViewSections permission flags to passport_permissions.
-- Backfill TRUE for every existing row: any user who already has a permission
-- row could already see the passport and its sections, so the status quo is preserved.
-- Note: custom_roles already includes these columns from V10.

ALTER TABLE passport_permissions
    ADD COLUMN can_view_passport  BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN can_view_sections  BOOLEAN NOT NULL DEFAULT TRUE;

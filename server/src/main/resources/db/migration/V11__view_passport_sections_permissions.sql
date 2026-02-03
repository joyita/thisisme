-- Add canViewPassport and canViewSections permission flags.
-- Backfill TRUE for every existing row: any user who already has a permission
-- row could already see the passport and its sections, so the status quo is preserved.

ALTER TABLE passport_permissions
    ADD COLUMN can_view_passport  BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN can_view_sections  BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE custom_roles
    ADD COLUMN can_view_passport  BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN can_view_sections  BOOLEAN NOT NULL DEFAULT TRUE;

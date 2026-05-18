DROP INDEX IF EXISTS idx_audit_created_at;
DROP INDEX IF EXISTS idx_audit_resource_code;
DROP TABLE IF EXISTS appref_audit_logs;

DROP INDEX IF EXISTS idx_apprefs_stage;
DROP INDEX IF EXISTS idx_apprefs_status;
DROP INDEX IF EXISTS idx_apprefs_project_code;
DROP TABLE IF EXISTS apprefs;

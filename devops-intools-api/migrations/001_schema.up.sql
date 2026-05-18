-- ─── Appref dictionary ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS apprefs (
    code                VARCHAR(50)  PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    stage               VARCHAR(50)  NOT NULL,
    project_code        VARCHAR(20),
    description         TEXT,
    size                VARCHAR(100),
    additional_features TEXT,
    billing_group       VARCHAR(50),
    owner               TEXT,
    pic                 VARCHAR(255),
    status              VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('ACTIVE', 'DECOMMISSIONED')),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apprefs_project_code ON apprefs(project_code);
CREATE INDEX IF NOT EXISTS idx_apprefs_status       ON apprefs(status);
CREATE INDEX IF NOT EXISTS idx_apprefs_stage        ON apprefs(stage);

-- ─── Appref audit log ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appref_audit_logs (
    id            BIGSERIAL    PRIMARY KEY,
    resource_code VARCHAR(50)  NOT NULL,
    action        VARCHAR(20)  NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DECOMMISSION')),
    actor_ip      VARCHAR(45),
    actor_id      VARCHAR(255),
    actor_email   VARCHAR(255),
    changes       JSONB,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_resource_code ON appref_audit_logs(resource_code);
CREATE INDEX IF NOT EXISTS idx_audit_created_at    ON appref_audit_logs(created_at DESC);

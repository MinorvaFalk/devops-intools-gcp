package repository

import (
	"context"
	"fmt"

	"github.com/georgysavva/scany/v2/pgxscan"
	"github.com/jackc/pgx/v5/pgxpool"

	"devops-intools-api/internal/models"
)

type AuditLogRepository struct {
	db *pgxpool.Pool
}

func NewAuditLogRepository(db *pgxpool.Pool) *AuditLogRepository {
	return &AuditLogRepository{db: db}
}

func (r *AuditLogRepository) Create(ctx context.Context, entry *models.AuditLog) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO appref_audit_logs (resource_code, action, actor_ip, actor_id, actor_email, changes)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		entry.ResourceCode, entry.Action, entry.ActorIP, entry.ActorID, entry.ActorEmail, entry.Changes,
	)
	if err != nil {
		return fmt.Errorf("create audit log: %w", err)
	}
	return nil
}

// ListByResource returns all audit log entries for a resource, newest first.
// Nullable actor_* columns are coalesced to '' so they scan into the model's
// plain string fields without needing pointer indirection.
func (r *AuditLogRepository) ListByResource(ctx context.Context, resourceCode string) ([]*models.AuditLog, error) {
	query := `SELECT id, resource_code, action,
	                 COALESCE(actor_ip, '')    AS actor_ip,
	                 COALESCE(actor_id, '')    AS actor_id,
	                 COALESCE(actor_email, '') AS actor_email,
	                 changes,
	                 created_at
	          FROM appref_audit_logs
	          WHERE resource_code = $1
	          ORDER BY created_at DESC`

	var result []*models.AuditLog
	if err := pgxscan.Select(ctx, r.db, &result, query, resourceCode); err != nil {
		return nil, fmt.Errorf("list audit logs: %w", err)
	}
	return result, nil
}

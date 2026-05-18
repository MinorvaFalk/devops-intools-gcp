package repository

import (
	"context"
	"fmt"
	"strings"

	"github.com/georgysavva/scany/v2/pgxscan"
	"github.com/jackc/pgx/v5/pgxpool"

	"devops-intools-api/internal/models"
)

type AppRefRepository struct {
	db *pgxpool.Pool
}

func NewAppRefRepository(db *pgxpool.Pool) *AppRefRepository {
	return &AppRefRepository{db: db}
}

const apprefSelectCols = `code, name, description, stage, project_code, size, additional_features,
	                      owner, pic, status, created_at, updated_at`

func (r *AppRefRepository) List(ctx context.Context, f models.AppRefFilter) ([]*models.AppRef, error) {
	var (
		conds []string
		args  []any
	)
	if f.Status != "" {
		args = append(args, f.Status)
		conds = append(conds, fmt.Sprintf("status = $%d", len(args)))
	}
	if f.Stage != "" {
		args = append(args, f.Stage)
		conds = append(conds, fmt.Sprintf("stage = $%d", len(args)))
	}
	if f.ProjectCode != "" {
		args = append(args, f.ProjectCode)
		conds = append(conds, fmt.Sprintf("project_code = $%d", len(args)))
	}

	query := `SELECT ` + apprefSelectCols + ` FROM apprefs`
	if len(conds) > 0 {
		query += " WHERE " + strings.Join(conds, " AND ")
	}
	query += " ORDER BY code"

	var data []*models.AppRef
	if err := pgxscan.Select(ctx, r.db, &data, query, args...); err != nil {
		return nil, fmt.Errorf("list apprefs: %w", err)
	}
	return data, nil
}

func (r *AppRefRepository) Get(ctx context.Context, code string) (*models.AppRef, error) {
	a := &models.AppRef{}
	query := `SELECT ` + apprefSelectCols + ` FROM apprefs WHERE code = $1`
	if err := pgxscan.Get(ctx, r.db, a, query, code); err != nil {
		if pgxscan.NotFound(err) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("get appref: %w", err)
	}
	return a, nil
}

func (r *AppRefRepository) Create(ctx context.Context, req *models.CreateAppRefRequest) (*models.AppRef, error) {
	a := &models.AppRef{}
	query := `INSERT INTO apprefs (code, name, description, stage, project_code, size, additional_features, owner, pic)
	          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	          RETURNING ` + apprefSelectCols
	if err := pgxscan.Get(ctx, r.db, a, query,
		req.Code, req.Name, req.Description, req.Stage, req.ProjectCode,
		req.Size, req.AdditionalFeatures, req.Owner, req.PIC); err != nil {
		return nil, classifyPgErr("create appref", err)
	}
	return a, nil
}

// Update applies a partial update — nil request fields are skipped via
// COALESCE so the existing column value is preserved.
func (r *AppRefRepository) Update(ctx context.Context, code string, req *models.UpdateAppRefRequest) (*models.AppRef, error) {
	a := &models.AppRef{}
	query := `UPDATE apprefs
	          SET name                = COALESCE($1, name),
	              description         = COALESCE($2, description),
	              stage               = COALESCE($3, stage),
	              project_code        = COALESCE($4, project_code),
	              size                = COALESCE($5, size),
	              additional_features = COALESCE($6, additional_features),
	              owner               = COALESCE($7, owner),
	              pic                 = COALESCE($8, pic),
	              updated_at          = NOW()
	          WHERE code = $9
	          RETURNING ` + apprefSelectCols
	if err := pgxscan.Get(ctx, r.db, a, query,
		req.Name, req.Description, req.Stage, req.ProjectCode, req.Size,
		req.AdditionalFeatures, req.Owner, req.PIC, code); err != nil {
		if pgxscan.NotFound(err) {
			return nil, ErrNotFound
		}
		return nil, classifyPgErr("update appref", err)
	}
	return a, nil
}

// Decommission sets the status to DECOMMISSIONED without deleting the record.
func (r *AppRefRepository) Decommission(ctx context.Context, code string) error {
	tag, err := r.db.Exec(ctx,
		`UPDATE apprefs SET status = 'DECOMMISSIONED', updated_at = NOW() WHERE code = $1`, code)
	if err != nil {
		return fmt.Errorf("decommission appref: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

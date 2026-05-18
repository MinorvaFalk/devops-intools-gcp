package services

import (
	"context"
	"encoding/json"
	"errors"

	"devops-intools-api/internal/models"
	"devops-intools-api/internal/repository"
	"devops-intools-api/pkg/audit"
	"devops-intools-api/pkg/validate"
)

type appRefRepo interface {
	List(ctx context.Context, f models.AppRefFilter) ([]*models.AppRef, error)
	Get(ctx context.Context, code string) (*models.AppRef, error)
	Create(ctx context.Context, req *models.CreateAppRefRequest) (*models.AppRef, error)
	Update(ctx context.Context, code string, req *models.UpdateAppRefRequest) (*models.AppRef, error)
	Decommission(ctx context.Context, code string) error
}

type auditLogRepo interface {
	Create(ctx context.Context, entry *models.AuditLog) error
	ListByResource(ctx context.Context, resourceCode string) ([]*models.AuditLog, error)
}

type AppRefService struct {
	repo      appRefRepo
	auditRepo auditLogRepo
}

func NewAppRefService(repo appRefRepo, auditRepo auditLogRepo) *AppRefService {
	return &AppRefService{repo: repo, auditRepo: auditRepo}
}

func (s *AppRefService) List(ctx context.Context, f models.AppRefFilter) ([]*models.AppRef, error) {
	return s.repo.List(ctx, f)
}

func (s *AppRefService) Get(ctx context.Context, code string) (*models.AppRef, error) {
	return s.repo.Get(ctx, code)
}

func (s *AppRefService) ListAuditLogs(ctx context.Context, code string) ([]*models.AuditLog, error) {
	return s.auditRepo.ListByResource(ctx, code)
}

func (s *AppRefService) Create(ctx context.Context, req *models.CreateAppRefRequest) (*models.AppRef, error) {
	if err := validate.Check(req); err != nil {
		return nil, err
	}
	item, err := s.repo.Create(ctx, req)
	if err != nil {
		return nil, err
	}
	s.log(ctx, item.Code, "CREATE", buildCreateChanges(item))
	return item, nil
}

func (s *AppRefService) Update(ctx context.Context, code string, req *models.UpdateAppRefRequest) (*models.AppRef, error) {
	if err := validate.Check(req); err != nil {
		return nil, err
	}
	old, err := s.repo.Get(ctx, code)
	if err != nil {
		return nil, err
	}
	item, err := s.repo.Update(ctx, code, req)
	if err != nil {
		return nil, err
	}
	s.log(ctx, item.Code, "UPDATE", buildUpdateChanges(old, item))
	return item, nil
}

func (s *AppRefService) Decommission(ctx context.Context, code string) error {
	old, err := s.repo.Get(ctx, code)
	if err != nil {
		return err
	}
	if err := s.repo.Decommission(ctx, code); err != nil {
		return err
	}
	changes, _ := json.Marshal(map[string]any{
		"status": map[string]any{"from": old.Status, "to": "DECOMMISSIONED"},
	})
	s.log(ctx, code, "DECOMMISSION", changes)
	return nil
}

// log writes an audit entry; failures are silently swallowed so they never
// break the main operation.
func (s *AppRefService) log(ctx context.Context, code, action string, changes json.RawMessage) {
	actor := audit.ActorFromContext(ctx)
	_ = s.auditRepo.Create(ctx, &models.AuditLog{
		ResourceCode: code,
		Action:       action,
		ActorIP:      actor.IP,
		ActorID:      actor.UserID,
		ActorEmail:   actor.Email,
		Changes:      changes,
	})
}

func IsNotFound(err error) bool {
	return errors.Is(err, repository.ErrNotFound)
}

func IsConflict(err error) bool {
	return errors.Is(err, repository.ErrConflict)
}

func IsFKViolation(err error) bool {
	return errors.Is(err, repository.ErrFKViolation)
}

type fieldChange struct {
	From any `json:"from"`
	To   any `json:"to"`
}

func derefStr(p *string) any {
	if p == nil {
		return nil
	}
	return *p
}

func buildCreateChanges(a *models.AppRef) json.RawMessage {
	m := map[string]fieldChange{
		"name":  {From: nil, To: a.Name},
		"stage": {From: nil, To: a.Stage},
	}
	if a.ProjectCode != nil {
		m["project_code"] = fieldChange{From: nil, To: *a.ProjectCode}
	}
	if a.Size != nil {
		m["size"] = fieldChange{From: nil, To: *a.Size}
	}
	if a.Owner != nil {
		m["owner"] = fieldChange{From: nil, To: *a.Owner}
	}
	if a.PIC != nil {
		m["pic"] = fieldChange{From: nil, To: *a.PIC}
	}
	if a.AdditionalFeatures != nil {
		m["additional_features"] = fieldChange{From: nil, To: *a.AdditionalFeatures}
	}
	b, _ := json.Marshal(m)
	return b
}

func buildUpdateChanges(old, new *models.AppRef) json.RawMessage {
	m := map[string]fieldChange{}
	if old.Name != new.Name {
		m["name"] = fieldChange{From: old.Name, To: new.Name}
	}
	if old.Stage != new.Stage {
		m["stage"] = fieldChange{From: old.Stage, To: new.Stage}
	}
	if derefStr(old.ProjectCode) != derefStr(new.ProjectCode) {
		m["project_code"] = fieldChange{From: derefStr(old.ProjectCode), To: derefStr(new.ProjectCode)}
	}
	if derefStr(old.Size) != derefStr(new.Size) {
		m["size"] = fieldChange{From: derefStr(old.Size), To: derefStr(new.Size)}
	}
	if derefStr(old.AdditionalFeatures) != derefStr(new.AdditionalFeatures) {
		m["additional_features"] = fieldChange{From: derefStr(old.AdditionalFeatures), To: derefStr(new.AdditionalFeatures)}
	}
	if derefStr(old.Owner) != derefStr(new.Owner) {
		m["owner"] = fieldChange{From: derefStr(old.Owner), To: derefStr(new.Owner)}
	}
	if derefStr(old.PIC) != derefStr(new.PIC) {
		m["pic"] = fieldChange{From: derefStr(old.PIC), To: derefStr(new.PIC)}
	}
	if len(m) == 0 {
		return nil
	}
	b, _ := json.Marshal(m)
	return b
}

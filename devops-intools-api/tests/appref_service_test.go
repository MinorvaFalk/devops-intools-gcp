package tests

import (
	"context"
	"errors"
	"testing"
	"time"

	"devops-intools-api/internal/models"
	"devops-intools-api/internal/repository"
	"devops-intools-api/internal/services"
	"devops-intools-api/pkg/audit"
	"devops-intools-api/pkg/validate"
)

// ─── helpers ─────────────────────────────────────────────────────────────────

func sPtr(s string) *string { return &s }

func actorCtx() context.Context {
	return audit.WithActor(context.Background(), audit.Actor{IP: "127.0.0.1"})
}

func sampleAppRef() *models.AppRef {
	return &models.AppRef{
		Code:      "APP001",
		Name:      "Test App",
		Stage:     "dev",
		Status:    "ACTIVE",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

// ─── mock repos ───────────────────────────────────────────────────────────────

type mockAppRefRepo struct {
	list         func(context.Context, models.AppRefFilter) ([]*models.AppRef, error)
	get          func(context.Context, string) (*models.AppRef, error)
	create       func(context.Context, *models.CreateAppRefRequest) (*models.AppRef, error)
	update       func(context.Context, string, *models.UpdateAppRefRequest) (*models.AppRef, error)
	decommission func(context.Context, string) error
}

func (m *mockAppRefRepo) List(ctx context.Context, f models.AppRefFilter) ([]*models.AppRef, error) {
	if m.list != nil {
		return m.list(ctx, f)
	}
	return nil, nil
}
func (m *mockAppRefRepo) Get(ctx context.Context, code string) (*models.AppRef, error) {
	if m.get != nil {
		return m.get(ctx, code)
	}
	return nil, repository.ErrNotFound
}
func (m *mockAppRefRepo) Create(ctx context.Context, req *models.CreateAppRefRequest) (*models.AppRef, error) {
	if m.create != nil {
		return m.create(ctx, req)
	}
	return nil, nil
}
func (m *mockAppRefRepo) Update(ctx context.Context, code string, req *models.UpdateAppRefRequest) (*models.AppRef, error) {
	if m.update != nil {
		return m.update(ctx, code, req)
	}
	return nil, nil
}
func (m *mockAppRefRepo) Decommission(ctx context.Context, code string) error {
	if m.decommission != nil {
		return m.decommission(ctx, code)
	}
	return nil
}

type mockAuditRepo struct {
	created []*models.AuditLog
}

func (m *mockAuditRepo) Create(_ context.Context, entry *models.AuditLog) error {
	m.created = append(m.created, entry)
	return nil
}
func (m *mockAuditRepo) ListByResource(_ context.Context, code string) ([]*models.AuditLog, error) {
	var out []*models.AuditLog
	for _, l := range m.created {
		if l.ResourceCode == code {
			out = append(out, l)
		}
	}
	return out, nil
}

func newSvc(repo *mockAppRefRepo, auditRepo *mockAuditRepo) *services.AppRefService {
	return services.NewAppRefService(repo, auditRepo)
}

// ─── Create ───────────────────────────────────────────────────────────────────

func TestServiceCreate_Success(t *testing.T) {
	want := sampleAppRef()
	auditMock := &mockAuditRepo{}
	svc := newSvc(&mockAppRefRepo{
		create: func(_ context.Context, _ *models.CreateAppRefRequest) (*models.AppRef, error) {
			return want, nil
		},
	}, auditMock)

	got, err := svc.Create(actorCtx(), &models.CreateAppRefRequest{
		Code: "APP001", Name: "Test App", Stage: "dev",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.Code != want.Code {
		t.Errorf("code: got %q, want %q", got.Code, want.Code)
	}
	if len(auditMock.created) != 1 || auditMock.created[0].Action != "CREATE" {
		t.Errorf("expected one CREATE audit log, got %v", auditMock.created)
	}
}

func TestServiceCreate_ValidationError(t *testing.T) {
	svc := newSvc(&mockAppRefRepo{}, &mockAuditRepo{})

	_, err := svc.Create(actorCtx(), &models.CreateAppRefRequest{Stage: "dev"})
	var ve *validate.Error
	if !errors.As(err, &ve) {
		t.Fatalf("expected *validate.Error, got %T: %v", err, err)
	}
	if _, ok := ve.Fields["code"]; !ok {
		t.Errorf("expected 'code' field error, fields: %v", ve.Fields)
	}
}

func TestServiceCreate_InvalidStage(t *testing.T) {
	svc := newSvc(&mockAppRefRepo{}, &mockAuditRepo{})

	_, err := svc.Create(actorCtx(), &models.CreateAppRefRequest{
		Code: "APP001", Name: "Test App", Stage: "invalid-stage",
	})
	var ve *validate.Error
	if !errors.As(err, &ve) {
		t.Fatalf("expected *validate.Error, got %T", err)
	}
	if _, ok := ve.Fields["stage"]; !ok {
		t.Errorf("expected 'stage' field error, fields: %v", ve.Fields)
	}
}

func TestServiceCreate_Conflict(t *testing.T) {
	svc := newSvc(&mockAppRefRepo{
		create: func(_ context.Context, _ *models.CreateAppRefRequest) (*models.AppRef, error) {
			return nil, repository.ErrConflict
		},
	}, &mockAuditRepo{})

	_, err := svc.Create(actorCtx(), &models.CreateAppRefRequest{
		Code: "APP001", Name: "Test App", Stage: "dev",
	})
	if !errors.Is(err, repository.ErrConflict) {
		t.Errorf("expected ErrConflict, got %v", err)
	}
}

// ─── Get ──────────────────────────────────────────────────────────────────────

func TestServiceGet_Success(t *testing.T) {
	want := sampleAppRef()
	svc := newSvc(&mockAppRefRepo{
		get: func(_ context.Context, code string) (*models.AppRef, error) {
			if code != "APP001" {
				return nil, repository.ErrNotFound
			}
			return want, nil
		},
	}, &mockAuditRepo{})

	got, err := svc.Get(context.Background(), "APP001")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.Code != want.Code {
		t.Errorf("code: got %q, want %q", got.Code, want.Code)
	}
}

func TestServiceGet_NotFound(t *testing.T) {
	svc := newSvc(&mockAppRefRepo{
		get: func(_ context.Context, _ string) (*models.AppRef, error) {
			return nil, repository.ErrNotFound
		},
	}, &mockAuditRepo{})

	_, err := svc.Get(context.Background(), "NOPE")
	if !errors.Is(err, repository.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

// ─── Update ───────────────────────────────────────────────────────────────────

func TestServiceUpdate_Success(t *testing.T) {
	old := sampleAppRef()
	updated := &models.AppRef{Code: "APP001", Name: "Updated App", Stage: "prod", Status: "ACTIVE"}
	auditMock := &mockAuditRepo{}
	svc := newSvc(&mockAppRefRepo{
		get: func(_ context.Context, _ string) (*models.AppRef, error) { return old, nil },
		update: func(_ context.Context, _ string, _ *models.UpdateAppRefRequest) (*models.AppRef, error) {
			return updated, nil
		},
	}, auditMock)

	got, err := svc.Update(actorCtx(), "APP001", &models.UpdateAppRefRequest{
		Name:  sPtr("Updated App"),
		Stage: sPtr("prod"),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.Name != "Updated App" {
		t.Errorf("name: got %q, want %q", got.Name, "Updated App")
	}
	if len(auditMock.created) != 1 || auditMock.created[0].Action != "UPDATE" {
		t.Errorf("expected one UPDATE audit log, got %v", auditMock.created)
	}
}

func TestServiceUpdate_ValidationError(t *testing.T) {
	svc := newSvc(&mockAppRefRepo{}, &mockAuditRepo{})

	_, err := svc.Update(actorCtx(), "APP001", &models.UpdateAppRefRequest{})
	var ve *validate.Error
	if !errors.As(err, &ve) {
		t.Fatalf("expected *validate.Error, got %T: %v", err, err)
	}
}

func TestServiceUpdate_NotFound(t *testing.T) {
	svc := newSvc(&mockAppRefRepo{
		get: func(_ context.Context, _ string) (*models.AppRef, error) {
			return nil, repository.ErrNotFound
		},
	}, &mockAuditRepo{})

	_, err := svc.Update(actorCtx(), "NOPE", &models.UpdateAppRefRequest{
		Name:  sPtr("X"),
		Stage: sPtr("dev"),
	})
	if !errors.Is(err, repository.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

// ─── Decommission ─────────────────────────────────────────────────────────────

func TestServiceDecommission_Success(t *testing.T) {
	auditMock := &mockAuditRepo{}
	svc := newSvc(&mockAppRefRepo{
		get:          func(_ context.Context, _ string) (*models.AppRef, error) { return sampleAppRef(), nil },
		decommission: func(_ context.Context, _ string) error { return nil },
	}, auditMock)

	if err := svc.Decommission(actorCtx(), "APP001"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(auditMock.created) != 1 || auditMock.created[0].Action != "DECOMMISSION" {
		t.Errorf("expected one DECOMMISSION audit log, got %v", auditMock.created)
	}
}

func TestServiceDecommission_NotFound(t *testing.T) {
	svc := newSvc(&mockAppRefRepo{
		get: func(_ context.Context, _ string) (*models.AppRef, error) {
			return nil, repository.ErrNotFound
		},
	}, &mockAuditRepo{})

	err := svc.Decommission(actorCtx(), "NOPE")
	if !errors.Is(err, repository.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

// ─── List ─────────────────────────────────────────────────────────────────────

func TestServiceList_Success(t *testing.T) {
	items := []*models.AppRef{sampleAppRef(), {Code: "APP002", Name: "Another", Stage: "prod", Status: "ACTIVE"}}
	svc := newSvc(&mockAppRefRepo{
		list: func(_ context.Context, _ models.AppRefFilter) ([]*models.AppRef, error) {
			return items, nil
		},
	}, &mockAuditRepo{})

	got, err := svc.List(context.Background(), models.AppRefFilter{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 2 {
		t.Errorf("expected 2 items, got %d", len(got))
	}
}

func TestServiceList_WithFilter(t *testing.T) {
	svc := newSvc(&mockAppRefRepo{
		list: func(_ context.Context, f models.AppRefFilter) ([]*models.AppRef, error) {
			if f.Stage != "prod" {
				t.Errorf("expected stage filter 'prod', got %q", f.Stage)
			}
			return []*models.AppRef{}, nil
		},
	}, &mockAuditRepo{})

	_, err := svc.List(context.Background(), models.AppRefFilter{Stage: "prod"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

// ─── ListAuditLogs ────────────────────────────────────────────────────────────

func TestServiceListAuditLogs_Success(t *testing.T) {
	auditMock := &mockAuditRepo{}
	auditMock.created = []*models.AuditLog{
		{ID: 1, ResourceCode: "APP001", Action: "CREATE"},
		{ID: 2, ResourceCode: "APP001", Action: "UPDATE"},
	}
	svc := newSvc(&mockAppRefRepo{}, auditMock)

	logs, err := svc.ListAuditLogs(context.Background(), "APP001")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(logs) != 2 {
		t.Errorf("expected 2 audit logs, got %d", len(logs))
	}
}

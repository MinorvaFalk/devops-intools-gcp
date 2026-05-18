package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v3"

	"devops-intools-api/internal/handlers"
	"devops-intools-api/internal/models"
	"devops-intools-api/internal/repository"
	"devops-intools-api/pkg/validate"
)

// ─── mock service ─────────────────────────────────────────────────────────────

type mockAppRefSvc struct {
	list          func(context.Context, models.AppRefFilter) ([]*models.AppRef, error)
	get           func(context.Context, string) (*models.AppRef, error)
	create        func(context.Context, *models.CreateAppRefRequest) (*models.AppRef, error)
	update        func(context.Context, string, *models.UpdateAppRefRequest) (*models.AppRef, error)
	decommission  func(context.Context, string) error
	listAuditLogs func(context.Context, string) ([]*models.AuditLog, error)
}

func (m *mockAppRefSvc) List(ctx context.Context, f models.AppRefFilter) ([]*models.AppRef, error) {
	if m.list != nil {
		return m.list(ctx, f)
	}
	return nil, nil
}
func (m *mockAppRefSvc) Get(ctx context.Context, code string) (*models.AppRef, error) {
	if m.get != nil {
		return m.get(ctx, code)
	}
	return nil, repository.ErrNotFound
}
func (m *mockAppRefSvc) Create(ctx context.Context, req *models.CreateAppRefRequest) (*models.AppRef, error) {
	if m.create != nil {
		return m.create(ctx, req)
	}
	return nil, nil
}
func (m *mockAppRefSvc) Update(ctx context.Context, code string, req *models.UpdateAppRefRequest) (*models.AppRef, error) {
	if m.update != nil {
		return m.update(ctx, code, req)
	}
	return nil, nil
}
func (m *mockAppRefSvc) Decommission(ctx context.Context, code string) error {
	if m.decommission != nil {
		return m.decommission(ctx, code)
	}
	return nil
}
func (m *mockAppRefSvc) ListAuditLogs(ctx context.Context, code string) ([]*models.AuditLog, error) {
	if m.listAuditLogs != nil {
		return m.listAuditLogs(ctx, code)
	}
	return nil, nil
}

// ─── helpers ──────────────────────────────────────────────────────────────────

func newHandlerApp(svc *mockAppRefSvc) *fiber.App {
	app := fiber.New(fiber.Config{})
	handlers.NewAppRefHandler(svc).Register(app)
	return app
}

func doRequest(app *fiber.App, method, path string, body any) *http.Response {
	var r io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		r = bytes.NewReader(b)
	}
	req := httptest.NewRequest(method, path, r)
	req.Header.Set("Content-Type", "application/json")
	resp, _ := app.Test(req)
	return resp
}

func decodeBody(t *testing.T, resp *http.Response) map[string]any {
	t.Helper()
	var out map[string]any
	_ = json.NewDecoder(resp.Body).Decode(&out)
	return out
}

// ─── List ─────────────────────────────────────────────────────────────────────

func TestHandlerList_OK(t *testing.T) {
	app := newHandlerApp(&mockAppRefSvc{
		list: func(_ context.Context, _ models.AppRefFilter) ([]*models.AppRef, error) {
			return []*models.AppRef{sampleAppRef()}, nil
		},
	})
	resp := doRequest(app, http.MethodGet, "/apprefs", nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}

func TestHandlerList_InternalError(t *testing.T) {
	app := newHandlerApp(&mockAppRefSvc{
		list: func(_ context.Context, _ models.AppRefFilter) ([]*models.AppRef, error) {
			return nil, errors.New("db down")
		},
	})
	resp := doRequest(app, http.MethodGet, "/apprefs", nil)
	if resp.StatusCode != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", resp.StatusCode)
	}
}

// ─── Get ──────────────────────────────────────────────────────────────────────

func TestHandlerGet_OK(t *testing.T) {
	app := newHandlerApp(&mockAppRefSvc{
		get: func(_ context.Context, _ string) (*models.AppRef, error) {
			return sampleAppRef(), nil
		},
	})
	resp := doRequest(app, http.MethodGet, "/apprefs/APP001", nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}

func TestHandlerGet_NotFound(t *testing.T) {
	app := newHandlerApp(&mockAppRefSvc{
		get: func(_ context.Context, _ string) (*models.AppRef, error) {
			return nil, repository.ErrNotFound
		},
	})
	resp := doRequest(app, http.MethodGet, "/apprefs/NOPE", nil)
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
}

// ─── Create ───────────────────────────────────────────────────────────────────

func TestHandlerCreate_Created(t *testing.T) {
	app := newHandlerApp(&mockAppRefSvc{
		create: func(_ context.Context, _ *models.CreateAppRefRequest) (*models.AppRef, error) {
			return sampleAppRef(), nil
		},
	})
	resp := doRequest(app, http.MethodPost, "/apprefs", map[string]any{
		"code": "APP001", "name": "Test App", "stage": "dev",
	})
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("expected 201, got %d", resp.StatusCode)
	}
}

func TestHandlerCreate_ValidationError(t *testing.T) {
	ve := &validate.Error{Fields: map[string]string{"code": "required"}}
	app := newHandlerApp(&mockAppRefSvc{
		create: func(_ context.Context, _ *models.CreateAppRefRequest) (*models.AppRef, error) {
			return nil, ve
		},
	})
	resp := doRequest(app, http.MethodPost, "/apprefs", map[string]any{"stage": "dev"})
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
}

func TestHandlerCreate_Conflict(t *testing.T) {
	app := newHandlerApp(&mockAppRefSvc{
		create: func(_ context.Context, _ *models.CreateAppRefRequest) (*models.AppRef, error) {
			return nil, repository.ErrConflict
		},
	})
	resp := doRequest(app, http.MethodPost, "/apprefs", map[string]any{
		"code": "APP001", "name": "Test App", "stage": "dev",
	})
	if resp.StatusCode != http.StatusConflict {
		t.Fatalf("expected 409, got %d", resp.StatusCode)
	}
}

func TestHandlerCreate_FKViolation(t *testing.T) {
	app := newHandlerApp(&mockAppRefSvc{
		create: func(_ context.Context, _ *models.CreateAppRefRequest) (*models.AppRef, error) {
			return nil, repository.ErrFKViolation
		},
	})
	resp := doRequest(app, http.MethodPost, "/apprefs", map[string]any{
		"code": "APP001", "name": "Test App", "stage": "dev",
	})
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
}

// ─── Update ───────────────────────────────────────────────────────────────────

func TestHandlerUpdate_OK(t *testing.T) {
	app := newHandlerApp(&mockAppRefSvc{
		update: func(_ context.Context, _ string, _ *models.UpdateAppRefRequest) (*models.AppRef, error) {
			return &models.AppRef{Code: "APP001", Name: "New Name", Stage: "prod", Status: "ACTIVE"}, nil
		},
	})
	resp := doRequest(app, http.MethodPut, "/apprefs/APP001", map[string]any{
		"name": "New Name", "stage": "prod",
	})
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}

func TestHandlerUpdate_NotFound(t *testing.T) {
	app := newHandlerApp(&mockAppRefSvc{
		update: func(_ context.Context, _ string, _ *models.UpdateAppRefRequest) (*models.AppRef, error) {
			return nil, repository.ErrNotFound
		},
	})
	resp := doRequest(app, http.MethodPut, "/apprefs/NOPE", map[string]any{
		"name": "X", "stage": "dev",
	})
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
}

func TestHandlerUpdate_ValidationError(t *testing.T) {
	ve := &validate.Error{Fields: map[string]string{"name": "required"}}
	app := newHandlerApp(&mockAppRefSvc{
		update: func(_ context.Context, _ string, _ *models.UpdateAppRefRequest) (*models.AppRef, error) {
			return nil, ve
		},
	})
	resp := doRequest(app, http.MethodPut, "/apprefs/APP001", map[string]any{})
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
}

// ─── Decommission ─────────────────────────────────────────────────────────────

func TestHandlerDecommission_NoContent(t *testing.T) {
	app := newHandlerApp(&mockAppRefSvc{
		decommission: func(_ context.Context, _ string) error { return nil },
	})
	resp := doRequest(app, http.MethodDelete, "/apprefs/APP001", nil)
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", resp.StatusCode)
	}
}

func TestHandlerDecommission_NotFound(t *testing.T) {
	app := newHandlerApp(&mockAppRefSvc{
		decommission: func(_ context.Context, _ string) error { return repository.ErrNotFound },
	})
	resp := doRequest(app, http.MethodDelete, "/apprefs/NOPE", nil)
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
}

// ─── AuditLogs ────────────────────────────────────────────────────────────────

func TestHandlerAuditLogs_OK(t *testing.T) {
	app := newHandlerApp(&mockAppRefSvc{
		listAuditLogs: func(_ context.Context, _ string) ([]*models.AuditLog, error) {
			return []*models.AuditLog{
				{ID: 1, ResourceCode: "APP001", Action: "CREATE"},
				{ID: 2, ResourceCode: "APP001", Action: "UPDATE"},
			}, nil
		},
	})
	resp := doRequest(app, http.MethodGet, "/apprefs/APP001/audit-logs", nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	body := decodeBody(t, resp)
	data, ok := body["data"].([]any)
	if !ok || len(data) != 2 {
		t.Errorf("expected 2 audit logs in response, got %v", body["data"])
	}
}

func TestHandlerAuditLogs_InternalError(t *testing.T) {
	app := newHandlerApp(&mockAppRefSvc{
		listAuditLogs: func(_ context.Context, _ string) ([]*models.AuditLog, error) {
			return nil, errors.New("db timeout")
		},
	})
	resp := doRequest(app, http.MethodGet, "/apprefs/APP001/audit-logs", nil)
	if resp.StatusCode != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", resp.StatusCode)
	}
}

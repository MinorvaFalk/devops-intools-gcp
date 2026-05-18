package handlers

import (
	"context"
	"errors"

	"github.com/gofiber/fiber/v3"

	"devops-intools-api/internal/models"
	"devops-intools-api/internal/repository"
	"devops-intools-api/pkg/response"
	"devops-intools-api/pkg/validate"
)

// ─── AppRef ──────────────────────────────────────────────────────────────────

type appRefSvc interface {
	List(ctx context.Context, f models.AppRefFilter) ([]*models.AppRef, error)
	Get(ctx context.Context, code string) (*models.AppRef, error)
	Create(ctx context.Context, req *models.CreateAppRefRequest) (*models.AppRef, error)
	Update(ctx context.Context, code string, req *models.UpdateAppRefRequest) (*models.AppRef, error)
	Decommission(ctx context.Context, code string) error
	ListAuditLogs(ctx context.Context, code string) ([]*models.AuditLog, error)
}

type AppRefHandler struct {
	svc appRefSvc
}

func NewAppRefHandler(svc appRefSvc) *AppRefHandler {
	return &AppRefHandler{svc: svc}
}

func (h *AppRefHandler) Register(r fiber.Router) {
	g := r.Group("/apprefs")
	g.Get("", h.List)
	g.Post("", h.Create)
	g.Get("/:code", h.Get)
	g.Put("/:code", h.Update)
	g.Delete("/:code", h.Decommission)
	g.Get("/:code/audit-logs", h.AuditLogs)
}

// GET /apprefs?status=ACTIVE&stage=dev&project_code=98H
func (h *AppRefHandler) List(c fiber.Ctx) error {
	var f models.AppRefFilter

	if err := c.Bind().Query(&f); err != nil {
		return response.BadRequest(c, errorf("invalid query parameters: %v", err))
	}

	items, err := h.svc.List(c.Context(), f)
	if err != nil {
		return response.InternalError(c, err)
	}
	return response.OK(c, items)
}

// GET /apprefs/:code
func (h *AppRefHandler) Get(c fiber.Ctx) error {
	item, err := h.svc.Get(c.Context(), c.Params("code"))
	if err != nil {
		return handleDBError(c, err)
	}
	return response.OK(c, item)
}

// POST /apprefs
func (h *AppRefHandler) Create(c fiber.Ctx) error {
	var req models.CreateAppRefRequest
	if err := c.Bind().Body(&req); err != nil {
		return response.BadRequest(c, errorf("invalid request body: %v", err))
	}
	item, err := h.svc.Create(c.Context(), &req)
	if err != nil {
		return handleDBError(c, err)
	}
	return response.Created(c, item)
}

// PUT /apprefs/:code
func (h *AppRefHandler) Update(c fiber.Ctx) error {
	var req models.UpdateAppRefRequest
	if err := c.Bind().Body(&req); err != nil {
		return response.BadRequest(c, errorf("invalid request body: %v", err))
	}
	item, err := h.svc.Update(c.Context(), c.Params("code"), &req)
	if err != nil {
		return handleDBError(c, err)
	}
	return response.OK(c, item)
}

// DELETE /apprefs/:code — sets status to DECOMMISSIONED, does not hard-delete.
func (h *AppRefHandler) Decommission(c fiber.Ctx) error {
	if err := h.svc.Decommission(c.Context(), c.Params("code")); err != nil {
		return handleDBError(c, err)
	}
	return response.NoContent(c)
}

// GET /apprefs/:code/audit-logs
func (h *AppRefHandler) AuditLogs(c fiber.Ctx) error {
	logs, err := h.svc.ListAuditLogs(c.Context(), c.Params("code"))
	if err != nil {
		return response.InternalError(c, err)
	}
	return response.OK(c, logs)
}

// ─── DB error helper ─────────────────────────────────────────────────────────

func handleDBError(c fiber.Ctx, err error) error {
	var ve *validate.Error
	switch {
	case errors.As(err, &ve):
		return response.ValidationErrors(c, ve.Fields)
	case errors.Is(err, repository.ErrNotFound):
		return response.NotFound(c, "resource")
	case errors.Is(err, repository.ErrConflict):
		return response.Conflict(c, "resource already exists with this code")
	case errors.Is(err, repository.ErrFKViolation):
		return response.BadRequest(c, errorf("referenced project_code does not exist"))
	default:
		return response.InternalError(c, err)
	}
}

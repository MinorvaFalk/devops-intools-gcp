package handlers

import (
	"fmt"

	"github.com/gofiber/fiber/v3"

	"devops-intools-api/internal/services"
	"devops-intools-api/pkg/response"
)

// ─── RefProject ──────────────────────────────────────────────────────────────

type RefProjectHandler struct {
	svc *services.RefProjectService
}

func NewRefProjectHandler(svc *services.RefProjectService) *RefProjectHandler {
	return &RefProjectHandler{svc: svc}
}

func (h *RefProjectHandler) Register(r fiber.Router) {
	g := r.Group("/ref/projects")
	g.Get("", h.List)
	g.Get("/:code", h.Get)
}

// GET /ref/projects — proxies the Core projects API, returning all pages merged.
func (h *RefProjectHandler) List(c fiber.Ctx) error {
	items, err := h.svc.List(c.Context())
	if err != nil {
		return response.InternalError(c, err)
	}
	return response.OK(c, items)
}

// GET /ref/projects/:code
func (h *RefProjectHandler) Get(c fiber.Ctx) error {
	item, err := h.svc.Get(c.Context(), c.Params("code"))
	if err != nil {
		return response.NotFound(c, fmt.Sprintf("project %q not found", c.Params("code")))
	}
	return response.OK(c, item)
}

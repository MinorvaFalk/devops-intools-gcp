package handlers

import (
	"github.com/gofiber/fiber/v3"

	"devops-intools-api/internal/models"
	"devops-intools-api/internal/services"
	"devops-intools-api/pkg/response"
)

// ─── Firewall ─────────────────────────────────────────────────────────────────

type FirewallHandler struct {
	svc *services.FirewallService
}

func NewFirewallHandler(svc *services.FirewallService) *FirewallHandler {
	return &FirewallHandler{svc: svc}
}

func (h *FirewallHandler) Register(r fiber.Router) {
	g := r.Group("/firewall")
	g.Get("/rules", h.ListRules)
	g.Get("/rules/:name", h.GetRule)
}

// GET /firewall/rules?project=... — simplified list of all VPC firewall rules.
func (h *FirewallHandler) ListRules(c fiber.Ctx) error {
	project, err := requireQuery(c, "project")
	if err != nil {
		return err
	}
	rules, err := h.svc.ListFirewalls(c.Context(), project)
	if err != nil {
		return handleGCPError(c, err)
	}
	out := make([]*models.FirewallRuleSummary, len(rules))
	for i, v := range rules {
		out[i] = &models.FirewallRuleSummary{
			Name:                  v.Name,
			Network:               v.Network,
			Direction:             v.Direction,
			Priority:              v.Priority,
			Action:                v.Action,
			SourceRanges:          v.SourceRanges,
			DestinationRanges:     v.DestinationRanges,
			SourceTags:            v.SourceTags,
			TargetTags:            v.TargetTags,
			SourceServiceAccounts: v.SourceServiceAccounts,
			TargetServiceAccounts: v.TargetServiceAccounts,
			Rules:                 v.Rules,
			Disabled:              v.Disabled,
			Description:           v.Description,
		}
	}
	return response.OK(c, out)
}

// GET /firewall/rules/:name?project=... — full detail for a single firewall rule.
func (h *FirewallHandler) GetRule(c fiber.Ctx) error {
	project, err := requireQuery(c, "project")
	if err != nil {
		return err
	}
	rule, err := h.svc.GetFirewall(c.Context(), project, c.Params("name"))
	if err != nil {
		return handleGCPError(c, err)
	}
	return response.OK(c, rule)
}

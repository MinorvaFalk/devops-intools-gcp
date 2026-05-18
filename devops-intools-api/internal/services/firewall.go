package services

import (
	"context"
	"fmt"

	compute "cloud.google.com/go/compute/apiv1"
	"cloud.google.com/go/compute/apiv1/computepb"
	"google.golang.org/api/iterator"

	"devops-intools-api/internal/models"
	"devops-intools-api/pkg/gcp"
)

// FirewallService encapsulates read-only VPC firewall rule operations.
type FirewallService struct {
	firewalls *compute.FirewallsClient
}

func NewFirewallService(f *gcp.ClientFactory) *FirewallService {
	return &FirewallService{firewalls: f.FirewallsClient}
}

// ListFirewalls returns all VPC firewall rules for the given project.
// Firewall rules are global (not per-zone).
func (s *FirewallService) ListFirewalls(ctx context.Context, projectID string) ([]*models.FirewallRule, error) {
	req := &computepb.ListFirewallsRequest{Project: projectID}

	var result []*models.FirewallRule
	it := s.firewalls.List(ctx, req)
	for {
		fw, err := it.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("list firewalls: %w", err)
		}
		result = append(result, toFirewallRule(fw))
	}
	return result, nil
}

// GetFirewall retrieves a single VPC firewall rule by name.
func (s *FirewallService) GetFirewall(ctx context.Context, projectID, name string) (*models.FirewallRule, error) {
	fw, err := s.firewalls.Get(ctx, &computepb.GetFirewallRequest{
		Project:  projectID,
		Firewall: name,
	})
	if err != nil {
		return nil, fmt.Errorf("get firewall %s: %w", name, err)
	}
	return toFirewallRule(fw), nil
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func toFirewallRule(fw *computepb.Firewall) *models.FirewallRule {
	m := &models.FirewallRule{
		Name:                  fw.GetName(),
		Network:               lastSegment(fw.GetNetwork()),
		Direction:             fw.GetDirection(),
		Priority:              fw.GetPriority(),
		SourceRanges:          fw.GetSourceRanges(),
		DestinationRanges:     fw.GetDestinationRanges(),
		SourceTags:            fw.GetSourceTags(),
		TargetTags:            fw.GetTargetTags(),
		SourceServiceAccounts: fw.GetSourceServiceAccounts(),
		TargetServiceAccounts: fw.GetTargetServiceAccounts(),
		Disabled:              fw.GetDisabled(),
		Description:           fw.GetDescription(),
		CreatedAt:             fw.GetCreationTimestamp(),
	}

	if lc := fw.GetLogConfig(); lc != nil {
		m.LogEnabled = lc.GetEnable()
	}

	if len(fw.GetAllowed()) > 0 {
		m.Action = "ALLOW"
		m.Rules = toPortRules(fw.GetAllowed(), nil)
	} else {
		m.Action = "DENY"
		m.Rules = toPortRules(nil, fw.GetDenied())
	}

	return m
}

func toPortRules(allowed []*computepb.Allowed, denied []*computepb.Denied) []models.FirewallPortRule {
	if len(allowed) > 0 {
		out := make([]models.FirewallPortRule, len(allowed))
		for i, a := range allowed {
			out[i] = models.FirewallPortRule{Protocol: a.GetIPProtocol(), Ports: a.GetPorts()}
		}
		return out
	}
	out := make([]models.FirewallPortRule, len(denied))
	for i, d := range denied {
		out[i] = models.FirewallPortRule{Protocol: d.GetIPProtocol(), Ports: d.GetPorts()}
	}
	return out
}

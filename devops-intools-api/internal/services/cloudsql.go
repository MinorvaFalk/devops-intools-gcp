package services

import (
	"context"
	"fmt"
	"time"

	"google.golang.org/api/sqladmin/v1"

	"devops-intools-api/internal/models"
	"devops-intools-api/pkg/gcp"
)

// CloudSQLService encapsulates read-only Cloud SQL operations. Start/Stop,
// Backup/Restore, and Create/Delete are intentionally omitted — credentials
// we use don't have those permissions.
type CloudSQLService struct {
	svc *sqladmin.Service
}

func NewCloudSQLService(f *gcp.ClientFactory) *CloudSQLService {
	return &CloudSQLService{svc: f.SQLAdmin}
}

// ListInstances returns all Cloud SQL instances in the given project.
func (s *CloudSQLService) ListInstances(ctx context.Context, projectID string) ([]*models.CloudSQLInstance, error) {
	resp, err := s.svc.Instances.List(projectID).Context(ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("list cloudsql instances: %w", err)
	}

	result := make([]*models.CloudSQLInstance, 0, len(resp.Items))
	for _, item := range resp.Items {
		result = append(result, toCloudSQLInstance(item))
	}
	return result, nil
}

// GetInstance retrieves a single Cloud SQL instance.
func (s *CloudSQLService) GetInstance(ctx context.Context, projectID, name string) (*models.CloudSQLInstance, error) {
	item, err := s.svc.Instances.Get(projectID, name).Context(ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("get cloudsql instance %s: %w", name, err)
	}
	return toCloudSQLInstance(item), nil
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func toCloudSQLInstance(item *sqladmin.DatabaseInstance) *models.CloudSQLInstance {
	m := &models.CloudSQLInstance{
		Name:           item.Name,
		Database:       item.DatabaseVersion,
		Region:         item.Region,
		Status:         item.State,
		ServiceAccount: item.ServiceAccountEmailAddress,
	}

	// IpAddresses contains entries with Type PRIMARY (public), PRIVATE, or
	// OUTGOING. We only surface the first two — OUTGOING is rarely useful.
	for _, ip := range item.IpAddresses {
		switch ip.Type {
		case "PRIMARY":
			m.PublicIP = ip.IpAddress
		case "PRIVATE":
			m.PrivateIP = ip.IpAddress
		}
	}

	if s := item.Settings; s != nil {
		m.Tier = s.Tier
		m.StorageGB = s.DataDiskSizeGb
		if s.ActivationPolicy != "" {
			m.Status = mapStatus(s.ActivationPolicy)
		}

		params := &models.CloudSQLParams{
			ActivationPolicy:  s.ActivationPolicy,
			AvailabilityType:  s.AvailabilityType,
			DataDiskType:      s.DataDiskType,
			StorageAutoResize: deref(s.StorageAutoResize),
		}
		if b := s.BackupConfiguration; b != nil {
			params.BackupEnabled = b.Enabled
			params.BackupStartTime = b.StartTime
			params.BinaryLogEnabled = b.BinaryLogEnabled
		}
		if ip := s.IpConfiguration; ip != nil {
			params.IPv4Enabled = ip.Ipv4Enabled
			params.RequireSSL = ip.RequireSsl
		}
		m.Parameters = params

		if len(s.DatabaseFlags) > 0 {
			flags := make([]models.DatabaseFlag, 0, len(s.DatabaseFlags))
			for _, f := range s.DatabaseFlags {
				flags = append(flags, models.DatabaseFlag{Name: f.Name, Value: f.Value})
			}
			m.DatabaseFlags = flags
		}

		if s.UserLabels != nil {
			m.Labels = s.UserLabels
		}
	}

	if t, err := time.Parse(time.RFC3339, item.CreateTime); err == nil {
		m.CreatedAt = t
	}
	return m
}

func deref(p *bool) bool {
	if p == nil {
		return false
	}
	return *p
}

func mapStatus(status string) string {
	switch status {
	case "ALWAYS":
		return "RUNNING"
	case "NEVER":
		return "STOPPED"
	default:
		return status
	}
}

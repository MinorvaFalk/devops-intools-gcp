package services

import (
	"devops-intools-api/pkg/gcp"
)

// Registry holds all initialized GCP service clients.
type Registry struct {
	Projects *ProjectsService
	GCE      *GCEService
	CloudSQL *CloudSQLService
	GKE      *GKEService
	GCS      *GCSService
	Redis    *RedisService
	Firewall *FirewallService
}

// NewRegistry constructs every service from the shared GCP client factory.
func NewRegistry(f *gcp.ClientFactory) *Registry {
	return &Registry{
		Projects: NewProjectsService(f),
		GCE:      NewGCEService(f),
		CloudSQL: NewCloudSQLService(f),
		GKE:      NewGKEService(f),
		GCS:      NewGCSService(f),
		Redis:    NewRedisService(f),
		Firewall: NewFirewallService(f),
	}
}

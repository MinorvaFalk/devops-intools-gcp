package services

import (
	"context"
	"fmt"
	"strconv"
	"time"

	cloudresourcemanager "google.golang.org/api/cloudresourcemanager/v1"

	"devops-intools-api/internal/models"
	"devops-intools-api/pkg/gcp"
)

// ProjectsService lists GCP projects accessible to the configured credentials.
type ProjectsService struct {
	crm *cloudresourcemanager.Service
}

func NewProjectsService(f *gcp.ClientFactory) *ProjectsService {
	return &ProjectsService{crm: f.ResourceManager}
}

// ListProjects returns all active projects the credentials can see.
// Used to populate the project picker that drives every other endpoint.
func (s *ProjectsService) ListProjects(ctx context.Context) ([]*models.Project, error) {
	var result []*models.Project

	call := s.crm.Projects.List().Context(ctx)
	if err := call.Pages(ctx, func(page *cloudresourcemanager.ListProjectsResponse) error {
		for _, p := range page.Projects {
			result = append(result, toProject(p))
		}
		return nil
	}); err != nil {
		return nil, fmt.Errorf("list projects: %w", err)
	}

	return result, nil
}

func toProject(p *cloudresourcemanager.Project) *models.Project {
	m := &models.Project{
		ProjectID: p.ProjectId,
		Name:      p.Name,
		Number:    strconv.FormatInt(p.ProjectNumber, 10),
		State:     p.LifecycleState,
	}
	if t, err := time.Parse(time.RFC3339, p.CreateTime); err == nil {
		m.CreatedAt = t
	}
	return m
}

package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"go.uber.org/zap"

	"devops-intools-api/internal/models"
)

const projectsSubpath = "projects/?format=json&lbu=38&platform=gcp&submit=Submit"

// RefProjectService fetches project entries from the PruCore projects API.
// The API is only reachable on the internal network; errors are logged and an
// empty list is returned so the rest of the app continues working.
type RefProjectService struct {
	projectsURL string
	client      *http.Client
	log         *zap.Logger
}

func NewRefProjectService(baseURL string, log *zap.Logger) *RefProjectService {
	base := strings.TrimRight(baseURL, "/") + "/"
	return &RefProjectService{
		projectsURL: base + projectsSubpath,
		client:      &http.Client{Timeout: 15 * time.Second},
		log:         log,
	}
}

// coreAPIPage is the paginated envelope returned by the Core projects API.
type coreAPIPage struct {
	Count   int              `json:"count"`
	Next    *string          `json:"next"`
	Results []coreAPIProject `json:"results"`
}

// coreAPIProject maps only the fields we expose from the external API response.
type coreAPIProject struct {
	Code              string `json:"code"`
	Name              string `json:"name"`
	Description       string `json:"description"`
	BusinessFunction  string `json:"business_function"`
	Criticality       string `json:"criticality"`
	Hosting           string `json:"hosting"`
	Owner             string `json:"owner"`
	ManagersGroup     string `json:"managers_group"`
	ContributorsGroup string `json:"contributors_group"`
	ViewersGroup      string `json:"viewers_group"`
}

// List fetches all pages from the PruCore API and returns the full project list.
// If the API is unreachable (internal-network only), an empty list is returned
// and the error is logged as a warning so the rest of the app keeps working.
func (s *RefProjectService) List(ctx context.Context) ([]*models.RefProject, error) {
	var result []*models.RefProject
	url := s.projectsURL

	for url != "" {
		page, err := s.fetchPage(ctx, url)
		if err != nil {
			s.log.Warn("PruCore projects API unavailable, returning empty list", zap.Error(err))
			return []*models.RefProject{}, nil
		}
		for i := range page.Results {
			result = append(result, toRefProject(page.Results[i]))
		}
		if page.Next == nil || *page.Next == "" {
			break
		}
		url = *page.Next
	}
	return result, nil
}

// Get returns a single project by code. Returns nil if the API is unreachable
// or the code is not found — callers should treat nil as "not found".
func (s *RefProjectService) Get(ctx context.Context, code string) (*models.RefProject, error) {
	all, err := s.List(ctx)
	if err != nil {
		return nil, err
	}
	for _, p := range all {
		if p.Code == code {
			return p, nil
		}
	}
	return nil, fmt.Errorf("project %q not found", code)
}

func (s *RefProjectService) fetchPage(ctx context.Context, url string) (*coreAPIPage, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("core projects API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("core projects API returned HTTP %d", resp.StatusCode)
	}

	var page coreAPIPage
	if err := json.NewDecoder(resp.Body).Decode(&page); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}
	return &page, nil
}

func toRefProject(r coreAPIProject) *models.RefProject {
	return &models.RefProject{
		Code:              r.Code,
		Name:              r.Name,
		Description:       r.Description,
		BusinessFunction:  r.BusinessFunction,
		Criticality:       r.Criticality,
		Hosting:           r.Hosting,
		Owner:             r.Owner,
		ManagersGroup:     r.ManagersGroup,
		ContributorsGroup: r.ContributorsGroup,
		ViewersGroup:      r.ViewersGroup,
	}
}

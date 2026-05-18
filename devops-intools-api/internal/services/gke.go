package services

import (
	"context"
	"fmt"
	"time"

	container "cloud.google.com/go/container/apiv1"
	"cloud.google.com/go/container/apiv1/containerpb"

	"devops-intools-api/internal/models"
	"devops-intools-api/pkg/gcp"
)

// GKEService encapsulates read-only Google Kubernetes Engine operations.
// Lifecycle (start/stop, backup, restore) and Create/Delete are intentionally
// omitted — credentials we use don't have those permissions.
type GKEService struct {
	client *container.ClusterManagerClient
}

func NewGKEService(f *gcp.ClientFactory) *GKEService {
	return &GKEService{client: f.ClusterManager}
}

// ListClusters returns all GKE clusters in the project across all regions.
func (s *GKEService) ListClusters(ctx context.Context, projectID string) ([]*models.GKECluster, error) {
	parent := fmt.Sprintf("projects/%s/locations/-", projectID)
	resp, err := s.client.ListClusters(ctx, &containerpb.ListClustersRequest{Parent: parent})
	if err != nil {
		return nil, fmt.Errorf("list gke clusters: %w", err)
	}

	result := make([]*models.GKECluster, 0, len(resp.Clusters))
	for _, c := range resp.Clusters {
		result = append(result, toGKECluster(c))
	}
	return result, nil
}

// GetCluster retrieves a single GKE cluster by name and location.
func (s *GKEService) GetCluster(ctx context.Context, projectID, location, name string) (*models.GKECluster, error) {
	clusterName := fmt.Sprintf("projects/%s/locations/%s/clusters/%s", projectID, location, name)
	c, err := s.client.GetCluster(ctx, &containerpb.GetClusterRequest{Name: clusterName})
	if err != nil {
		return nil, fmt.Errorf("get gke cluster %s: %w", name, err)
	}
	return toGKECluster(c), nil
}

// ListNodePools returns all node pools attached to a cluster, with their
// machine spec, autoscaling block, max pods per node, version, etc.
func (s *GKEService) ListNodePools(ctx context.Context, projectID, location, clusterName string) ([]*models.GKENodePool, error) {
	parent := fmt.Sprintf("projects/%s/locations/%s/clusters/%s", projectID, location, clusterName)
	resp, err := s.client.ListNodePools(ctx, &containerpb.ListNodePoolsRequest{Parent: parent})
	if err != nil {
		return nil, fmt.Errorf("list gke node pools for %s: %w", clusterName, err)
	}

	result := make([]*models.GKENodePool, 0, len(resp.NodePools))
	for _, np := range resp.NodePools {
		result = append(result, toGKENodePool(np))
	}
	return result, nil
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func toGKECluster(c *containerpb.Cluster) *models.GKECluster {
	mode := "Standard"
	if c.Autopilot != nil && c.Autopilot.Enabled {
		mode = "Autopilot"
	}

	m := &models.GKECluster{
		Name:      c.Name,
		Location:  c.Location,
		Mode:      mode,
		Version:   c.CurrentMasterVersion,
		Status:    c.Status.String(),
		Endpoint:  c.Endpoint,
		NodeCount: c.CurrentNodeCount,
		NodeZones: c.Locations,
		Labels:    c.ResourceLabels,
	}

	if c.DefaultMaxPodsConstraint != nil {
		m.MaxPodsPerNode = c.DefaultMaxPodsConstraint.MaxPodsPerNode
	}

	if t, err := time.Parse(time.RFC3339, c.CreateTime); err == nil {
		m.CreatedAt = t
	}

	return m
}

func toGKENodePool(np *containerpb.NodePool) *models.GKENodePool {
	m := &models.GKENodePool{
		Name:             np.Name,
		Version:          np.Version,
		Status:           np.Status.String(),
		InitialNodeCount: np.InitialNodeCount,
		Locations:        np.Locations,
	}

	if np.MaxPodsConstraint != nil {
		m.MaxPodsPerNode = np.MaxPodsConstraint.MaxPodsPerNode
	}

	if cfg := np.Config; cfg != nil {
		m.MachineType = cfg.MachineType
		m.DiskSizeGB = cfg.DiskSizeGb
		m.DiskType = cfg.DiskType
		m.ImageType = cfg.ImageType
	}

	if a := np.Autoscaling; a != nil {
		m.Autoscaling = &models.NodePoolAutoscaling{
			Enabled:      a.Enabled,
			MinNodeCount: a.MinNodeCount,
			MaxNodeCount: a.MaxNodeCount,
		}
	}

	return m
}

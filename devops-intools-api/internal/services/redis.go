package services

import (
	"context"
	"fmt"
	"time"

	redis "cloud.google.com/go/redis/apiv1"
	"cloud.google.com/go/redis/apiv1/redispb"
	"google.golang.org/api/iterator"

	"devops-intools-api/internal/models"
	"devops-intools-api/pkg/gcp"
)

// RedisService encapsulates read-only Memorystore for Redis operations.
// Create/Delete/Upgrade are intentionally omitted — credentials we use don't
// have those permissions.
type RedisService struct {
	client *redis.CloudRedisClient
}

func NewRedisService(f *gcp.ClientFactory) *RedisService {
	return &RedisService{client: f.RedisClient}
}

// ListInstances returns all Redis instances across all locations in the project.
func (s *RedisService) ListInstances(ctx context.Context, projectID string) ([]*models.RedisInstance, error) {
	parent := fmt.Sprintf("projects/%s/locations/-", projectID)
	var result []*models.RedisInstance

	it := s.client.ListInstances(ctx, &redispb.ListInstancesRequest{Parent: parent})
	for {
		inst, err := it.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("list redis instances: %w", err)
		}
		result = append(result, toRedisInstance(inst))
	}
	return result, nil
}

// GetInstance retrieves a single Redis instance.
func (s *RedisService) GetInstance(ctx context.Context, projectID, location, name string) (*models.RedisInstance, error) {
	fullName := fmt.Sprintf("projects/%s/locations/%s/instances/%s", projectID, location, name)
	inst, err := s.client.GetInstance(ctx, &redispb.GetInstanceRequest{Name: fullName})
	if err != nil {
		return nil, fmt.Errorf("get redis instance %s: %w", name, err)
	}
	return toRedisInstance(inst), nil
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func toRedisInstance(inst *redispb.Instance) *models.RedisInstance {
	m := &models.RedisInstance{
		Name:         lastSegment(inst.Name),
		Region:       locationFromName(inst.Name),
		Tier:         inst.Tier.String(),
		MemorySizeGB: inst.MemorySizeGb,
		ReplicaCount: inst.ReplicaCount,
		RedisVersion: inst.RedisVersion,
		Status:       inst.State.String(),
		Host:         inst.Host,
		Port:         inst.Port,
		Labels:       inst.Labels,
	}
	if inst.CreateTime != nil {
		m.CreatedAt = time.Unix(inst.CreateTime.Seconds, int64(inst.CreateTime.Nanos))
	}
	return m
}

// locationFromName extracts the location segment from a fully-qualified
// resource name: projects/{project}/locations/{location}/instances/{instance}.
func locationFromName(name string) string {
	parts := splitName(name)
	if len(parts) >= 4 {
		return parts[3]
	}
	return ""
}

func splitName(name string) []string {
	var parts []string
	current := ""
	for _, c := range name {
		if c == '/' {
			parts = append(parts, current)
			current = ""
		} else {
			current += string(c)
		}
	}
	parts = append(parts, current)
	return parts
}

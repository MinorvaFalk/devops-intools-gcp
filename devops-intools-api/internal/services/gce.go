package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	compute "cloud.google.com/go/compute/apiv1"
	"cloud.google.com/go/compute/apiv1/computepb"
	"google.golang.org/api/iterator"

	"devops-intools-api/internal/models"
	"devops-intools-api/pkg/gcp"
)

// GCEService encapsulates read-only Google Compute Engine operations.
// Lifecycle (start/stop) and Snapshot are intentionally omitted —
// credentials we use don't have those permissions.
type GCEService struct {
	instances *compute.InstancesClient
	disks     *compute.DisksClient
}

func NewGCEService(f *gcp.ClientFactory) *GCEService {
	return &GCEService{
		instances: f.InstancesClient,
		disks:     f.DisksClient,
	}
}

// ListInstances returns all GCE instances across all zones for the given
// project. Uses the aggregated list API to avoid per-zone calls. GKE node
// VMs are filtered out — the dashboard tracks them under the GKE service.
func (s *GCEService) ListInstances(ctx context.Context, projectID string) ([]*models.GCEInstance, error) {
	req := &computepb.AggregatedListInstancesRequest{Project: projectID}

	var result []*models.GCEInstance
	it := s.instances.AggregatedList(ctx, req)
	for {
		pair, err := it.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("list instances: %w", err)
		}
		for _, inst := range pair.Value.Instances {
			if isGKENode(inst) {
				continue
			}
			result = append(result, toGCEInstance(inst))
		}
	}
	return result, nil
}

// isGKENode reports whether a VM was provisioned by GKE (node pool). Either
// signal is sufficient on its own — GKE always sets both — but checking
// both keeps the filter robust against unusual configurations.
func isGKENode(inst *computepb.Instance) bool {
	if strings.HasPrefix(inst.GetName(), "gke-") {
		return true
	}
	if _, ok := inst.GetLabels()["goog-k8s-cluster-name"]; ok {
		return true
	}
	return false
}

// GetInstance retrieves a single GCE instance by name and zone, and enriches
// every attached disk with its actual type (pd-balanced, pd-ssd, etc.) by
// looking up the underlying Disk resources. ListInstances skips this extra
// lookup to avoid N+1 calls.
func (s *GCEService) GetInstance(ctx context.Context, projectID, zone, name string) (*models.GCEInstance, error) {
	inst, err := s.instances.Get(ctx, &computepb.GetInstanceRequest{
		Project:  projectID,
		Zone:     zone,
		Instance: name,
	})
	if err != nil {
		return nil, fmt.Errorf("get instance %s: %w", name, err)
	}

	m := toGCEInstance(inst)

	s.enrichDiskType(ctx, projectID, zone, m.BootDisk)
	for _, d := range m.AdditionalDisks {
		s.enrichDiskType(ctx, projectID, zone, d)
	}

	return m, nil
}

// enrichDiskType populates Type on the given disk via DisksClient.Get.
// Failures are intentionally swallowed: a missing type shouldn't fail the
// whole detail view.
func (s *GCEService) enrichDiskType(ctx context.Context, projectID, zone string, d *models.GCEDisk) {
	if d == nil || d.Name == "" {
		return
	}
	disk, err := s.disks.Get(ctx, &computepb.GetDiskRequest{
		Project: projectID,
		Zone:    zone,
		Disk:    d.Name,
	})
	if err == nil {
		d.Type = lastSegment(disk.GetType())
	}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func toGCEInstance(inst *computepb.Instance) *models.GCEInstance {
	m := &models.GCEInstance{
		ID:          fmt.Sprintf("%d", inst.GetId()),
		Name:        inst.GetName(),
		Zone:        lastSegment(inst.GetZone()),
		MachineType: lastSegment(inst.GetMachineType()),
		Status:      inst.GetStatus(),
		CPUPlatform: inst.GetCpuPlatform(),
		Labels:      inst.GetLabels(),
	}

	if ts := inst.GetCreationTimestamp(); ts != "" {
		if t, err := time.Parse(time.RFC3339, ts); err == nil {
			m.CreatedAt = t
		}
	}

	if inst.GetNetworkInterfaces() != nil {
		ni := inst.GetNetworkInterfaces()[0]
		m.InternalIP = ni.GetNetworkIP()
		if len(ni.GetAccessConfigs()) > 0 {
			m.ExternalIP = ni.GetAccessConfigs()[0].GetNatIP()
		}
	}

	for _, d := range inst.GetDisks() {
		gd := &models.GCEDisk{
			Name:       lastSegment(d.GetSource()),
			SizeGB:     d.GetDiskSizeGb(),
			Mode:       d.GetMode(),
			DeviceName: d.GetDeviceName(),
			Boot:       d.GetBoot(),
			AutoDelete: d.GetAutoDelete(),
		}
		if d.GetBoot() {
			m.BootDisk = gd
		} else {
			m.AdditionalDisks = append(m.AdditionalDisks, gd)
		}
	}

	if inst.GetTags() != nil {
		m.NetworkTags = inst.GetTags().GetItems()
	}

	if len(inst.GetServiceAccounts()) > 0 {
		m.ServiceAccount = inst.GetServiceAccounts()[0].GetEmail()
	}

	return m
}

func lastSegment(s string) string {
	parts := strings.Split(s, "/")
	return parts[len(parts)-1]
}

package gcp

import (
	"context"
	"fmt"
	"time"

	compute "cloud.google.com/go/compute/apiv1"
	container "cloud.google.com/go/container/apiv1"
	monitoring "cloud.google.com/go/monitoring/apiv3/v2"
	redis "cloud.google.com/go/redis/apiv1"
	"cloud.google.com/go/storage"
	cloudresourcemanager "google.golang.org/api/cloudresourcemanager/v1"
	"google.golang.org/api/option"
	sqladmin "google.golang.org/api/sqladmin/v1"
	"google.golang.org/grpc"
	"google.golang.org/grpc/keepalive"

	"devops-intools-api/internal/config"
)

// ClientFactory centralises creation and lifecycle of all GCP API clients.
type ClientFactory struct {
	cfg config.GCPConfig

	// Compute Engine
	InstancesClient  *compute.InstancesClient
	DisksClient      *compute.DisksClient
	SnapshotsClient  *compute.SnapshotsClient
	FirewallsClient  *compute.FirewallsClient

	// Cloud SQL
	SQLAdmin *sqladmin.Service

	// GKE
	ClusterManager *container.ClusterManagerClient

	// GCS
	StorageClient *storage.Client

	// Redis (Memorystore)
	RedisClient *redis.CloudRedisClient

	// Cloud Resource Manager (project listing)
	ResourceManager *cloudresourcemanager.Service

	// Cloud Monitoring (bucket size, object count, etc.)
	MetricClient *monitoring.MetricClient
}

// NewClientFactory creates all GCP clients using Application Default Credentials
// (or an explicit credentials file when configured).
func NewClientFactory(ctx context.Context, cfg config.GCPConfig) (*ClientFactory, error) {
	opts := clientOptions(cfg)
	f := &ClientFactory{cfg: cfg}

	var err error

	// ── Compute Engine ────────────────────────────────────────────────────────
	f.InstancesClient, err = compute.NewInstancesRESTClient(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("compute instances client: %w", err)
	}

	f.DisksClient, err = compute.NewDisksRESTClient(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("compute disks client: %w", err)
	}

	f.SnapshotsClient, err = compute.NewSnapshotsRESTClient(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("compute snapshots client: %w", err)
	}

	f.FirewallsClient, err = compute.NewFirewallsRESTClient(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("compute firewalls client: %w", err)
	}

	// ── Cloud SQL ─────────────────────────────────────────────────────────────
	f.SQLAdmin, err = sqladmin.NewService(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("sqladmin client: %w", err)
	}

	// ── GKE ───────────────────────────────────────────────────────────────────
	f.ClusterManager, err = container.NewClusterManagerClient(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("container cluster manager client: %w", err)
	}

	// ── GCS ───────────────────────────────────────────────────────────────────
	f.StorageClient, err = storage.NewClient(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("storage client: %w", err)
	}

	// ── Redis (Memorystore) ───────────────────────────────────────────────────
	f.RedisClient, err = redis.NewCloudRedisClient(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("redis client: %w", err)
	}

	// ── Cloud Resource Manager ────────────────────────────────────────────────
	f.ResourceManager, err = cloudresourcemanager.NewService(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("resource manager client: %w", err)
	}

	// ── Cloud Monitoring ──────────────────────────────────────────────────────
	f.MetricClient, err = monitoring.NewMetricClient(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("monitoring metric client: %w", err)
	}

	return f, nil
}

// Close releases all underlying connections.
func (f *ClientFactory) Close() {
	if f.InstancesClient != nil {
		_ = f.InstancesClient.Close()
	}
	if f.DisksClient != nil {
		_ = f.DisksClient.Close()
	}
	if f.SnapshotsClient != nil {
		_ = f.SnapshotsClient.Close()
	}
	if f.FirewallsClient != nil {
		_ = f.FirewallsClient.Close()
	}
	if f.ClusterManager != nil {
		_ = f.ClusterManager.Close()
	}
	if f.StorageClient != nil {
		_ = f.StorageClient.Close()
	}
	if f.RedisClient != nil {
		_ = f.RedisClient.Close()
	}
	if f.MetricClient != nil {
		_ = f.MetricClient.Close()
	}
}

func clientOptions(cfg config.GCPConfig) []option.ClientOption {
	var opts []option.ClientOption
	if cfg.CredentialsFile != "" {
		opts = append(opts, option.WithAuthCredentialsFile(option.ServiceAccount, cfg.CredentialsFile))
	}

	// gRPC keepalive: ping idle connections every 30s and tear them down if
	// the ack doesn't arrive within 10s. Reaps half-open connections quickly
	// (NAT timeouts, ELB idle eviction) instead of waiting on TCP RTO.
	// Only affects gRPC-backed clients (GKE, Redis, Monitoring); REST clients
	// (Compute, SQL Admin, Storage, ResourceManager) ignore this option.
	opts = append(opts, option.WithGRPCDialOption(grpc.WithKeepaliveParams(keepalive.ClientParameters{
		Time:                30 * time.Second,
		Timeout:             10 * time.Second,
		PermitWithoutStream: true,
	})))

	return opts
}

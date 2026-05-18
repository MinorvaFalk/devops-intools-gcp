package models

import "time"

// ─── Projects ────────────────────────────────────────────────────────────────

// Project mirrors a GCP project entry from Cloud Resource Manager. Used to
// populate the project picker on the frontend.
type Project struct {
	ProjectID string    `json:"project_id"`
	Name      string    `json:"name"`
	Number    string    `json:"number"`
	State     string    `json:"state"`
	CreatedAt time.Time `json:"created_at,omitempty"`
}

// ─── GCE ────────────────────────────────────────────────────────────────────

// GCEInstance mirrors the UI data shown in the GCE Instances list.
type GCEInstance struct {
	ID              string     `json:"id"`
	Name            string     `json:"name"`
	Zone            string     `json:"zone"`
	MachineType     string     `json:"machine_type"`
	Status          string     `json:"status"` // RUNNING | STOPPED | TERMINATED
	InternalIP      string     `json:"internal_ip"`
	ExternalIP      string     `json:"external_ip,omitempty"`
	BootDisk        *GCEDisk   `json:"boot_disk,omitempty"`
	AdditionalDisks []*GCEDisk `json:"additional_disks,omitempty"`
	CPUPlatform     string     `json:"cpu_platform"`
	NetworkTags     []string   `json:"network_tags,omitempty"`
	Labels          Labels     `json:"labels,omitempty"`
	ServiceAccount  string     `json:"service_account,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}

// GCEDisk represents one disk attached to a GCE instance. Drives the "Disks"
// tab in the instance detail view. Type (pd-balanced, pd-ssd, ...) is only
// populated by GetInstance, not by ListInstances.
type GCEDisk struct {
	Name       string `json:"name"`
	SizeGB     int64  `json:"size_gb"`
	Type       string `json:"type,omitempty"`
	Mode       string `json:"mode,omitempty"`
	DeviceName string `json:"device_name,omitempty"`
	Boot       bool   `json:"boot"`
	AutoDelete bool   `json:"auto_delete"`
}

// ─── CloudSQL ────────────────────────────────────────────────────────────────

// CloudSQLInstance mirrors the UI data shown in the CloudSQL list and detail
// views. DatabaseFlags, ServiceAccount and the *Parameters block are populated
// from the instance Settings; they drive the "Flags & Parameters" tab.
type CloudSQLInstance struct {
	ID             string          `json:"id"`
	Name           string          `json:"name"`
	Database       string          `json:"database_version"` // POSTGRES_15 | MYSQL_8_0 etc.
	Region         string          `json:"region"`
	Tier           string          `json:"tier"`
	Status         string          `json:"status"` // RUNNABLE | STOPPED | FAILED
	StorageGB      int64           `json:"storage_gb"`
	PublicIP       string          `json:"public_ip,omitempty"`
	PrivateIP      string          `json:"private_ip,omitempty"`
	ServiceAccount string          `json:"service_account,omitempty"`
	DatabaseFlags  []DatabaseFlag  `json:"database_flags,omitempty"`
	Parameters     *CloudSQLParams `json:"parameters,omitempty"`
	Labels         Labels          `json:"labels,omitempty"`
	CreatedAt      time.Time       `json:"created_at"`
}

// DatabaseFlag is a single Cloud SQL database flag (postgres GUC, MySQL system
// variable, etc.).
type DatabaseFlag struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// CloudSQLParams groups the instance-level settings most useful in the UI.
type CloudSQLParams struct {
	ActivationPolicy  string `json:"activation_policy,omitempty"` // ALWAYS | NEVER | ON_DEMAND
	AvailabilityType  string `json:"availability_type,omitempty"` // ZONAL | REGIONAL
	DataDiskType      string `json:"data_disk_type,omitempty"`    // PD_SSD | PD_HDD
	StorageAutoResize bool   `json:"storage_auto_resize,omitempty"`
	BackupEnabled     bool   `json:"backup_enabled,omitempty"`
	BackupStartTime   string `json:"backup_start_time,omitempty"`
	BinaryLogEnabled  bool   `json:"binary_log_enabled,omitempty"`
	IPv4Enabled       bool   `json:"ipv4_enabled,omitempty"`
	RequireSSL        bool   `json:"require_ssl,omitempty"`
}

// ─── GKE ────────────────────────────────────────────────────────────────────

// GKECluster mirrors the UI data shown in the GKE Clusters list and detail
// view. NodeZones is the cluster-level Locations slice (zones the control
// plane spans + where node pools may schedule).
type GKECluster struct {
	Name           string    `json:"name"`
	Location       string    `json:"location"`
	Mode           string    `json:"mode"` // Standard | Autopilot
	Version        string    `json:"version"`
	Status         string    `json:"status"` // RUNNING | DEGRADED | STOPPED
	Endpoint       string    `json:"endpoint,omitempty"`
	NodeCount      int32     `json:"node_count"`
	MaxPodsPerNode int64     `json:"max_pods_per_node,omitempty"`
	NodeZones      []string  `json:"node_zones,omitempty"`
	Labels         Labels    `json:"labels,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
}

// GKENodePool drives the "Node Pools" tab on the cluster detail view.
type GKENodePool struct {
	Name             string               `json:"name"`
	Version          string               `json:"version,omitempty"`
	Status           string               `json:"status,omitempty"`
	InitialNodeCount int32                `json:"initial_node_count"`
	Locations        []string             `json:"locations,omitempty"`
	MaxPodsPerNode   int64                `json:"max_pods_per_node,omitempty"`
	MachineType      string               `json:"machine_type,omitempty"`
	DiskSizeGB       int32                `json:"disk_size_gb,omitempty"`
	DiskType         string               `json:"disk_type,omitempty"`
	ImageType        string               `json:"image_type,omitempty"`
	Autoscaling      *NodePoolAutoscaling `json:"autoscaling,omitempty"`
}

// NodePoolAutoscaling captures the autoscaling block on a node pool.
type NodePoolAutoscaling struct {
	Enabled      bool  `json:"enabled"`
	MinNodeCount int32 `json:"min_node_count"`
	MaxNodeCount int32 `json:"max_node_count"`
}

// ─── GCS ────────────────────────────────────────────────────────────────────

// GCSBucket represents a Cloud Storage bucket.
type GCSBucket struct {
	Name              string    `json:"name"`
	Location          string    `json:"location"`
	StorageClass      string    `json:"storage_class"`
	VersioningEnabled bool      `json:"versioning_enabled"`
	Labels            Labels    `json:"labels,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
}

// BucketMetrics holds Cloud Monitoring metrics for a single bucket. Sampled
// daily by Google, so SampledAt may be up to ~24h old.
type BucketMetrics struct {
	Bucket      string    `json:"bucket"`
	TotalBytes  int64     `json:"total_bytes"`
	ObjectCount int64     `json:"object_count"`
	SampledAt   time.Time `json:"sampled_at,omitempty"`
}

// ─── Redis (Memorystore) ─────────────────────────────────────────────────────

// RedisInstance represents a Memorystore Redis instance.
type RedisInstance struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Region       string    `json:"region"`
	Tier         string    `json:"tier"` // BASIC | STANDARD_HA
	MemorySizeGB int32     `json:"memory_size_gb"`
	ReplicaCount int32     `json:"replica_count"`
	RedisVersion string    `json:"redis_version"`
	Status       string    `json:"status"` // READY | CREATING | DELETING | FAILED
	Host         string    `json:"host"`
	Port         int32     `json:"port"`
	Labels       Labels    `json:"labels,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

// ─── List summary types ───────────────────────────────────────────────────────

// GCEInstanceSummary is the simplified list-view payload for a GCE instance.
type GCEInstanceSummary struct {
	Name        string   `json:"name"`
	Zone        string   `json:"zone"`
	MachineType string   `json:"machine_type"`
	Status      string   `json:"status"`
	InternalIP  string   `json:"internal_ip"`
	NetworkTags []string `json:"network_tags,omitempty"`
}

// CloudSQLInstanceSummary is the simplified list-view payload for a Cloud SQL instance.
type CloudSQLInstanceSummary struct {
	Name            string `json:"name"`
	DatabaseVersion string `json:"database_version"`
	Region          string `json:"region"`
	Status          string `json:"status"`
	MachineType     string `json:"machine_type"`
	PublicIP        string `json:"public_ip,omitempty"`
	PrivateIP       string `json:"private_ip,omitempty"`
}

// GKEClusterSummary is the simplified list-view payload for a GKE cluster.
type GKEClusterSummary struct {
	Name      string   `json:"name"`
	Location  string   `json:"location"`
	Version   string   `json:"version"`
	Endpoint  string   `json:"endpoint,omitempty"`
	NodeZones []string `json:"node_zones,omitempty"`
}

// GCSBucketSummary is the simplified list-view payload for a GCS bucket.
type GCSBucketSummary struct {
	Name         string `json:"name"`
	Location     string `json:"location"`
	StorageClass string `json:"storage_class"`
}

// RedisInstanceSummary is the simplified list-view payload for a Redis instance.
// Name contains only the instance short-name (last path segment).
type RedisInstanceSummary struct {
	Name    string `json:"name"`
	Region  string `json:"region"`
	Tier    string `json:"tier"`
	Version string `json:"version"`
	Host    string `json:"host"`
}

// ─── Firewall ────────────────────────────────────────────────────────────────

// FirewallRule represents a VPC firewall rule.
type FirewallRule struct {
	Name                  string             `json:"name"`
	Network               string             `json:"network"`
	Direction             string             `json:"direction"` // INGRESS | EGRESS
	Priority              int32              `json:"priority"`
	Action                string             `json:"action"` // ALLOW | DENY
	SourceRanges          []string           `json:"source_ranges"`
	DestinationRanges     []string           `json:"destination_ranges"`
	SourceTags            []string           `json:"source_tags"`
	TargetTags            []string           `json:"target_tags"`
	SourceServiceAccounts []string           `json:"source_service_accounts,omitempty"`
	TargetServiceAccounts []string           `json:"target_service_accounts,omitempty"`
	Rules                 []FirewallPortRule `json:"rules"`
	Disabled              bool               `json:"disabled"`
	LogEnabled            bool               `json:"log_enabled"`
	Description           string             `json:"description"`
	CreatedAt             string             `json:"created_at,omitempty"`
}

// FirewallPortRule is a single allowed/denied protocol+port combination within
// a firewall rule.
type FirewallPortRule struct {
	Protocol string   `json:"protocol"`
	Ports    []string `json:"ports,omitempty"`
}

// FirewallRuleSummary is the list-view payload for a firewall rule.
// Includes all fields from FirewallRule except created_at and log_enabled.
type FirewallRuleSummary struct {
	Name                  string             `json:"name"`
	Network               string             `json:"network"`
	Direction             string             `json:"direction"`
	Priority              int32              `json:"priority"`
	Action                string             `json:"action"`
	SourceRanges          []string           `json:"source_ranges,omitempty"`
	DestinationRanges     []string           `json:"destination_ranges,omitempty"`
	SourceTags            []string           `json:"source_tags,omitempty"`
	TargetTags            []string           `json:"target_tags,omitempty"`
	SourceServiceAccounts []string           `json:"source_service_accounts,omitempty"`
	TargetServiceAccounts []string           `json:"target_service_accounts,omitempty"`
	Rules                 []FirewallPortRule `json:"rules"`
	Disabled              bool               `json:"disabled"`
	Description           string             `json:"description,omitempty"`
}

// ─── Overview ────────────────────────────────────────────────────────────────

// OverviewSummary is the data structure for the Overview page.
type OverviewSummary struct {
	GCE      ResourceSummary `json:"gce"`
	CloudSQL ResourceSummary `json:"cloudsql"`
	GKE      ResourceSummary `json:"gke"`
	GCS      ResourceSummary `json:"gcs"`
	Redis    ResourceSummary `json:"redis"`
}

// ResourceSummary shows top-level counts for a GCP service.
type ResourceSummary struct {
	Total    int            `json:"total"`
	ByStatus map[string]int `json:"by_status"`
}

// ─── Shared ──────────────────────────────────────────────────────────────────

// Labels is a generic string map used for GCP resource labels.
type Labels map[string]string

// Operation represents a long-running GCP operation.
type Operation struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Status   string `json:"status"`
	Progress int    `json:"progress"`
}

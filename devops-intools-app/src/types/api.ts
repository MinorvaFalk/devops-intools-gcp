// Types mirroring internal/models/models.go and internal/models/appref.go

export type Labels = Record<string, string>;

// ─── Projects ────────────────────────────────────────────────────────────────

export interface Project {
  project_id: string;
  name: string;
  number: string;
  state: string;
  created_at?: string;
}

// ─── GCE ────────────────────────────────────────────────────────────────────

export interface GCEInstanceSummary {
  name: string;
  zone: string;
  machine_type: string;
  status: string;
  internal_ip: string;
  network_tags?: string[];
}

export interface GCEDisk {
  name: string;
  size_gb: number;
  type?: string;
  mode?: string;
  device_name?: string;
  boot: boolean;
  auto_delete: boolean;
}

export interface GCEInstance {
  id: string;
  name: string;
  zone: string;
  machine_type: string;
  status: string;
  internal_ip: string;
  external_ip?: string;
  boot_disk?: GCEDisk;
  additional_disks?: GCEDisk[];
  cpu_platform: string;
  network_tags?: string[];
  labels?: Labels;
  service_account?: string;
  created_at: string;
}

// ─── CloudSQL ────────────────────────────────────────────────────────────────

export interface CloudSQLInstanceSummary {
  name: string;
  database_version: string;
  region: string;
  status: string;
  machine_type: string;
  public_ip?: string;
  private_ip?: string;
}

export interface DatabaseFlag {
  name: string;
  value: string;
}

export interface CloudSQLParams {
  [key: string]: unknown;
  activation_policy?: string;
  availability_type?: string;
  data_disk_type?: string;
  storage_auto_resize?: boolean;
  backup_enabled?: boolean;
  backup_start_time?: string;
  binary_log_enabled?: boolean;
  ipv4_enabled?: boolean;
  require_ssl?: boolean;
}

export interface CloudSQLInstance {
  id: string;
  name: string;
  database_version: string;
  region: string;
  tier: string;
  status: string;
  storage_gb: number;
  public_ip?: string;
  private_ip?: string;
  service_account?: string;
  database_flags?: DatabaseFlag[];
  parameters?: CloudSQLParams;
  labels?: Labels;
  created_at: string;
}

// ─── GKE ────────────────────────────────────────────────────────────────────

export interface GKEClusterSummary {
  name: string;
  location: string;
  version: string;
  endpoint?: string;
  node_zones?: string[];
}

export interface GKECluster {
  name: string;
  location: string;
  mode: string;
  version: string;
  status: string;
  endpoint?: string;
  node_count: number;
  max_pods_per_node?: number;
  node_zones?: string[];
  labels?: Labels;
  created_at: string;
}

export interface NodePoolAutoscaling {
  enabled: boolean;
  min_node_count: number;
  max_node_count: number;
}

export interface GKENodePool {
  name: string;
  version?: string;
  status?: string;
  initial_node_count: number;
  locations?: string[];
  max_pods_per_node?: number;
  machine_type?: string;
  disk_size_gb?: number;
  disk_type?: string;
  image_type?: string;
  autoscaling?: NodePoolAutoscaling;
}

// ─── GCS ────────────────────────────────────────────────────────────────────

export interface GCSBucketSummary {
  name: string;
  location: string;
  storage_class: string;
}

export interface GCSBucket {
  name: string;
  location: string;
  storage_class: string;
  versioning_enabled: boolean;
  labels?: Labels;
  created_at: string;
}

export interface BucketMetrics {
  bucket: string;
  total_bytes: number;
  object_count: number;
  sampled_at?: string;
}

// ─── Redis ───────────────────────────────────────────────────────────────────

export interface RedisInstanceSummary {
  name: string;
  region: string;
  tier: string;
  version: string;
  host: string;
}

export interface RedisInstance {
  id: string;
  name: string;
  region: string;
  tier: string;
  memory_size_gb: number;
  replica_count: number;
  redis_version: string;
  status: string;
  host: string;
  port: number;
  labels?: Labels;
  created_at: string;
}

// ─── Overview ────────────────────────────────────────────────────────────────

export interface ResourceSummary {
  total: number;
  by_status: Record<string, number>;
}

export interface OverviewSummary {
  gce: ResourceSummary;
  cloudsql: ResourceSummary;
  gke: ResourceSummary;
  gcs: ResourceSummary;
  redis: ResourceSummary;
}

// ─── AppRef ──────────────────────────────────────────────────────────────────

export interface RefProject {
  code: string;
  name: string;
  description?: string;
  business_function?: string;
  criticality?: string;
  hosting?: string;
  owner?: string;
  managers_group?: string;
  contributors_group?: string;
  viewers_group?: string;
}

export interface AppRef {
  code: string;
  name: string;
  description?: string;
  stage: string;
  project_code: string | null;
  size?: string;
  additional_features?: string;
  owner?: string;
  pic?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAppRefRequest {
  code: string;
  name: string;
  description?: string;
  stage: string;
  project_code?: string;
  size?: string;
  additional_features?: string;
  owner?: string;
  pic?: string;
}

export interface UpdateAppRefRequest {
  name?: string;
  description?: string;
  stage?: string;
  project_code?: string;
  size?: string;
  additional_features?: string;
  owner?: string;
  pic?: string;
  status?: string;
}

export interface AppRefFilter {
  status?: string;
  stage?: string;
  project_code?: string;
}

export interface AuditLogFieldChange {
  from: unknown;
  to: unknown;
}

export interface AuditLog {
  id: number;
  resource_code: string;
  action: string;
  actor_ip?: string;
  actor_id?: string;
  actor_email?: string;
  changes?: Record<string, AuditLogFieldChange>;
  created_at: string;
}

// ─── Firewall ─────────────────────────────────────────────────────────────────

export interface FirewallProtocolRule {
  protocol: string;
  ports?: string[];
}

export interface Firewall {
  name: string;
  network: string;
  direction: "INGRESS" | "EGRESS";
  priority: number;
  action: "ALLOW" | "DENY";
  source_ranges?: string[];
  destination_ranges?: string[];
  target_tags?: string[];
  source_tags?: string[];
  target_service_accounts?: string[];
  rules: FirewallProtocolRule[];
  disabled: boolean;
  description?: string;
  vpc_project?: string;
}

// ─── API envelope ────────────────────────────────────────────────────────────

export interface ApiEnvelope<T> {
  data: T;
  error?: string;
}

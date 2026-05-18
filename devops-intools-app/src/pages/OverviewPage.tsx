import { ServiceCard } from "../components/ServiceCard";
import type { PageId } from "../layout/Sidebar";

const SERVICES: { label: string; icon: string; page: PageId; description: string }[] = [
  { label: "GCE Instances",     icon: "server",   page: "gce",      description: "Compute Engine virtual machines" },
  { label: "GKE Clusters",      icon: "cluster",  page: "gke",      description: "Kubernetes Engine clusters" },
  { label: "Cloud SQL",         icon: "database", page: "cloudsql", description: "Managed Postgres / MySQL instances" },
  { label: "Cloud Storage",     icon: "bucket",   page: "gcs",      description: "GCS buckets" },
  { label: "Memorystore",       icon: "memory",   page: "redis",    description: "Redis instances" },
  { label: "Appref Dictionary",  icon: "book",     page: "appref",      description: "Application reference registry" },
  { label: "Project Reference", icon: "folder",   page: "projectref", description: "Project criticality and ownership registry" },
  { label: "Firewall Rules",    icon: "shield",   page: "firewall",   description: "VPC firewall rules" },
];

export function OverviewPage({ onNav }: { onNav: (id: PageId) => void }) {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Overview</h1>
          <p className="page-sub">Select a service to get started</p>
        </div>
      </div>
      <div className="resource-grid">
        {SERVICES.map((s) => (
          <ServiceCard key={s.page} {...s} onNav={onNav} />
        ))}
      </div>
    </div>
  );
}

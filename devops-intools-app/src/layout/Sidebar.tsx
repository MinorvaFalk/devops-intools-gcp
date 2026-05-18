import { Icon } from "../components/Icon";

type PageId = "overview" | "gce" | "gke" | "cloudsql" | "redis" | "gcs" | "appref" | "auditlog" | "firewall" | "projectref";

interface NavEntry {
  section?: string;
  id?: PageId;
  label?: string;
  icon?: string;
}

const NAV: NavEntry[] = [
  { id: "overview", label: "Overview", icon: "cluster" },
  { section: "Compute" },
  { id: "gce", label: "GCE Instances", icon: "server" },
  { id: "gke", label: "GKE Clusters", icon: "cluster" },
  { section: "Data" },
  { id: "cloudsql", label: "Cloud SQL", icon: "database" },
  { id: "redis", label: "Memorystore Redis", icon: "memory" },
  { id: "gcs", label: "Cloud Storage", icon: "bucket" },
  { section: "Reference" },
  { id: "projectref", label: "Project Reference", icon: "cluster" },
  { id: "appref", label: "Appref Dictionary", icon: "book" },
  { id: "auditlog", label: "Appref Audit Log", icon: "log" },
  { section: "Security" },
  { id: "firewall", label: "Firewall Rules", icon: "shield" },
];

interface SidebarProps {
  current: PageId;
  onNav: (id: PageId) => void;
  counts: Partial<Record<PageId, number>>;
}

export function Sidebar({ current, onNav, counts }: SidebarProps) {
  return (
    <aside className="sidebar">
      {NAV.map((n, i) =>
        n.section ? (
          <div key={`s${i}`} className="sidebar-section">{n.section}</div>
        ) : (
          <div
            key={n.id}
            className={`nav-item ${current === n.id ? "active" : ""}`}
            onClick={() => n.id && onNav(n.id)}
          >
            <span className="nav-icon"><Icon name={n.icon!} size={16} /></span>
            <span>{n.label}</span>
            {n.id != null && counts[n.id] != null && (
              <span className="nav-count">{counts[n.id]}</span>
            )}
          </div>
        )
      )}
      <div className="sidebar-foot">
        <div>Region: <span className="mono">asia-southeast2</span></div>
      </div>
    </aside>
  );
}

export type { PageId };

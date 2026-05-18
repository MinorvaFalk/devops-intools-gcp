import { useEffect, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import type { Project } from "../types/api";
import { ProjectPicker } from "./ProjectPicker";
import type { PageId } from "./Sidebar";

const PAGE_TITLES: Record<PageId, string> = {
  overview: "Overview",
  gce: "GCE Instances",
  gke: "GKE Clusters",
  cloudsql: "Cloud SQL",
  redis: "Memorystore Redis",
  gcs: "Cloud Storage",
  appref: "Appref Dictionary",
  auditlog: "Appref Audit Log",
  firewall: "Firewall Rules",
  projectref: "Project Reference",
};

export interface User {
  name: string;
  email: string;
  initials: string;
}

interface TopbarProps {
  current: PageId;
  user: User;
  onLogout: () => void;
  project: string;
  projects: Project[];
  onProjectChange: (id: string) => void;
  theme: "light" | "dark";
  onThemeChange: (t: "light" | "dark") => void;
}

export function Topbar({
  current, user, onLogout,
  project, projects, onProjectChange,
  theme, onThemeChange,
}: TopbarProps) {
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu]);

  return (
    <div className="topbar">
      {/* Brand panel — same width as sidebar so the border aligns with the sidebar divider */}
      <div className="topbar-brand">
        <div className="brand-mark">DI</div>
        <div>
          <div className="font-semibold text-[14px] tracking-tight leading-tight">DevOps Intools</div>
          <div className="brand-meta">Internal Platform</div>
        </div>
      </div>

      {/* Breadcrumb + main actions */}
      <div className="topbar-content">
        <div className="breadcrumb">
          <span className="crumb">DevOps</span>
          <span className="sep"><Icon name="chev" size={11} /></span>
          <span className="crumb current">{PAGE_TITLES[current]}</span>
        </div>
      </div>

      <div className="topbar-right">
        <ProjectPicker projects={projects} value={project} onChange={onProjectChange} />
        <div className="user-chip relative" ref={menuRef} onClick={() => setMenu((m) => !m)}>
          <div className="user-avatar">{user.initials}</div>
          <span className="text-[12.5px]">{user.name}</span>
          <Icon name="chevDown" size={12} />
          {menu && (
            <div className="user-menu-panel" onClick={(e) => e.stopPropagation()}>
              <div className="user-menu-info">
                <div className="text-[12.5px] font-semibold">{user.name}</div>
                <div className="text-[11.5px] text-fg-3">{user.email}</div>
              </div>
              <div className="menu-row">
                <span>Theme</span>
                <div className="theme-pill">
                  <button className={theme === "light" ? "active" : ""} onClick={() => onThemeChange("light")}>Light</button>
                  <button className={theme === "dark" ? "active" : ""} onClick={() => onThemeChange("dark")}>Dark</button>
                </div>
              </div>
              <button className="btn ghost w-full justify-start mt-1"
                onClick={() => { setMenu(false); onLogout(); }}>
                <Icon name="logout" size={13} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

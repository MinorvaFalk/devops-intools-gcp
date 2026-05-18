import { useEffect, useState } from "react";
import * as projectsApi from "./api/projects";
import { ToastProvider, useToast } from "./components/Toast";
import { Sidebar, type PageId } from "./layout/Sidebar";
import { Topbar, type User } from "./layout/Topbar";
import { LoginPage } from "./pages/LoginPage";
import { OverviewPage } from "./pages/OverviewPage";
import { GCEPage } from "./pages/GCEPage";
import { GKEPage } from "./pages/GKEPage";
import { CloudSQLPage } from "./pages/CloudSQLPage";
import { GCSPage } from "./pages/GCSPage";
import { RedisPage } from "./pages/RedisPage";
import { ApprefPage } from "./pages/ApprefPage";
import { AuditLogPage } from "./pages/AuditLogPage";
import { FirewallPage } from "./pages/FirewallPage";
import { ProjectRefPage } from "./pages/ProjectRefPage";
import type { Project } from "./types/api";

function AppInner() {
  const push = useToast();

  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem("intools_user") ?? "null") as User | null; }
    catch { return null; }
  });
  const [page, setPage] = useState<PageId>(() =>
    (localStorage.getItem("intools_page") as PageId | null) ?? "overview"
  );
  const [project, setProject] = useState<string>(() =>
    localStorage.getItem("intools_project") ?? ""
  );
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    (localStorage.getItem("intools_theme") as "light" | "dark" | null) ?? "light"
  );
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (user) localStorage.setItem("intools_user", JSON.stringify(user));
    else localStorage.removeItem("intools_user");
  }, [user]);

  useEffect(() => { localStorage.setItem("intools_page", page); }, [page]);
  useEffect(() => { localStorage.setItem("intools_project", project); }, [project]);

  useEffect(() => {
    localStorage.setItem("intools_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!user) return;
    projectsApi.listProjects()
      .then((list) => {
        const IGNORE_RE = /monitoring|billing|shared/i;
        const filtered = list.filter((p) => !IGNORE_RE.test(p.project_id));
        setProjects(filtered);
        if (!project && filtered.length > 0) {
          setProject(filtered[0].project_id);
        }
      })
      .catch((err: unknown) => push(String(err instanceof Error ? err.message : err), "err"));
  }, [user]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>(".search input");
        el?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!user) return <LoginPage onLogin={setUser} />;

  const handleProjectChange = (id: string) => {
    setProject(id);
    push(`Switched to ${id}`, "ok");
  };

  const counts: Partial<Record<PageId, number>> = {};

  const renderPage = () => {
    switch (page) {
      case "overview":  return <OverviewPage onNav={setPage} />;
      case "gce":       return <GCEPage project={project} />;
      case "gke":       return <GKEPage project={project} />;
      case "cloudsql":  return <CloudSQLPage project={project} />;
      case "gcs":       return <GCSPage project={project} />;
      case "redis":     return <RedisPage project={project} />;
      case "appref":    return <ApprefPage project={project} />;
      case "auditlog":  return <AuditLogPage project={project} />;
      case "firewall":    return <FirewallPage />;
      case "projectref":  return <ProjectRefPage />;
    }
  };

  return (
    <div className="app">
      <Topbar
        current={page}
        user={user}
        onLogout={() => setUser(null)}
        project={project}
        projects={projects}
        onProjectChange={handleProjectChange}
        theme={theme}
        onThemeChange={setTheme}
      />
      <Sidebar current={page} onNav={setPage} counts={counts} />
      <main className="main" key={page}>
        {renderPage()}
      </main>
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}

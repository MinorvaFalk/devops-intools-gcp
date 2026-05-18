import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../components/Icon";
import type { Project } from "../types/api";

interface ProjectPickerProps {
  projects: Project[];
  value: string;
  onChange: (id: string) => void;
}

export function ProjectPicker({ projects, value, onChange }: ProjectPickerProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [kbdIdx, setKbdIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 10);
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter(
      (p) =>
        p.project_id.toLowerCase().includes(term) ||
        p.name.toLowerCase().includes(term) ||
        p.number.includes(term)
    );
  }, [projects, q]);

  useEffect(() => { setKbdIdx(0); }, [q, open]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setKbdIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setKbdIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      const p = filtered[kbdIdx];
      if (p) { onChange(p.project_id); setOpen(false); setQ(""); }
    } else if (e.key === "Escape") { setOpen(false); }
  };

  // <lbu>-<nprd|prod>-<dev|uat|prd|sit>-<appref>-<random>
  const ENV_RE = /^[^-]+-(?:nprd|prod)-(dev|uat|prd|sit)-/i;
  const ENV_STYLE: Record<string, string> = { prd: "err", uat: "warn", sit: "warn", dev: "info" };

  const getEnv = (id: string): { label: string; cls: string } => {
    const m = id.match(ENV_RE);
    const env = m ? m[1].toLowerCase() : null;
    return env
      ? { label: env, cls: ENV_STYLE[env] ?? "info" }
      : { label: "unknown", cls: "info" };
  };

  return (
    <div className="combo-wrap" ref={wrapRef}>
      <button className="combo-btn" onClick={() => setOpen((o) => !o)} title={value}>
        <Icon name="cluster" size={13} className="ic" />
        <span className="lbl">{value || "Select project"}</span>
        <Icon name="chevDown" size={12} className="ic" />
      </button>
      {open && (
        <div className="combo-panel">
          <div className="combo-search">
            <Icon name="search" size={13} />
            <input
              ref={inputRef}
              placeholder="Search project ID, name, number…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKey}
            />
          </div>
          <div className="combo-list">
            {filtered.length === 0 ? (
              <div className="combo-empty">No projects match "<span className="mono">{q}</span>"</div>
            ) : (
              filtered.map((p, i) => (
                <div
                  key={p.project_id}
                  className={`combo-item ${p.project_id === value ? "selected" : ""} ${i === kbdIdx ? "kbd-active" : ""}`}
                  onMouseEnter={() => setKbdIdx(i)}
                  onClick={() => { onChange(p.project_id); setOpen(false); setQ(""); }}
                >
                  <span className="code" title={p.project_id}>{p.project_id}</span>
                  <span className="meta">
                    {(() => { const e = getEnv(p.project_id); return (
                      <span className={`status env ${e.cls}`}>
                        <span className="sdot" />
                        {e.label}
                      </span>
                    ); })()}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="combo-foot">
            <span>{filtered.length} of {projects.length}</span>
            <span>
              <span className="kbd">↑↓</span> navigate{" "}
              <span className="kbd">↵</span> select{" "}
              <span className="kbd">esc</span> close
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

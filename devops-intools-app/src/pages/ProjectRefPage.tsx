import { useMemo, useState } from "react";
import * as refApi from "../api/ref_projects";
import { DataTable } from "../components/DataTable";
import { Drawer } from "../components/Drawer";
import { Icon } from "../components/Icon";
import { StatCard } from "../components/StatCard";
import { useToast } from "../components/Toast";
import { useQuery } from "../hooks/useQuery";
import type { RefProject } from "../types/api";

const CRITICALITY_CLASS: Record<string, string> = {
  Critical: "err",
  High: "warn",
  Medium: "info",
  Low: "ok",
};

function CriticalityBadge({ value }: { value?: string }) {
  if (!value) return <span className="muted">—</span>;
  const cls = CRITICALITY_CLASS[value] ?? "terminated";
  return (
    <span className={`status ${cls}`}>
      <span className="sdot" />
      {value}
    </span>
  );
}

function useFilter(list: RefProject[], query: string): RefProject[] {
  return useMemo(() => {
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.business_function ?? "").toLowerCase().includes(q) ||
        (p.owner ?? "").toLowerCase().includes(q),
    );
  }, [list, query]);
}

export function ProjectRefPage() {
  const push = useToast();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<RefProject | null>(null);

  const {
    data: fetched = [],
    loading,
    error,
    refetch,
  } = useQuery(refApi.listRefProjects, []);

  const list = fetched;

  const filtered = useFilter(list, q);

  if (error)
    return (
      <div className="page">
        <div className="notice err">
          <Icon name="warn" size={14} className="ic" />
          <div>{error}</div>
        </div>
      </div>
    );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Project Reference</h1>
          <p className="page-sub">Project registry · {list.length} projects</p>
        </div>
        <button
          className="btn"
          onClick={() => {
            push("Refreshing…");
            refApi.bustRefProjects();
            refetch();
          }}
        >
          <Icon name="refresh" size={13} /> Refresh
        </button>
      </div>

      <div className="stat-row">
        <StatCard label="Total" value={list.length} />
        <StatCard
          label="High"
          value={list.filter((p) => p.criticality === "high").length}
          tone="warn"
        />
        <StatCard
          label="Medium"
          value={list.filter((p) => p.criticality === "medium").length}
          tone="info"
        />
        <StatCard
          label="Low"
          value={list.filter((p) => p.criticality === "low").length}
          tone="ok"
        />
      </div>

      {!loading && list.length === 0 && (
        <div className="notice warn">
          <Icon name="warn" size={14} className="ic" />
          <div>
            No projects returned. The external project registry may be
            unreachable
          </div>
        </div>
      )}

      <div className="filterbar">
        <div className="search">
          <Icon name="search" size={13} />
          <input
            placeholder="Search by code, name, function, owner…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <DataTable
        columns={[
          "Code",
          "Name",
          "Business Function",
          "Criticality",
          "Hosting",
          "Owner",
        ]}
        loading={loading}
        isEmpty={filtered.length === 0}
        empty="No projects match."
      >
        {filtered.map((row) => (
          <tr
            key={row.code}
            className={selected?.code === row.code ? "selected" : ""}
            onClick={() => setSelected(row)}
          >
            <td>
              <span className="tag mono accent">{row.code}</span>
            </td>
            <td>{row.name}</td>
            <td className="text-fg-2">{row.business_function ?? "—"}</td>
            <td>
              <CriticalityBadge value={row.criticality} />
            </td>
            <td className="mono">{row.hosting ?? "—"}</td>
            <td className="text-fg-2">{row.owner ?? "—"}</td>
          </tr>
        ))}
      </DataTable>

      <Drawer open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <div className="drawer-head">
              <h2 className="font-sans text-[18px]">{selected.name}</h2>
              <div className="drawer-head-actions">
                <button className="btn ghost" onClick={() => setSelected(null)}>
                  <Icon name="close" size={14} />
                </button>
              </div>
              <div className="sub">
                <span className="tag mono accent">{selected.code}</span>
                {selected.criticality && (
                  <>
                    <span className="muted">·</span>
                    <CriticalityBadge value={selected.criticality} />
                  </>
                )}
                {selected.business_function && (
                  <>
                    <span className="muted">·</span>
                    <span className="mono text-fg-2">
                      {selected.business_function}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="drawer-body">
              <div className="mt-3 mb-4">
                <div className="text-[10px] font-semibold tracking-wider text-fg-3 uppercase mb-2">
                  Description
                </div>
                <div className="card text-[13px] text-fg-2 leading-relaxed">
                  {selected.description || (
                    <span className="muted">No description provided.</span>
                  )}
                </div>
              </div>
              <dl className="kv">
                <dt>Code</dt>
                <dd>
                  <span className="tag mono accent">{selected.code}</span>
                </dd>
                <dt>Name</dt>
                <dd>{selected.name}</dd>
                {selected.business_function && (
                  <>
                    <dt>Business Function</dt>
                    <dd>{selected.business_function}</dd>
                  </>
                )}
                {selected.criticality && (
                  <>
                    <dt>Criticality</dt>
                    <dd>
                      <CriticalityBadge value={selected.criticality} />
                    </dd>
                  </>
                )}
                {selected.hosting && (
                  <>
                    <dt>Hosting</dt>
                    <dd className="mono">{selected.hosting}</dd>
                  </>
                )}
                {selected.owner && (
                  <>
                    <dt>Owner</dt>
                    <dd>{selected.owner}</dd>
                  </>
                )}
                {selected.managers_group && (
                  <>
                    <dt>Managers Group</dt>
                    <dd className="mono">{selected.managers_group}</dd>
                  </>
                )}
                {selected.contributors_group && (
                  <>
                    <dt>Contributors Group</dt>
                    <dd className="mono">{selected.contributors_group}</dd>
                  </>
                )}
                {selected.viewers_group && (
                  <>
                    <dt>Viewers Group</dt>
                    <dd className="mono">{selected.viewers_group}</dd>
                  </>
                )}
              </dl>
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}

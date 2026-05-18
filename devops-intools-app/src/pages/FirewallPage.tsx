import { Fragment, useMemo, useState } from "react";
import * as firewallApi from "../api/firewall";
import { DataTable } from "../components/DataTable";
import { Drawer } from "../components/Drawer";
import { Icon } from "../components/Icon";
import { StatCard } from "../components/StatCard";
import { useToast } from "../components/Toast";
import { useQuery } from "../hooks/useQuery";
import type { Firewall } from "../types/api";

function parseFirewallProjects(): { id: string; label: string }[] {
  const raw = import.meta.env.VITE_FIREWALL_PROJECTS as string | undefined;
  if (!raw?.trim()) return [];
  return raw.split(",").flatMap((entry) => {
    const trimmed = entry.trim();
    if (!trimmed) return [];
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx > 0) {
      return [{ label: trimmed.slice(0, colonIdx), id: trimmed.slice(colonIdx + 1) }];
    }
    return [{ label: trimmed, id: trimmed }];
  });
}

const FIREWALL_PROJECTS = parseFirewallProjects();

function useFilter<T>(list: T[], query: string, keys: (keyof T)[]): T[] {
  return useMemo(() => {
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter((item) =>
      keys.some((k) =>
        String(item[k] ?? "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [list, query, keys]);
}

function ActionBadge({ action }: { action: string }) {
  const cls = action === "ALLOW" ? "ok" : "err";
  return (
    <span
      className={`status ${cls}`}
      style={{ padding: "1px 7px", fontSize: 10.5 }}
    >
      <span className="sdot" />
      {action}
    </span>
  );
}

function DirectionBadge({ direction }: { direction: string }) {
  const cls = direction === "INGRESS" ? "info" : "warn";
  return (
    <span className={`status ${cls} !px-[7px] !text-[10.5px]`}>
      <span className="sdot" />
      {direction}
    </span>
  );
}

function TagList({ items }: { items?: string[] }) {
  if (!items?.length) return <span className="text-fg-3">—</span>;
  return (
    <div className="flex flex-wrap gap-1 items-center">
      {items.map((t) => (
        <span key={t} className="tag mono text-[10.5px]">{t}</span>
      ))}
    </div>
  );
}

function PortList({
  rules,
}: {
  rules: { protocol: string; ports?: string[] }[];
}) {
  const tags = rules.flatMap((r) =>
    r.ports?.length ? r.ports.map((p) => `${r.protocol}:${p}`) : [r.protocol],
  );
  if (!tags.length) return <span className="text-fg-3">—</span>;
  return (
    <div className="flex flex-wrap gap-1 items-center">
      {tags.map((t, i) => (
        <span key={i} className="tag mono text-[10.5px]">{t}</span>
      ))}
    </div>
  );
}

function useProjectQuery(projectId: string) {
  return useQuery(
    projectId
      ? () => firewallApi.listFirewalls(projectId).then((r) => r.map((fw) => ({ ...fw, vpc_project: projectId })))
      : null,
    [projectId],
  );
}

export function FirewallPage() {
  const push = useToast();
  const [activeTab, setActiveTab] = useState<string>(FIREWALL_PROJECTS[0]?.id ?? "all");
  const [q, setQ] = useState("");
  const [dirF, setDirF] = useState("all");
  const [actionF, setActionF] = useState("all");
  const [selected, setSelected] = useState<Firewall | null>(null);

  const q0 = useProjectQuery(FIREWALL_PROJECTS[0]?.id ?? "");
  const q1 = useProjectQuery(FIREWALL_PROJECTS[1]?.id ?? "");

  const results = [q0, q1].slice(0, FIREWALL_PROJECTS.length);
  const loading = results.some((r) => r.loading);
  const error = results.find((r) => r.error)?.error ?? null;

  const all = useMemo(
    () => results.flatMap((r) => r.data ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q0.data, q1.data],
  );

  const byTab = useMemo(() => {
    if (activeTab === "all" || FIREWALL_PROJECTS.length <= 1) return all;
    const idx = FIREWALL_PROJECTS.findIndex((p) => p.id === activeTab);
    const data = [q0.data, q1.data][idx];
    return (data ?? []) as typeof all;
  }, [activeTab, all, q0.data, q1.data]);

  const filtered = useFilter(byTab, q, ["name", "network"])
    .filter((f) => dirF === "all" || f.direction === dirF)
    .filter((f) => actionF === "all" || f.action === actionF);

  const noProjectsConfigured = FIREWALL_PROJECTS.length === 0;

  if (noProjectsConfigured)
    return (
      <div className="page">
        <div className="notice err">
          <Icon name="warn" size={14} className="ic" />
          <div>
            No firewall projects configured.{" "}
            Set <span className="mono">VITE_FIREWALL_PROJECTS</span> in your environment.
          </div>
        </div>
      </div>
    );

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
          <h1 className="page-title">Firewall Rules</h1>
          <p className="page-sub">VPC firewall rules · {all.length} total</p>
        </div>
        <div className="row">
          <button
            className="btn"
            onClick={() => {
              push("Refreshing…");
              FIREWALL_PROJECTS.forEach((p) => firewallApi.bustFirewalls(p.id));
              results.forEach((r) => r.refetch());
            }}
          >
            <Icon name="refresh" size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="stat-row">
        <StatCard label="Total rules" value={all.length} />
        <StatCard
          label="Allow"
          value={all.filter((f) => f.action === "ALLOW").length}
          tone="ok"
        />
        <StatCard
          label="Deny"
          value={all.filter((f) => f.action === "DENY").length}
          tone="err"
        />
        <StatCard
          label="Disabled"
          value={all.filter((f) => f.disabled).length}
          tone="muted"
        />
      </div>

      <div className="filterbar">
        {FIREWALL_PROJECTS.length > 1 && (
          <div className="tab-group">
            {FIREWALL_PROJECTS.map((p) => (
              <button
                key={p.id}
                className={`tab-btn ${activeTab === p.id ? "active" : ""}`}
                onClick={() => setActiveTab(p.id)}
              >
                {p.label}
              </button>
            ))}
            <button
              className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All
            </button>
          </div>
        )}
        <div className="search">
          <Icon name="search" size={13} />
          <input
            placeholder="Search name, network…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="select"
          value={dirF}
          onChange={(e) => setDirF(e.target.value)}
        >
          <option value="all">All directions</option>
          <option value="INGRESS">INGRESS</option>
          <option value="EGRESS">EGRESS</option>
        </select>
        <select
          className="select"
          value={actionF}
          onChange={(e) => setActionF(e.target.value)}
        >
          <option value="all">All actions</option>
          <option value="ALLOW">ALLOW</option>
          <option value="DENY">DENY</option>
        </select>
      </div>

      <DataTable
        columns={[
          "Name",
          "Network",
          "Direction",
          "Action",
          "Priority",
          "Protocols / Ports",
          "Target tags",
          "Disabled",
        ]}
        loading={loading}
        isEmpty={filtered.length === 0}
        empty="No firewall rules match."
      >
        {filtered.map((fw) => (
          <tr
            key={`${fw.vpc_project}-${fw.name}`}
            className={
              selected?.name === fw.name &&
              selected?.vpc_project === fw.vpc_project
                ? "selected"
                : ""
            }
            onClick={() => setSelected(fw)}
          >
            <td className="cell-name mono">{fw.name}</td>
            <td className="mono">{fw.network}</td>
            <td>
              <DirectionBadge direction={fw.direction} />
            </td>
            <td>
              <ActionBadge action={fw.action} />
            </td>
            <td className="mono">{fw.priority}</td>
            <td>
              <PortList rules={fw.rules} />
            </td>
            <td>
              <TagList items={fw.target_tags} />
            </td>
            <td>
              {fw.disabled ? (
                <span
                  className="status terminated"
                  style={{ padding: "1px 7px", fontSize: 10.5 }}
                >
                  <span className="sdot" />
                  disabled
                </span>
              ) : (
                <span
                  className="status ok"
                  style={{ padding: "1px 7px", fontSize: 10.5 }}
                >
                  <span className="sdot" />
                  enabled
                </span>
              )}
            </td>
          </tr>
        ))}
      </DataTable>

      <Drawer open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <>
            <div className="drawer-head">
              <h2 style={{ fontSize: 14, wordBreak: "break-all" }}>{selected.name}</h2>
              <div className="drawer-head-actions">
                <button className="btn ghost" onClick={() => setSelected(null)}><Icon name="close" size={14} /></button>
              </div>
              <div className="sub">
                {selected.description && <span className="text-fg-2">{selected.description}</span>}
                <ActionBadge action={selected.action} />
                <span className="muted">·</span>
                <DirectionBadge direction={selected.direction} />
                <span className="muted">·</span>
                <span className="mono">{selected.network}</span>
              </div>
            </div>
            <div className="drawer-body">
              <dl className="kv">
                <dt>Name</dt>
                <dd className="mono">{selected.name}</dd>
                <dt>Description</dt>
                <dd className="text-fg-2">
                  {selected.description?.trim() || "—"}
                </dd>
                <dt>Network</dt>
                <dd className="mono">{selected.network}</dd>
                <dt>VPC project</dt>
                <dd className="mono">{selected.vpc_project ?? "—"}</dd>
                <dt>Direction</dt>
                <dd>
                  <DirectionBadge direction={selected.direction} />
                </dd>
                <dt>Action</dt>
                <dd>
                  <ActionBadge action={selected.action} />
                </dd>
                <dt>Priority</dt>
                <dd className="mono">{selected.priority}</dd>
                <dt>Status</dt>
                <dd>
                  {selected.disabled ? (
                    <span
                      className="status terminated"
                      style={{ padding: "1px 7px", fontSize: 10.5 }}
                    >
                      <span className="sdot" />
                      disabled
                    </span>
                  ) : (
                    <span
                      className="status ok"
                      style={{ padding: "1px 7px", fontSize: 10.5 }}
                    >
                      <span className="sdot" />
                      enabled
                    </span>
                  )}
                </dd>
              </dl>

              {selected.rules.length > 0 && (
                <>
                  <div className="section-title" style={{ marginTop: 18 }}>
                    Protocols &amp; Ports
                  </div>
                  <dl className="kv">
                    {selected.rules.map((r, i) => (
                      <Fragment key={i}>
                        <dt className="mono">{r.protocol}</dt>
                        <dd className="mono">{r.ports?.join(", ") || "all"}</dd>
                      </Fragment>
                    ))}
                  </dl>
                </>
              )}

              {(selected.source_ranges?.length ?? 0) > 0 && (
                <>
                  <div className="section-title" style={{ marginTop: 18 }}>
                    Source Ranges
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {selected.source_ranges!.map((r) => (
                      <span key={r} className="tag mono" style={{ fontSize: 11 }}>
                        {r}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {(selected.destination_ranges?.length ?? 0) > 0 && (
                <>
                  <div className="section-title" style={{ marginTop: 18 }}>
                    Destination Ranges
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {selected.destination_ranges!.map((r) => (
                      <span key={r} className="tag mono" style={{ fontSize: 11 }}>
                        {r}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {(selected.target_tags?.length ?? 0) > 0 && (
                <>
                  <div className="section-title" style={{ marginTop: 18 }}>
                    Target Tags
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {selected.target_tags!.map((t) => (
                      <span key={t} className="tag mono" style={{ fontSize: 11 }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import * as gkeApi from "../api/gke";
import { Copyable } from "../components/Copyable";
import { DataTable } from "../components/DataTable";
import { Drawer } from "../components/Drawer";
import { Icon } from "../components/Icon";
import { LabelTags } from "../components/LabelTags";
import { SAFileInput, type SAKey } from "../components/SAFileInput";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useToast } from "../components/Toast";
import { useQuery } from "../hooks/useQuery";
import type { GKEClusterSummary, GKENodePool } from "../types/api";

function useFilter<T>(list: T[], query: string, keys: (keyof T)[]): T[] {
  return useMemo(() => {
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter((item) => keys.some((k) => String(item[k] ?? "").toLowerCase().includes(q)));
  }, [list, query, keys]);
}

function ScaleModal({ open, np, clusterName, onClose }: { open: boolean; np: GKENodePool | null; clusterName: string; onClose: () => void }) {
  const [autoscaling, setAutoscaling] = useState(true);
  const [minNodes, setMinNodes] = useState(1);
  const [maxNodes, setMaxNodes] = useState(6);
  const [nodeCount, setNodeCount] = useState(1);
  const [opsSa, setOpsSa] = useState<SAKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const push = useToast();

  useEffect(() => {
    if (open && np) {
      setAutoscaling(np.autoscaling?.enabled ?? true);
      setMinNodes(np.autoscaling?.min_node_count ?? 1);
      setMaxNodes(np.autoscaling?.max_node_count ?? 6);
      setNodeCount(np.initial_node_count);
      setOpsSa(null);
      setSubmitting(false);
    }
  }, [open, np?.name]);

  if (!open || !np) return null;

  const autoscaleValid = minNodes >= 0 && maxNodes > minNodes;
  const canConfirm = !!opsSa && !submitting && (autoscaling ? autoscaleValid : nodeCount >= 0);

  const submit = () => {
    setSubmitting(true);
    setTimeout(() => {
      push(`Node pool ${np.name} scaling applied`, "ok");
      setSubmitting(false);
      onClose();
    }, 950);
  };

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 540 }}>
        <div className="modal-head">
          <h3>Scale node pool</h3>
          <p>Adjust scaling for <span className="mono">{np.name}</span></p>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Node pool</label>
            <input className="input" value={`${clusterName} / ${np.name}`} readOnly />
          </div>
          <div className="field">
            <label>Autoscaling</label>
            <label className="toggle-wrap">
              <input type="checkbox" checked={autoscaling} onChange={(e) => setAutoscaling(e.target.checked)} />
              <span className="toggle-track"><span className="toggle-thumb" /></span>
              <span className="toggle-label">{autoscaling ? "Enabled" : "Disabled — fixed count"}</span>
            </label>
          </div>
          {autoscaling ? (
            <div className="row" style={{ gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
              <div className="field" style={{ flex: 1, margin: 0 }}>
                <label>Min nodes</label>
                <input className="input" type="number" min={0} value={minNodes} onChange={(e) => setMinNodes(+e.target.value)} />
              </div>
              <div className="field" style={{ flex: 1, margin: 0 }}>
                <label>Max nodes</label>
                <input className="input" type="number" min={minNodes + 1} value={maxNodes} onChange={(e) => setMaxNodes(+e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="field">
              <label>Fixed node count</label>
              <input className="input" type="number" min={0} value={nodeCount} onChange={(e) => setNodeCount(+e.target.value)} />
            </div>
          )}
          <div className="field">
            <label>Ops Service Account key <span className="text-err">*</span></label>
            <SAFileInput value={opsSa} onChange={setOpsSa} />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn primary" disabled={!canConfirm} onClick={submit}>
            {submitting ? <><span className="spinner" /> Applying…</> : "Apply scaling"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function GKEPage({ project }: { project: string }) {
  const push = useToast();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<GKEClusterSummary | null>(null);
  const [tab, setTab] = useState("overview");
  const [scaleTarget, setScaleTarget] = useState<{ np: GKENodePool; clusterName: string } | null>(null);

  const { data: list = [], loading, error, refetch } = useQuery(
    () => gkeApi.listClusters(project), [project]
  );
  const { data: detail, loading: detailLoading } = useQuery(
    selected ? () => gkeApi.getCluster(project, selected.location, selected.name) : null,
    [selected?.name, project]
  );
  const { data: pools = [] } = useQuery(
    selected ? () => gkeApi.listNodePools(project, selected.location, selected.name) : null,
    [selected?.name, project]
  );

  const filtered = useFilter(list, q, ["name", "endpoint", "version", "location"]);

  if (error) return (
    <div className="page"><div className="notice err"><Icon name="warn" size={14} className="ic" /><div>{error}</div></div></div>
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">GKE Clusters</h1>
          <p className="page-sub">Google Kubernetes Engine · {list.length} clusters</p>
        </div>
        <button className="btn" onClick={() => { push("Refreshing…"); gkeApi.bustClusters(project); refetch(); }}>
          <Icon name="refresh" size={13} /> Refresh
        </button>
      </div>

      <div className="stat-row">
        <StatCard label="Clusters" value={list.length} />
        <StatCard label="Multi-zone" value={list.filter((x) => (x.node_zones?.length ?? 0) > 1).length} />
        <StatCard label="Single-zone" value={list.filter((x) => (x.node_zones?.length ?? 1) === 1).length} />
        <StatCard label="Versions" value={new Set(list.map((x) => x.version.split("-")[0])).size} />
      </div>

      <div className="filterbar">
        <div className="search">
          <Icon name="search" size={13} />
          <input placeholder="Search clusters…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <DataTable
        columns={["Name", "Location", "Version", "Endpoint", "Zones"]}
        loading={loading}
        isEmpty={filtered.length === 0}
        empty="No clusters found."
      >
        {filtered.map((row) => (
          <tr key={row.name} className={selected?.name === row.name ? "selected" : ""}
            onClick={() => { setSelected(row); setTab("overview"); }}>
            <td className="cell-name mono">{row.name}</td>
            <td className="mono">{row.location}</td>
            <td className="mono">{row.version}</td>
            <td className="mono">{row.endpoint}</td>
            <td><div className="tag-list">{(row.node_zones ?? []).map((z) => <span key={z} className="tag">{z}</span>)}</div></td>
          </tr>
        ))}
      </DataTable>

      <Drawer open={!!selected} onClose={() => setSelected(null)}>
        {detailLoading && <div className="p-10 text-center text-fg-3"><span className="spinner" /> Loading…</div>}
        {detail && (
          <>
            <div className="drawer-head">
              <h2>{detail.name}</h2>
              <div className="drawer-head-actions">
                <button className="btn ghost" onClick={() => setSelected(null)}><Icon name="close" size={14} /></button>
              </div>
              <div className="sub">
                <span><StatusBadge status={detail.status} /></span>
                <span className="mono">{detail.mode}</span>
                <span className="mono">{detail.version}</span>
                <span className="mono">{detail.location}</span>
              </div>
            </div>
            <div className="drawer-tabs">
              {["overview", "nodepools", "labels", "raw"].map((t) => (
                <button key={t} className={`drawer-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
                  {t === "raw" ? "Raw JSON" : t === "nodepools" ? `Node pools (${pools.length})` : t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <div className="drawer-body">
              {tab === "overview" && (
                <dl className="kv">
                  <dt>Name</dt><dd className="mono">{detail.name}</dd>
                  <dt>Mode</dt><dd>{detail.mode}</dd>
                  <dt>Version</dt><dd className="mono">{detail.version}</dd>
                  <dt>Location</dt><dd className="mono">{detail.location}</dd>
                  <dt>Status</dt><dd><StatusBadge status={detail.status} /></dd>
                  {detail.endpoint && <><dt>Endpoint</dt><dd><Copyable value={detail.endpoint}>{detail.endpoint}</Copyable></dd></>}
                  <dt>Total nodes</dt><dd className="mono">{detail.node_count}</dd>
                  {detail.max_pods_per_node != null && <><dt>Max pods / node</dt><dd className="mono">{detail.max_pods_per_node}</dd></>}
                  <dt>Node zones</dt><dd><div className="tag-list">{(detail.node_zones ?? []).map((z) => <span key={z} className="tag">{z}</span>)}</div></dd>
                  <dt>Created</dt><dd className="mono">{detail.created_at}</dd>
                </dl>
              )}
              {tab === "nodepools" && (
                <>
                  <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>{pools.length} node pool{pools.length === 1 ? "" : "s"}</div>
                  {pools.map((np) => (
                    <div key={np.name} className="np-card">
                      <div className="np-card-head">
                        <div className="row-tight">
                          <span className="name">{np.name}</span>
                          {np.status && <StatusBadge status={np.status} />}
                          <span className="tag">{np.autoscaling?.enabled ? "autoscale" : "fixed"}</span>
                        </div>
                        <button className="btn sm primary" onClick={() => setScaleTarget({ np, clusterName: detail.name })}>
                          <Icon name="scaleUp" size={11} /> Scale
                        </button>
                      </div>
                      <div className="np-meta">
                        {np.machine_type && <div><div className="k">Machine</div><div className="v">{np.machine_type}</div></div>}
                        {np.disk_size_gb != null && <div><div className="k">Disk</div><div className="v">{np.disk_size_gb} GB · {np.disk_type}</div></div>}
                        {np.image_type && <div><div className="k">Image</div><div className="v">{np.image_type}</div></div>}
                        {np.version && <div><div className="k">Version</div><div className="v">{np.version}</div></div>}
                        {np.autoscaling && (
                          <div>
                            <div className="k">Autoscaling</div>
                            <div className="v">
                              {np.autoscaling.enabled
                                ? <span>{np.autoscaling.min_node_count} – {np.autoscaling.max_node_count}</span>
                                : <span>fixed {np.initial_node_count}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
              {tab === "labels" && <LabelTags labels={detail.labels} />}
              {tab === "raw" && <pre className="card" style={{ overflow: "auto", margin: 0, fontSize: 11.5 }}>{JSON.stringify({ cluster: detail, node_pools: pools }, null, 2)}</pre>}
            </div>
          </>
        )}
      </Drawer>

      <ScaleModal open={!!scaleTarget} np={scaleTarget?.np ?? null} clusterName={scaleTarget?.clusterName ?? ""} onClose={() => setScaleTarget(null)} />
    </div>
  );
}

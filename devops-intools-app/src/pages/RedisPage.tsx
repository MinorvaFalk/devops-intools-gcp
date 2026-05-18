import { useEffect, useMemo, useState } from "react";
import * as redisApi from "../api/redis";
import { Copyable } from "../components/Copyable";
import { DataTable } from "../components/DataTable";
import { Drawer } from "../components/Drawer";
import { Icon } from "../components/Icon";
import { LabelTags } from "../components/LabelTags";
import { SAFileInput, type SAKey } from "../components/SAFileInput";
import { SecretReveal } from "../components/SecretReveal";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useToast } from "../components/Toast";
import { useQuery } from "../hooks/useQuery";
import type { RedisInstanceSummary } from "../types/api";

function useFilter<T>(list: T[], query: string, keys: (keyof T)[]): T[] {
  return useMemo(() => {
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter((item) => keys.some((k) => String(item[k] ?? "").toLowerCase().includes(q)));
  }, [list, query, keys]);
}

export function RedisPage({ project }: { project: string }) {
  const push = useToast();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<RedisInstanceSummary | null>(null);
  const [tab, setTab] = useState("overview");
  const [authVisible, setAuthVisible] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [opsSa, setOpsSa] = useState<SAKey | null>(null);
  const [authString, setAuthString] = useState("");

  const { data: list = [], loading, error, refetch } = useQuery(
    () => redisApi.listInstances(project), [project]
  );

  const { data: detail, loading: detailLoading } = useQuery(
    selected ? () => redisApi.getInstance(project, selected.region, selected.name) : null,
    [selected?.name, project]
  );

  useEffect(() => { setAuthVisible(false); setAuthString(""); setOpsSa(null); }, [selected?.name]);

  const filtered = useFilter(list, q, ["name", "host", "version", "region", "tier"]);

  const requestAuth = () => {
    if (!opsSa) { push("Upload an ops service account key first", "err"); return; }
    setAuthLoading(true);
    setTimeout(() => {
      // simulate retrieved auth — in production this would call a real endpoint
      setAuthString("mock-auth-" + Math.random().toString(36).slice(2, 18));
      setAuthVisible(true);
      setAuthLoading(false);
      push("Auth string retrieved", "ok");
    }, 900);
  };

  if (error) return (
    <div className="page"><div className="notice err"><Icon name="warn" size={14} className="ic" /><div>{error}</div></div></div>
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Memorystore Redis</h1>
          <p className="page-sub">Managed Redis instances · {list.length} instances</p>
        </div>
        <button className="btn" onClick={() => { push("Refreshing…"); redisApi.bustInstances(project); refetch(); }}>
          <Icon name="refresh" size={13} /> Refresh
        </button>
      </div>

      <div className="stat-row">
        <StatCard label="Instances" value={list.length} />
        <StatCard label="HA tier" value={list.filter((x) => x.tier === "STANDARD_HA").length} />
        <StatCard label="Basic tier" value={list.filter((x) => x.tier === "BASIC").length} />
        <StatCard label="Versions" value={new Set(list.map((x) => x.version)).size} />
      </div>

      <div className="filterbar">
        <div className="search">
          <Icon name="search" size={13} />
          <input placeholder="Search Redis instances…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <DataTable
        columns={["Name", "Region", "Tier", "Version", "Host"]}
        loading={loading}
        isEmpty={filtered.length === 0}
        empty="No instances found."
      >
        {filtered.map((r) => (
          <tr key={r.name} className={selected?.name === r.name ? "selected" : ""}
            onClick={() => { setSelected(r); setTab("overview"); }}>
            <td className="cell-name mono">{r.name}</td>
            <td className="mono">{r.region}</td>
            <td><span className="tag">{r.tier}</span></td>
            <td className="mono">{r.version}</td>
            <td className="mono">{r.host}</td>
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
                <span className="muted">·</span>
                <span className="mono">{detail.region}</span>
                <span className="muted">·</span>
                <span className="mono">{detail.redis_version}</span>
                <span className="muted">·</span>
                <span className="tag">{detail.tier}</span>
              </div>
            </div>
            <div className="drawer-tabs">
              {["overview", "auth", "labels", "raw"].map((t) => (
                <button key={t} className={`drawer-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
                  {t === "raw" ? "Raw JSON" : t === "auth" ? "Auth string" : t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <div className="drawer-body">
              {tab === "overview" && (
                <dl className="kv">
                  <dt>Name</dt><dd className="mono">{detail.name}</dd>
                  <dt>Region</dt><dd className="mono">{detail.region}</dd>
                  <dt>Tier</dt><dd>{detail.tier}</dd>
                  <dt>Memory</dt><dd className="mono">{detail.memory_size_gb} GB</dd>
                  <dt>Replicas</dt><dd className="mono">{detail.replica_count}</dd>
                  <dt>Version</dt><dd className="mono">{detail.redis_version}</dd>
                  <dt>Status</dt><dd><StatusBadge status={detail.status} /></dd>
                  <dt>Host</dt><dd><Copyable value={detail.host}>{detail.host}</Copyable></dd>
                  <dt>Port</dt><dd className="mono">{detail.port}</dd>
                  <dt>Created</dt><dd className="mono">{detail.created_at}</dd>
                </dl>
              )}
              {tab === "auth" && (
                <>
                  <div className="notice">
                    <Icon name="warn" size={14} className="ic" />
                    <div>Revealing the AUTH string is a privileged action and is logged.</div>
                  </div>
                  <div className="card" style={{ marginTop: 14 }}>
                    <div className="section-title mt-0 mb-2">Request auth string</div>
                    <div className="field">
                      <label>Ops Service Account key <span className="text-err">*</span></label>
                      <SAFileInput value={opsSa} onChange={setOpsSa} />
                    </div>
                    <button className="btn primary" disabled={authLoading || !opsSa} onClick={requestAuth}>
                      {authLoading ? <><span className="spinner" /> Fetching…</> : <><Icon name="key" size={13} /> Reveal auth string</>}
                    </button>
                    {authVisible && (
                      <div style={{ marginTop: 14 }}>
                        <div className="section-title" style={{ margin: "0 0 6px" }}>Auth string</div>
                        <SecretReveal value={authString} />
                      </div>
                    )}
                  </div>
                </>
              )}
              {tab === "labels" && <LabelTags labels={detail.labels} />}
              {tab === "raw" && <pre className="card" style={{ overflow: "auto", margin: 0, fontSize: 11.5 }}>{JSON.stringify(detail, null, 2)}</pre>}
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}

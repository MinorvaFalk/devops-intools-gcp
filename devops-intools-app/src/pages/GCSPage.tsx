import { useEffect, useMemo, useState } from "react";
import * as gcsApi from "../api/gcs";
import { Copyable } from "../components/Copyable";
import { DataTable } from "../components/DataTable";
import { Drawer } from "../components/Drawer";
import { Icon } from "../components/Icon";
import { LabelTags } from "../components/LabelTags";
import { StatCard } from "../components/StatCard";
import { useToast } from "../components/Toast";
import { useQuery } from "../hooks/useQuery";
import type { BucketMetrics, GCSBucket, GCSBucketSummary } from "../types/api";

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

function fmtBytes(b: number | null | undefined): string {
  if (b == null) return "—";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let i = 0,
    v = b;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${i > 0 && v < 10 ? v.toFixed(2) : i > 0 && v < 100 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

export function GCSPage({ project }: { project: string }) {
  const push = useToast();
  const [q, setQ] = useState("");
  const [classF, setClassF] = useState("all");
  const [selected, setSelected] = useState<GCSBucketSummary | null>(null);
  const [tab, setTab] = useState("overview");
  const [detail, setDetail] = useState<GCSBucket | null>(null);
  const [usage, setUsage] = useState<BucketMetrics | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);

  const {
    data: list = [],
    loading,
    error,
    refetch,
  } = useQuery(() => gcsApi.listBuckets(project), [project]);

  const filtered = useFilter(list, q, ["name", "location", "storage_class"])
    .filter((b) => classF === "all" || b.storage_class === classF);

  const classes = useMemo(
    () => ["all", ...Array.from(new Set(list.map((x) => x.storage_class)))],
    [list],
  );

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      setUsage(null);
      return;
    }
    setDetail(null);
    setUsage(null);
    setUsageLoading(true);

    Promise.all([
      gcsApi.getBucket(selected.name),
      gcsApi.getBucketMetrics(project, selected.name),
    ])
      .then(([d, u]) => {
        setDetail(d);
        setUsage(u);
        setUsageLoading(false);
      })
      .catch(() => setUsageLoading(false));
  }, [selected?.name, project]);

  const refreshUsage = () => {
    if (!selected) return;
    setUsageLoading(true);
    gcsApi
      .getBucketMetrics(project, selected.name)
      .then((u) => {
        setUsage(u);
        setUsageLoading(false);
      })
      .catch(() => setUsageLoading(false));
  };

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
          <h1 className="page-title">Cloud Storage</h1>
          <p className="page-sub">GCS buckets · {list.length} buckets</p>
        </div>
        <button
          className="btn"
          onClick={() => {
            push("Refreshing…");
            gcsApi.bustBuckets(project);
            refetch();
          }}
        >
          <Icon name="refresh" size={13} /> Refresh
        </button>
      </div>

      <div className="stat-row">
        <StatCard label="Buckets" value={list.length} />
        <StatCard
          label="Standard"
          value={list.filter((x) => x.storage_class === "STANDARD").length}
        />
        <StatCard
          label="Nearline / Coldline"
          value={list.filter((x) => x.storage_class !== "STANDARD").length}
        />
      </div>

      <div className="filterbar">
        <div className="search">
          <Icon name="search" size={13} />
          <input
            placeholder="Search buckets…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="select"
          value={classF}
          onChange={(e) => setClassF(e.target.value)}
        >
          {classes.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All classes" : c}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={[{ label: "Name", width: "60%" }, "Location", "Storage class"]}
        loading={loading}
        isEmpty={filtered.length === 0}
        empty="No buckets found."
      >
        {filtered.map((b) => (
          <tr key={b.name} className={selected?.name === b.name ? "selected" : ""}
            onClick={() => { setSelected(b); setTab("overview"); }}>
            <td className="cell-name mono" style={{ fontSize: 12 }}>{b.name}</td>
            <td className="mono">{b.location}</td>
            <td className="mono">{b.storage_class}</td>
          </tr>
        ))}
      </DataTable>

      <Drawer open={!!selected} onClose={() => setSelected(null)}>
        {usageLoading && !detail && (
          <div className="p-10 text-center text-fg-3">
            <span className="spinner" /> Loading…
          </div>
        )}
        {detail && (
          <>
            <div className="drawer-head">
              <h2 style={{ fontSize: 14, lineHeight: 1.3, wordBreak: "break-all" }}>{detail.name}</h2>
              <div className="drawer-head-actions">
                <button className="btn ghost" onClick={() => setSelected(null)}><Icon name="close" size={14} /></button>
              </div>
              <div className="sub">
                <span className="mono">{detail.location}</span>
                <span className="mono">{detail.storage_class}</span>
                {detail.versioning_enabled && <span className="tag">versioning</span>}
              </div>
            </div>
            <div className="drawer-tabs">
              {["overview", "labels", "raw"].map((t) => (
                <button
                  key={t}
                  className={`drawer-tab ${tab === t ? "active" : ""}`}
                  onClick={() => setTab(t)}
                >
                  {t === "raw" ? "Raw JSON" : t[0] + t.slice(1)}
                </button>
              ))}
            </div>
            <div className="drawer-body">
              {tab === "overview" && (
                <>
                  <div className="usage-card">
                    <div className="usage-head">
                      <div className="title row-tight">
                        <Icon name="bucket" size={14} /> Current usage
                      </div>
                      <button
                        className="btn sm"
                        onClick={refreshUsage}
                        disabled={usageLoading}
                      >
                        {usageLoading ? (
                          <>
                            <span className="spinner" /> Sampling…
                          </>
                        ) : (
                          <>
                            <Icon name="refresh" size={11} /> Re-sample
                          </>
                        )}
                      </button>
                    </div>
                    <div className="usage-grid">
                      <div className="usage-stat">
                        <div className="k">Total size</div>
                        <div className="v">
                          {usageLoading ? (
                            <span
                              className="sk"
                              style={{ width: 80, height: 22 }}
                            />
                          ) : (
                            fmtBytes(usage?.total_bytes)
                          )}
                        </div>
                        <div className="sub">
                          {usage
                            ? usage.total_bytes.toLocaleString() + " bytes"
                            : ""}
                        </div>
                      </div>
                      <div className="usage-stat">
                        <div className="k">Object count</div>
                        <div className="v">
                          {usageLoading ? (
                            <span
                              className="sk"
                              style={{ width: 60, height: 22 }}
                            />
                          ) : (
                            (usage?.object_count?.toLocaleString() ?? "—")
                          )}
                        </div>
                      </div>
                      <div className="usage-stat">
                        <div className="k">Sampled</div>
                        <div className="v" style={{ fontSize: 13 }}>
                          {usageLoading ? (
                            <span
                              className="sk"
                              style={{ width: 110, height: 14 }}
                            />
                          ) : (
                            (usage?.sampled_at ?? "—")
                          )}
                        </div>
                        <div className="sub">UTC</div>
                      </div>
                    </div>
                  </div>
                  <dl className="kv">
                    <dt>Name</dt>
                    <dd>
                      <Copyable value={detail.name}>{detail.name}</Copyable>
                    </dd>
                    <dt>Location</dt>
                    <dd className="mono">{detail.location}</dd>
                    <dt>Storage class</dt>
                    <dd className="mono">{detail.storage_class}</dd>
                    <dt>Versioning</dt>
                    <dd className="mono">
                      {String(detail.versioning_enabled)}
                    </dd>
                    <dt>Created</dt>
                    <dd className="mono">{detail.created_at}</dd>
                  </dl>
                </>
              )}
              {tab === "labels" &&
                (Object.keys(detail.labels ?? {}).length ? (
                  <LabelTags labels={detail.labels} />
                ) : (
                  <div className="muted">No labels.</div>
                ))}
              {tab === "raw" && (
                <pre
                  className="card"
                  style={{ overflow: "auto", margin: 0, fontSize: 11.5 }}
                >
                  {JSON.stringify(detail, null, 2)}
                </pre>
              )}
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}

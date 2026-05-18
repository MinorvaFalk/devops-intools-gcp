import { useMemo, useRef, useState } from "react";
import * as sqlApi from "../api/cloudsql";
import { ActionModal, type ActionDef } from "../components/ActionModal";
import { BulkActionModal } from "../components/BulkActionModal";
import { Copyable } from "../components/Copyable";
import { DataTable } from "../components/DataTable";
import { Drawer } from "../components/Drawer";
import { Icon } from "../components/Icon";
import { KVTable } from "../components/KVTable";
import { LabelTags } from "../components/LabelTags";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useToast } from "../components/Toast";
import { useQuery } from "../hooks/useQuery";
import type { CloudSQLInstanceSummary } from "../types/api";

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

export function CloudSQLPage({ project }: { project: string }) {
  const push = useToast();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<CloudSQLInstanceSummary | null>(
    null,
  );
  const [tab, setTab] = useState("overview");
  const [action, setAction] = useState<ActionDef | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<{
    kind: "start" | "stop";
    targets: string[];
  } | null>(null);

  const {
    data: list = [],
    loading,
    error,
    refetch,
  } = useQuery(() => sqlApi.listInstances(project), [project]);
  const { data: detail, loading: detailLoading } = useQuery(
    selected ? () => sqlApi.getInstance(project, selected.name) : null,
    [selected?.name, project],
  );

  const filtered = useFilter(list, q, [
    "name",
    "private_ip",
    "database_version",
    "machine_type",
  ]);

  const allFilteredChecked =
    filtered.length > 0 && filtered.every((x) => checked.has(x.name));
  const someChecked =
    filtered.some((x) => checked.has(x.name)) && !allFilteredChecked;
  const indeterRef = useRef<HTMLInputElement>(null);
  if (indeterRef.current) indeterRef.current.indeterminate = someChecked;

  const toggleAll = () => {
    const ids = filtered.map((x) => x.name);
    setChecked((s) => {
      const n = new Set(s);
      if (ids.every((id) => s.has(id))) ids.forEach((id) => n.delete(id));
      else ids.forEach((id) => n.add(id));
      return n;
    });
  };

  const toggle = (name: string) =>
    setChecked((s) => {
      const n = new Set(s);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });

  const selectedRows = list.filter((x) => checked.has(x.name));
  const canStart = selectedRows
    .filter((x) => x.status !== "RUNNING")
    .map((x) => x.name);
  const canStop = selectedRows
    .filter((x) => x.status === "RUNNING")
    .map((x) => x.name);

  const openAction = (kind: string, target: string) => {
    const map: Record<string, ActionDef> = {
      start: {
        target,
        title: "Start Cloud SQL instance",
        description: "Resume the database.",
        confirmLabel: "Start",
      },
      stop: {
        target,
        danger: true,
        title: "Stop Cloud SQL instance",
        description: "Suspend the database. Open connections will be dropped.",
        confirmLabel: "Stop",
      },
      backup: {
        target,
        title: "Export backup to GCS",
        description: "Export a logical backup to a GCS bucket.",
        extraFields: [
          {
            key: "bucketPath",
            label: "GCS bucket path",
            required: true,
            placeholder: "gs://my-bucket/backup.sql.gz",
          },
          {
            key: "databases",
            label: "Databases (blank = all)",
            placeholder: "db1, db2",
          },
        ],
        confirmLabel: "Start export",
      },
      restore: {
        target,
        danger: true,
        title: "Restore from GCS backup",
        description:
          "Restore from a GCS object. THIS WILL OVERWRITE EXISTING DATA.",
        extraFields: [
          {
            key: "bucketPath",
            label: "GCS object path",
            required: true,
            placeholder: "gs://my-bucket/backup.sql.gz",
          },
          {
            key: "confirmName",
            label: "Type the instance name to confirm",
            required: true,
            placeholder: target,
          },
        ],
        confirmLabel: "Restore database",
      },
    };
    setAction(map[kind] ?? null);
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
          <h1 className="page-title">Cloud SQL</h1>
          <p className="page-sub">
            Managed Postgres / MySQL instances · {list.length} instances
          </p>
        </div>
        <button
          className="btn"
          onClick={() => {
            push("Refreshing…");
            sqlApi.bustInstances(project);
            refetch();
          }}
        >
          <Icon name="refresh" size={13} /> Refresh
        </button>
      </div>

      <div className="stat-row">
        <StatCard label="Total" value={list.length} />
        <StatCard
          label="Running"
          value={list.filter((x) => x.status === "RUNNING").length}
          tone="ok"
        />
        <StatCard
          label="Stopped / Terminated"
          value={list.filter((x) => x.status === "STOPPED").length}
          tone="muted"
        />
        <StatCard
          label="Engine families"
          value={
            new Set(list.map((x) => x.database_version.split("_")[0])).size
          }
        />
      </div>

      <div className="filterbar">
        <div className="search">
          <Icon name="search" size={13} />
          <input
            placeholder="Search instances…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {checked.size > 0 && (
        <div className="bulk-bar">
          <span className="count">{checked.size} selected</span>
          <button
            className="btn sm ghost"
            onClick={() => setChecked(new Set())}
          >
            Clear
          </button>
          <span className="spacer" />
          <button
            className="btn sm primary"
            disabled={canStart.length === 0}
            onClick={() => setBulk({ kind: "start", targets: canStart })}
          >
            <Icon name="play" size={11} /> Start {canStart.length}
          </button>
          <button
            className="btn sm danger"
            disabled={canStop.length === 0}
            onClick={() => setBulk({ kind: "stop", targets: canStop })}
          >
            <Icon name="stop" size={11} /> Stop {canStop.length}
          </button>
        </div>
      )}

      <DataTable
        columns={[
          {
            label: (
              <input
                type="checkbox"
                ref={indeterRef}
                checked={allFilteredChecked}
                onChange={toggleAll}
              />
            ),
            className: "check-cell",
          },
          "Name",
          "Engine",
          "Region",
          "Status",
          "Tier",
          "Private IP",
          { label: "", className: "actions-cell" },
        ]}
        loading={loading}
        isEmpty={filtered.length === 0}
        empty="No instances match."
      >
        {filtered.map((row) => (
          <tr
            key={row.name}
            className={selected?.name === row.name ? "selected" : ""}
            onClick={() => {
              setSelected(row);
              setTab("overview");
            }}
          >
            <td className="check-cell" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={checked.has(row.name)}
                onChange={() => toggle(row.name)}
              />
            </td>
            <td className="cell-name mono">{row.name}</td>
            <td className="mono">{row.database_version}</td>
            <td className="mono">{row.region}</td>
            <td>
              <StatusBadge status={row.status} />
            </td>
            <td className="mono">{row.machine_type}</td>
            <td className="mono">{row.private_ip}</td>
            <td className="actions-cell">
              <button
                className="btn sm"
                onClick={(e) => {
                  e.stopPropagation();
                  openAction(
                    row.status === "RUNNING" ? "stop" : "start",
                    row.name,
                  );
                }}
              >
                {row.status === "RUNNING" ? (
                  <>
                    <Icon name="stop" size={11} /> Stop
                  </>
                ) : (
                  <>
                    <Icon name="play" size={11} /> Start
                  </>
                )}
              </button>
            </td>
          </tr>
        ))}
      </DataTable>

      <Drawer open={!!selected} onClose={() => setSelected(null)}>
        {detailLoading && (
          <div className="p-10 text-center text-fg-3">
            <span className="spinner" /> Loading…
          </div>
        )}
        {detail && (
          <>
            <div className="drawer-head">
              <h2>{detail.name}</h2>
              <div className="drawer-head-actions">
                <button className="btn ghost" onClick={() => setSelected(null)}>
                  <Icon name="close" size={14} />
                </button>
              </div>
              <div className="sub">
                <span>
                  <StatusBadge status={detail.status} />
                </span>
                <span className="muted">·</span>
                <span className="mono">{detail.database_version}</span>
                <span className="muted">·</span>
                <span className="mono">{detail.region}</span>
                <span className="muted">·</span>
                <span className="mono">{detail.tier}</span>
              </div>
            </div>
            <div className="drawer-actions">
              {detail.status === "RUNNING" ? (
                <button
                  className="btn danger"
                  onClick={() => openAction("stop", detail.name)}
                >
                  <Icon name="stop" size={13} /> Stop
                </button>
              ) : (
                <button
                  className="btn primary"
                  onClick={() => openAction("start", detail.name)}
                >
                  <Icon name="play" size={13} /> Start
                </button>
              )}
              <button
                className="btn"
                onClick={() => openAction("backup", detail.name)}
              >
                <Icon name="backup" size={13} /> Export backup
              </button>
              <button
                className="btn danger"
                onClick={() => openAction("restore", detail.name)}
              >
                <Icon name="restore" size={13} /> Restore from GCS
              </button>
            </div>
            <div className="drawer-tabs">
              {["overview", "parameters", "flags", "labels", "raw"].map((t) => (
                <button
                  key={t}
                  className={`drawer-tab ${tab === t ? "active" : ""}`}
                  onClick={() => setTab(t)}
                >
                  {t === "raw" ? "Raw JSON" : t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <div className="drawer-body">
              {tab === "overview" && (
                <dl className="kv">
                  <dt>Name</dt>
                  <dd className="mono">{detail.name}</dd>
                  <dt>Engine</dt>
                  <dd className="mono">{detail.database_version}</dd>
                  <dt>Region</dt>
                  <dd className="mono">{detail.region}</dd>
                  <dt>Tier</dt>
                  <dd className="mono">{detail.tier}</dd>
                  <dt>Status</dt>
                  <dd>
                    <StatusBadge status={detail.status} />
                  </dd>
                  <dt>Storage</dt>
                  <dd className="mono">{detail.storage_gb} GB</dd>
                  {detail.private_ip && (
                    <>
                      <dt>Private IP</dt>
                      <dd>
                        <Copyable value={detail.private_ip}>
                          {detail.private_ip}
                        </Copyable>
                      </dd>
                    </>
                  )}
                  {detail.service_account && (
                    <>
                      <dt>Service account</dt>
                      <dd className="mono" style={{ fontSize: 11.5 }}>
                        {detail.service_account}
                      </dd>
                    </>
                  )}
                  <dt>Created</dt>
                  <dd className="mono">{detail.created_at}</dd>
                </dl>
              )}
              {tab === "parameters" && (
                <KVTable
                  data={detail.parameters ?? {}}
                  emptyMessage="No parameters."
                />
              )}
              {tab === "flags" && (
                <KVTable
                  data={detail.database_flags ?? []}
                  monoKeys
                  emptyMessage="No flags."
                />
              )}
              {tab === "labels" && <LabelTags labels={detail.labels} />}
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

      <ActionModal
        open={!!action}
        action={action}
        onClose={() => setAction(null)}
        onConfirm={() => setAction(null)}
      />
      <BulkActionModal
        open={!!bulk}
        kind={bulk?.kind ?? "start"}
        targets={bulk?.targets ?? []}
        onClose={() => setBulk(null)}
        onConfirm={() => {
          setBulk(null);
          setChecked(new Set());
        }}
      />
    </div>
  );
}

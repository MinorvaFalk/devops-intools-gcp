import { useCallback, useMemo, useRef, useState } from "react";
import * as gceApi from "../api/gce";
import { ActionModal, type ActionDef } from "../components/ActionModal";
import { BulkActionModal } from "../components/BulkActionModal";
import { Copyable } from "../components/Copyable";
import { DataTable } from "../components/DataTable";
import { DiskCard } from "../components/DiskCard";
import { Drawer } from "../components/Drawer";
import { Icon } from "../components/Icon";
import { LabelTags } from "../components/LabelTags";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { useToast } from "../components/Toast";
import { useQuery } from "../hooks/useQuery";
import type { GCEInstanceSummary } from "../types/api";

function useFilter<T>(list: T[], query: string, keys: (keyof T)[]): T[] {
  return useMemo(() => {
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter((item) =>
      keys.some((k) => {
        const v = item[k];
        if (Array.isArray(v)) return v.some((s) => String(s).toLowerCase().includes(q));
        return String(v ?? "").toLowerCase().includes(q);
      })
    );
  }, [list, query, keys]);
}

export function GCEPage({ project }: { project: string }) {
  const push = useToast();
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [selected, setSelected] = useState<GCEInstanceSummary | null>(null);
  const [tab, setTab] = useState("overview");
  const [action, setAction] = useState<ActionDef | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<{ kind: "start" | "stop"; targets: string[] } | null>(null);

  const { data: list = [], loading, error, refetch } = useQuery(
    () => gceApi.listInstances(project),
    [project]
  );

  const { data: detail, loading: detailLoading } = useQuery(
    selected ? () => gceApi.getInstance(project, selected.zone, selected.name) : null,
    [selected?.name, project]
  );

  const filtered = useFilter(list, q, ["name", "internal_ip", "machine_type", "zone"])
    .filter((x) => statusF === "all" || x.status === statusF);

  const toggle = useCallback((name: string) => {
    setChecked((s) => { const n = new Set(s); n.has(name) ? n.delete(name) : n.add(name); return n; });
  }, []);

  const allFilteredChecked = filtered.length > 0 && filtered.every((x) => checked.has(x.name));
  const someChecked = filtered.some((x) => checked.has(x.name)) && !allFilteredChecked;
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

  const selectedRows = list.filter((x) => checked.has(x.name));
  const canStart = selectedRows.filter((x) => x.status !== "RUNNING").map((x) => x.name);
  const canStop = selectedRows.filter((x) => x.status === "RUNNING").map((x) => x.name);

  const openAction = (kind: string, target: string) => {
    const map: Record<string, ActionDef> = {
      start: { target, title: "Start instance", description: "Boot the instance.", confirmLabel: "Start instance" },
      stop: { target, title: "Stop instance", danger: true, description: "Gracefully shut down the instance.", confirmLabel: "Stop instance" },
      snapshot: {
        target, title: "Create snapshot", description: "Create a snapshot of the boot disk.",
        extraFields: [
          { key: "snapshotName", label: "Snapshot name", required: true, placeholder: `snap-${target}-${new Date().toISOString().slice(0, 10)}` },
          { key: "diskName", label: "Source disk", type: "select", required: true, options: [target, `add-disk-0-${target}`] },
          { key: "description", label: "Description", type: "textarea", placeholder: "Pre-deploy snapshot" },
        ],
        confirmLabel: "Create snapshot",
      },
      attachDisk: {
        target, title: "Attach disk", description: "Attach a persistent disk.",
        extraFields: [
          { key: "disk", label: "Disk name", required: true },
          { key: "deviceName", label: "Device name", required: true },
          { key: "mode", label: "Mode", type: "select", required: true, options: ["READ_WRITE", "READ_ONLY"] },
        ],
        confirmLabel: "Attach disk",
      },
    };
    setAction(map[kind] ?? null);
  };

  if (error) return (
    <div className="page"><div className="notice err"><Icon name="warn" size={14} className="ic" /><div>{error}</div></div></div>
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">GCE Instances</h1>
          <p className="page-sub">Compute Engine VMs · {list.length} instances</p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => { push("Refreshing…"); gceApi.bustInstances(project); refetch(); }}>
            <Icon name="refresh" size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="stat-row">
        <StatCard label="Total" value={list.length} />
        <StatCard label="Running" value={list.filter((x) => x.status === "RUNNING").length} tone="ok" />
        <StatCard label="Stopped / Terminated" value={list.filter((x) => x.status !== "RUNNING").length} tone="muted" />
        <StatCard label="Zones" value={new Set(list.map((x) => x.zone)).size} />
      </div>

      <div className="filterbar">
        <div className="search">
          <Icon name="search" size={13} />
          <input placeholder="Search name, IP, machine type, zone…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select" value={statusF} onChange={(e) => setStatusF(e.target.value)}>
          <option value="all">All status</option>
          <option value="RUNNING">RUNNING</option>
          <option value="STOPPED">STOPPED</option>
          <option value="TERMINATED">TERMINATED</option>
        </select>
      </div>

      {checked.size > 0 && (
        <div className="bulk-bar">
          <span className="count">{checked.size} selected</span>
          <button className="btn sm ghost" onClick={() => setChecked(new Set())}>Clear</button>
          <span className="spacer" />
          <button className="btn sm primary" disabled={canStart.length === 0}
            onClick={() => setBulk({ kind: "start", targets: canStart })}>
            <Icon name="play" size={11} /> Start {canStart.length}
          </button>
          <button className="btn sm danger" disabled={canStop.length === 0}
            onClick={() => setBulk({ kind: "stop", targets: canStop })}>
            <Icon name="stop" size={11} /> Stop {canStop.length}
          </button>
        </div>
      )}

      <DataTable
        columns={[
          { label: <input type="checkbox" ref={indeterRef} checked={allFilteredChecked} onChange={toggleAll} />, className: "check-cell" },
          { label: "Name", width: "26%" },
          "Zone",
          "Machine type",
          "Status",
          "Internal IP",
          "Network tags",
          { label: "", className: "actions-cell" },
        ]}
        loading={loading}
        isEmpty={filtered.length === 0}
        empty="No instances match your filters."
      >
        {filtered.map((row) => (
          <tr key={row.name} className={selected?.name === row.name ? "selected" : ""}
            onClick={() => { setSelected(row); setTab("overview"); }}>
            <td className="check-cell" onClick={(e) => e.stopPropagation()}>
              <input type="checkbox" checked={checked.has(row.name)} onChange={() => toggle(row.name)} />
            </td>
            <td className="cell-name"><div className="mono">{row.name}</div></td>
            <td className="mono">{row.zone}</td>
            <td className="mono">{row.machine_type}</td>
            <td><StatusBadge status={row.status} /></td>
            <td className="mono">{row.internal_ip}</td>
            <td>
              <div className="tag-list">
                {(row.network_tags ?? []).map((t) => <span key={t} className="tag">{t}</span>)}
              </div>
            </td>
            <td className="actions-cell">
              <button className="btn sm" onClick={(e) => { e.stopPropagation(); openAction(row.status === "RUNNING" ? "stop" : "start", row.name); }}>
                {row.status === "RUNNING" ? <><Icon name="stop" size={11} /> Stop</> : <><Icon name="play" size={11} /> Start</>}
              </button>
            </td>
          </tr>
        ))}
      </DataTable>

      <Drawer open={!!selected} onClose={() => setSelected(null)}>
        {detailLoading && (
          <div className="p-10 text-center text-fg-3"><span className="spinner" /> Loading…</div>
        )}
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
                <span className="mono">{detail.zone}</span>
                <span className="muted">·</span>
                <span className="mono">{detail.machine_type}</span>
                <span className="muted">·</span>
                <span className="mono">{detail.internal_ip}</span>
              </div>
            </div>
            <div className="drawer-actions">
              {detail.status === "RUNNING"
                ? <button className="btn danger" onClick={() => openAction("stop", detail.name)}><Icon name="stop" size={13} /> Stop</button>
                : <button className="btn primary" onClick={() => openAction("start", detail.name)}><Icon name="play" size={13} /> Start</button>}
              <button className="btn" onClick={() => openAction("snapshot", detail.name)}><Icon name="snapshot" size={13} /> Create snapshot</button>
              <button className="btn" onClick={() => openAction("attachDisk", detail.name)}><Icon name="attach" size={13} /> Attach disk</button>
            </div>
            <div className="drawer-tabs">
              {["overview", "disks", "labels", "raw"].map((t) => (
                <button key={t} className={`drawer-tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
                  {t === "raw" ? "Raw JSON" : t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
            <div className="drawer-body">
              {tab === "overview" && (
                <>
                  <div className="section-title">Instance</div>
                  <dl className="kv">
                    <dt>ID</dt><dd><Copyable value={detail.id}>{detail.id}</Copyable></dd>
                    <dt>Name</dt><dd className="mono">{detail.name}</dd>
                    <dt>Zone</dt><dd className="mono">{detail.zone}</dd>
                    <dt>Machine type</dt><dd className="mono">{detail.machine_type}</dd>
                    <dt>CPU platform</dt><dd>{detail.cpu_platform}</dd>
                    <dt>Status</dt><dd><StatusBadge status={detail.status} /></dd>
                    <dt>Internal IP</dt><dd><Copyable value={detail.internal_ip}>{detail.internal_ip}</Copyable></dd>
                    {detail.service_account && <><dt>Service account</dt><dd className="mono" style={{ fontSize: 11.5 }}>{detail.service_account}</dd></>}
                    <dt>Network tags</dt><dd><div className="tag-list">{(detail.network_tags ?? []).map((t) => <span key={t} className="tag">{t}</span>)}</div></dd>
                    <dt>Created</dt><dd className="mono">{detail.created_at}</dd>
                  </dl>
                </>
              )}
              {tab === "disks" && (
                <>
                  {detail.boot_disk && <><div className="section-title">Boot disk</div><DiskCard d={detail.boot_disk} /></>}
                  {(detail.additional_disks ?? []).length > 0 && (
                    <>
                      <div className="section-title">Additional disks ({detail.additional_disks!.length})</div>
                      {detail.additional_disks!.map((d) => <DiskCard key={d.name} d={d} />)}
                    </>
                  )}
                </>
              )}
              {tab === "labels" && (
                <>
                  <div className="section-title">Labels</div>
                  <LabelTags labels={detail.labels} />
                </>
              )}
              {tab === "raw" && (
                <pre className="card" style={{ overflow: "auto", margin: 0, fontSize: 11.5 }}>
                  {JSON.stringify(detail, null, 2)}
                </pre>
              )}
            </div>
          </>
        )}
      </Drawer>

      <ActionModal open={!!action} action={action} onClose={() => setAction(null)} onConfirm={() => setAction(null)} />
      <BulkActionModal open={!!bulk} kind={bulk?.kind ?? "start"} targets={bulk?.targets ?? []}
        onClose={() => setBulk(null)} onConfirm={() => { setBulk(null); setChecked(new Set()); }} />
    </div>
  );
}

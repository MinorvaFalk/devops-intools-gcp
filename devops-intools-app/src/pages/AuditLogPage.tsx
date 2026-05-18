import { useMemo, useState } from "react";
import * as apprefApi from "../api/appref";
import { DataTable } from "../components/DataTable";
import { Icon } from "../components/Icon";
import { StatCard } from "../components/StatCard";
import { useQuery } from "../hooks/useQuery";
import type { AuditLog, AuditLogFieldChange } from "../types/api";

const ACTION_STYLE: Record<string, string> = { CREATE: "ok", UPDATE: "info", DECOMMISSION: "err" };

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  return String(v);
}

function ChangesSummary({ changes }: { changes?: Record<string, AuditLogFieldChange> }) {
  if (changes == null || Object.keys(changes).length === 0) return <span className="muted">—</span>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {Object.entries(changes).map(([field, c]) => (
        <div key={field} className="tl-change-row" style={{ padding: 0, border: "none", background: "none" }}>
          <span className="tc-field">{field}</span>
          <span className="tc-old">{fmtVal(c.from)}</span>
          <span className="tc-arrow">→</span>
          <span className="tc-new">{fmtVal(c.to)}</span>
        </div>
      ))}
    </div>
  );
}

export function AuditLogPage({ project: _project }: { project: string }) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [actionF, setActionF] = useState("all");

  // First fetch the list of apprefs for the code picker
  const { data: apprefsData, error: apprefsError } = useQuery(
    () => apprefApi.listApprefs(),
    []
  );
  const apprefs = apprefsData ?? [];

  // Fetch audit logs for selected code
  const { data: rawLogs, loading, error, refetch } = useQuery(
    selectedCode ? () => apprefApi.listAuditLogs(selectedCode) : null,
    [selectedCode]
  );
  const logs = rawLogs ?? [];

  const fmtDate = (s: string) => {
    try { return new Date(s).toLocaleString("en-GB", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
    catch { return s; }
  };

  const filtered = useMemo(() => logs
    .filter((l) => actionF === "all" || l.action === actionF)
    .filter((l) => {
      if (!q) return true;
      const term = q.toLowerCase();
      return (
        l.resource_code.includes(term) ||
        (l.actor_email ?? "").includes(term) ||
        (l.actor_id ?? "").includes(term) ||
        (l.actor_ip ?? "").includes(term) ||
        l.action.toLowerCase().includes(term)
      );
    }), [logs, q, actionF]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Appref Audit Log</h1>
          <p className="page-sub">Mutations to the appref dictionary — who changed what, when</p>
        </div>
        <button className="btn" onClick={() => refetch()}>
          <Icon name="refresh" size={13} /> Refresh
        </button>
      </div>

      {apprefsError && (
        <div className="notice err"><Icon name="warn" size={14} className="ic" /><div>{apprefsError}</div></div>
      )}

      {/* Code picker */}
      <div className="filterbar mb-[18px]">
        <Icon name="log" size={13} className="text-fg-3" />
        <span className="text-[12.5px] text-fg-2">Appref code:</span>
        <select
          className="select"
          value={selectedCode ?? ""}
          onChange={(e) => { setSelectedCode(e.target.value || null); setQ(""); setActionF("all"); }}
        >
          <option value="">Select an appref…</option>
          {apprefs.map((a) => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}
        </select>
      </div>

      {!selectedCode ? (
        <div className="notice info">
          <Icon name="info" size={14} className="ic" />
          <div>Select an appref code above to view its change history.</div>
        </div>
      ) : error ? (
        <div className="notice err"><Icon name="warn" size={14} className="ic" /><div>{error}</div></div>
      ) : (
        <>
          <div className="stat-row">
            <StatCard label="Total events" value={logs.length} />
            <StatCard label="Creates" value={logs.filter((l) => l.action === "CREATE").length} />
            <StatCard label="Updates" value={logs.filter((l) => l.action === "UPDATE").length} />
            <StatCard label="Unique actors" value={new Set(logs.map((l) => l.actor_email ?? l.actor_id ?? l.actor_ip)).size} />
          </div>

          <div className="filterbar">
            <div className="search">
              <Icon name="search" size={13} />
              <input placeholder="Search actor, IP…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select className="select" value={actionF} onChange={(e) => setActionF(e.target.value)}>
              <option value="all">All actions</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DECOMMISSION">DECOMMISSION</option>
            </select>
          </div>

          <DataTable
            columns={[{ label: "#", width: 40 }, "Resource", "Action", "Actor", "IP", "Changes", "Timestamp"]}
            loading={loading}
            isEmpty={filtered.length === 0}
            empty="No log entries match."
          >
            {filtered.map((l: AuditLog) => (
              <tr key={l.id}>
                <td className="mono text-fg-4">{l.id}</td>
                <td>
                  <span className="tag mono accent">{l.resource_code}</span>
                </td>
                <td>
                  <span className={`status ${ACTION_STYLE[l.action] ?? "info"}`}>
                    <span className="sdot" />{l.action}
                  </span>
                </td>
                <td className="mono text-[11.5px]">{l.actor_email ?? l.actor_id ?? "—"}</td>
                <td className="mono">{l.actor_ip ?? "—"}</td>
                <td className="text-[11.5px]">
                  <ChangesSummary changes={l.changes} />
                </td>
                <td className="mono text-[11.5px] text-fg-3">{fmtDate(l.created_at)}</td>
              </tr>
            ))}
          </DataTable>
        </>
      )}
    </div>
  );
}

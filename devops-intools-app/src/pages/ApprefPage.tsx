import { useMemo, useState } from "react";
import * as apprefApi from "../api/appref";
import { DataTable } from "../components/DataTable";
import { Drawer } from "../components/Drawer";
import { Icon } from "../components/Icon";
import { StatusBadge } from "../components/StatusBadge";
import { useToast } from "../components/Toast";
import { useQuery } from "../hooks/useQuery";
import type { AppRef, AuditLogFieldChange, CreateAppRefRequest, UpdateAppRefRequest } from "../types/api";

const STATUS_OPTS = ["ACTIVE", "DECOMMISSIONED"];
const STAGE_OPTS = ["prod", "stg", "uat", "dev"];
const SIZE_OPTS = ["small", "medium", "large"];

function DecommissionModal({
  appref,
  loading,
  onConfirm,
  onClose,
}: {
  appref: AppRef;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Decommission appref</h3>
          <p>This action is irreversible and will be logged.</p>
        </div>
        <div className="modal-body">
          <div className="notice" style={{ marginBottom: 14 }}>
            <Icon name="warn" size={14} className="ic" />
            <div>
              The appref <b className="mono">{appref.code}</b> will be marked as{" "}
              <b>DECOMMISSIONED</b> and can no longer be used in new provisioning.
            </div>
          </div>
          <dl className="kv" style={{ fontSize: 12.5 }}>
            <dt>Code</dt><dd className="mono">{appref.code}</dd>
            <dt>Name</dt><dd>{appref.name}</dd>
            <dt>Stage</dt><dd className="mono">{appref.stage}</dd>
            <dt>Owner</dt><dd className="mono">{appref.owner ?? "—"}</dd>
          </dl>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn danger" onClick={onConfirm} disabled={loading}>
            {loading
              ? <><span className="spinner" /> Decommissioning…</>
              : <><Icon name="warn" size={12} /> Decommission</>}
          </button>
        </div>
      </div>
    </div>
  );
}

const EMPTY_CREATE: CreateAppRefRequest = {
  code: "", name: "", description: "", stage: "dev", project_code: "",
  size: "", additional_features: "", owner: "", pic: "",
};

function CreateModal({
  loading,
  refProjects,
  onConfirm,
  onClose,
}: {
  loading: boolean;
  refProjects: import("../types/api").RefProject[];
  onConfirm: (req: CreateAppRefRequest) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CreateAppRefRequest>({ ...EMPTY_CREATE });
  const g = (k: keyof CreateAppRefRequest) => ({
    value: (form[k] as string) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value })),
  });
  const valid = form.code.trim() && form.name.trim() && form.stage;

  const handleConfirm = () => {
    const req = { ...form, project_code: form.project_code?.trim() || undefined };
    onConfirm(req);
  };

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" style={{ width: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>New appref</h3>
          <p>Register a new application reference entry.</p>
        </div>
        <div className="modal-body">
          <div className="edit-form-grid">
            <div className="field"><label>Code <span className="text-err">*</span></label>
              <input className="input mono" placeholder="e.g. APP001" {...g("code")} />
            </div>
            <div className="field"><label>Stage <span className="text-err">*</span></label>
              <select className="input sans" {...g("stage")}>
                {STAGE_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field full"><label>Name <span className="text-err">*</span></label>
              <input className="input sans" placeholder="Human-readable app name" {...g("name")} />
            </div>
            <div className="field full"><label>Description</label>
              <textarea className="input sans" rows={2} placeholder="Brief description of what this application does" {...g("description")} />
            </div>
            <div className="field full"><label>Project code</label>
              <select className="input sans" {...g("project_code")}>
                <option value="">—</option>
                {refProjects.map((p) => (
                  <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
                ))}
              </select>
            </div>
            <div className="field"><label>Size</label>
              <select className="input sans" {...g("size")}>
                <option value="">—</option>
                {SIZE_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="field"><label>Owner</label>
              <input className="input sans" placeholder="Team or person" {...g("owner")} />
            </div>
            <div className="field full"><label>PIC email</label>
              <input className="input" type="email" placeholder="pic@example.com" {...g("pic")} />
            </div>
            <div className="field full"><label>Additional features</label>
              <textarea className="input sans" rows={2} placeholder="e.g. caching, read-replica" {...g("additional_features")} />
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn primary" onClick={handleConfirm} disabled={loading || !valid}>
            {loading ? <><span className="spinner" /> Creating…</> : <><Icon name="check" size={12} /> Create appref</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function useFilter<T>(list: T[], query: string, keys: (keyof T)[]): T[] {
  return useMemo(() => {
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter((item) => keys.some((k) => String(item[k] ?? "").toLowerCase().includes(q)));
  }, [list, query, keys]);
}

export function ApprefPage({ project: _project }: { project: string }) {
  const push = useToast();
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [stageF, setStageF] = useState("all");
  const [selected, setSelected] = useState<AppRef | null>(null);
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<UpdateAppRefRequest>>({});
  const [saving, setSaving] = useState(false);
  const [decommConfirm, setDecommConfirm] = useState(false);
  const [decommitting, setDecommitting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const { data: listData, loading, error, refetch } = useQuery(() => apprefApi.listApprefs(), []);
  const { data: refProjectsData } = useQuery(() => apprefApi.listRefProjects(), []);
  const list = listData ?? [];
  const refProjects = refProjectsData ?? [];

  const filtered = useFilter(list, q, ["code", "name", "owner", "project_code"])
    .filter((x) => statusF === "all" || x.status === statusF)
    .filter((x) => stageF === "all" || x.stage === stageF);

  const selectedEntry = selected ? list.find((e) => e.code === selected.code) ?? selected : null;

  const decommission = async () => {
    if (!selectedEntry) return;
    setDecommitting(true);
    try {
      await apprefApi.decommissionAppref(selectedEntry.code);
      push(`"${selectedEntry.code}" decommissioned`, "ok");
      setSelected(null);
      setDecommConfirm(false);
      refetch();
    } catch (err) {
      push(String(err instanceof Error ? err.message : err), "err");
    } finally {
      setDecommitting(false);
    }
  };

  const startEdit = () => {
    if (!selectedEntry) return;
    setTab("overview");
    setForm({
      name: selectedEntry.name,
      description: selectedEntry.description ?? "",
      stage: selectedEntry.stage,
      project_code: selectedEntry.project_code ?? "",
      size: selectedEntry.size ?? "",
      additional_features: selectedEntry.additional_features ?? "",
      owner: selectedEntry.owner ?? "",
      pic: selectedEntry.pic ?? "",
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    if (!selectedEntry) return;
    setSaving(true);
    try {
      const req: UpdateAppRefRequest = { ...form };
      if (!req.project_code?.trim()) delete req.project_code;
      const updated = await apprefApi.updateAppref(selectedEntry.code, req);
      setSelected(updated);
      setEditing(false);
      push(`Appref "${selectedEntry.code}" updated`, "ok");
      refetch();
    } catch (err) {
      push(String(err instanceof Error ? err.message : err), "err");
    } finally {
      setSaving(false);
    }
  };

  const createAppref = async (req: CreateAppRefRequest) => {
    setCreating(true);
    try {
      const created = await apprefApi.createAppref(req);
      push(`Appref "${created.code}" created`, "ok");
      setCreateOpen(false);
      refetch();
    } catch (err) {
      push(String(err instanceof Error ? err.message : err), "err");
    } finally {
      setCreating(false);
    }
  };

  const f = (k: keyof UpdateAppRefRequest) => ({
    value: (form[k] as string) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [k]: e.target.value })),
  });

  if (error) return (
    <div className="page"><div className="notice err"><Icon name="warn" size={14} className="ic" /><div>{error}</div></div></div>
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Appref Dictionary</h1>
          <p className="page-sub">Application reference registry · {list.length} entries</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn primary" onClick={() => setCreateOpen(true)}>
            <Icon name="plus" size={13} /> New appref
          </button>
          <button className="btn" onClick={() => refetch()}>
            <Icon name="refresh" size={13} /> Refresh
          </button>
        </div>
      </div>

      <div className="filterbar">
        <div className="search">
          <Icon name="search" size={13} />
          <input placeholder="Search code, name, owner, project…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select" value={stageF} onChange={(e) => setStageF(e.target.value)}>
          <option value="all">All stages</option>
          {STAGE_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="select" value={statusF} onChange={(e) => setStatusF(e.target.value)}>
          <option value="all">All status</option>
          {STATUS_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <DataTable
        columns={["Code", { label: "Name", width: "30%" }, "Stage", "Project", "Owner", "Status"]}
        loading={loading}
        isEmpty={filtered.length === 0}
        empty="No entries match."
      >
        {filtered.map((a) => (
          <tr key={a.code} className={selected?.code === a.code ? "selected" : ""}
            onClick={() => { setSelected(a); setTab("overview"); setEditing(false); }}>
            <td>
              <span className="tag mono accent">{a.code}</span>
            </td>
            <td className="cell-name">{a.name}</td>
            <td className="mono">{a.stage}</td>
            <td className="mono text-[11.5px]">{a.project_code}</td>
            <td className="mono text-[11.5px]">{a.owner ?? "—"}</td>
            <td><StatusBadge status={a.status} /></td>
          </tr>
        ))}
      </DataTable>

      <Drawer open={!!selected} onClose={() => { setSelected(null); setEditing(false); }}>
        {selectedEntry && (
          <>
            <div className="drawer-head">
              <h2 className="font-sans text-[18px]">{selectedEntry.name}</h2>
              <div className="drawer-head-actions">
                {!editing && selectedEntry.status === "ACTIVE" && (
                  <button className="btn danger sm" onClick={() => setDecommConfirm(true)}>
                    <Icon name="warn" size={12} /> Decommission
                  </button>
                )}
                {!editing && <button className="btn sm" onClick={startEdit}><Icon name="edit" size={12} /> Edit</button>}
                <button className="btn ghost" onClick={() => { setSelected(null); setEditing(false); }}><Icon name="close" size={14} /></button>
              </div>
              <div className="sub">
                <span className="tag mono accent">{selectedEntry.code}</span>
                <span className="muted">·</span>
                <StatusBadge status={selectedEntry.status} />
                <span className="muted">·</span>
                <span className="mono text-fg-2">{selectedEntry.stage}</span>
                {selectedEntry.project_code && <><span className="muted">·</span><span className="mono text-fg-2">{selectedEntry.project_code}</span></>}
              </div>
            </div>

            <div className="drawer-tabs">
              {["overview", "changes", "raw"].map((t) => (
                <button key={t} className={`drawer-tab ${tab === t ? "active" : ""}`}
                  onClick={() => { setTab(t); if (t !== "overview") setEditing(false); }}>
                  {t === "raw" ? "Raw JSON" : t === "changes" ? "Change history" : t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <div className="drawer-body">
              {tab === "overview" && !editing && (
                <>
                  <div className="mt-3 mb-4">
                    <div className="text-[10px] font-semibold tracking-wider text-fg-3 uppercase mb-2">Description</div>
                    <div className="card text-[13px] text-fg-2 leading-relaxed">
                      {selectedEntry.description || <span className="muted">No description provided.</span>}
                    </div>
                  </div>
                <dl className="kv">
                  <dt>Code</dt><dd className="mono">{selectedEntry.code}</dd>
                  <dt>Name</dt><dd>{selectedEntry.name}</dd>
                  <dt>Stage</dt><dd className="mono">{selectedEntry.stage}</dd>
                  <dt>Project</dt><dd className="mono">{selectedEntry.project_code ?? <span className="muted">—</span>}</dd>
                  {selectedEntry.size && <><dt>Size</dt><dd className="mono">{selectedEntry.size}</dd></>}
                  {selectedEntry.owner && <><dt>Owner</dt><dd className="mono">{selectedEntry.owner}</dd></>}
                  {selectedEntry.pic && <><dt>PIC email</dt><dd className="mono" style={{ fontSize: 11.5 }}>{selectedEntry.pic}</dd></>}
                  {selectedEntry.additional_features && <><dt>Additional features</dt><dd>{selectedEntry.additional_features}</dd></>}
                  <dt>Status</dt><dd><StatusBadge status={selectedEntry.status} /></dd>
                  <dt>Created</dt><dd className="mono">{selectedEntry.created_at}</dd>
                  <dt>Updated</dt><dd className="mono">{selectedEntry.updated_at}</dd>
                </dl>
                </>
              )}

              {tab === "overview" && editing && (
                <>
                  <div className="notice info" style={{ marginBottom: 14 }}>
                    <Icon name="info" size={13} className="ic" />
                    <div>Code is immutable. Changes are persisted via the API.</div>
                  </div>
                  <div className="edit-form-grid">
                    <div className="field full"><label>Name</label><input className="input sans" {...f("name")} /></div>
                    <div className="field full"><label>Description</label><textarea className="input sans" rows={2} placeholder="Brief description of what this application does" {...f("description")} /></div>
                    <div className="field"><label>Stage</label>
                      <select className="input sans" {...f("stage")}>
                        {STAGE_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="field full"><label>Project code</label>
                      <select className="input sans" {...f("project_code")}>
                        <option value="">—</option>
                        {refProjects.map((p) => (
                          <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field"><label>Size</label>
                      <select className="input sans" {...f("size")}>
                        <option value="">—</option>
                        {SIZE_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="field"><label>Owner</label><input className="input sans" {...f("owner")} /></div>
                    <div className="field full"><label>PIC email</label><input className="input" type="email" {...f("pic")} /></div>
                    <div className="field full"><label>Additional features</label><textarea className="input sans" rows={3} {...f("additional_features")} /></div>
                  </div>
                </>
              )}

              {tab === "changes" && (
                <AuditLogInline code={selectedEntry.code} />
              )}

              {tab === "raw" && (
                <pre className="card" style={{ overflow: "auto", margin: 0, fontSize: 11.5 }}>
                  {JSON.stringify(selectedEntry, null, 2)}
                </pre>
              )}
            </div>

            {editing && (
              <div className="drawer-edit-actions">
                <button className="btn ghost" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
                <button className="btn primary" onClick={() => { void saveEdit(); }} disabled={saving || !form.name?.trim()}>
                  {saving ? <><span className="spinner" /> Saving…</> : <><Icon name="check" size={12} /> Save changes</>}
                </button>
              </div>
            )}
          </>
        )}
      </Drawer>

      {decommConfirm && selectedEntry && (
        <DecommissionModal
          appref={selectedEntry}
          loading={decommitting}
          onConfirm={() => { void decommission(); }}
          onClose={() => setDecommConfirm(false)}
        />
      )}

      {createOpen && (
        <CreateModal
          loading={creating}
          refProjects={refProjects}
          onConfirm={(req) => { void createAppref(req); }}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </div>
  );
}

function AuditLogInline({ code }: { code: string }) {
  const { data: rawLogs, loading, error } = useQuery(
    () => apprefApi.listAuditLogs(code), [code]
  );
  const logs = rawLogs ?? [];

  if (loading) return <div className="muted"><span className="spinner" /> Loading…</div>;
  if (error) return <div className="notice err" style={{ fontSize: 12 }}>{error}</div>;
  if (!logs.length) return <div className="muted" style={{ fontSize: 12 }}>No changes recorded yet.</div>;

  const fmtDate = (s: string) => {
    try { return new Date(s).toLocaleString("en-GB", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
    catch { return s; }
  };

  return (
    <div className="timeline">
      {logs.map((l, i) => (
        <div key={l.id} className="tl-item">
          {i < logs.length - 1 && <div className="tl-line" />}
          <div className={`tl-dot ${l.action.toLowerCase()}`} />
          <div className="tl-body">
            <div className="tl-head">
              <span className="tl-action">{l.action}</span>
              <span className="tl-who">
                by <span className="mono">{l.actor_email ?? l.actor_id ?? l.actor_ip ?? "unknown"}</span>
                {l.actor_ip && <span> · <span className="mono">{l.actor_ip}</span></span>}
              </span>
              <span className="tl-when">{fmtDate(l.created_at)}</span>
            </div>
            {l.changes != null && Object.keys(l.changes).length > 0 && (
              <div className="tl-changes">
                {Object.entries(l.changes).map(([field, c]) => (
                  <AuditFieldDiff key={field} field={field} change={c} />
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  return String(v);
}

function AuditFieldDiff({ field, change }: { field: string; change: AuditLogFieldChange }) {
  return (
    <div className="tl-change-row">
      <span className="tc-field">{field}</span>
      <span className="tc-old">{fmtVal(change.from)}</span>
      <span className="tc-arrow">→</span>
      <span className="tc-new">{fmtVal(change.to)}</span>
    </div>
  );
}

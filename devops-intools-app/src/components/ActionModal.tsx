import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { SAFileInput, type SAKey } from "./SAFileInput";
import { useToast } from "./Toast";

export interface ExtraField {
  key: string;
  label: string;
  type?: "text" | "textarea" | "select" | "number";
  required?: boolean;
  placeholder?: string;
  hint?: string;
  options?: string[];
  min?: number;
  max?: number;
}

export interface ActionDef {
  target: string;
  title: string;
  description: string;
  danger?: boolean;
  confirmLabel?: string;
  extraFields?: ExtraField[];
  defaultExtra?: Record<string, string>;
}

interface ActionModalProps {
  open: boolean;
  action: ActionDef | null;
  onClose: () => void;
  onConfirm: (payload: { opsSa: SAKey; extra: Record<string, string> }) => void;
}

export function ActionModal({ open, action, onClose, onConfirm }: ActionModalProps) {
  const [opsSa, setOpsSa] = useState<SAKey | null>(null);
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const push = useToast();

  useEffect(() => {
    if (open) { setOpsSa(null); setExtra(action?.defaultExtra ?? {}); setSubmitting(false); }
  }, [open, action]);

  if (!open || !action) return null;

  const extraValid = (action.extraFields ?? []).every(
    (f) => !f.required || (extra[f.key] ?? "").trim().length > 0
  );
  const canConfirm = !!opsSa && extraValid && !submitting;

  const submit = () => {
    if (!opsSa) return;
    setSubmitting(true);
    setTimeout(() => {
      onConfirm({ opsSa, extra });
      push(`${action.title} requested for ${action.target}`, "ok");
      setSubmitting(false);
      onClose();
    }, 850);
  };

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{action.title}</h3>
          <p>{action.description}</p>
        </div>
        <div className="modal-body">
          {action.danger && (
            <div className="notice mb-3.5">
              <Icon name="warn" size={14} className="ic" />
              <div>
                This is a privileged action and will be logged. Affected resource:{" "}
                <b className="mono">{action.target}</b>.
              </div>
            </div>
          )}
          <div className="field">
            <label>Resource</label>
            <input className="input" value={action.target} readOnly />
          </div>
          {(action.extraFields ?? []).map((f) => (
            <div className="field" key={f.key}>
              <label>{f.label}{f.required && <span className="text-err"> *</span>}</label>
              {f.type === "textarea" ? (
                <textarea className="input" placeholder={f.placeholder} value={extra[f.key] ?? ""} onChange={(e) => setExtra((p) => ({ ...p, [f.key]: e.target.value }))} />
              ) : f.type === "select" ? (
                <select className="input sans" value={extra[f.key] ?? ""} onChange={(e) => setExtra((p) => ({ ...p, [f.key]: e.target.value }))}>
                  <option value="">Select…</option>
                  {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === "number" ? (
                <input className="input" type="number" min={f.min} max={f.max} value={extra[f.key] ?? ""} onChange={(e) => setExtra((p) => ({ ...p, [f.key]: e.target.value }))} />
              ) : (
                <input className="input" placeholder={f.placeholder} value={extra[f.key] ?? ""} onChange={(e) => setExtra((p) => ({ ...p, [f.key]: e.target.value }))} />
              )}
              {f.hint && <div className="hint">{f.hint}</div>}
            </div>
          ))}
          <div className="field">
            <label>Ops Service Account key <span className="text-err">*</span></label>
            <SAFileInput value={opsSa} onChange={setOpsSa} />
            <div className="hint">Required. Parsed locally, never uploaded.</div>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className={`btn ${action.danger ? "danger" : "primary"}`} disabled={!canConfirm} onClick={submit}>
            {submitting ? <><span className="spinner" /> Running…</> : (action.confirmLabel ?? "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

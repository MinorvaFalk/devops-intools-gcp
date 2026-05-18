import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { SAFileInput, type SAKey } from "./SAFileInput";
import { useToast } from "./Toast";

interface BulkActionModalProps {
  open: boolean;
  kind: "start" | "stop";
  targets: string[];
  onClose: () => void;
  onConfirm: () => void;
}

export function BulkActionModal({ open, kind, targets, onClose, onConfirm }: BulkActionModalProps) {
  const [opsSa, setOpsSa] = useState<SAKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const push = useToast();

  useEffect(() => { if (open) { setOpsSa(null); setSubmitting(false); } }, [open]);
  if (!open) return null;

  const isStop = kind === "stop";
  const canConfirm = !!opsSa && !submitting && targets.length > 0;

  const submit = () => {
    setSubmitting(true);
    setTimeout(() => {
      push(`${isStop ? "Stop" : "Start"} requested for ${targets.length} resource${targets.length === 1 ? "" : "s"}`, "ok");
      setSubmitting(false);
      onConfirm();
      onClose();
    }, 1100);
  };

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 560 }}>
        <div className="modal-head">
          <h3>{isStop ? "Stop" : "Start"} {targets.length} resource{targets.length === 1 ? "" : "s"}</h3>
          <p>{isStop ? "Gracefully shut down all selected resources." : "Boot all selected resources."}</p>
        </div>
        <div className="modal-body">
          {isStop && (
            <div className="notice" style={{ marginBottom: 14 }}>
              <Icon name="warn" size={14} className="ic" />
              <div>Stopping {targets.length} resource{targets.length === 1 ? "" : "s"} — open connections will be dropped.</div>
            </div>
          )}
          <div className="field">
            <label>Selected resources</label>
            <div className="card max-h-40 overflow-auto p-2">
              {targets.map((t) => (
                <div key={t} className="row px-1.5 py-1 border-b border-line">
                  <span className="mono text-xs">{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Ops Service Account key <span className="text-err">*</span></label>
            <SAFileInput value={opsSa} onChange={setOpsSa} />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className={`btn ${isStop ? "danger" : "primary"}`} disabled={!canConfirm} onClick={submit}>
            {submitting ? <><span className="spinner" /> Running…</> : `${isStop ? "Stop" : "Start"} ${targets.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}

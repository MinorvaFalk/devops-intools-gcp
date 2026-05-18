import type { GCEDisk } from "../types/api";
import { Icon } from "./Icon";

export function DiskCard({ d }: { d: GCEDisk }) {
  return (
    <div className="card mb-2.5">
      <div className="row justify-between">
        <div className="row-tight">
          <Icon name="disk" size={14} />
          <span className="mono font-medium">{d.name}</span>
          {d.boot && <span className="tag">boot</span>}
          {d.mode && <span className="tag">{d.mode}</span>}
        </div>
        <div className="muted mono text-xs">
          {d.size_gb} GB{d.type ? ` · ${d.type}` : ""}
        </div>
      </div>
      <div className="row mt-2 text-fg-3 text-[11.5px]">
        {d.device_name && (
          <span>device: <span className="mono text-fg-2">{d.device_name}</span></span>
        )}
        <span>· auto delete: <span className="mono text-fg-2">{String(d.auto_delete)}</span></span>
      </div>
    </div>
  );
}

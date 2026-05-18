const STATUS_CLASS: Record<string, string> = {
  RUNNING: "running", RUNNABLE: "runnable", READY: "ready",
  ALWAYS: "ok",
  NEVER: "stopped",
  TERMINATED: "terminated", STOPPED: "stopped",
  ACTIVE: "ok",
  DECOMMISSIONED: "terminated",
  PROVISIONING: "warn", STARTING: "warn", STOPPING: "warn", REPAIRING: "warn",
  ERROR: "err", FAILED: "err",
  PENDING: "info",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_CLASS[status] ?? "terminated";
  return (
    <span className={`status ${cls}`}>
      <span className="sdot" />
      {status}
    </span>
  );
}

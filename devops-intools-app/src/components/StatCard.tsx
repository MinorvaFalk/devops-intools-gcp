interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  tone?: "ok" | "muted" | "err" | "warn" | "info";
}

const TONE_LABEL: Record<string, string> = {
  ok:   "text-ok",
  err:  "text-err",
  warn: "text-warn",
  info: "text-info",
};

const TONE_BORDER: Record<string, string> = {
  ok:   "border-l-[3px] border-l-ok",
  err:  "border-l-[3px] border-l-err",
  warn: "border-l-[3px] border-l-warn",
  info: "border-l-[3px] border-l-info",
};

const TONE_VAL: Record<string, string> = {
  ok:   "text-ok",
  err:  "text-err",
  muted:"text-fg-3",
};

export function StatCard({ label, value, sub, tone }: StatCardProps) {
  const borderCls = tone && tone !== "muted" ? TONE_BORDER[tone] ?? "" : "";
  const labelCls  = tone && tone !== "muted" ? TONE_LABEL[tone]  ?? "" : "";
  const valCls    = tone ? TONE_VAL[tone] ?? "" : "";
  return (
    <div className={`stat-card ${borderCls}`}>
      <div className={`label ${labelCls}`}>{label}</div>
      <div className={`val ${valCls}`}>{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

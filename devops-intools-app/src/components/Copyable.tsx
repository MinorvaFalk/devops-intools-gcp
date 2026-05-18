import { useState } from "react";
import { Icon } from "./Icon";

export function Copyable({ value, children }: { value: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="row-tight">
      <span className="mono">{children ?? value}</span>
      <button
        className="copy-btn"
        title="Copy"
        onClick={(e) => {
          e.stopPropagation();
          navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
      >
        {copied ? <Icon name="check" size={12} /> : <Icon name="copy" size={12} />}
      </button>
    </span>
  );
}

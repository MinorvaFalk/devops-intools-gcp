import { Fragment } from "react";

type KVTableProps = {
  data: Record<string, unknown> | { name: string; value: string }[];
  monoKeys?: boolean;
  emptyMessage?: string;
};

export function KVTable({ data, monoKeys = false, emptyMessage = "No entries." }: KVTableProps) {
  const entries: [string, string][] = Array.isArray(data)
    ? data.map((f) => [f.name, f.value])
    : Object.entries(data).map(([k, v]) => [k, String(v)]);

  if (entries.length === 0) {
    return <p className="text-fg-3 text-[12.5px]">{emptyMessage}</p>;
  }

  return (
    <dl className="kv" style={monoKeys ? { gridTemplateColumns: "max-content 1fr" } : undefined}>
      {entries.map(([k, v]) => (
        <Fragment key={k}>
          <dt className={monoKeys ? "mono text-[11.5px]" : undefined}>{k}</dt>
          <dd className="mono">{v}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

import type { ReactNode } from "react";

export interface ColDef {
  label: ReactNode;
  width?: string | number;
  className?: string;
}

interface DataTableProps {
  columns: (string | ColDef)[];
  loading?: boolean;
  isEmpty?: boolean;
  empty?: string;
  children: ReactNode;
}

export function DataTable({ columns, loading, isEmpty, empty = "No results.", children }: DataTableProps) {
  const cols: ColDef[] = columns.map((c) => (typeof c === "string" ? { label: c } : c));

  return (
    <div className="table-wrap">
      {loading ? (
        <div className="p-10 text-center text-fg-3">
          <span className="spinner" /> Loading…
        </div>
      ) : (
        <table className="t">
          <thead>
            <tr>
              {cols.map((c, i) => (
                <th key={i} className={c.className} style={c.width != null ? { width: c.width } : undefined}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isEmpty ? (
              <tr>
                <td colSpan={cols.length} className="text-center py-8 px-4 text-fg-3">
                  {empty}
                </td>
              </tr>
            ) : children}
          </tbody>
        </table>
      )}
    </div>
  );
}

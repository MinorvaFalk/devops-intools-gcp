import { KVTable } from "./KVTable";
import type { Labels } from "../types/api";

export function LabelTags({ labels }: { labels?: Labels }) {
  return <KVTable data={labels ?? {}} emptyMessage="No labels." />;
}

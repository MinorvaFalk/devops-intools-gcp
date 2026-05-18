import { get } from "./client";
import type { OverviewSummary } from "../types/api";

export const getOverview = (project: string) =>
  get<OverviewSummary>(`/overview?project=${encodeURIComponent(project)}`);

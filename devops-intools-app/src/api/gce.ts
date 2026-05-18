import { get } from "./client";
import { bustCache, cachedGet } from "./cache";
import type { GCEInstance, GCEInstanceSummary } from "../types/api";

const listPath = (project: string) =>
  `/gce/instances?project=${encodeURIComponent(project)}`;

export const listInstances = (project: string) =>
  cachedGet<GCEInstanceSummary[]>(listPath(project));

export const bustInstances = (project: string) => bustCache(listPath(project));

export const getInstance = (project: string, zone: string, name: string) =>
  get<GCEInstance>(
    `/gce/instances/${encodeURIComponent(name)}?project=${encodeURIComponent(project)}&zone=${encodeURIComponent(zone)}`
  );

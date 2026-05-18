import { get } from "./client";
import { bustCache, cachedGet } from "./cache";
import type { CloudSQLInstance, CloudSQLInstanceSummary } from "../types/api";

const listPath = (project: string) =>
  `/cloudsql/instances?project=${encodeURIComponent(project)}`;

export const listInstances = (project: string) =>
  cachedGet<CloudSQLInstanceSummary[]>(listPath(project));

export const bustInstances = (project: string) => bustCache(listPath(project));

export const getInstance = (project: string, name: string) =>
  get<CloudSQLInstance>(
    `/cloudsql/instances/${encodeURIComponent(name)}?project=${encodeURIComponent(project)}`
  );

import { get } from "./client";
import { bustCache, cachedGet } from "./cache";
import type { RedisInstance, RedisInstanceSummary } from "../types/api";

const listPath = (project: string) =>
  `/redis/instances?project=${encodeURIComponent(project)}`;

export const listInstances = (project: string) =>
  cachedGet<RedisInstanceSummary[]>(listPath(project));

export const bustInstances = (project: string) => bustCache(listPath(project));

export const getInstance = (project: string, location: string, name: string) =>
  get<RedisInstance>(
    `/redis/instances/${encodeURIComponent(name)}?project=${encodeURIComponent(project)}&location=${encodeURIComponent(location)}`
  );

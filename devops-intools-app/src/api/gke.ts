import { get } from "./client";
import { bustCache, cachedGet } from "./cache";
import type { GKECluster, GKEClusterSummary, GKENodePool } from "../types/api";

const listPath = (project: string) =>
  `/gke/clusters?project=${encodeURIComponent(project)}`;

export const listClusters = (project: string) =>
  cachedGet<GKEClusterSummary[]>(listPath(project));

export const bustClusters = (project: string) => bustCache(listPath(project));

export const getCluster = (project: string, location: string, name: string) =>
  get<GKECluster>(
    `/gke/clusters/${encodeURIComponent(name)}?project=${encodeURIComponent(project)}&location=${encodeURIComponent(location)}`
  );

export const listNodePools = (project: string, location: string, name: string) =>
  get<GKENodePool[]>(
    `/gke/clusters/${encodeURIComponent(name)}/nodepools?project=${encodeURIComponent(project)}&location=${encodeURIComponent(location)}`
  );
